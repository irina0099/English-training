import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { findMap } from './maps';
import type { Issue, MagPage } from './types';
import { PAGE_WIDTH } from './types';

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
  await p.then((d) => d.destroy()).catch(() => {});
}

export function openDoc(key: string): Promise<PDFDocumentProxy> {
  if (!docs.has(key)) {
    // One magazine open at a time: the one read before is closed (its file stays saved).
    for (const other of [...docs.keys()]) void closeDoc(other);
    const p = (async () => {
      const kept = inMemory.get(key);
      const stored = kept ?? (await tx<ArrayBuffer | Blob | undefined>('readonly', (s) => s.get(key)));
      if (!stored) throw new Error('missing');
      const buf = stored instanceof Blob ? await stored.arrayBuffer() : stored;
      const m = await pdfjs();
      // pdf.js hands the bytes to its worker, so give it a copy and keep the original.
      return m.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;
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
    if (!pages.length) {
      pages = Array.from({ length: doc.numPages }, (_, i) => ({ id: `p${i + 1}`, topic: 'Pages', title: `Page ${i + 1}`, html: '', pdf: { from: i + 1, to: i + 1 } }));
    }
  }

  onStep('Drawing the cover…');
  const cover = await saveThumb(first, key, saved).catch(() => ({}));
  return {
    id: key,
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

/** The page at the layout width (PAGE_WIDTH), the size every page is placed and its text laid at. */
const fitViewport = (page: PDFPageProxy) => page.getViewport({ scale: PAGE_WIDTH / page.getViewport({ scale: 1 }).width });

/** Safari's limit for one canvas is about 16.7 million pixels. */
const MAX_PIXELS = 16_000_000;

async function drawPage(page: PDFPageProxy, width: number): Promise<Blob | null> {
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
 * A whole magazine as one continuous column of pages, like Preview. Every page gets its
 * place and its text layer, but only the pages near the screen are drawn, so a long issue
 * fits in the phone's memory.
 */
export class PdfView {
  slots: HTMLElement[] = [];
  private pages: PDFPageProxy[] = [];
  private m: PdfJs | null = null;
  private wanted: number[] = [];
  private drawing = false;
  /** Pages that couldn't be drawn (out of memory): tried again once they come back into view. */
  private failed = new Set<number>();
  private alive = true;
  /** Picture width, in device pixels, when the page fills the screen width. */
  private baseWidth = 1200;
  private sharp: number | null = null;

  constructor(
    private root: HTMLElement,
    private key: string,
  ) {}

  /** Places every page (sizes only); returns the number of pages. */
  async layout(gap: number): Promise<number> {
    this.m = await pdfjs();
    const doc = await openDoc(this.key);
    // All at once: one by one, a long issue waited for the worker hundreds of times in a row.
    const pages = await Promise.all(Array.from({ length: doc.numPages }, (_, i) => doc.getPage(i + 1)));
    if (!this.alive) return 0;
    for (const [i, page] of pages.entries()) {
      const n = i + 1;
      const vp = fitViewport(page);
      const slot = document.createElement('div');
      slot.className = 'pdf-page';
      slot.style.height = `${vp.height}px`;
      if (n > 1) slot.style.marginTop = `${gap}px`;
      slot.dataset.page = String(n);
      this.root.appendChild(slot);
      this.slots.push(slot);
      this.pages.push(page);
    }
    return doc.numPages;
  }

  /** Builds the text layers, nearest pages first; `onDone` runs when every page has its text. */
  async buildText(first: number, onDone: () => void) {
    const order = this.slots.map((_, i) => i).sort((a, b) => Math.abs(a - (first - 1)) - Math.abs(b - (first - 1)));
    for (const i of order) {
      if (!this.alive) return;
      const page = this.pages[i];
      const vp = fitViewport(page);
      const text = document.createElement('div');
      text.className = 'pdf-text';
      try {
        await buildTextLayer(this.m!, page, vp, text);
      } catch {
        continue;
      }
      if (!this.alive) return;
      this.slots[i].appendChild(text);
      // Let the page breathe between pages: scrolling stays smooth while text is prepared.
      await new Promise((r) => setTimeout(r, 0));
    }
    onDone();
  }

  /** Draws the given pages (numbers from 1, most important first) and forgets far-away ones. */
  show(pages: number[], baseWidth: number) {
    const width = Math.round(baseWidth);
    if (width !== this.baseWidth) this.failed.clear();
    this.baseWidth = width;
    this.wanted = pages.filter((n) => n >= 1 && n <= this.slots.length);
    const keep = new Set<number>();
    for (const n of this.wanted) for (let k = n - 1; k <= n + 1; k++) keep.add(k);
    this.slots.forEach((slot, i) => {
      if (keep.has(i + 1)) return;
      this.drop(slot);
      this.failed.delete(i + 1);
    });
    void this.drain();
  }

  private drop(slot: HTMLElement) {
    const img = slot.querySelector<HTMLImageElement>('.pdf-img');
    if (!img) return;
    URL.revokeObjectURL(img.src);
    img.remove();
    delete slot.dataset.width;
    if (this.sharp === Number(slot.dataset.page)) this.sharp = null;
  }

  private async drain() {
    if (this.drawing) return;
    this.drawing = true;
    try {
      for (;;) {
        const n = this.wanted.find((k) => !this.failed.has(k) && !this.slots[k - 1]?.querySelector('.pdf-img'));
        if (!n || !this.alive) break;
        // A page that didn't draw must not be drawn again and again: that would never end.
        const ok = await this.paint(n, this.baseWidth).catch(() => false);
        if (!ok) this.failed.add(n);
      }
    } finally {
      this.drawing = false;
    }
  }

  private async paint(n: number, width: number): Promise<boolean> {
    const slot = this.slots[n - 1];
    const blob = await drawPage(this.pages[n - 1], width);
    if (!blob || !this.alive || !slot) return false;
    let img = slot.querySelector<HTMLImageElement>('.pdf-img');
    if (img) URL.revokeObjectURL(img.src);
    else {
      img = document.createElement('img');
      img.className = 'pdf-img';
      img.alt = '';
      img.draggable = false;
      slot.insertBefore(img, slot.firstChild);
    }
    img.src = URL.createObjectURL(blob);
    slot.dataset.width = String(Math.round(width));
    return true;
  }

  /**
   * Redraws one page sharper for the current zoom, like Preview once you stop zooming;
   * the page sharpened before goes back to normal, to save memory.
   */
  async sharpen(n: number, width: number) {
    if (this.sharp && this.sharp !== n) {
      const prev = this.sharp;
      this.sharp = null;
      if (Number(this.slots[prev - 1]?.dataset.width) > this.baseWidth * 1.15) await this.paint(prev, this.baseWidth).catch(() => false);
    }
    const slot = this.slots[n - 1];
    if (!slot?.querySelector('.pdf-img')) return;
    if (width <= Number(slot.dataset.width ?? 0) * 1.15) return;
    // A sharper picture is a bonus: if it can't be drawn, the normal one stays.
    if (await this.paint(n, width).catch(() => false)) this.sharp = n;
  }

  destroy() {
    this.alive = false;
    for (const slot of this.slots) this.drop(slot);
    // Frees what pdf.js keeps for each page (its drawing instructions, its text).
    for (const page of this.pages) page.cleanup();
    this.pages = [];
  }
}

/**
 * The invisible words over the page picture, placed by pdf.js's own text layer: it measures the
 * fonts it falls back to, so the selection sits on the printed words.
 */
async function buildTextLayer(m: PdfJs, page: PDFPageProxy, viewport: ReturnType<PDFPageProxy['getViewport']>, el: HTMLElement) {
  const content = await page.getTextContent();
  el.classList.add('textLayer');
  el.style.setProperty('--total-scale-factor', String(viewport.scale));
  const layer = new m.TextLayer({ textContentSource: content, container: el, viewport });
  await layer.render();
  // Line ends come out as <br>: give the page's text a space there, so the last word of
  // a line and the first word of the next don't run together.
  for (const br of el.querySelectorAll('br')) br.before(document.createTextNode(' '));
}
