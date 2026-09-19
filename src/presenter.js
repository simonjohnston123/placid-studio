// AI PRESENTER without a GPU.
//
// One photo of a face + a voiceover -> a talking-head video, all on the CPU:
//   1. MediaPipe Face Landmarker (WASM, CPU) finds 478 face points once.
//   2. The voiceover is analysed per video frame: loudness drives how far the
//      jaw opens, hiss (zero-crossing rate) drives lip spread for s/sh/ee.
//   3. A WebGL fragment shader warps the photo with smooth radial-basis
//      displacements around the jaw, lips and eyelids, paints the mouth
//      interior (with upper teeth) where the lips part, and adds idle head
//      movement and blinks.
// No neural rendering at run time, so it runs in real time on any laptop.
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const BASE = import.meta.env.BASE_URL;
let landmarker = null;

async function getLandmarker() {
  if (landmarker) return landmarker;
  const fileset = await FilesetResolver.forVisionTasks(`${BASE}mediapipe`);
  landmarker = await FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: `${BASE}models/face_landmarker.task`, delegate: 'CPU' },
    runningMode: 'IMAGE',
    numFaces: 1,
  });
  return landmarker;
}

/** Face points in pixel coordinates, or throws if no usable face. */
export async function detectFace(bitmap) {
  const fl = await getLandmarker();
  const res = fl.detect(bitmap);
  const pts = res.faceLandmarks?.[0];
  if (!pts) throw new Error('No face found. Use a clear, front-facing photo of one person.');
  const P = pts.map(p => [p.x * bitmap.width, p.y * bitmap.height]);
  const eyeDist = Math.hypot(P[33][0] - P[263][0], P[33][1] - P[263][1]);
  if (eyeDist < 40) throw new Error('The face is too small in this photo. Crop closer to the head and shoulders.');
  const yaw = Math.abs((P[1][0] - P[234][0]) - (P[454][0] - P[1][0])) / eyeDist;
  if (yaw > 0.9) throw new Error('The face is turned too far to the side. Use a photo looking at the camera.');
  return P;
}

// MediaPipe mesh indices.
const LIP_UP_IN = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308];
const LIP_LO_IN = [95, 88, 178, 87, 14, 317, 402, 318, 324];
const LIP_UP_OUT = [185, 40, 39, 37, 0, 267, 269, 270, 409];
const LIP_LO_OUT = [146, 91, 181, 84, 17, 314, 405, 321, 375];
const CORNERS = [61, 291];
const JAW = [172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397];
const LID_L = [161, 160, 159, 158, 157], LOW_L = [163, 144, 145, 153, 154];
const LID_R = [384, 385, 386, 387, 388], LOW_R = [381, 380, 374, 373, 390];
const ANCHORS = [10, 151, 9, 8, 168, 6, 197, 195, 5, 4, 1, 33, 133, 362, 263, 234, 454, 93, 323, 127, 356];
// Inner-mouth outline (upper inner left->right, then lower inner right->left) for the cavity.
const CAVITY = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95];

