import { defineConfig } from 'vite';

// base is the GitHub Pages sub-path; override with BASE=/ for local or a custom domain.
export default defineConfig({
  base: process.env.BASE ?? (process.env.CUSTOM_DOMAIN ? '/' : '/placid-studio/'),
  worker: { format: 'es' },
  optimizeDeps: { exclude: ['@huggingface/transformers', 'kokoro-js'] },
  build: { target: 'es2022' },
});
