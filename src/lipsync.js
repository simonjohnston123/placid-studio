// LIP SYNC on a real video clip, on the CPU.
//
// Film yourself once saying anything, then every ad reuses that clip with new
// words. Per frame: track the face (MediaPipe, WASM), work out how open the
// mouth already is in that frame, and warp it to where the new voiceover says it
// should be. The rest of the frame — head, eyes, background — is untouched, so
// the result keeps the real footage's motion.
//
// Honest limits: it moves the mouth you filmed, it does not regenerate it, so
// a source clip with a wide-open mouth or a hand across the face will look off.
// Film neutral, mouth mostly closed, facing the camera.
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { Presenter, mouthTrack } from './presenter.js';

const BASE = import.meta.env.BASE_URL;
let videoLandmarker = null;

async function getVideoLandmarker() {
  if (videoLandmarker) return videoLandmarker;
  const fileset = await FilesetResolver.forVisionTasks(`${BASE}mediapipe`);
  videoLandmarker = await FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: `${BASE}models/face_landmarker.task`, delegate: 'CPU' },
    runningMode: 'VIDEO',
    numFaces: 1,
  });
  return videoLandmarker;
}

const loadVideo = file => new Promise((resolve, reject) => {
  const v = document.createElement('video');
  v.preload = 'auto'; v.muted = true; v.playsInline = true;
  v.onloadedmetadata = () => resolve(v);
  v.onerror = () => reject(new Error('That video could not be read. MP4 or WebM works best.'));
  v.src = URL.createObjectURL(file);
});

const seek = (v, t) => new Promise(resolve => { v.onseeked = () => resolve(); v.currentTime = Math.min(t, Math.max(0, v.duration - 0.001)); });

/**
 * Re-syncs `file` to `audio`.
 * The clip loops (and ping-pongs, so the join never jumps) until the voiceover ends.
 */