const MAXC = 96; // multiple of 4: falloffs are packed four per vec4
const VS = `attribute vec2 p; varying vec2 v; void main(){ v = p * 0.5 + 0.5; v.y = 1.0 - v.y; gl_Position = vec4(p, 0.0, 1.0); }`;
const FS = `precision highp float;
varying vec2 v;
uniform sampler2D img;
uniform vec2 res;
uniform vec4 ctl[${MAXC}];   // xy = control point (px), zw = displacement (px)
uniform vec4 sig4[${MAXC / 4}]; // falloff radius (px), four controls per vec4
uniform int nctl;
uniform vec2 cav[20];        // mouth cavity outline after displacement (px)
uniform vec2 cav0[20];       // the same outline in the original photo
uniform float teethOn;       // 1 when the photo's mouth is closed, so teeth must be drawn
uniform float open;
uniform vec3 head;           // x, y shift (px), rotation (rad)
uniform vec2 pivot;
uniform vec3 mouthTone;
float inPoly(vec2 q, bool moved){
  bool c = false;
  vec2 b = moved ? cav[19] : cav0[19];
  for (int i = 0; i < 20; i++) {
    vec2 a = moved ? cav[i] : cav0[i];
    if (((a.y > q.y) != (b.y > q.y)) && (q.x < (b.x - a.x) * (q.y - a.y) / (b.y - a.y + 1e-5) + a.x)) c = !c;
    b = a;
  }
  return c ? 1.0 : 0.0;
}
float edgeDist(vec2 q){
  float d = 1e5;
  vec2 b = cav[19];
  for (int i = 0; i < 20; i++) {
    vec2 a = cav[i], ab = b - a;
    float t = clamp(dot(q - a, ab) / max(dot(ab, ab), 1e-5), 0.0, 1.0);
    d = min(d, length(q - a - ab * t));
    b = a;
  }
  return d;
}
void main(){
  vec2 q = v * res;
  // Head movement: inverse rotate/shift around the neck pivot.
  vec2 d0 = q - pivot - head.xy;
  float cs = cos(-head.z), sn = sin(-head.z);
  q = pivot + vec2(cs * d0.x - sn * d0.y, sn * d0.x + cs * d0.y);
  vec2 disp = vec2(0.0);
  float wsum = 0.0;
  for (int g = 0; g < ${MAXC / 4}; g++) {
    if (g * 4 >= nctl) break;
    vec4 s = sig4[g];
    vec2 d1 = q - ctl[g * 4].xy;     float w1 = exp(-dot(d1, d1) / (s.x * s.x)); disp += ctl[g * 4].zw * w1;
    vec2 d2 = q - ctl[g * 4 + 1].xy; float w2 = exp(-dot(d2, d2) / (s.y * s.y)); disp += ctl[g * 4 + 1].zw * w2;
    vec2 d3 = q - ctl[g * 4 + 2].xy; float w3 = exp(-dot(d3, d3) / (s.z * s.z)); disp += ctl[g * 4 + 2].zw * w3;
    vec2 d4 = q - ctl[g * 4 + 3].xy; float w4 = exp(-dot(d4, d4) / (s.w * s.w)); disp += ctl[g * 4 + 3].zw * w4;
    wsum += w1 + w2 + w3 + w4;
  }
  // Weighted average, not a sum: overlapping controls must not add up their pushes.
  disp /= max(wsum, 1.0);
  vec2 src = q - disp;
  vec3 col = texture2D(img, clamp(src / res, 0.001, 0.999)).rgb;
  if (open > 0.02 && inPoly(q, true) > 0.0) {
    // Only where the lips have newly parted: real teeth already in the photo stay as they are.
    float fresh = teethOn > 0.5 ? 1.0 : 1.0 - inPoly(q, false);
    if (fresh > 0.0) {
      vec2 top = mix(cav[3], cav[7], 0.5), bot = mix(cav[13], cav[17], 0.5);
      float t = clamp((q.y - top.y) / max(bot.y - top.y, 1.0), 0.0, 1.0);
      // Darker throat, a hint of tongue toward the bottom.
      vec3 cavity = mix(vec3(0.10, 0.03, 0.04), vec3(0.30, 0.10, 0.10), smoothstep(0.35, 1.0, t));
      float teeth = teethOn * smoothstep(0.32, 0.20, t) * clamp(open * 3.0, 0.0, 1.0);
      cavity = mix(cavity, vec3(0.88, 0.85, 0.80), teeth * 0.8);
      col = mix(col, cavity, smoothstep(0.0, 2.5, edgeDist(q)));
    }
  }
  gl_FragColor = vec4(col, 1.0);
}`;

