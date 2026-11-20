import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  build: {
    target: 'es2022', chunkSizeWarningLimit: 650,
    rollupOptions: { output: { manualChunks(id) {
      // Shared React/CommonJS helpers must not be pulled into the optional
      // graphics chunk: the DOM and 2D fallback need to boot without Three.
      if (id.includes('commonjsHelpers') || /\/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react';
      if (/\/node_modules\/(three|@react-three\/fiber|react-reconciler)\//.test(id)) return 'three';
      if (/\/node_modules\/gsap\//.test(id)) return 'motion';
    } } },
  },
});
