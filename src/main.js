import { STYLE_PRESETS, MOTIONS, VOICES } from './presets.js';
import { MotionRenderer } from './motion.js';
import { saveItem, listItems, deleteItem, toWav } from './store.js';

const $ = sel => document.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- workers ----------
function client(worker) {
  let n = 0;
  const pending = new Map();
  worker.onmessage = ({ data }) => {
    const p = pending.get(data.id);
    if (!p) return;
    if (data.type === 'done') { pending.delete(data.id); p.resolve(data.result); }
    else if (data.type === 'error') { pending.delete(data.id); p.reject(new Error(data.message)); }
    else p.onEvent?.(data);
  };
  return (msg, onEvent, transfer = []) => new Promise((resolve, reject) => {
    const id = ++n;
    pending.set(id, { resolve, reject, onEvent });
    worker.postMessage({ ...msg, id }, transfer);
  });
}
const gen = client(new Worker(new URL('./gen.worker.js', import.meta.url), { type: 'module' }));
const tts = client(new Worker(new URL('./tts.worker.js', import.meta.url), { type: 'module' }));

// ---------- state ----------
const S = {
  mode: 'presets',
  preset: STYLE_PRESETS[0],
  motion: STYLE_PRESETS[0].motion,
  source: null,   // { blob, url, prompt }
  voice: null,    // { samples, rate, text }
  busy: false,
  gpu: { ok: false, f16: false },
  libFilter: 'all',
};
const depthCache = new WeakMap();

// ---------- job / progress UI ----------
const job = {
  files: new Map(),
  start(text) {
    this.files.clear();
    $('#empty').hidden = true; $('#job').hidden = false;
    $('#jobText').textContent = text; $('#jobSub').textContent = '';
    $('#jobBar').parentElement.classList.add('indet'); $('#jobBar').style.width = '';
  },
  text(t) { $('#jobText').textContent = t; },
  event(e) {
    if (e.type === 'progress') {
      this.files.set(e.file, e);
      let loaded = 0, total = 0;
      for (const f of this.files.values()) { loaded += f.loaded || 0; total += f.total || 0; }
      if (total) {
        $('#jobBar').parentElement.classList.remove('indet');
        $('#jobBar').style.width = (100 * loaded / total).toFixed(1) + '%';
        $('#jobText').textContent = `Downloading ${e.stage} (first time only)`;
        $('#jobSub').textContent = `${mb(loaded)} of ${mb(total)} MB`;
      }
    } else if (e.type === 'status') {
      this.files.clear();
      $('#jobText').textContent = e.text; $('#jobSub').textContent = '';
      $('#jobBar').parentElement.classList.add('indet');
    } else if (e.type === 'step') {
      $('#jobBar').parentElement.classList.remove('indet');
      $('#jobBar').style.width = (100 * e.done / e.total).toFixed(0) + '%';
      $('#jobSub').textContent = `Image ${e.i + 1} of ${e.count} · ${Math.round(100 * e.done / e.total)}%`;
    }
  },
  pct(p, sub) {
    $('#jobBar').parentElement.classList.remove('indet');
    $('#jobBar').style.width = (100 * p).toFixed(0) + '%';
    if (sub) $('#jobSub').textContent = sub;
  },
  end() { $('#job').hidden = true; },
};
const mb = b => (b / 1048576).toFixed(0);
const onEvent = e => job.event(e);

function showError(err) {
  job.end();
  const div = document.createElement('div');
  div.className = 'err';
  div.textContent = err.message || String(err);
  $('#out').prepend(div);
  console.error(err);
}

async function run(label, fn) {
  if (S.busy) return;
  S.busy = true;
  document.querySelectorAll('.btn.primary').forEach(b => (b.disabled = true));
  $('#out').querySelectorAll('.err').forEach(e => e.remove());
  job.start(label);
  try { await fn(); job.end(); }
  catch (e) { showError(e); }
  finally {
    S.busy = false;
    document.querySelectorAll('.btn.primary').forEach(b => (b.disabled = false));
  }
}

// ---------- model helpers ----------
async function generateImages(prompt, count) {
  const blobs = await gen({ op: 'image', prompt, count }, onEvent);
  return blobs;
}