export async function lipSyncVideo({ file, audio, outCanvas, caption = null, aiTag = true, onTick }) {
  const fps = 30;
  const landmarker = await getVideoLandmarker();
  const video = await loadVideo(file);
  if (!video.duration || !isFinite(video.duration)) throw new Error('That video has no readable length.');

  const mouth = mouthTrack(audio.samples, audio.rate, fps);
  const seconds = audio.samples.length / audio.rate + 0.4;
  const frames = Math.ceil(seconds * fps);

  const W = video.videoWidth, H = video.videoHeight;
  outCanvas.width = W - (W % 2); outCanvas.height = H - (H % 2);
  const ctx = outCanvas.getContext('2d');
  const grab = document.createElement('canvas');
  grab.width = W; grab.height = H;
  const gctx = grab.getContext('2d', { willReadFrequently: true });

  const pres = new Presenter();
  const srcFrames = Math.max(1, Math.floor(video.duration * fps));
  // Ping-pong: forward then backward, so a 6-second clip covers a 20-second script
  // without a visible cut back to the start.
  const sourceTime = i => {
    const period = srcFrames * 2 - 2 || 1;
    const k = period > 1 ? i % period : 0;
    return (k < srcFrames ? k : period - k) / fps;
  };

  const stream = outCanvas.captureStream(fps);
  const actx = new AudioContext();
  const buf = actx.createBuffer(1, audio.samples.length, audio.rate);
  buf.copyToChannel(audio.samples, 0);
  const src = actx.createBufferSource(); src.buffer = buf;
  const dest = actx.createMediaStreamDestination();
  src.connect(dest);
  dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
  const mime = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m));
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
  const chunks = [];
  rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  const finished = new Promise(r => (rec.onstop = r));

  // Rendered ahead of time, frame by frame, then played back at 30fps while
  // recording: tracking a face takes longer than a frame lasts, so recording
  // live would drift out of sync with the voice.
  //
  // Kept as JPEGs, not bitmaps: 600 frames of raw 720p is over a gigabyte, and
  // the tab dies. Decoding one JPEG takes a few milliseconds, which fits a frame.
  const rendered = [];
  const store = async canvas => new Promise(r => canvas.toBlob(b => r(b), 'image/jpeg', 0.92));
  let missing = 0;
  for (let i = 0; i < frames; i++) {
    await seek(video, sourceTime(i));
    gctx.drawImage(video, 0, 0, W, H);
    const res = landmarker.detectForVideo(grab, performance.now() + i * (1000 / fps));
    const pts = res.faceLandmarks?.[0];
    const bmp = await createImageBitmap(grab);
    if (pts) {
      const P = pts.map(p => [p.x * W, p.y * H]);
      pres.load(bmp, P);
      const m = mouth[Math.min(i, mouth.length - 1)] || { open: 0, spread: 0 };
      // How open is the filmed mouth already? Only the difference is applied.
      const S = pres.S;
      const already = Math.max(0, Math.min(1, (pres.P[14][1] - pres.P[13][1]) / (S * 0.17)));
      pres.draw({ open: Math.max(0, m.open - already * 0.85), spread: m.spread, blink: 0, hx: 0, hy: 0, rot: 0 });
      rendered.push(await store(pres.gc));
    } else {
      missing++;
      rendered.push(await store(grab)); // no face this frame: the original, untouched
    }
    bmp.close?.();
    onTick?.((i / frames) * 0.75, `tracking ${i + 1} of ${frames}`);
  }
  if (missing > frames * 0.5) throw new Error('No face could be tracked in most of that clip. Use a clip facing the camera, well lit, one person.');

  let shown = -1;
  const draw = async i => {
    const idx = Math.min(i, rendered.length - 1);
    if (idx !== shown) {
      const bmp = await createImageBitmap(rendered[idx]);
      ctx.drawImage(bmp, 0, 0, outCanvas.width, outCanvas.height);
      bmp.close?.();
      shown = idx;
    }
    if (caption) lowerThird(ctx, outCanvas.width, outCanvas.height, caption);
    if (aiTag) aiLabel(ctx, outCanvas.width, outCanvas.height);
  };
  await draw(0);
  rec.start(250);
  src.start();
  const t0 = actx.currentTime;
  await new Promise(resolve => {
    const loop = async () => {
      const t = actx.currentTime - t0;
      await draw(Math.floor(t * fps));
      const done = Math.min(1, t / seconds);
      onTick?.(0.75 + done * 0.25, `${Math.round(done * 100)}% · keep this tab open`);
      if (t < seconds) setTimeout(loop, 1000 / fps); else resolve();
    };
    loop();
  });
  rec.stop();
  await finished;
  actx.close();
  return new Blob(chunks, { type: mime.split(';')[0] });
}

// Same furniture as the presenter's, kept here so lip sync stands alone.
function lowerThird(c, W, H, { title, line }) {
  const pad = Math.round(W * 0.05), fs = Math.round(Math.min(W, H) * 0.05);
  const g = c.createLinearGradient(0, H * 0.72, 0, H);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(0,0,0,.7)'); g.addColorStop(1, 'rgba(0,0,0,.85)');
  c.fillStyle = g; c.fillRect(0, H * 0.72, W, H * 0.28);
  c.textBaseline = 'top'; c.fillStyle = '#fff';
  c.font = `700 ${fs}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  c.fillText(String(title).slice(0, 44), pad, H - pad - fs * 2.3);
  if (line) { c.font = `600 ${Math.round(fs * 0.72)}px system-ui, sans-serif`; c.fillStyle = '#5eead4'; c.fillText(line, pad, H - pad - fs * 0.9); }
}

function aiLabel(c, W, H) {
  const fs = Math.round(Math.min(W, H) * 0.028), pad = Math.round(fs * 0.7);
  c.font = `600 ${fs}px system-ui, sans-serif`;
  const text = 'AI lip sync', w = c.measureText(text).width + pad * 2;
  c.fillStyle = 'rgba(0,0,0,.55)';
  c.beginPath(); c.roundRect(pad * 2, pad * 2, w, fs + pad, fs / 2); c.fill();
  c.fillStyle = '#fff'; c.textBaseline = 'middle';
  c.fillText(text, pad * 3, pad * 2 + (fs + pad) / 2);
}
