import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: 'src/public',
  build: {
    outDir: path.resolve(__dirname, 'dist/frontend'), // Frontend in separatem Ordner
    emptyOutDir: true, // löscht nur den Frontend-Ordner
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, 'src/public/index.html'),
        trainer: path.resolve(__dirname, 'src/public/trainer.html'),
      }
    }
  },
  server: {
    port: 5173,
    open: true
  }
});
