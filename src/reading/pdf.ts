import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { findMap } from './maps';
import type { Issue, MagPage } from './types';
import { PAGE_WIDTH } from './types';

// Magazines added as PDF files. The file stays on this device (IndexedDB);
// pages are drawn exactly as printed, with an invisible text layer on top so
// words can be selected, looked up, highlighted and saved.

type PdfJs = typeof import('pdfjs-dist');
let lib: Promise<PdfJs> | null = null;

function pdfjs(): Promise<PdfJs> {
  lib ??= Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]).then(([m, worker]) => {
    m.GlobalWorkerOptions.workerSrc = worker.default;
    return m;
  });
  return lib;
}

// ——— File storage ———

const DB = 'english-notebook-files';
const STORE = 'pdf';

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const req = run(d.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const deleteFile = (key: string) => tx('readwrite', (s) => s.delete(key));

// ——— Documents ———

const docs = new Map<string, Promise<PDFDocumentProxy>>();
/** Files that couldn't be saved on the device: readable until the app is closed. */
const inMemory = new Map<string, ArrayBuffer>();

/** An import step that failed, with the browser's reason, so the message can say what went wrong. */
export class ImportError extends Error {
  constructor(
    public step: string,
    cause: unknown,
  ) {
    super(`${step}: ${cause instanceof Error ? `${cause.name} ${cause.message}` : String(cause)}`);
  }
}

async function step<T>(name: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (e) {
    throw new ImportError(name, e);
  }
}

export function openDoc(key: string): Promise<PDFDocumentProxy> {
  if (!docs.has(key)) {
    const p = (async () => {
      const kept = inMemory.get(key);
      const stored = kept ?? (await tx<ArrayBuffer | Blob | undefined>('readonly', (s) => s.get(key)));
      if (!stored) throw new Error('missing');
      const buf = stored instanceof Blob ? await stored.arrayBuffer() : stored;
      const m = await pdfjs();
      // pdf.js hands the bytes to its worker, so give it a copy and keep the original.
      return m.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;
    })();
    p.catch(() => docs.delete(key));
    docs.set(key, p);
  }
  return docs.get(key)!;
}

async function pageText(page: PDFPageProxy): Promise<string> {
  const content = await page.getTextContent();
  return content.items.map((i) => ('str' in i ? i.str : '')).join(' ');
}

/** Saves the file and works out its contents: a known issue's map, the PDF's own outline, or page by page. */
export async function importPdf(file: File, onStep: (text: string) => void): Promise<Issue> {
  const key = `pdf-${Date.now().toString(36)}`;
  onStep('Loading the file…');
  // Raw bytes, not the File itself: Safari on iPhone often can't keep a File in IndexedDB.
  const buf = await step('read file', () => file.arrayBuffer());
  onStep('Saving it on this device…');
  let saved = true;
  try {
    await tx('readwrite', (s) => s.put(buf, key));
  } catch {
    saved = false;
    inMemory.set(key, buf);
  }
  onStep('Reading the pages…');
  const doc = await step('open PDF', () => openDoc(key));
  const first = await step('read page 1', () => doc.getPage(1));
  const firstText = await step('read text', () => pageText(first));
  const map = findMap(doc.numPages, firstText);
  const name = file.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim();

  let pages: MagPage[];
  if (map) {
    pages = map.articles.map((a, i) => ({ id: `a${i}`, topic: a.topic, title: a.title, dek: a.dek, html: '', pdf: { from: a.from, to: a.to } }));
  } else {
    pages = await fromOutline(doc);
    if (!pages.length) {
      pages = Array.from({ length: doc.numPages }, (_, i) => ({ id: `p${i + 1}`, topic: 'Pages', title: `Page ${i + 1}`, html: '', pdf: { from: i + 1, to: i + 1 } }));
    }
  }

  onStep('Drawing the cover…');
  const thumb = await renderThumb(first).catch(() => undefined);
  return {
    id: key,
    magazine: map?.magazine ?? name,
    issue: map?.issue ?? '',
    date: map?.date ?? '',
    theme: 'mag-pdf',
    cover: map?.cover ?? { bg: '#2c2c2e', fg: '#ffffff', accent: '#ff9500' },
    pages,
    file: key,
    thumb,
    addedAt: Date.now(),
    ...(saved ? {} : { unsaved: true }),
  };
}

/** Articles from the PDF's bookmarks, when it has them. */
async function fromOutline(doc: PDFDocumentProxy): Promise<MagPage[]> {
  const outline = await doc.getOutline().catch(() => null);
  if (!outline?.length) return [];
  const starts: { title: string; page: number }[] = [];
  for (const item of outline) {
    try {
      const dest = typeof item.dest === 'string' ? await doc.getDestination(item.dest) : item.dest;
      if (!dest) continue;
      const page = (await doc.getPageIndex(dest[0])) + 1;
      starts.push({ title: item.title, page });
    } catch {
      // A broken bookmark: skip it.
    }
  }
  starts.sort((a, b) => a.page - b.page);
  return starts.map((s, i) => ({
    id: `o${i}`,
    topic: 'Contents',
    title: s.title,
    html: '',
    pdf: { from: s.page, to: Math.max(s.page, (starts[i + 1]?.page ?? doc.numPages + 1) - 1) },
  }));
}

async function renderThumb(page: PDFPageProxy): Promise<string> {
  const vp = page.getViewport({ scale: 1 });
  const scale = 240 / vp.width;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  await page.render({ canvas, viewport }).promise;
  const url = canvas.toDataURL('image/jpeg', 0.72);
  canvas.width = canvas.height = 0;
  return url;
}

// ——— Drawing pages ———

/** How much sharper than the page width the picture is drawn, so zooming in stays crisp. */
const QUALITY = 3;

export interface PageSlot {
  el: HTMLElement;
  height: number;
}

/**
 * Lays out an article's PDF pages inside `root`: an image of each page and an invisible text
 * layer that matches the printed words. Text layers come first (they are quick), so word
 * selection works while the pictures are still being drawn.
 */
export async function layoutPdf(root: HTMLElement, key: string, from: number, to: number, isCurrent: () => boolean, onText: () => void): Promise<void> {
  const m = await pdfjs();
  const doc = await openDoc(key);
  const pages: { page: PDFPageProxy; slot: HTMLElement; scale: number }[] = [];
  for (let n = from; n <= to && n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const scale = PAGE_WIDTH / base.width;
    const viewport = page.getViewport({ scale });
    const slot = document.createElement('div');
    slot.className = 'pdf-page';
    slot.style.height = `${viewport.height}px`;
    slot.dataset.page = String(n);
    const text = document.createElement('div');
    text.className = 'pdf-text';
    await buildTextLayer(m, page, viewport, text);
    if (!isCurrent()) return;
    slot.appendChild(text);
    root.appendChild(slot);
    pages.push({ page, slot, scale });
  }
  onText();
  for (const { page, slot, scale } of pages) {
    if (!isCurrent()) return;
    const viewport = page.getViewport({ scale: scale * QUALITY });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    await page.render({ canvas, viewport }).promise;
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.9));
    canvas.width = canvas.height = 0;
    if (!blob || !isCurrent()) return;
    const img = document.createElement('img');
    img.className = 'pdf-img';
    img.alt = '';
    img.draggable = false;
    img.src = URL.createObjectURL(blob);
    slot.insertBefore(img, slot.firstChild);
  }
}

