# Placid Studio

AI images, image-to-video and voiceovers that run entirely in the visitor's browser.
No servers, no API keys, no per-generation cost. Hosted as a static site.

| Feature | How it works | Runs on |
|---|---|---|
| Presets | 12 style recipes, each with a matching camera move; one click from prompt to finished video | — |
| Text to image | Janus-Pro 1B (open weights, ONNX) | Visitor's GPU via WebGPU |
| Upscale 2x | Swin2SR | WebGPU, CPU fallback |
| Image to video | Depth Anything V2 reads scene depth; a WebGL shader renders 8 camera moves through it; recorded to MP4/WebM | GPU/CPU |
| Voiceover | Kokoro-82M, 9 voices, speed control | CPU (WebAssembly) — any device |
| Video + voice | Voiceover mixed into the rendered video | — |
| Library | Everything kept in the browser's IndexedDB | — |

Model weights are open-licence files fetched once from the Hugging Face hub and cached by the browser.
The ONNX runtime itself is bundled into this site.

```
npm install
npm run build    # outputs dist/ for GitHub Pages (base /placid-studio/)
```
