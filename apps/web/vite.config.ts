import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // jspdf is loaded lazily on first export; pre-bundle it so the dev
    // server doesn't re-optimize (and reload the page) mid-click.
    include: ['jspdf'],
  },
});
