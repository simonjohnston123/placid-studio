// Builds src/engine.js as one ES module (plus its two workers) for PlacidCRM's
// Video maker. Output: dist-engine/, copied into the CRM's public/video-engine/.
//   npx vite build --config vite.engine.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: false,
  base: './',
  worker: { format: 'es' },
  build: {
    outDir: 'dist-engine',
    emptyOutDir: true,
    target: 'es2022',
    lib: { entry: 'src/engine.js', formats: ['es'], fileName: () => 'engine.js' },
  },
});
