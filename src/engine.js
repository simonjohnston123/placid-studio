// THE REEL ENGINE, WITHOUT THE STUDIO AROUND IT.
//
// PlacidCRM's Video maker loads this one file and gets the same reel the
// studio makes: product photos with depth-based camera moves, a spoken
// question hook, generated music, burned-in captions and the Placid Deals
// surround. Everything still runs in the visitor's browser — no GPU, no API.
//
// No DOM of its own: the caller passes a canvas and gets progress callbacks,
// so the CRM owns every pixel of its page.
import { MotionRenderer } from './motion.js';
import { productScript, hookFor, productPost, spokenAd, adReadiness, sayable } from './adcopy.js';
import { musicBed, mixVoiceAndMusic, captionCues, reelOverlay } from './reel.js';
import { VOICES } from './presets.js';
import genWorkerUrl from './gen.worker.js?worker&url';
import ttsWorkerUrl from './tts.worker.js?worker&url';

export { VOICES, hookFor, productScript, productPost, adReadiness, sayable };

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
  worker.onerror = e => {
    e.preventDefault?.();
    for (const p of pending.values()) p.reject(new Error('The video engine ran out of memory. Close other tabs and try again.'));
    pending.clear();
  };
  return (msg, onEvent) => new Promise((resolve, reject) => {
    const id = ++n;
    pending.set(id, { resolve, reject, onEvent });
    worker.postMessage({ ...msg, id });
  });
}

// The engine is served from the studio's own site and loaded by the CRM, so its
// workers live on another origin — and a browser refuses to start a worker
// from another origin. A one-line module on the page's own origin that
// imports the real worker gets round that; the import itself is plain CORS.
function spawn(url) {
  if (url.origin === self.location.origin) return new Worker(url, { type: 'module' });
  const shim = new Blob([`import ${JSON.stringify(url.href)};`], { type: 'text/javascript' });
  return new Worker(URL.createObjectURL(shim), { type: 'module' });
}

// Workers start on first use, so opening the page costs nothing.
let gen = null, tts = null;
const genW = () => (gen ??= client(spawn(new URL(genWorkerUrl, import.meta.url))));
const ttsW = () => (tts ??= client(spawn(new URL(ttsWorkerUrl, import.meta.url))));

/** Turns worker events into one plain progress call: (text, fraction|null). */
function progress(onProgress) {
  const files = new Map();
  return e => {
    if (e.type === 'progress') {
      files.set(e.file, e);
      let loaded = 0, total = 0;
      for (const f of files.values()) { loaded += f.loaded || 0; total += f.total || 0; }
      if (total) onProgress?.(`Downloading the ${e.stage.toLowerCase()} (first time only)`, loaded / total);
    } else if (e.type === 'status') { files.clear(); onProgress?.(e.text, null); }
  };
}

/**
 * Loads a product from its public page. `base` is the site that answers
 * /api/public/product-card — inside the CRM that is the CRM itself, so the
 * call is same-origin and needs no CORS at all.
 */
export async function loadProduct(link, { base = null, onProgress } = {}) {
  let u;
  try { u = new URL(link); } catch { throw new Error('Paste the whole product link, starting with https://'); }
  const origin = base || u.origin;
  const res = await fetch(`${origin}/api/public/product-card?url=${encodeURIComponent(u.href)}`);
  const card = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(card.error || `The product could not be read (${res.status}).`);
  if (!card.images?.length) throw new Error('That product has no photos to make a reel from.');
  // The card is built by whichever site answered, so inside the CRM its url
  // comes back on the CRM's host — and the reel would print placidcrm.com on
  // screen and in the caption. The shop is the link that was pasted.
  try {
    const shop = new URL(card.url);
    shop.protocol = u.protocol; shop.host = u.host;
    card.url = shop.href;
  } catch { card.url = u.href; }
  onProgress?.('Downloading product photos…', null);
  const photos = [];
  for (const src of card.images.slice(0, 5)) {
    const r = await fetch(src).catch(() => null);
    if (r?.ok) photos.push(await r.blob());
  }
  if (!photos.length) throw new Error('The product photos could not be downloaded. Try again in a minute.');
  return { card, photos };
}

const MOVES = ['push', 'orbit', 'pan', 'pull', 'crane', 'drift'];

/**
 * One finished reel. Returns { video, caption, seconds }.
 * `canvas` is drawn into while it records, so the caller can show it live.
 */
export async function makeReel({ card, photos, hook, script, voice = 'bf_emma', music = 'auto', logo = null, payments = true, canvas, onProgress, trendTerms = [] }) {
  const ev = progress(onProgress);
  const spoken = spokenAd(hook, script);

  onProgress?.('Recording the voiceover…', null);
  const v = await ttsW()({ text: spoken, voice, speed: 1 }, ev);
  const vo = { samples: v.samples, rate: v.rate, text: spoken };
  const seconds = vo.samples.length / vo.rate + 2.6;

  let bed = null;
  if (music === 'auto' || music === 'quiet') { onProgress?.('Writing the music…', null); bed = await musicBed(seconds, vo.rate); }
  const track = mixVoiceAndMusic(vo, bed, music === 'quiet' ? 0.22 : 0.45);

  const overlay = reelOverlay({
    hook, cues: captionCues(spoken, vo), price: card.priceLabel, title: card.title,
    host: new URL(card.url).host, seconds, logo: logo ? await createImageBitmap(logo) : null, payments,
  });

  // Every reel gets its own camera sequence and photo order, so a feed of
  // them doesn't look stamped out of one template. The first photo is always
  // the product's own lead image, so it's on screen from the first frame.
  const moves = [...MOVES].sort(() => Math.random() - 0.5);
  const order = [photos[0], ...photos.slice(1).sort(() => Math.random() - 0.5)];
  const shots = [];
  for (const [i, b] of order.entries()) {
    onProgress?.(`Reading the depth of photo ${i + 1} of ${photos.length}…`, null);
    shots.push({ image: await createImageBitmap(b), depth: await genW()({ op: 'depth', blob: b }, ev), motion: moves[i % moves.length] });
  }

  const r = new MotionRenderer(canvas);
  r.setFrame('vertical', null);
  const video = await r.record(shots, { intensity: 1, grain: 0.03, onFrame: overlay }, seconds, track,
    t => onProgress?.(`Recording — keep this tab open`, t));

  const post = productPost(card, hook, { trendTerms });
  return { video, caption: post.caption, hashtags: post.hashtags, hook, script, seconds };
}
