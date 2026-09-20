// Library: everything made is kept in the browser's own IndexedDB. Nothing leaves the device.
const DB = 'placid-studio', STORE = 'items';

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(out?.result ?? out);
    t.onerror = () => reject(t.error);
  });
}

const BRAND = 'brand-logo';
export const saveLogo = blob => tx('readwrite', s => s.put({ id: BRAND, kind: 'brand', blob, created: Date.now() }));
export const loadLogo = async () => (await tx('readonly', s => s.get(BRAND)))?.blob || null;

export const saveItem = item => tx('readwrite', s => s.put({ id: crypto.randomUUID(), created: Date.now(), ...item }));
export const deleteItem = id => tx('readwrite', s => s.delete(id));
export const listItems = async () => (await tx('readonly', s => s.getAll())).filter(i => i.kind !== 'brand').sort((a, b) => b.created - a.created);

// 16-bit mono WAV so voiceovers can be downloaded and reused.
export function toWav(samples, rate) {
  const buf = new ArrayBuffer(44 + samples.length * 2), v = new DataView(buf);
  const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 0x7fff, true);
  return new Blob([buf], { type: 'audio/wav' });
}
