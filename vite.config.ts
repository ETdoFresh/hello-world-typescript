import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(() => ({
  root: path.resolve(__dirname, 'src', 'frontend'),
  publicDir: path.resolve(__dirname, 'public'),
  build: {
    outDir: path.resolve(__dirname, 'dist', 'client'),
    emptyOutDir: true
  },
  server: {
    middlewareMode: true
  },
  plugins: [react()]
}));
