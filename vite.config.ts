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
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
