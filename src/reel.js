// A TikTok / Reels product video, built to what actually works there:
//
//   - the hook lands in the first second, on screen AND spoken
//   - 21-34 seconds, which is the organic sweet spot
//   - burned-in captions, because most people watch muted first
//   - the product shown early and from several angles, one cut every ~2.5s
//   - clear voice over a quiet music bed (voice + music beats music alone)
//   - price on screen, and the shop address at the end
//
// Sources for those rules are in the chat; the numbers come from TikTok's own
// seller guidance and 2026 practitioner write-ups.

const FONT = '"Segoe UI", system-ui, -apple-system, Helvetica, sans-serif';

/* ---------- music the studio writes itself ---------- */
// Generated here rather than licensed: a bed we own outright, so a video can be
// posted anywhere without a music claim. Deliberately plain — it sits under the
// voice and stays out of its way.
export async function musicBed(seconds, rate = 44100) {
  const ctx = new OfflineAudioContext(1, Math.ceil(seconds * rate), rate);
  const bpm = 104, beat = 60 / bpm, bars = Math.ceil(seconds / (beat * 4)) + 1;
  // A-minor: Am - F - C - G, the four chords under half the ads ever made.
  const chords = [[220, 261.63, 329.63], [174.61, 220, 261.63], [261.63, 329.63, 392], [196, 246.94, 293.66]];
  const master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);

  for (let bar = 0; bar < bars; bar++) {
    const t0 = bar * beat * 4;
    const chord = chords[bar % chords.length];
    // pad
    for (const f of chord) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.07, t0 + 0.35);
      g.gain.linearRampToValueAtTime(0, t0 + beat * 4);
      o.connect(g).connect(master); o.start(t0); o.stop(t0 + beat * 4 + 0.05);
    }
    // bass on the one and the three
    for (const k of [0, 2]) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = chord[0] / 2;
      g.gain.setValueAtTime(0.14, t0 + k * beat);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + k * beat + beat * 0.9);
      o.connect(g).connect(master); o.start(t0 + k * beat); o.stop(t0 + k * beat + beat);
    }
    // soft ticks on the offbeats keep it moving without competing with speech
    for (let k = 0; k < 8; k++) {
      const t = t0 + k * beat / 2;
      if (t > seconds) break;
      const len = Math.floor(rate * 0.03);
      const buf = ctx.createBuffer(1, len, rate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
      const s = ctx.createBufferSource(), g = ctx.createGain();
      s.buffer = buf; g.gain.value = k % 2 ? 0.05 : 0.09;
      s.connect(g).connect(master); s.start(t);
    }
  }
  const out = await ctx.startRendering();
  return out.getChannelData(0);
}

/** Voice at full level, music ducked underneath it. */
// A bed sits about 18-20 dB under the voice. The first version used 0.16 and
// ducked to 0.45 of that, which measured -55 dB in the pauses: inaudible.
export function mixVoiceAndMusic(voice, music, musicGain = 0.45) {
  const n = Math.max(voice.samples.length, music ? music.length : 0);
  const out = new Float32Array(n);
  out.set(voice.samples);
  if (music) {
    for (let i = 0; i < n; i++) {
      // Duck further wherever the voice is actually speaking.
      const v = Math.abs(voice.samples[i] || 0);
      out[i] += (music[i % music.length] || 0) * musicGain * (v > 0.02 ? 0.5 : 1);
    }
  }
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
  if (peak > 0.99) for (let i = 0; i < n; i++) out[i] *= 0.99 / peak;
  return { samples: out, rate: voice.rate };
}

/* ---------- captions ---------- */
/**
 * Splits the script into short on-screen chunks and times them against the
 * voice's own pauses, so the words appear roughly when they are spoken.
 * Kokoro gives no word timings, so silences are the best signal available.
 */
