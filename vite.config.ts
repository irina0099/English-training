import { defineConfig } from 'vite';

export default defineConfig({
  // A name for this build: the service worker keeps each build's files in a cache of its own
  // and drops the previous one, so old versions don't pile up on the phone.
  define: { __BUILD_ID__: JSON.stringify(Date.now().toString(36)) },
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