export class Presenter {
  constructor() {
    this.gc = document.createElement('canvas');
    const gl = this.gc.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) throw new Error('WebGL is not available in this browser.');
    this.gl = gl;
    const prog = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, FS]]) {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
      gl.attachShader(prog, sh);
    }
    gl.linkProgram(prog); gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = Object.fromEntries(['img', 'res', 'ctl', 'sig4', 'nctl', 'cav', 'cav0', 'teethOn', 'open', 'head', 'pivot', 'mouthTone']
      .map(n => [n, gl.getUniformLocation(prog, n)]));
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    for (const [k, val] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]])
      gl.texParameteri(gl.TEXTURE_2D, k, val);
  }

  /** bitmap: the portrait. P: points from detectFace (pixels, same bitmap). */
  load(bitmap, P) {
    const gl = this.gl;
    const k = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * k), h = Math.round(bitmap.height * k);
    this.gc.width = w - (w % 2); this.gc.height = h - (h % 2);
    this.P = P.map(([x, y]) => [x * (this.gc.width / bitmap.width), y * (this.gc.height / bitmap.height)]);
    this.S = Math.hypot(this.P[33][0] - this.P[263][0], this.P[33][1] - this.P[263][1]);
    gl.viewport(0, 0, this.gc.width, this.gc.height);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
    gl.uniform1i(this.u.img, 0);
    gl.uniform2f(this.u.res, this.gc.width, this.gc.height);
    const chin = this.P[152];
    gl.uniform2f(this.u.pivot, chin[0], chin[1] + this.S * 0.6);
    // Mouth interior tone from the lips' own colour, darkened.
    gl.uniform3f(this.u.mouthTone, 0.42, 0.16, 0.16);
    this.faceBox = this.#box();
    // Original mouth outline, and whether the photo's mouth is closed (then teeth are drawn).
    const cav0 = new Float32Array(40);
    CAVITY.forEach((i, k) => { cav0[k * 2] = this.P[i][0]; cav0[k * 2 + 1] = this.P[i][1]; });
    gl.uniform2fv(this.u.cav0, cav0);
    const gap = this.P[14][1] - this.P[13][1];
    gl.uniform1f(this.u.teethOn, gap < this.S * 0.05 ? 1 : 0);
  }

  #box() {
    const xs = this.P.map(p => p[0]), ys = this.P.map(p => p[1]);
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  }

  /** f: { open 0..1, spread -1..1, blink 0..1, hx, hy (px), rot (rad) } */
  draw(f) {
    const gl = this.gl, P = this.P, S = this.S;
    const ctl = [], sig = [];
    const add = (i, dx, dy, s) => { ctl.push(P[i][0], P[i][1], dx, dy); sig.push(s); };
    const cx = (P[61][0] + P[291][0]) / 2, half = Math.abs(P[291][0] - P[61][0]) / 2 || 1;
    const centre = i => 1 - Math.min(1, Math.abs(P[i][0] - cx) / half) * 0.55;
    const drop = Math.min(f.open, 0.75) * 0.17 * S, // past ~0.75 the photo's teeth visibly squash
      spread = f.spread * 0.045 * S;
    for (const i of LIP_LO_IN) add(i, 0, drop * centre(i), S * 0.10);
    for (const i of LIP_LO_OUT) add(i, 0, drop * 0.92 * centre(i), S * 0.12);
    for (const i of LIP_UP_IN) add(i, 0, -drop * 0.10 * centre(i), S * 0.07);
    for (const i of LIP_UP_OUT) add(i, 0, -drop * 0.06 * centre(i), S * 0.08);
    add(61, -spread, drop * 0.18, S * 0.10); add(291, spread, drop * 0.18, S * 0.10);
    for (const i of JAW) {
      const w = 1 - Math.min(1, Math.abs(P[i][0] - cx) / (S * 0.9));
      add(i, 0, drop * 0.75 * w, S * 0.22);
    }
    const gapL = P[145][1] - P[159][1], gapR = P[374][1] - P[386][1];
    for (const i of LID_L) add(i, 0, f.blink * gapL * 0.95, S * 0.055);
    for (const i of LID_R) add(i, 0, f.blink * gapR * 0.95, S * 0.055);
    for (const i of ANCHORS) add(i, 0, 0, S * 0.08);
    const n = sig.length;
    if (n > MAXC) throw new Error(`Presenter has ${n} control points; MAXC is ${MAXC}.`);
    const ctlArr = new Float32Array(MAXC * 4); ctlArr.set(ctl);
    // Unused slots get zero displacement and a harmless radius.
    const sigArr = new Float32Array(MAXC).fill(1); sigArr.set(sig);
    gl.uniform4fv(this.u.ctl, ctlArr);
    gl.uniform4fv(this.u.sig4, sigArr);
    gl.uniform1i(this.u.nctl, n);
    // Cavity polygon: inner lip points pushed by the same field the shader applies.
    const moved = i => {
      let dx = 0, dy = 0, ws = 0;
      for (let k = 0; k < n; k++) {
        const ex = P[i][0] - ctl[k * 4], ey = P[i][1] - ctl[k * 4 + 1];
        const w = Math.exp(-(ex * ex + ey * ey) / (sig[k] * sig[k]));
        dx += ctl[k * 4 + 2] * w; dy += ctl[k * 4 + 3] * w; ws += w;
      }
      ws = Math.max(ws, 1);
      return [P[i][0] + dx / ws, P[i][1] + dy / ws];
    };
    const cav = new Float32Array(40);
    CAVITY.forEach((i, k) => { const [x, y] = moved(i); cav[k * 2] = x; cav[k * 2 + 1] = y; });
    gl.uniform2fv(this.u.cav, cav);
    gl.uniform1f(this.u.open, f.open);
    gl.uniform3f(this.u.head, f.hx || 0, f.hy || 0, f.rot || 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

// ---------- voice -> mouth ----------

/** Per-frame { open, spread } from the voiceover, at fps. */
export function mouthTrack(samples, rate, fps = 30) {
  const hop = Math.round(rate / fps), n = Math.ceil(samples.length / hop);
  const rms = new Float32Array(n), zcr = new Float32Array(n);
  for (let f = 0; f < n; f++) {
    let s = 0, z = 0;
    const a = f * hop, b = Math.min(samples.length, a + hop * 2);
    for (let i = a; i < b; i++) { s += samples[i] * samples[i]; if (i > a && (samples[i] >= 0) !== (samples[i - 1] >= 0)) z++; }
    rms[f] = Math.sqrt(s / Math.max(1, b - a));
    zcr[f] = z / Math.max(1, b - a);
  }
  const sorted = Array.from(rms).sort((x, y) => x - y);
  const loud = sorted[Math.floor(sorted.length * 0.95)] || 1e-3;
  const gate = loud * 0.08;
  const out = [];
  let o = 0, sp = 0;
  for (let f = 0; f < n; f++) {
    // Sibilants (high zero-crossing, modest energy) keep the teeth nearly together and the lips wide.
    const hiss = Math.min(1, Math.max(0, (zcr[f] - 0.12) / 0.18));
    let target = rms[f] < gate ? 0 : Math.min(1, Math.pow((rms[f] - gate) / (loud - gate), 0.7));
    target *= 1 - hiss * 0.6;
    // Fast open, slower close — how real jaws move.
    o += (target - o) * (target > o ? 0.65 : 0.35);
    sp += ((hiss * 0.8 - target * 0.2) - sp) * 0.4;
    out.push({ open: o, spread: sp });
  }
  return out;
}

/** Natural idle motion: blinks every 2-5 s, slow sway, small nods on stressed syllables. */
export function idleTrack(frames, fps, mouth, S) {
  const out = [];
  let nextBlink = fps * (1 + Math.random() * 2), blinkAt = -99;
  const seed = Math.random() * 100;
  for (let f = 0; f < frames; f++) {
    if (f >= nextBlink) { blinkAt = f; nextBlink = f + fps * (2 + Math.random() * 3); }
    const bt = (f - blinkAt) / (fps * 0.16);
    const blink = bt >= 0 && bt <= 1 ? Math.sin(bt * Math.PI) : 0;
    const t = f / fps + seed;
    const emph = mouth[f] ? Math.max(0, mouth[f].open - (mouth[f - 3]?.open ?? 0)) : 0;
    out.push({
      blink,
      hx: Math.sin(t * 0.7) * S * 0.02 + Math.sin(t * 1.9) * S * 0.006,
      hy: Math.sin(t * 0.9) * S * 0.012 + emph * S * 0.05,
      rot: Math.sin(t * 0.5) * 0.012 + Math.sin(t * 1.3) * 0.005,
    });
  }
  return out;
}

/**
 * Records the presenter speaking `audio` into outCanvas (sized to the chosen format),
 * cropped around the face. caption: optional { title, line } lower third.
 */
export async function recordPresenter(pres, outCanvas, size, audio, { caption = null, aiTag = true, backdrop = null, onTick } = {}) {
  const fps = 30;
  const [W, H] = size || [pres.gc.width, pres.gc.height];
  outCanvas.width = W; outCanvas.height = H;
  const c = outCanvas.getContext('2d');
  const mouth = mouthTrack(audio.samples, audio.rate, fps);
  const seconds = audio.samples.length / audio.rate + 0.5;
  const frames = Math.ceil(seconds * fps) + 2;
  const idle = idleTrack(frames, fps, mouth, pres.S);
  // Cover-crop with the face in the upper-middle of the frame.
  // Cover the frame, and zoom in so the face is about half the frame width (head and shoulders).
  const k = Math.max(W / pres.gc.width, H / pres.gc.height, (W * 0.5) / (pres.faceBox.x1 - pres.faceBox.x0));
  const fb = pres.faceBox, fx = (fb.x0 + fb.x1) / 2 * k, fy = (fb.y0 + fb.y1) / 2 * k;
  const ox = Math.min(0, Math.max(W - pres.gc.width * k, W / 2 - fx));
  const oy = Math.min(0, Math.max(H - pres.gc.height * k, H * 0.42 - fy));
  const frame = f => {
    const m = mouth[Math.min(f, mouth.length - 1)] || { open: 0, spread: 0 };
    pres.draw({ ...m, ...idle[Math.min(f, idle.length - 1)] });
    if (backdrop?.length) {
      // PRODUCT PRESENTER: product photos full frame with a slow zoom, presenter in a corner window.
      const per = frames / backdrop.length, i = Math.min(backdrop.length - 1, Math.floor(f / per)), t = (f - i * per) / per;
      const img = backdrop[i], z = 1.04 + 0.08 * t;
      c.fillStyle = '#fff'; c.fillRect(0, 0, W, H);
      const kc = Math.min(W / img.width, (H * 0.72) / img.height) * z;
      c.drawImage(img, (W - img.width * kc) / 2, H * 0.06 + (H * 0.66 - img.height * kc) / 2, img.width * kc, img.height * kc);
      const bw = Math.round(W * 0.40), bh = Math.round(bw * 1.25), bx = Math.round(W * 0.05), by = Math.round(H * 0.70 - bh * 0.5);
      const k2 = Math.max(bw / pres.gc.width, bh / pres.gc.height) * 1.6;
      const fcx = (pres.faceBox.x0 + pres.faceBox.x1) / 2, fcy = (pres.faceBox.y0 + pres.faceBox.y1) / 2;
      c.save();
      c.beginPath(); c.roundRect(bx, by, bw, bh, bw * 0.08); c.clip();
      c.drawImage(pres.gc, bx + bw / 2 - fcx * k2, by + bh * 0.45 - fcy * k2, pres.gc.width * k2, pres.gc.height * k2);
      c.restore();
      c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = Math.max(3, W * 0.006);
      c.beginPath(); c.roundRect(bx, by, bw, bh, bw * 0.08); c.stroke();
    } else {
      c.drawImage(pres.gc, ox, oy, pres.gc.width * k, pres.gc.height * k);
    }
    if (caption) (backdrop?.length ? topBand : lowerThird)(c, W, H, caption);
    if (aiTag) aiLabel(c, W, H);
  };

  const stream = outCanvas.captureStream(fps);
  const ctx = new AudioContext();
  const buf = ctx.createBuffer(1, audio.samples.length, audio.rate);
  buf.copyToChannel(audio.samples, 0);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const dest = ctx.createMediaStreamDestination();
  src.connect(dest);
  dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
  const mime = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m));
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
  const chunks = [];
  rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  const finished = new Promise(r => (rec.onstop = r));
  frame(0);
  rec.start(250);
  src.start();
  // The frame shown is chosen from the audio clock, so lips stay in sync even if a frame is slow.
  const t0 = ctx.currentTime;
  await new Promise(resolve => {
    const loop = () => {
      const t = ctx.currentTime - t0;
      frame(Math.floor(t * fps));
      onTick?.(Math.min(1, t / seconds));
      if (t < seconds) setTimeout(loop, 1000 / fps); else resolve();
    };
    loop();
  });
  rec.stop();
  await finished;
  ctx.close();
  return new Blob(chunks, { type: mime.split(';')[0] });
}

