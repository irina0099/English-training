import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { detectArticles, type TextRun } from './detect';
import { findMap } from './maps';
import type { Issue, MagPage } from './types';

// Magazines added as PDF files. The file stays on this device (IndexedDB);
// pages are drawn exactly as printed, with an invisible text layer on top so
// words can be selected, looked up, highlighted and saved.

type PdfJs = typeof import('pdfjs-dist');
let lib: Promise<PdfJs> | null = null;

/**
 * pdf.js reads page text with `for await (… of stream)`. Safari (iPhone included) can't iterate
 * a ReadableStream that way yet, which broke adding a magazine there; teach it how.
 */
function streamIteration() {
  const proto = (typeof ReadableStream === 'undefined' ? null : ReadableStream.prototype) as unknown as Record<symbol, unknown> | null;
  if (!proto || proto[Symbol.asyncIterator]) return;
  proto[Symbol.asyncIterator] = async function* (this: ReadableStream) {
    const reader = this.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) return;
        yield value;
      }
    } finally {
      reader.releaseLock();
    }
  };
}

function pdfjs(): Promise<PdfJs> {
  streamIteration();
  lib ??= Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]).then(([m, worker]) => {
    m.GlobalWorkerOptions.workerSrc = worker.default;
    return m;
  });
  return lib;
}

// ——— File storage ———

const DB = 'english-notebook-files';
const STORE = 'pdf';

/** One connection for the whole app: a new one per request would pile up and block upgrades. */
let conn: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  conn ??= new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => {
      const d = req.result;
      // Another tab wants a newer version, or the browser closed it: open afresh next time.
      d.onversionchange = () => {
        d.close();
        conn = null;
      };
      d.onclose = () => (conn = null);
      resolve(d);
    };
    req.onerror = () => {
      conn = null;
      reject(req.error);
    };
  });
  return conn;
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const req = run(t.objectStore(STORE));
    // A request can succeed and its transaction still abort (Safari runs out of room at commit),
    // so the file is only saved once the whole transaction is complete.
    t.oncomplete = () => resolve(req.result);
    t.onabort = t.onerror = () => reject(t.error ?? req.error);
  });
}

/** Removes a magazine's file and its cover picture from the device and from memory. */
export async function deleteFile(key: string): Promise<void> {
  await closeDoc(key);
  inMemory.delete(key);
  await tx('readwrite', (s) => {
    s.delete(thumbKey(key));
    return s.delete(key);
  });
}

/** Cover pictures live next to their PDF, not in localStorage, where room is short. */
const thumbKey = (file: string) => `${file}#thumb`;

/** The cover picture of a magazine, as an object URL for an <img>; revoke it when done. */
export async function loadThumb(file: string): Promise<string | null> {
  const bytes = await tx<ArrayBuffer | undefined>('readonly', (s) => s.get(thumbKey(file))).catch(() => undefined);
  return bytes ? URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' })) : null;
}

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

/** Lets pdf.js free a document: its fonts and pictures take a lot of iPhone's memory. */
async function closeDoc(key: string): Promise<void> {
  const p = docs.get(key);
  if (!p) return;
  docs.delete(key);
  await p.then((d) => d.loadingTask.destroy()).catch(() => {});
}

/** The magazine's file as saved on this device. */
export async function fileBytes(key: string): Promise<ArrayBuffer> {
  const kept = inMemory.get(key);
  if (kept) return kept.slice(0);
  const stored = await tx<ArrayBuffer | Blob | undefined>('readonly', (s) => s.get(key));
  if (!stored) throw new Error('missing');
  return stored instanceof Blob ? stored.arrayBuffer() : stored;
}

