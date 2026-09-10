import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: { '/api': 'http://localhost:5000' },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        /* exceljs is large and only ever touched by Intake's import/
           template flow (utils/excel.js) — split it into its own chunk
           so it's fetched separately from (and cacheable independently
           of) Intake's own page code, rather than baked directly into
           it. */
        manualChunks: {
          exceljs: ['exceljs'],
        },
      },
    },
  },
});