export function captionCues(script, voice) {
  const { samples, rate } = voice;
  const total = samples.length / rate;
  const win = Math.floor(rate * 0.03);
  const loud = [];
  for (let i = 0; i < samples.length; i += win) {
    let s = 0;
    for (let j = i; j < Math.min(samples.length, i + win); j++) s += samples[j] * samples[j];
    loud.push(Math.sqrt(s / win));
  }
  const peak = [...loud].sort((a, b) => a - b)[Math.floor(loud.length * 0.95)] || 1;
  const gate = peak * 0.06;
  // Pauses longer than ~180ms are sentence or phrase breaks.
  const gaps = [];
  let runStart = null;
  loud.forEach((v, i) => {
    if (v < gate) { if (runStart === null) runStart = i; }
    else { if (runStart !== null && (i - runStart) * 0.03 > 0.18) gaps.push(((runStart + i) / 2) * 0.03); runStart = null; }
  });

  // "Placid Deals dot com" is how it must be SPOKEN; on screen it has to read
  // placiddeals.com. The voice keeps the spoken form, the captions get the written one.
  script = writtenForm(script);

  // Break at punctuation first, then by words — a caption that ends mid-phrase
  // ("Vacuum. BLDC Motor: saves") is harder to read than one that ends on a comma.
  const phrases = script.replace(/\s+/g, ' ').trim()
    .split(/(?<=[.!?;:,])\s+/)
    .flatMap(p => {
      const w = p.split(' ');
      if (w.length <= 5) return [p];
      const out = [];
      for (let i = 0; i < w.length; i += 4) out.push(w.slice(i, i + 4).join(' '));
      // Never leave a single word stranded on its own line.
      if (out.length > 1 && out[out.length - 1].split(' ').length === 1) out[out.length - 2] += ' ' + out.pop();
      return out;
    })
    .map(p => p.trim())
    .filter(Boolean);
  const chunks = phrases;
  // Spread chunks across the audio by character weight, then snap the edges to pauses.
  const chars = chunks.map(c => c.length), sum = chars.reduce((a, b) => a + b, 0);
  const cues = [];
  let t = 0;
  chunks.forEach((text, i) => {
    const dur = (chars[i] / sum) * total;
    let end = t + dur;
    const near = gaps.find(g => Math.abs(g - end) < 0.28);
    if (near) end = near;
    cues.push({ t0: t, t1: Math.max(end, t + 0.35), text });
    t = cues[cues.length - 1].t1;
  });
  return cues;
}

/** Spoken spellings turned back into written ones for anything shown on screen. */
export function writtenForm(text) {
  return String(text || '')
    .replace(/\bplacid\s+deals\s+dot\s+com\b/gi, 'placiddeals.com')
    .replace(/\b([a-z0-9-]+)\s+dot\s+(com|com\.au|net|org|co)\b/gi, (m, a, b) => `${a}.${b}`)
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/* ---------- on-screen furniture ---------- */
function roundRect(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }

function fitText(c, text, max, weight, size, maxLines = 3) {
  let fs = size;
  for (; fs > size * 0.55; fs -= 2) {
    c.font = `${weight} ${fs}px ${FONT}`;
    const words = text.split(/\s+/), lines = [];
    let cur = '';
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (c.measureText(next).width > max && cur) { lines.push(cur); cur = w; } else cur = next;
    }
    if (cur) lines.push(cur);
    if (lines.length <= maxLines) return { fs, lines };
  }
  c.font = `${weight} ${fs}px ${FONT}`;
  return { fs, lines: [text] };
}

function drawHook(c, W, H, text, alpha) {
  if (alpha <= 0) return;
  c.save();
  c.globalAlpha = alpha;
  const pad = W * 0.07;
  const { fs, lines } = fitText(c, text.toUpperCase(), W - pad * 2, 800, Math.round(W * 0.095), 3);
  const lh = fs * 1.15, boxH = lines.length * lh + pad * 0.8;
  const y = H * 0.16;
  c.fillStyle = 'rgba(0,0,0,.55)';
  roundRect(c, pad * 0.5, y - pad * 0.4, W - pad, boxH, W * 0.035); c.fill();
  c.textBaseline = 'top'; c.textAlign = 'center';
  lines.forEach((l, i) => {
    c.fillStyle = '#fff';
    c.strokeStyle = 'rgba(0,0,0,.65)'; c.lineWidth = fs * 0.14; c.lineJoin = 'round';
    c.strokeText(l, W / 2, y + i * lh);
    c.fillText(l, W / 2, y + i * lh);
  });
  c.restore();
}