export function openDoc(key: string): Promise<PDFDocumentProxy> {
  if (!docs.has(key)) {
    // One magazine open at a time: the one read before is closed (its file stays saved).
    for (const other of [...docs.keys()]) void closeDoc(other);
    const p = (async () => {
      const kept = inMemory.get(key);
      const buf = kept ? kept.slice(0) : await fileBytes(key);
      const m = await pdfjs();
      // pdf.js hands the bytes over to its worker. Bytes read from storage are a fresh copy,
      // so a large magazine isn't held in memory twice; a file kept in memory is copied.
      return m.getDocument({ data: new Uint8Array(buf) }).promise;
    })();
    p.catch(() => {
      if (docs.get(key) === p) docs.delete(key);
    });
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
  const key = `pdf-${newId()}`;
  onStep('Loading the file…');
  // Raw bytes, not the File itself: Safari on iPhone often can't keep a File in IndexedDB.
  const buf = await step('read file', () => file.arrayBuffer());
  onStep('Saving it on this device…');
  let saved = true;
  // Ask the phone to keep the app's data even when space runs low or the app isn't opened for a while.
  await navigator.storage?.persist?.().catch(() => false);
  try {
    await tx('readwrite', (s) => s.put(buf, key));
  } catch {
    saved = false;
    inMemory.set(key, buf);
  }
  try {
    return await readIssue(key, file, saved, onStep);
  } catch (e) {
    // Not a PDF, or a broken one: don't leave its bytes behind where nobody can see them.
    await deleteFile(key).catch(() => {});
    throw e;
  }
}

/** A random id; `crypto.randomUUID` needs https, which a phone testing over the local network lacks. */
function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

async function readIssue(key: string, file: File, saved: boolean, onStep: (text: string) => void): Promise<Issue> {
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
    if (!pages.length) pages = await findArticles(doc, onStep);
  }

  onStep('Drawing the cover…');
  const cover = await saveThumb(first, key, saved).catch(() => ({}));
  return {
    // The same magazine gets the same id when added again, so notes from a backup find it.
    id: slug(map ? `${map.magazine} ${map.issue}` : `${name} ${doc.numPages}`),
    magazine: map?.magazine ?? name,
    issue: map?.issue ?? '',
    date: map?.date ?? '',
    theme: 'mag-pdf',
    cover: map?.cover ?? { bg: '#2c2c2e', fg: '#ffffff', accent: '#ff9500' },
    pages,
    file: key,
    ...cover,
    addedAt: Date.now(),
    ...(saved ? {} : { unsaved: true }),
  };
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-|-$/g, '') || 'magazine';

/** Reads every page's text and finds where articles begin (see detect.ts). */
async function findArticles(doc: PDFDocumentProxy, onStep: (text: string) => void): Promise<MagPage[]> {
  const runs: TextRun[][] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    if (n % 8 === 1) onStep(`Finding the articles… page ${n} of ${doc.numPages}`);
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    runs.push(
      content.items.flatMap((it) =>
        'str' in it && it.str.trim() ? [{ str: it.str, size: Math.hypot(it.transform[2], it.transform[3]), x: it.transform[4], y: it.transform[5] }] : [],
      ),
    );
    page.cleanup();
  }
  return detectArticles(runs);
}

/** Splits a magazine added before article finding existed (it was listed page by page). */
export async function redetect(issue: Issue, onStep: (text: string) => void = () => {}): Promise<MagPage[] | null> {
  if (!issue.file) return null;
  const doc = await openDoc(issue.file);
  const pages = (await fromOutline(doc)) || [];
  return pages.length ? pages : findArticles(doc, onStep);
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

/**
 * Draws the cover small and keeps it next to the PDF. Only when the device can't store it
 * there does it go into the magazine's record as a data URL.
 */
async function saveThumb(page: PDFPageProxy, key: string, fileSaved: boolean): Promise<Pick<Issue, 'thumb' | 'thumbFile'>> {
  const viewport = page.getViewport({ scale: 240 / page.getViewport({ scale: 1 }).width });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  try {
    await page.render({ canvas, viewport }).promise;
    if (fileSaved) {
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.72));
      if (blob) {
        // Raw bytes, as for the PDF: Safari on iPhone can fail to keep a Blob in IndexedDB.
        const bytes = await blob.arrayBuffer();
        const stored = await tx('readwrite', (s) => s.put(bytes, thumbKey(key))).then(
          () => true,
          () => false,
        );
        if (stored) return { thumbFile: key };
      }
    }
    return { thumb: canvas.toDataURL('image/jpeg', 0.72) };
  } finally {
    canvas.width = canvas.height = 0;
  }
}

// ——— Drawing pages ———

/** Safari's limit for one canvas is about 16.7 million pixels. */
const MAX_PIXELS = 16_000_000;

export async function drawPage(page: PDFPageProxy, width: number): Promise<Blob | null> {
  const base = page.getViewport({ scale: 1 });
  const target = Math.min(width, Math.sqrt(MAX_PIXELS * (base.width / base.height)));
  const viewport = page.getViewport({ scale: target / base.width });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  await page.render({ canvas, viewport }).promise;
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.9));
  // Free the canvas memory right away: iPhone has a tight limit for canvases.
  canvas.width = canvas.height = 0;
  return blob;
}

/**
 * The invisible words over the page picture, placed by pdf.js's own text layer: it measures the
 * fonts it falls back to, so the selection sits on the printed words.
 */
