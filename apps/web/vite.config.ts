import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  // Subpath hosting (GitHub Pages serves at /GridStage/) — see
  // .github/workflows/pages.yml. Default stays '/' for dev, e2e and desktop.
  base: process.env.GRIDSTAGE_BASE ?? '/',
  plugins: [react()],
  optimizeDeps: {
    // Pre-bundle deps the dev server would otherwise optimize on demand —
    // an on-demand optimize reloads the page mid-test/mid-click.
    include: ['jspdf', 'yjs', 'y-websocket', 'three', '@react-three/fiber'],
    // onnxruntime-web must NOT be pre-bundled: it locates its .wasm files
    // via import.meta.url, which pre-bundling rewrites and breaks.
    exclude: ['onnxruntime-web'],
  },
});