function drawCaption(c, W, H, text) {
  if (!text) return;
  c.save();
  const pad = W * 0.08;
  const { fs, lines } = fitText(c, text, W - pad * 2, 700, Math.round(W * 0.062), 2);
  const lh = fs * 1.2;
  let y = H * 0.74;
  c.textAlign = 'center'; c.textBaseline = 'top';
  for (const l of lines) {
    c.strokeStyle = 'rgba(0,0,0,.8)'; c.lineWidth = fs * 0.18; c.lineJoin = 'round';
    c.strokeText(l, W / 2, y);
    c.fillStyle = '#fff';
    c.fillText(l, W / 2, y);
    y += lh;
  }
  c.restore();
}

function drawPrice(c, W, H, price) {
  if (!price) return;
  c.save();
  const fs = Math.round(W * 0.062);
  c.font = `800 ${fs}px ${FONT}`;
  const w = c.measureText(price).width + fs * 1.1, h = fs * 1.6;
  const x = W - w - W * 0.05, y = H * 0.055;
  c.fillStyle = '#14b8a6';
  roundRect(c, x, y, w, h, h / 2); c.fill();
  c.fillStyle = '#04201d'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(price, x + w / 2, y + h / 2 + 1);
  c.restore();
}

function drawEndCard(c, W, H, { title, host, price }, alpha) {
  if (alpha <= 0) return;
  c.save();
  c.globalAlpha = alpha;
  c.fillStyle = 'rgba(8,12,16,.86)';
  c.fillRect(0, 0, W, H);
  const pad = W * 0.09;
  c.textAlign = 'center';
  const t = fitText(c, title, W - pad * 2, 800, Math.round(W * 0.085), 3);
  c.textBaseline = 'top';
  let y = H * 0.3;
  c.fillStyle = '#fff';
  t.lines.forEach((l, i) => c.fillText(l, W / 2, y + i * t.fs * 1.15));
  y += t.lines.length * t.fs * 1.15 + H * 0.02;
  if (price) {
    c.font = `800 ${Math.round(W * 0.11)}px ${FONT}`;
    c.fillStyle = '#5eead4';
    c.fillText(price, W / 2, y);
    y += W * 0.15;
  }
  c.font = `700 ${Math.round(W * 0.058)}px ${FONT}`;
  c.fillStyle = '#fff';
  c.fillText(host, W / 2, y);
  c.font = `600 ${Math.round(W * 0.042)}px ${FONT}`;
  c.fillStyle = '#9aa1ad';
  c.fillText('Link in bio', W / 2, y + W * 0.085);
  c.restore();
}

/** Everything a reel draws over the footage, as one per-frame function. */
export function reelOverlay({ hook, cues, price, title, host, seconds }) {
  const endFrom = Math.max(seconds - 2.2, seconds * 0.82);
  return (c, t) => {
    const W = c.canvas.width, H = c.canvas.height;
    drawPrice(c, W, H, price);
    // Hook: full strength for the first 2 seconds, then out by 2.6s.
    drawHook(c, W, H, hook, t < 2 ? Math.min(1, t / 0.25) : Math.max(0, 1 - (t - 2) / 0.6));
    const cue = cues.find(q => t >= q.t0 && t < q.t1);
    if (t > 2.4) drawCaption(c, W, H, cue?.text);
    drawEndCard(c, W, H, { title, host, price }, t > endFrom ? Math.min(1, (t - endFrom) / 0.5) : 0);
  };
}

/** The post text: caption plus hashtags from the product's own words. */
export function postText(card, hook) {
  const stop = new Set(['with', 'and', 'the', 'for', 'from', 'your', 'this', 'that', 'plus', 'pack', 'set', 'new']);
  const words = String(card.title).toLowerCase().match(/[a-z]{4,}/g) || [];
  const tags = [...new Set(words.filter(w => !stop.has(w)))].slice(0, 5).map(w => '#' + w);
  const base = ['#placiddeals', '#australia', '#tiktokmademebuyit'];
  return `${hook}\n\n${card.title}${card.priceLabel ? ` — ${card.priceLabel}` : ''}\n${card.url}\n\n${[...base, ...tags].join(' ')}`;
}
