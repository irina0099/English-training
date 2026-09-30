// Turns the Vite build in dist-artifact/ into one self-contained page for claude.ai:
// CSS and JS are inlined, and the document wrapper is left to the host.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'dist-artifact';
const html = readFileSync(join(dir, 'index.html'), 'utf8');
const css = [...html.matchAll(/<link rel="stylesheet"[^>]*href="\.\/(assets\/[^"]+\.css)"[^>]*>/g)].map((m) => readFileSync(join(dir, m[1]), 'utf8'));
const js = [...html.matchAll(/<script type="module"[^>]*src="\.\/(assets\/[^"]+\.js)"[^>]*><\/script>/g)].map((m) => readFileSync(join(dir, m[1]), 'utf8'));
if (!css.length || !js.length) throw new Error('Could not find built CSS/JS in dist-artifact/index.html');

const fonts = html.match(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/)?.[0] ?? '';
const page = [
  '<title>Английская тетрадь</title>',
  fonts,
  `<style>${css.join('\n')}</style>`,
  '<div id="app"></div>',
  `<script type="module">${js.join('\n').replace(/<\/script/gi, '<\\/script')}</script>`,
].join('\n');

writeFileSync(join(dir, 'english-notebook.html'), page);
console.log(`dist-artifact/english-notebook.html — ${(page.length / 1024).toFixed(0)} KB`);
