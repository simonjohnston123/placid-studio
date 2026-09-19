// 2.5D camera moves: the image is displaced by its own depth map in a WebGL shader,
// so near things move more than far things. Recorded straight off the canvas.
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

export class MotionRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, premultipliedAlpha: false });
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
  }

  #tex() {
    const gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    for (const [k, val] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]])
      gl.texParameteri(gl.TEXTURE_2D, k, val);
    return t;
  }

  // image: ImageBitmap; depth: { data: Uint8Array (1 channel), width, height }
  load(image, depth, maxW = 1280) {
    const gl = this.gl;
    const scale = Math.min(1, maxW / image.width);
    let w = Math.round(image.width * scale), h = Math.round(image.height * scale);
    if (w < 720) { h = Math.round(h * 720 / w); w = 720; } // small generations get a 720p canvas
    this.canvas.width = w - (w % 2); this.canvas.height = h - (h % 2);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.texImg);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    const rgba = new Uint8Array(depth.width * depth.height * 4);
    for (let i = 0; i < depth.data.length; i++) { const d = depth.data[i]; rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = d; rgba[i * 4 + 3] = 255; }
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.texDep);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, depth.width, depth.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
  }

  draw(motion, t, { intensity = 1, grain = 0 } = {}) {
    const gl = this.gl, m = (MOTIONS[motion] || MOTIONS.push).f(t);
    const k = intensity;
    gl.uniform1f(this.u.zoom, 1 + (m.zoom - 1) * Math.max(k, 0.3));
    gl.uniform1f(this.u.s, m.s === 1 ? 0 : m.s * k);
    gl.uniform2f(this.u.off, m.ox * k, m.oy * k);
    gl.uniform1f(this.u.grain, grain);
    gl.uniform1f(this.u.time, t * 97.0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
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

  // Records the move in real time. audio: optional { samples: Float32Array, rate }.
  async record(motion, opts, seconds, audio, onTick) {
    this.stop();
    const stream = this.canvas.captureStream(30);
    let ctx = null, src = null;
    if (audio) {
      ctx = new AudioContext();
      const buf = ctx.createBuffer(1, audio.samples.length, audio.rate);
      buf.copyToChannel(audio.samples, 0);
      src = ctx.createBufferSource(); src.buffer = buf;
      const dest = ctx.createMediaStreamDestination();
      src.connect(dest);
      dest.stream.getAudioTracks().forEach(tr => stream.addTrack(tr));
      seconds = Math.max(seconds, buf.duration + 0.4);
    }
    const mime = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm']
      .find(m => MediaRecorder.isTypeSupported(m));
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
    const chunks = [];
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    const finished = new Promise(r => (rec.onstop = r));
    this.draw(motion, 0, opts);
    rec.start(250);
    src?.start();
    const start = performance.now();
    // Timer, not requestAnimationFrame: rAF stops completely in a hidden tab and the render would hang.
    await new Promise(resolve => {
      const loop = () => {
        const t = Math.min(1, (performance.now() - start) / 1000 / seconds);
        this.draw(motion, t, opts);
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
