// 2.5D camera moves: the image is displaced by its own depth map in a WebGL shader,
// so near things move more than far things. A 2D canvas composites the result into
// the chosen frame (source shape, 9:16, 1:1, 16:9) with captions, and is recorded.
import { MOTIONS } from './presets.js';

const VS = `attribute vec2 p; varying vec2 v; void main(){ v = p * 0.5 + 0.5; v.y = 1.0 - v.y; gl_Position = vec4(p, 0.0, 1.0); }`;
const FS = `precision highp float;
varying vec2 v;
uniform sampler2D img, dep;
uniform float zoom, s, grain, time;
uniform vec2 off;
float rnd(vec2 c){ return fract(sin(dot(c, vec2(12.9898, 78.233)) + time) * 43758.5453); }
void main(){
  vec2 uv = (v - 0.5) / zoom + 0.5;
  vec2 p = uv;
  for (int i = 0; i < 10; i++) {
    float d = texture2D(dep, p).r;
    p = uv - (off * 1.6 + (uv - 0.5) * s) * (d - 0.35);
  }
  vec3 c = texture2D(img, clamp(p, 0.001, 0.999)).rgb;
  c += (rnd(v * 800.0) - 0.5) * grain;
  float vig = smoothstep(0.95, 0.35, length(v - 0.5));
  gl_FragColor = vec4(c * mix(0.82, 1.0, vig), 1.0);
}`;

export const FORMATS = {
  source: { label: 'Same as image', size: null },
  vertical: { label: '9:16 · TikTok, Reels, Shorts', size: [720, 1280] },
  square: { label: '1:1 · Instagram, Facebook feed', size: [1080, 1080] },
  wide: { label: '16:9 · YouTube', size: [1280, 720] },
};

export class MotionRenderer {
  constructor(canvas) {
    this.out = canvas;
    this.ctx = canvas.getContext('2d');
    this.gc = document.createElement('canvas');
    const gl = this.gc.getContext('webgl', { preserveDrawingBuffer: true, premultipliedAlpha: false });
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
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = Object.fromEntries(['img', 'dep', 'zoom', 's', 'off', 'grain', 'time'].map(n => [n, gl.getUniformLocation(prog, n)]));
    gl.uniform1i(this.u.img, 0); gl.uniform1i(this.u.dep, 1);
    this.texImg = this.#tex(); this.texDep = this.#tex();
    this.format = 'source';
    this.caption = null;
  }