let measureCtx: CanvasRenderingContext2D | null | undefined;

async function buildTextLayer(m: PdfJs, page: PDFPageProxy, viewport: ReturnType<PDFPageProxy['getViewport']>, el: HTMLElement) {
  const content = await page.getTextContent();
  const frag = document.createDocumentFragment();
  for (const item of content.items) {
    if (!('str' in item)) continue;
    if (item.str) {
      const tx = m.Util.transform(viewport.transform, item.transform);
      const angle = Math.atan2(tx[1], tx[0]);
      const size = Math.hypot(tx[2], tx[3]);
      const style = content.styles[item.fontName];
      const family = style?.fontFamily ?? 'sans-serif';
      const ascent = style?.ascent ? style.ascent : style?.descent ? 1 + style.descent : 0.8;
      const left = tx[4] + Math.sin(angle) * size * ascent;
      const top = tx[5] - Math.cos(angle) * size * ascent;
      const span = document.createElement('span');
      span.textContent = item.str;
      span.style.left = `${left.toFixed(2)}px`;
      span.style.top = `${top.toFixed(2)}px`;
      span.style.fontSize = `${size.toFixed(2)}px`;
      span.style.fontFamily = family;
      let transform = angle ? `rotate(${angle}rad)` : '';
      measureCtx ??= document.createElement('canvas').getContext('2d');
      const measure = measureCtx;
      if (measure) {
        measure.font = `${size}px ${family}`;
        const natural = measure.measureText(item.str).width;
        const target = (style?.vertical ? item.height : item.width) * viewport.scale;
        if (natural > 0 && target > 0) transform += ` scaleX(${(target / natural).toFixed(4)})`;
      }
      if (transform) span.style.transform = transform;
      frag.appendChild(span);
    }
    // Keep words on separate lines apart in the page's text.
    if (item.hasEOL) frag.appendChild(document.createTextNode('\n'));
  }
  el.appendChild(frag);
}
