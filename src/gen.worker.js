// Image generation (Janus-Pro 1B), depth estimation (Depth Anything V2) and 2x upscaling (Swin2SR),
// all running on the visitor's device. Weights download once and are cached by the browser.
import { AutoProcessor, MultiModalityCausalLM, pipeline, RawImage, env } from '@huggingface/transformers';

env.allowLocalModels = false;

const JANUS = 'onnx-community/Janus-Pro-1B-ONNX';
const DEPTH = 'onnx-community/depth-anything-v2-small';
const UPSCALE = 'Xenova/swin2SR-classical-sr-x2-64';

let janus = null, depth = null, upscaler = null;
let gpu = null; // { ok, f16 }

async function gpuInfo() {
  if (gpu) return gpu;
  try {
    const a = await navigator.gpu?.requestAdapter();
    gpu = { ok: !!a, f16: !!a?.features.has('shader-f16') };
  } catch { gpu = { ok: false, f16: false }; }
  return gpu;
}

const progress = (id, stage) => p => {
  if (p.status === 'progress') self.postMessage({ id, type: 'progress', stage, file: p.file, loaded: p.loaded, total: p.total });
};

async function loadJanus(id) {
  if (janus) return janus;
  const g = await gpuInfo();
  if (!g.ok) throw new Error('Image generation needs WebGPU (Chrome or Edge on a computer with a graphics chip). Upload your own image instead.');
  const processor = await AutoProcessor.from_pretrained(JANUS, { progress_callback: progress(id, 'Image model') });
  const model = await MultiModalityCausalLM.from_pretrained(JANUS, {
    // ~1.5 GB total. lm_head is only used for text replies, never for images, so it takes the smallest file.
    dtype: g.f16
      ? { prepare_inputs_embeds: 'quantized', language_model: 'q4f16', lm_head: 'q4f16', gen_head: 'fp16', gen_img_embeds: 'fp16', image_decode: 'fp32' }
      : { prepare_inputs_embeds: 'quantized', language_model: 'q4', lm_head: 'q4', gen_head: 'fp32', gen_img_embeds: 'fp32', image_decode: 'fp32' },
    device: { prepare_inputs_embeds: 'wasm', language_model: 'webgpu', lm_head: 'webgpu', gen_head: 'webgpu', gen_img_embeds: 'webgpu', image_decode: 'webgpu' },
    progress_callback: progress(id, 'Image model'),
  });
  janus = { processor, model };
  return janus;
}

async function loadDepth(id) {
  if (depth) return depth;
  const g = await gpuInfo();
  depth = await pipeline('depth-estimation', DEPTH, {
    device: g.ok ? 'webgpu' : 'wasm', dtype: g.ok ? 'fp32' : 'q8', progress_callback: progress(id, 'Depth model'),
  });
  return depth;
}

async function loadUpscaler(id) {
  if (upscaler) return upscaler;
  const g = await gpuInfo();
  upscaler = await pipeline('image-to-image', UPSCALE, {
    device: g.ok ? 'webgpu' : 'wasm', dtype: g.ok ? 'fp32' : 'q8', progress_callback: progress(id, 'Upscaler'),
  });
  return upscaler;
}

async function generateImage(id, prompt, count) {
  const { processor, model } = await loadJanus(id);
  const inputs = await processor([{ role: '<|User|>', content: prompt }], { chat_template: 'text_to_image' });
  const total = processor.num_image_tokens;
  const blobs = [];
  for (let i = 0; i < count; i++) {
    let done = 0;
    const streamer = {
      put: () => { done++; if (done % 16 === 0) self.postMessage({ id, type: 'step', i, count, done, total }); },
      end: () => {},
    };
    self.postMessage({ id, type: 'status', text: `Generating image ${i + 1} of ${count}…` });
    const [img] = await model.generate_images({ ...inputs, min_new_tokens: total, max_new_tokens: total, do_sample: true, streamer });
    blobs.push(await img.toBlob('image/png'));
  }
  return blobs;
}

async function estimateDepth(id, blob) {
  const pipe = await loadDepth(id);
  self.postMessage({ id, type: 'status', text: 'Reading scene depth…' });
  const img = await RawImage.fromBlob(blob);
  const { depth: d } = await pipe(img);
  const data = d.channels === 1 ? d.data : d.grayscale().data;
  return { data: new Uint8Array(data), width: d.width, height: d.height };
}

async function upscale(id, blob) {
  const pipe = await loadUpscaler(id);
  self.postMessage({ id, type: 'status', text: 'Upscaling 2x…' });
  const out = await pipe(await RawImage.fromBlob(blob));
  const img = Array.isArray(out) ? out[0] : out;
  return img.toBlob('image/png');
}

self.onmessage = async ({ data: msg }) => {
  const { id, op } = msg;
  try {
    let result;
    if (op === 'gpu') result = await gpuInfo();
    else if (op === 'image') result = await generateImage(id, msg.prompt, msg.count ?? 1);
    else if (op === 'depth') result = await estimateDepth(id, msg.blob);
    else if (op === 'upscale') result = await upscale(id, msg.blob);
    else throw new Error('Unknown op ' + op);
    self.postMessage({ id, type: 'done', result });
  } catch (e) {
    self.postMessage({ id, type: 'error', message: e?.message || String(e) });
  }
};
