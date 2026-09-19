// Style presets: a prompt recipe + the camera move used when the image is animated.
export const STYLE_PRESETS = [
  { id: 'cinematic', name: 'Cinematic', motion: 'push', colors: ['#1e3a5f', '#e0a458'],
    prompt: 'cinematic film still, dramatic lighting, shallow depth of field, anamorphic lens, 35mm film' },
  { id: 'product', name: 'Product Hero', motion: 'orbit', colors: ['#f5f5f4', '#a8a29e'],
    prompt: 'studio product photography, seamless backdrop, softbox lighting, crisp detail, commercial' },
  { id: 'aerial', name: 'Aerial', motion: 'crane', colors: ['#14532d', '#fbbf24'],
    prompt: 'aerial drone photograph, sweeping wide landscape, golden hour light' },
  { id: 'neon', name: 'Neon Night', motion: 'pan', colors: ['#581c87', '#06b6d4'],
    prompt: 'neon-lit city street at night, rain reflections, moody cyberpunk atmosphere' },
  { id: 'anime', name: 'Anime', motion: 'drift', colors: ['#38bdf8', '#f9a8d4'],
    prompt: 'hand-painted anime key visual, vibrant colours, clean line art, soft clouds' },
  { id: 'noir', name: 'Film Noir', motion: 'pull', colors: ['#0a0a0a', '#d4d4d4'],
    prompt: 'black and white film noir, hard shadows, venetian blind light, 1940s' },
  { id: 'render3d', name: '3D Render', motion: 'orbit', colors: ['#fda4af', '#93c5fd'],
    prompt: '3D render, soft global illumination, clay materials, pastel colours, isometric' },
  { id: 'vintage', name: 'Vintage Film', motion: 'pull', colors: ['#92400e', '#fde68a'],
    prompt: '1970s film photograph, warm faded tones, visible film grain' },
  { id: 'fantasy', name: 'Fantasy', motion: 'vertigo', colors: ['#312e81', '#34d399'],
    prompt: 'epic fantasy concept art, volumetric light rays, detailed matte painting' },
  { id: 'watercolour', name: 'Watercolour', motion: 'drift', colors: ['#bae6fd', '#fecdd3'],
    prompt: 'delicate watercolour illustration, paper texture, soft washes of colour' },
  { id: 'food', name: 'Food', motion: 'push', colors: ['#7c2d12', '#fcd34d'],
    prompt: 'overhead food photography, natural window light, rustic wooden table' },
  { id: 'portrait', name: 'Portrait', motion: 'push', colors: ['#44403c', '#fb923c'],
    prompt: 'professional portrait photograph, 85mm lens, soft rim light, bokeh background' },
];

// Camera moves. Each returns, for t in [0,1]: zoom, parallax offset (x,y) and depth strength.
export const MOTIONS = {
  push:    { label: 'Push in',    f: t => ({ zoom: 1.08 + 0.22 * ease(t), ox: 0, oy: 0, s: 0.05 + 0.06 * ease(t) }) },
  pull:    { label: 'Pull out',   f: t => ({ zoom: 1.30 - 0.22 * ease(t), ox: 0, oy: 0, s: 0.11 - 0.06 * ease(t) }) },
  orbit:   { label: 'Orbit',      f: t => ({ zoom: 1.12, ox: Math.sin((t - 0.5) * Math.PI) * 0.06, oy: 0, s: 1 }) },
  pan:     { label: 'Pan',        f: t => ({ zoom: 1.15, ox: (ease(t) - 0.5) * 0.10, oy: 0, s: 1 }) },
  crane:   { label: 'Crane up',   f: t => ({ zoom: 1.12, ox: 0, oy: (0.5 - ease(t)) * 0.08, s: 1 }) },
  drift:   { label: 'Drift',      f: t => ({ zoom: 1.10 + 0.05 * t, ox: Math.sin(t * Math.PI * 2) * 0.025, oy: Math.cos(t * Math.PI * 2) * 0.015, s: 1 }) },
  vertigo: { label: 'Vertigo',    f: t => ({ zoom: 1.08 + 0.25 * ease(t), ox: 0, oy: 0, s: -0.04 - 0.10 * ease(t) }) },
  still:   { label: 'Still',      f: () => ({ zoom: 1.0, ox: 0, oy: 0, s: 0 }) },
};

function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

// Kokoro ships no Australian or New Zealand voice (55 voices: US, UK and other
// languages). UK reads closest to Australian ears, so those are listed first and
// marked. A real AU/NZ voice needs either your own recording ("Use my own voice")
// or a voice trained on Australian speech.
export const VOICES = [
  ['bf_emma', 'Emma (UK — closest to AU)'], ['bm_george', 'George (UK — closest to AU)'],
  ['bf_isabella', 'Isabella (UK, female)'], ['bm_lewis', 'Lewis (UK, male)'],
  ['bf_alice', 'Alice (UK, female)'], ['bm_daniel', 'Daniel (UK, male)'],
  ['af_heart', 'Heart (US, female)'], ['af_bella', 'Bella (US, female)'], ['af_nicole', 'Nicole (US, female)'],
  ['am_michael', 'Michael (US, male)'], ['am_adam', 'Adam (US, male)'],
];