  #tex() {
    const gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    for (const [k, val] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]])
      gl.texParameteri(gl.TEXTURE_2D, k, val);
    return t;
  }

  /** Output frame. format: key of FORMATS. caption: { title, line } or null. */
  setFrame(format, caption = null) { this.format = format; this.caption = caption; }

  // image: ImageBitmap; depth: { data: Uint8Array (1 channel), width, height }
  load(image, depth, maxW = 1280) {
    const gl = this.gl;
    const scale = Math.min(1, maxW / image.width);
    let w = Math.round(image.width * scale), h = Math.round(image.height * scale);
    if (w < 720) { h = Math.round(h * 720 / w); w = 720; } // small generations get a 720p canvas
    this.gc.width = w - (w % 2); this.gc.height = h - (h % 2);
    gl.viewport(0, 0, this.gc.width, this.gc.height);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.texImg);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    const rgba = new Uint8Array(depth.width * depth.height * 4);
    for (let i = 0; i < depth.data.length; i++) { const d = depth.data[i]; rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = d; rgba[i * 4 + 3] = 255; }
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.texDep);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, depth.width, depth.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgba);

    const size = FORMATS[this.format]?.size || [this.gc.width, this.gc.height];
    if (this.out.width !== size[0] || this.out.height !== size[1]) { this.out.width = size[0]; this.out.height = size[1]; }
    // The photo's own background colour behind it, rather than a blurred copy:
    // a product shot on white gets clean white, one on black gets black. The
    // blurred version read as a grey smudge around the product.
    this.bg = null;
    if (FORMATS[this.format]?.size) {
      const probe = document.createElement('canvas');
      probe.width = 32; probe.height = 32;
      const pc = probe.getContext('2d', { willReadFrequently: true });
      pc.drawImage(image, 0, 0, 32, 32);
      const d = pc.getImageData(0, 0, 32, 32).data;
      // Edge pixels only — the middle is the product, the border is its backdrop.
      const rs = [], gs = [], bs = [];
      for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
          if (x > 2 && x < 29 && y > 2 && y < 29) continue;
          const i = (y * 32 + x) * 4;
          rs.push(d[i]); gs.push(d[i + 1]); bs.push(d[i + 2]);
        }
      }
      const mid = a => a.sort((p, q) => p - q)[a.length >> 1];
      const bg = document.createElement('canvas'); bg.width = size[0]; bg.height = size[1];
      const b = bg.getContext('2d');
      b.fillStyle = `rgb(${mid(rs)}, ${mid(gs)}, ${mid(bs)})`;
      b.fillRect(0, 0, size[0], size[1]);
      this.bg = bg;
    }
  }

  draw(motion, t, { intensity = 1, grain = 0, alpha = 1 } = {}) {
    const gl = this.gl, m = (MOTIONS[motion] || MOTIONS.push).f(t);
    const k = intensity;
    gl.uniform1f(this.u.zoom, 1 + (m.zoom - 1) * Math.max(k, 0.3));
    gl.uniform1f(this.u.s, m.s === 1 ? 0 : m.s * k);
    gl.uniform2f(this.u.off, m.ox * k, m.oy * k);
    gl.uniform1f(this.u.grain, grain);
    gl.uniform1f(this.u.time, t * 97.0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    const c = this.ctx, W = this.out.width, H = this.out.height;
    c.globalAlpha = 1;
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    c.globalAlpha = alpha;
    if (this.bg) {
      c.drawImage(this.bg, 0, 0);
      const cap = this.caption ? 0.2 : 0;
      const k2 = Math.min(W / this.gc.width, (H * (1 - cap)) / this.gc.height);
      const w = this.gc.width * k2, h = this.gc.height * k2;
      c.drawImage(this.gc, (W - w) / 2, (H * (1 - cap) - h) / 2, w, h);
    } else {
      c.drawImage(this.gc, 0, 0, W, H);
    }
    c.globalAlpha = 1;
    if (this.caption) this.#caption();
  }

  #caption() {
    const c = this.ctx, W = this.out.width, H = this.out.height, { title, line } = this.caption;
    const pad = Math.round(W * 0.06), fs = Math.round(Math.min(W, H) * 0.052);
    c.font = `700 ${fs}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    const lines = wrap(c, title, W - pad * 2).slice(0, 2);
    const small = Math.round(fs * 0.72);
    const boxH = lines.length * fs * 1.2 + (line ? small * 1.6 : 0) + pad;
    const g = c.createLinearGradient(0, H - boxH - pad * 1.5, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.35, 'rgba(0,0,0,.72)'); g.addColorStop(1, 'rgba(0,0,0,.85)');
    c.fillStyle = g; c.fillRect(0, H - boxH - pad * 1.5, W, boxH + pad * 1.5);
    c.fillStyle = '#fff'; c.textBaseline = 'top';
    let y = H - boxH;
    for (const l of lines) { c.fillText(l, pad, y); y += fs * 1.2; }
    if (line) {
      c.font = `600 ${small}px system-ui, -apple-system, "Segoe UI", sans-serif`;
      c.fillStyle = '#5eead4';
      c.fillText(line, pad, y + small * 0.3);
    }
  }

  preview(motion, opts, seconds = 5) {
    this.stop();
    const start = performance.now();
    const loop = now => {
      const t = ((now - start) / 1000 / seconds) % 1;
      this.draw(motion, t, opts);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() { cancelAnimationFrame(this.raf); clearTimeout(this.timer); this.raf = this.timer = 0; }

  /**
   * Records one or more shots back to back.
   * shots: [{ image: ImageBitmap, depth, motion }]; seconds: total length.
   * audio: optional { samples: Float32Array, rate } — the video stretches to fit it.
   */
  /** opts.onFrame(ctx, t, i) draws over every frame — captions, hook, end card. */
  async record(shots, opts, seconds, audio, onTick) {
    this.stop();
    // captureStream(0) + requestFrame(): a hidden or backgrounded tab stops
    // feeding an automatic capture, which silently freezes the picture while the
    // audio keeps running. Pushing each frame by hand is immune to that.
    const stream = this.out.captureStream(0);
    const videoTrack = stream.getVideoTracks()[0];
    let ctx = null, src = null;
    if (audio) {
      ctx = new AudioContext();
      const buf = ctx.createBuffer(1, audio.samples.length, audio.rate);
      buf.copyToChannel(audio.samples, 0);
      src = ctx.createBufferSource(); src.buffer = buf;
      const dest = ctx.createMediaStreamDestination();
      src.connect(dest);
      dest.stream.getAudioTracks().forEach(tr => stream.addTrack(tr));
      seconds = Math.max(seconds, buf.duration + 0.6);
    }
    const mime = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm']
      .find(m => MediaRecorder.isTypeSupported(m));
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
    const chunks = [];
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    const finished = new Promise(r => (rec.onstop = r));
    const per = seconds / shots.length;
    let current = -1;
    const show = i => { if (i !== current) { current = i; this.load(shots[i].image, shots[i].depth); } };
    show(0);
    this.draw(shots[0].motion, 0, opts);
    videoTrack.requestFrame();
    rec.start(250);
    src?.start();
    const start = performance.now();
    // Timer, not requestAnimationFrame: rAF stops completely in a hidden tab and the render would hang.
    await new Promise(resolve => {
      const loop = () => {
        const elapsed = (performance.now() - start) / 1000;
        const t = Math.min(1, elapsed / seconds);
        const i = Math.min(shots.length - 1, Math.floor(elapsed / per));
        show(i);
        const local = Math.min(1, (elapsed - i * per) / per);
        const fade = shots.length > 1 ? Math.min(1, (elapsed - i * per) / 0.3) : 1;
        this.draw(shots[i].motion, local, { ...opts, alpha: fade });
        opts.onFrame?.(this.ctx, elapsed, i);
        videoTrack.requestFrame();
        onTick?.(t);
        if (t < 1) this.timer = setTimeout(loop, 1000 / 30); else resolve();
      };
      loop();
    });
    rec.stop();
    await finished;
    ctx?.close();
    return new Blob(chunks, { type: mime.split(';')[0] });
  }
}

function wrap(c, text, max) {
  const words = String(text).split(/\s+/), lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? cur + ' ' + w : w;
    if (c.measureText(next).width > max && cur) { lines.push(cur); cur = w; } else cur = next;
  }
  if (cur) lines.push(cur);
  if (lines.length > 2) lines[1] = lines[1].replace(/\s*\S*$/, '') + '…';
  return lines;
}