async function depthFor(blob) {
  if (depthCache.has(blob)) return depthCache.get(blob);
  const d = await gen({ op: 'depth', blob }, onEvent);
  depthCache.set(blob, d);
  return d;
}

async function speak(text, voice, speed) {
  const r = await tts({ text, voice, speed }, onEvent);
  return { samples: r.samples, rate: r.rate, text };
}

async function audioFromBlob(blob) {
  const ctx = new AudioContext();
  const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
  ctx.close();
  return { samples: buf.getChannelData(0).slice(), rate: buf.sampleRate };
}

let renderer = null;
function heroCanvas() {
  const out = $('#out');
  out.innerHTML = `<div class="hero"><canvas id="cv"></canvas><div class="acts" id="heroActs"></div></div>`;
  renderer = new MotionRenderer($('#cv'));
  return renderer;
}

async function renderVideo({ blob, motion, seconds, intensity = 1, grain = 0.03, voice, prompt }) {
  const depth = await depthFor(blob);
  const bmp = await createImageBitmap(blob);
  const r = heroCanvas();
  r.load(bmp, depth);
  job.text('Recording video…');
  const video = await r.record(motion, { intensity, grain }, seconds, voice, t => job.pct(t, `${Math.round(t * 100)}%`));
  const ext = video.type.includes('mp4') ? 'mp4' : 'webm';
  await saveItem({ kind: 'video', blob: video, prompt, motion, ext });
  showVideo(video, ext);
}

function showVideo(blob, ext) {
  const url = URL.createObjectURL(blob);
  $('#out').innerHTML = `<div class="hero"><video src="${url}" controls autoplay loop playsinline></video>
    <div class="acts"><a class="btn" href="${url}" download="placid-studio-${Date.now()}.${ext}">Download ${ext.toUpperCase()}</a>
    <button class="btn" data-go="library">Open Library</button></div></div>`;
}

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