async function buildTextLayer(m: PdfJs, page: PDFPageProxy, viewport: ReturnType<PDFPageProxy['getViewport']>, el: HTMLElement) {
  const content = await page.getTextContent();
  el.classList.add('textLayer');
  const layer = new m.TextLayer({ textContentSource: content, container: el, viewport });
  await layer.render();
  markLineWidths(el, content.items, (viewport.rawDims as { pageWidth: number }).pageWidth);
  // Line ends come out as <br>: give the page's text a space there, so the last word of
  // a line and the first word of the next don't run together.
  for (const br of el.querySelectorAll('br')) br.before(document.createTextNode(' '));
}

/**
 * Notes on each line of the text layer how wide the printed line is, as a share of the page,
 * so `fitLineWidths` can make the line exactly that wide once it is on the page.
 */
function markLineWidths(el: HTMLElement, items: Awaited<ReturnType<PDFPageProxy['getTextContent']>>['items'], pageWidth: number) {
  const runs = items.filter((i) => 'str' in i && i.str !== '') as { width: number; transform: number[] }[];
  const spans = [...el.querySelectorAll<HTMLElement>('span:not(.markedContent)')].filter((s) => s.textContent);
  if (spans.length !== runs.length || !pageWidth) return;
  spans.forEach((span, i) => {
    const { width, transform } = runs[i];
    // Straight lines only; pdf.js stretches only lines it measured (they have --scale-x).
    if (transform[1] || transform[2] || !width || !span.style.getPropertyValue('--scale-x')) return;
    span.dataset.w = String(width / pageWidth);
  });
}

/**
 * pdf.js sizes each line by measuring it on a canvas, and the page's own text rendering comes out
 * a little different, so lines ended off the printed ones and the words inside drifted with them
 * (highlights and selections sat beside the words). Once the layer is on the page, each line is
 * measured as drawn and made exactly as wide as the printed one, in two parts:
 * - letters are stretched by one factor per font and size (headlines and body text differ):
 *   the stand-in font's difference from the magazine's, from its tightest lines;
 * - what's left goes into the spaces, as in justified text, where the gaps between words widen.
 * The layer keeps one size and is only scaled when zooming (see DocView), so this runs once.
 */
export function fitLineWidths(layer: HTMLElement) {
  const own = layer.offsetWidth;
  const shown = layer.getBoundingClientRect().width;
  const total = Number(layer.style.getPropertyValue('--total-scale-factor'));
  if (!own || !shown || !total) return;
  const k = shown / own;
  const spans = [...layer.querySelectorAll<HTMLElement>('span[data-w]')];
  // All changes, then all measurements, then all changes: one layout instead of one per line.
  for (const span of spans) span.style.wordSpacing = '';
  const lines = spans.map((span) => {
    const scale = Number(span.style.getPropertyValue('--scale-x')) || 1;
    const fontHeight = parseFloat(span.style.getPropertyValue('--font-height')) || 0;
    const text = span.textContent ?? '';
    return {
      span,
      natural: span.getBoundingClientRect().width / k / scale,
      target: Number(span.dataset.w) * own,
      gaps: (text.trim().match(/ +/g) ?? []).length,
      font: fontHeight * total,
      group: `${span.style.fontFamily}|${Math.round(fontHeight * 2)}`,
    };
  });
  // The letters' factor for each font and size, from its tightest lines (least extra space).
  const factor = new Map<string, number>();
  const byGroup = new Map<string, number[]>();
  for (const l of lines) if (l.natural && l.gaps >= 3) byGroup.set(l.group, [...(byGroup.get(l.group) ?? []), l.target / l.natural]);
  for (const [g, r] of byGroup) if (r.length >= 2) factor.set(g, r.sort((a, b) => a - b)[Math.floor(r.length * 0.2)]);
  for (const l of lines) {
    if (!l.natural || !l.target) continue;
    const plain = l.target / l.natural;
    if (plain < 0.5 || plain > 2) continue;
    const letters = factor.get(l.group) ?? 0;
    const extra = letters && l.gaps ? l.target - letters * l.natural : -1;
    if (extra >= 0 && l.font) {
      // Letters by the font's factor, the rest spread over the gaps between words.
      l.span.style.setProperty('--scale-x', String(letters));
      l.span.style.wordSpacing = `${(extra / l.gaps / letters / l.font).toFixed(4)}em`;
    } else l.span.style.setProperty('--scale-x', String(plain));
  }
}

/** A text layer for one page, sized by the `--total-scale-factor` of the element it goes into. */
export async function makeTextLayer(page: PDFPageProxy, scale: number): Promise<HTMLElement> {
  const m = await pdfjs();
  const el = document.createElement('div');
  el.className = 'pdf-text';
  await buildTextLayer(m, page, page.getViewport({ scale }), el);
  return el;
}