/** Live preview: loops the idle motion with the mouth closed. */
export function previewPresenter(pres, outCanvas, size) {
  const [W, H] = size || [pres.gc.width, pres.gc.height];
  outCanvas.width = W; outCanvas.height = H;
  const c = outCanvas.getContext('2d');
  const fps = 30, idle = idleTrack(fps * 20, fps, [], pres.S);
  // Cover the frame, and zoom in so the face is about half the frame width (head and shoulders).
  const k = Math.max(W / pres.gc.width, H / pres.gc.height, (W * 0.5) / (pres.faceBox.x1 - pres.faceBox.x0));
  const fb = pres.faceBox, fx = (fb.x0 + fb.x1) / 2 * k, fy = (fb.y0 + fb.y1) / 2 * k;
  const ox = Math.min(0, Math.max(W - pres.gc.width * k, W / 2 - fx));
  const oy = Math.min(0, Math.max(H - pres.gc.height * k, H * 0.42 - fy));
  let f = 0, raf = 0;
  const loop = () => {
    const talk = (Math.sin(f / 3.1) * 0.5 + 0.5) * (Math.sin(f / 23) > 0 ? 1 : 0);
    pres.draw({ open: talk * 0.8, spread: 0, ...idle[f % idle.length] });
    c.drawImage(pres.gc, ox, oy, pres.gc.width * k, pres.gc.height * k);
    f++; raf = requestAnimationFrame(loop);
  };
  loop();
  return () => cancelAnimationFrame(raf);
}

