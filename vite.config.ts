import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the build works from any path (GitHub Pages, a subfolder, a file server).
  base: './',
  oxc: {
    jsx: { runtime: 'automatic', importSource: 'preact' },
  },
  build: {
    target: 'es2020',
    modulePreload: false,
    rollupOptions: {
      output: {
        // Safari can refuse a worker served as .mjs; the pdf.js worker ships as .js.
        assetFileNames: (info) => (info.names?.[0]?.endsWith('.mjs') ? 'assets/[name]-[hash].js' : 'assets/[name]-[hash][extname]'),
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