// ---------- shared controls ----------
const motionOptions = sel => Object.entries(MOTIONS).map(([k, m]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${m.label}</option>`).join('');
const voiceOptions = () => VOICES.map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join('');
const lengthOptions = sel => [3, 5, 8, 10, 15].map(s => `<option value="${s}" ${s === sel ? 'selected' : ''}>${s} seconds</option>`).join('');

function dropZone(el, onFile) {
  const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*', hidden: true });
  el.after(input);
  const paint = () => {
    el.innerHTML = S.source ? `<img src="${S.source.url}" alt=""><span>Click to change · <a href="#" data-clear>remove</a></span>` : 'Drop an image here or click to upload';
  };
  el.onclick = e => {
    if (e.target.matches('[data-clear]')) { e.preventDefault(); e.stopPropagation(); S.source = null; paint(); onFile?.(); return; }
    input.click();
  };
  input.onchange = () => input.files[0] && set(input.files[0]);
  el.ondragover = e => { e.preventDefault(); el.classList.add('over'); };
  el.ondragleave = () => el.classList.remove('over');
  el.ondrop = e => { e.preventDefault(); el.classList.remove('over'); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) set(f); };
  function set(file) { S.source = { blob: file, url: URL.createObjectURL(file), prompt: file.name }; paint(); onFile?.(); }
  paint();
}

// ---------- panels ----------
const panels = {
  presets() {
    $('#panel').innerHTML = `
      <h1>Presets</h1>
      <p class="lede">Pick a look, describe the shot and get a finished video with camera movement and an optional voiceover.</p>
      <div class="presets">${STYLE_PRESETS.map(p => `
        <button class="preset ${p.id === S.preset.id ? 'on' : ''}" data-preset="${p.id}" style="background:linear-gradient(135deg,${p.colors[0]},${p.colors[1]})"><span>${esc(p.name)}</span></button>`).join('')}
      </div>
      <label class="f" for="prompt">Describe the shot</label>
      <textarea id="prompt" placeholder="A lighthouse on a cliff during a storm"></textarea>
      <label class="f">Or start from your own image</label>
      <div class="drop" id="drop"></div>
      <div class="row">
        <div><label class="f" for="motion">Camera</label><select id="motion">${motionOptions(S.motion)}</select></div>
        <div><label class="f" for="len">Length</label><select id="len">${lengthOptions(5)}</select></div>
      </div>
      <label class="check"><input type="checkbox" id="vo"> Add a voiceover</label>
      <div id="voBox" hidden>
        <label class="f" for="script">Voiceover script</label>
        <textarea id="script" placeholder="Where the storm meets the sea, one light keeps watch."></textarea>
        <label class="f" for="voice">Voice</label><select id="voice">${voiceOptions()}</select>
      </div>
      <button class="btn primary" id="go">Create video</button>
      <p class="note">An uploaded image is used as-is; otherwise a new image is generated from your description in the chosen style.</p>`;
    dropZone($('#drop'));
    $('#panel').querySelectorAll('[data-preset]').forEach(b => b.onclick = () => {
      S.preset = STYLE_PRESETS.find(p => p.id === b.dataset.preset);
      S.motion = S.preset.motion;
      $('#panel').querySelectorAll('.preset').forEach(x => x.classList.toggle('on', x === b));
      $('#motion').value = S.motion;
    });
    $('#motion').onchange = e => (S.motion = e.target.value);
    $('#vo').onchange = e => ($('#voBox').hidden = !e.target.checked);
    $('#go').onclick = () => {
      const text = $('#prompt').value.trim();
      if (!S.source && !text) return $('#prompt').focus();
      const wantVoice = $('#vo').checked && $('#script').value.trim();
      const seconds = +$('#len').value, motion = $('#motion').value;
      const preset = S.preset, script = $('#script').value.trim(), voiceId = $('#voice').value;
      run('Starting…', async () => {
        let blob = S.source?.blob, prompt = text || S.source?.prompt;
        if (!blob) {
          const full = `${text}, ${preset.prompt}`;
          [blob] = await generateImages(full, 1);
          await saveItem({ kind: 'image', blob, prompt: full });
          prompt = full;
        }
        let voice = null;
        if (wantVoice) {
          voice = await speak(script, voiceId, 1);
          await saveItem({ kind: 'audio', blob: toWav(voice.samples, voice.rate), prompt: script });
        }
        await renderVideo({ blob, motion, seconds, voice, prompt });
      });
    };
  },

  image() {
    $('#panel').innerHTML = `
      <h1>Image</h1>
      <p class="lede">Text to image, generated on your graphics chip.</p>
      <label class="f" for="prompt">Prompt</label>
      <textarea id="prompt" placeholder="A cosy reading nook with a window seat, rain outside"></textarea>
      <div class="row">
        <div><label class="f" for="style">Style</label><select id="style"><option value="">None</option>${STYLE_PRESETS.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></div>
        <div><label class="f" for="count">Images</label><select id="count"><option>1</option><option>2</option><option>3</option><option>4</option></select></div>
      </div>
      <button class="btn primary" id="go">Generate</button>
      <p class="note">Images come out at 384 × 384. Use Upscale 2x on any result for a sharper 768 × 768 version.</p>`;
    $('#go').onclick = () => {
      const text = $('#prompt').value.trim();
      if (!text) return $('#prompt').focus();
      const style = STYLE_PRESETS.find(p => p.id === $('#style').value);
      const prompt = style ? `${text}, ${style.prompt}` : text;
      const count = +$('#count').value;
      run('Starting…', async () => {
        const blobs = await generateImages(prompt, count);
        for (const blob of blobs) await saveItem({ kind: 'image', blob, prompt });
        $('#out').innerHTML = `<div class="grid">${blobs.map((b, i) => imageCard({ blob: b, prompt }, i)).join('')}</div>`;
        bindImageCards(blobs.map(blob => ({ blob, prompt })));
      });
    };
  },

  video() {
    $('#panel').innerHTML = `
      <h1>Video</h1>
      <p class="lede">Image to video. The scene's depth is read, then a real camera move is rendered through it.</p>
      <label class="f">Source image</label>
      <div class="drop" id="drop"></div>
      <div class="row">
        <div><label class="f" for="motion">Camera</label><select id="motion">${motionOptions(S.motion)}</select></div>
        <div><label class="f" for="len">Length</label><select id="len">${lengthOptions(5)}</select></div>
      </div>
      <label class="f" for="int">Movement strength</label>
      <input type="range" id="int" min="0.3" max="2" step="0.1" value="1">
      <label class="check"><input type="checkbox" id="grain" checked> Film grain</label>
      <label class="f" for="vsel">Voiceover</label>
      <select id="vsel"><option value="">None</option></select>
      <div class="row" style="margin-top:18px"><button class="btn" id="prev">Live preview</button></div>
      <button class="btn primary" id="go">Render video</button>`;
    dropZone($('#drop'));
    $('#motion').onchange = e => (S.motion = e.target.value);
    fillVoiceSelect($('#vsel'));
    const opts = () => ({ intensity: +$('#int').value, grain: $('#grain').checked ? 0.03 : 0 });
    $('#prev').onclick = () => {
      if (!S.source) return $('#drop').click();
      run('Preparing preview…', async () => {
        const depth = await depthFor(S.source.blob);
        const r = heroCanvas();
        r.load(await createImageBitmap(S.source.blob), depth);
        r.preview($('#motion').value, opts(), +$('#len').value);
        $('#heroActs').innerHTML = '<span class="note">Live preview. Adjust the controls, then Render video.</span>';
        for (const id of ['#motion', '#int', '#grain', '#len']) $(id).oninput = () => r.preview($('#motion').value, opts(), +$('#len').value);
      });
    };
    $('#go').onclick = () => {
      if (!S.source) return $('#drop').click();
      const motion = $('#motion').value, seconds = +$('#len').value, o = opts(), vid = $('#vsel').value;
      run('Starting…', async () => {
        let voice = null;
        if (vid === 'current') voice = S.voice;
        else if (vid) { const it = (await listItems()).find(i => i.id === vid); voice = it && await audioFromBlob(it.blob); }
        await renderVideo({ blob: S.source.blob, motion, seconds, ...o, voice, prompt: S.source.prompt });
      });
    };
  },

  voice() {
    $('#panel').innerHTML = `
      <h1>Voice</h1>
      <p class="lede">Text to speech. Runs on the processor, so it works on any device.</p>
      <label class="f" for="script">Script</label>
      <textarea id="script" placeholder="Welcome to Placid. Here's what's new this week."></textarea>
      <div class="row">
        <div><label class="f" for="voice">Voice</label><select id="voice">${voiceOptions()}</select></div>
        <div><label class="f" for="speed">Speed</label><select id="speed"><option value="0.85">Slow</option><option value="1" selected>Normal</option><option value="1.15">Fast</option></select></div>
      </div>
      <button class="btn primary" id="go">Generate voiceover</button>`;
    $('#go').onclick = () => {
      const text = $('#script').value.trim();
      if (!text) return $('#script').focus();
      const voiceId = $('#voice').value, speed = +$('#speed').value;
      run('Starting…', async () => {
        const v = await speak(text, voiceId, speed);
        S.voice = v;
        const wav = toWav(v.samples, v.rate);
        await saveItem({ kind: 'audio', blob: wav, prompt: text });
        const url = URL.createObjectURL(wav);
        $('#out').innerHTML = `<div class="hero"><div class="card"><audio src="${url}" controls autoplay></audio>
          <div class="meta"><p>${esc(text)}</p><div class="acts">
          <a class="btn sm" href="${url}" download="voiceover-${Date.now()}.wav">Download WAV</a>
          <button class="btn sm" id="useV">Use in a video</button></div></div></div></div>`;
        $('#useV').onclick = () => { setMode('video'); $('#vsel').value = 'current'; };
      });
    };
  },

  async library() {
    $('#panel').innerHTML = `
      <h1>Library</h1>
      <p class="lede">Everything you've made, stored in this browser only. Clearing site data removes it, so download anything you want to keep.</p>`;
    $('#empty').hidden = true;
    await paintLibrary();
  },
};

function imageCard(it, i) {
  const url = URL.createObjectURL(it.blob);
  return `<div class="card"><img src="${url}" alt=""><div class="meta"><p>${esc(it.prompt)}</p><div class="acts">
    <button class="btn sm" data-anim="${i}">Animate</button><button class="btn sm" data-up="${i}">Upscale 2x</button>
    <a class="btn sm" href="${url}" download="placid-image-${Date.now()}-${i}.png">Download</a>${it.id ? `<button class="btn sm danger" data-del="${it.id}">Delete</button>` : ''}</div></div></div>`;
}

function bindImageCards(items) {
  $('#out').querySelectorAll('[data-anim]').forEach(b => b.onclick = () => {
    const it = items[+b.dataset.anim];
    S.source = { blob: it.blob, url: URL.createObjectURL(it.blob), prompt: it.prompt };
    setMode('video');
  });
  $('#out').querySelectorAll('[data-up]').forEach(b => b.onclick = () => {
    const it = items[+b.dataset.up];
    run('Starting…', async () => {
      const blob = await gen({ op: 'upscale', blob: it.blob }, onEvent);
      await saveItem({ kind: 'image', blob, prompt: it.prompt + ' (2x)' });
      $('#out').innerHTML = `<div class="grid">${imageCard({ blob, prompt: it.prompt + ' (2x)' }, 0)}</div>`;
      bindImageCards([{ blob, prompt: it.prompt + ' (2x)' }]);
    });
  });
}

async function fillVoiceSelect(sel) {
  if (S.voice) sel.insertAdjacentHTML('beforeend', `<option value="current">Latest: ${esc(S.voice.text.slice(0, 40))}</option>`);
  for (const it of (await listItems()).filter(i => i.kind === 'audio'))
    sel.insertAdjacentHTML('beforeend', `<option value="${it.id}">${esc(it.prompt.slice(0, 50))}</option>`);
}

async function paintLibrary() {
  const all = await listItems();
  const items = S.libFilter === 'all' ? all : all.filter(i => i.kind === S.libFilter);
  const tabs = [['all', 'All'], ['video', 'Videos'], ['image', 'Images'], ['audio', 'Voice']]
    .map(([k, n]) => `<button data-f="${k}" class="${S.libFilter === k ? 'on' : ''}">${n} (${k === 'all' ? all.length : all.filter(i => i.kind === k).length})</button>`).join('');
  const cards = items.map((it, i) => {
    const url = URL.createObjectURL(it.blob);
    if (it.kind === 'image') return imageCard(it, i);
    const media = it.kind === 'video' ? `<video src="${url}" controls loop playsinline preload="metadata"></video>` : `<audio src="${url}" controls preload="none"></audio>`;
    const ext = it.kind === 'video' ? (it.ext || 'webm') : 'wav';
    return `<div class="card">${media}<div class="meta"><p>${esc(it.prompt)}</p><div class="acts">
      <a class="btn sm" href="${url}" download="placid-${it.kind}-${it.created}.${ext}">Download</a>
      <button class="btn sm danger" data-del="${it.id}">Delete</button></div></div></div>`;
  }).join('');
  $('#out').innerHTML = `<div class="tabs">${tabs}</div>${items.length ? `<div class="grid">${cards}</div>` : '<p class="note">Nothing here yet.</p>'}`;
  $('#out').querySelectorAll('[data-f]').forEach(b => b.onclick = () => { S.libFilter = b.dataset.f; paintLibrary(); });
  $('#out').querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { await deleteItem(b.dataset.del); paintLibrary(); });
  bindImageCards(items);
}

// ---------- navigation ----------
function setMode(mode) {
  if (S.busy) return;
  renderer?.stop();
  S.mode = mode;
  document.querySelectorAll('#rail button').forEach(b => b.classList.toggle('on', b.dataset.mode === mode));
  $('#out').innerHTML = '';
  $('#empty').hidden = mode === 'library';
  $('#job').hidden = true;
  panels[mode]();
}
$('#rail').onclick = e => { const b = e.target.closest('[data-mode]'); if (b) setMode(b.dataset.mode); };
$('#out').addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) setMode(b.dataset.go); });

// ---------- boot ----------
(async () => {
  try { S.gpu = await gen({ op: 'gpu' }); } catch {}
  const d = $('#device');
  if (S.gpu.ok) { d.textContent = 'WebGPU ready · all features available'; d.classList.add('ok'); }
  else d.textContent = 'No WebGPU: image generation off · video, voice and upload work';
})();
setMode('presets');