function lowerThird(c, W, H, { title, line }) {
  const pad = Math.round(W * 0.06), fs = Math.round(Math.min(W, H) * 0.048);
  const g = c.createLinearGradient(0, H * 0.7, 0, H);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(0,0,0,.7)'); g.addColorStop(1, 'rgba(0,0,0,.85)');
  c.fillStyle = g; c.fillRect(0, H * 0.7, W, H * 0.3);
  c.textBaseline = 'top'; c.fillStyle = '#fff';
  c.font = `700 ${fs}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  c.fillText(String(title).slice(0, 48), pad, H - pad - fs * 2.4);
  if (line) { c.font = `600 ${Math.round(fs * 0.72)}px system-ui, sans-serif`; c.fillStyle = '#5eead4'; c.fillText(line, pad, H - pad - fs * 0.9); }
}

// Meta and TikTok require realistic AI-generated people to be disclosed; a visible tag keeps
// the disclosure with the video wherever it is reposted.
function aiLabel(c, W, H) {
  const fs = Math.round(Math.min(W, H) * 0.028), pad = Math.round(fs * 0.7);
  c.font = `600 ${fs}px system-ui, sans-serif`;
  const text = 'AI presenter', w = c.measureText(text).width + pad * 2;
  c.fillStyle = 'rgba(0,0,0,.55)';
  c.beginPath(); c.roundRect(pad * 2, pad * 2, w, fs + pad, fs / 2); c.fill();
  c.fillStyle = '#fff'; c.textBaseline = 'middle';
  c.fillText(text, pad * 3, pad * 2 + (fs + pad) / 2);
}

// Product layout: title and price across the bottom-right, clear of the presenter window.
function topBand(c, W, H, { title, line }) {
  const x0 = W * 0.49, pad = Math.round(W * 0.04), fs = Math.round(W * 0.042), max = W - x0 - pad;
  c.textBaseline = 'top'; c.fillStyle = '#0b1f3a';
  c.font = `700 ${fs}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  const words = String(title).split(/\s+/), lines = [];
  let cur = '';
  for (const w of words) { const n = cur ? cur + ' ' + w : w; if (c.measureText(n).width > max && cur) { lines.push(cur); cur = w; } else cur = n; }
  if (cur) lines.push(cur);
  let y = H * 0.78;
  for (const l of lines.slice(0, 3)) { c.fillText(l, x0, y); y += fs * 1.2; }
  if (line) { c.font = `800 ${Math.round(fs * 1.1)}px system-ui, sans-serif`; c.fillStyle = '#0d9488'; c.fillText(line.split(' · ')[0], x0, y + fs * 0.4); }
}
