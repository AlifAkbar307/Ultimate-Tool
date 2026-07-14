import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// Config disederhanakan untuk deploy statis di Vercel.
// - base '/' : app disajikan di root domain (mis. tool-hub.vercel.app)
// - tidak ada blok `server`/`preview` : itu hanya untuk dev server lokal,
//   tidak dipakai saat build production, dan dulu mewajibkan env PORT (khas Replit).
// - plugin khusus Replit (runtime-error-modal, cartographer, dev-banner) dibuang
//   karena hanya relevan di dalam environment Replit.

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // "@/..." menunjuk ke folder src (dipakai di seluruh import app)
      '@': path.resolve(import.meta.dirname, 'src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    // Output ke "dist" supaya cocok dengan default Output Directory Vercel.
    outDir: path.resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
  },
});
