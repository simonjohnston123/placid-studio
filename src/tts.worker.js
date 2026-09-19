// Voiceover with Kokoro-82M, on the CPU (WebAssembly) so it works on any device.
import { KokoroTTS } from 'kokoro-js';

let tts = null;

self.onmessage = async ({ data: msg }) => {
  const { id, text, voice, speed } = msg;
  try {
    if (!tts) {
      tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
        dtype: 'q8', device: 'wasm',
        progress_callback: p => {
          if (p.status === 'progress') self.postMessage({ id, type: 'progress', stage: 'Voice model', file: p.file, loaded: p.loaded, total: p.total });
        },
      });
    }
    self.postMessage({ id, type: 'status', text: 'Speaking…' });
    const audio = await tts.generate(text, { voice, speed });
    const samples = audio.audio;
    self.postMessage({ id, type: 'done', result: { samples, rate: audio.sampling_rate } }, [samples.buffer]);
  } catch (e) {
    self.postMessage({ id, type: 'error', message: e?.message || String(e) });
  }
};
