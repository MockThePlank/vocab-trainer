import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src/public',
  build: {
    outDir: '../../dist/public',
    emptyOutDir: true,
    rollupOptions: {
      input: 'src/public/vocab.html'
    }
  },
  server: {
    port: 5173,
    open: true
  }
});
