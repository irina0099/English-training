import type { PDFPageProxy } from 'pdfjs-dist';
import { drawPage, makeTextLayer, openDoc } from './pdf';
import { indexText, type TextIndex } from './text';

// A PDF magazine as one column of pages, like Preview, built for iPhone:
// - scrolling is the browser's own (smooth, with momentum), not moved by script;
// - zoom changes the page width; while fingers pinch, the column is only stretched on
//   screen, and when they let go the pages are laid out again at the new size;
// - only pages near the screen get their picture and text; the rest are empty boxes.

/** Pages are measured in these units across, whatever the zoom (Markup and notes use them). */
export const UNITS = 600;
const GAP = 8;
const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;
/** Safari's limit for one canvas is about 16.7 million pixels. */
const MAX_PIXELS = 16_000_000;

interface Slot {
  el: HTMLElement;
  page: PDFPageProxy;
  /** Page size in PDF points. */
  w: number;
  h: number;
  top: number;
  height: number;
  img: HTMLImageElement | null;
  /** Picture width in device pixels, or 0 while drawing. */
  drawn: number;
  text: HTMLElement | null;
  textIndex: TextIndex | null;
  textPromise: Promise<void> | null;
  overlay: HTMLElement;
}

export class DocView {
  slots: Slot[] = [];
  zoom = 1;
  private alive = true;
  private width = 390;
  private queue = false;
  private raf = 0;
  private pinch: { startZoom: number; cx: number; cy: number } | null = null;

  constructor(
    public scroller: HTMLElement,
    public col: HTMLElement,
    private key: string,
    private onChange: () => void,
    /** Draws the learner's notes on a page (highlights, Markup); called when a page is laid out. */
    private decorate: (pg: number, overlay: HTMLElement) => void,
  ) {}

  get pageWidth() {
    return this.width * this.zoom;
  }

  async init(): Promise<void> {
    const doc = await openDoc(this.key);
    // All at once: one by one, a long issue waited for the worker hundreds of times in a row.
    const pages = await Promise.all(Array.from({ length: doc.numPages }, (_, i) => doc.getPage(i + 1)));
    if (!this.alive) return;
    for (const [i, page] of pages.entries()) {
      const n = i + 1;
      const vp = page.getViewport({ scale: 1 });
      const el = document.createElement('div');
      el.className = 'pdf-page';
      el.dataset.page = String(n);
      const overlay = document.createElement('div');
      overlay.className = 'pg-overlay';
      el.appendChild(overlay);
      this.col.appendChild(el);
      this.slots.push({ el, page, w: vp.width, h: vp.height, top: 0, height: 0, img: null, drawn: 0, text: null, textIndex: null, textPromise: null, overlay });
    }
    this.width = this.scroller.clientWidth;
    this.layout();
    this.slots.forEach((s, i) => this.decorate(i + 1, s.overlay));
    this.scroller.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onResize);
    this.bindZoom();
    this.update();
  }

  destroy() {
    this.alive = false;
    this.scroller.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onResize);
    cancelAnimationFrame(this.raf);
    for (const s of this.slots) {
      this.release(s, true);
      // Frees what pdf.js keeps for the page (its drawing instructions, its text).
      s.page.cleanup();
    }
  }

  // ——— Layout ———

  private layout() {
    const pw = this.pageWidth;
    // Pages start below the space kept for the floating header (the column's top offset).
    let top = this.col.offsetTop;
    this.col.style.width = `${pw}px`;
    // Page units in CSS pixels, for text notes and the text layer.
    this.col.style.setProperty('--pu', String(pw / UNITS));
    for (const s of this.slots) {
      s.height = (pw * s.h) / s.w;
      s.top = top;
      s.el.style.width = `${pw}px`;
      s.el.style.height = `${s.height}px`;
      s.el.style.setProperty('--total-scale-factor', String(pw / s.w));
      top += s.height + GAP;
    }
  }

  private onResize = () => {
    const w = this.scroller.clientWidth;
    if (Math.abs(w - this.width) < 1) return;
    const pg = this.pageAt(this.scroller.scrollTop + 1);
    this.width = w;
    this.layout();
    this.scrollToPage(pg);
  };

  private onScroll = () => {
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => this.update());
  };

  /** The page number at a vertical position in the column. */
  pageAt(y: number): number {
    let n = 1;
    for (let i = 0; i < this.slots.length; i++) if (this.slots[i].top <= y) n = i + 1;
    return n;
  }

  topOf(pg: number): number {
    return this.slots[pg - 1]?.top ?? 0;
  }

  bottomOf(pg: number): number {
    const s = this.slots[pg - 1];
    return s ? s.top + s.height : 0;
  }

  /** The scroll position that shows a page's top just under the floating header. */
  scrollTargetOf(pg: number): number {
    return this.topOf(pg) - this.col.offsetTop;
  }

  scrollToPage(pg: number, offset = 0) {
    this.scroller.scrollTop = this.scrollTargetOf(pg) + offset;
  }

  // ——— Drawing what's on screen ———

  private update() {
    if (!this.alive) return;
    const top = this.scroller.scrollTop;
    const h = this.scroller.clientHeight;
    const near = (s: Slot, k: number) => s.top + s.height > top - h * k && s.top < top + h * (1 + k);
    for (const s of this.slots) {
      if (near(s, 1)) void this.ensureText(s);
      else if (!near(s, 3)) this.release(s, false);
    }
    void this.drain();
    this.onChange();
  }

  /** Keeps pictures for the pages around the screen, drawn at the resolution the zoom needs. */
  private async drain() {
    if (this.queue) return;
    this.queue = true;
    try {
      for (;;) {
        if (!this.alive) return;
        const top = this.scroller.scrollTop;
        const h = this.scroller.clientHeight;
        const middle = top + h / 2;
        const want = Math.round(this.pageWidth * (window.devicePixelRatio || 1));
        const todo = this.slots
          .filter((s) => s.top + s.height > top - h * 0.5 && s.top < top + h * 1.5)
          .filter((s) => !s.drawn || Math.abs(s.drawn - Math.min(want, cap(s))) > s.drawn * 0.15)
          .sort((a, b) => Math.abs(a.top + a.height / 2 - middle) - Math.abs(b.top + b.height / 2 - middle));
        const s = todo[0];
        if (!s) return;
        const width = Math.min(want, cap(s));
        // A page that fails to draw (out of memory, a broken page) waits for the next scroll.
        const blob = await drawPage(s.page, width).catch(() => null);
        if (!this.alive || !blob) return;
        if (!s.img) {
          s.img = document.createElement('img');
          s.img.className = 'pdf-img';
          s.img.alt = '';
          s.img.draggable = false;
          s.el.insertBefore(s.img, s.el.firstChild);
        } else URL.revokeObjectURL(s.img.src);
        s.img.src = URL.createObjectURL(blob);
        s.drawn = width;
      }
    } finally {
      this.queue = false;
    }
  }

  /** The invisible text over a page, so words can be selected. */
  ensureText(s: Slot): Promise<void> {
    s.textPromise ??= (async () => {
      const text = await makeTextLayer(s.page, UNITS / s.w);
      if (!this.alive || s.textPromise === null) return;
      s.el.insertBefore(text, s.overlay);
      s.text = text;
      s.textIndex = indexText(text);
    })().catch(() => {
      s.textPromise = null;
    });
    return s.textPromise;
  }

  textOf(pg: number): Promise<TextIndex | null> {
    const s = this.slots[pg - 1];
    if (!s) return Promise.resolve(null);
    return this.ensureText(s).then(() => s.textIndex);
  }

  indexOf(pg: number): TextIndex | null {
    return this.slots[pg - 1]?.textIndex ?? null;
  }

  private release(s: Slot, all: boolean) {
    if (s.img) {
      URL.revokeObjectURL(s.img.src);
      s.img.remove();
      s.img = null;
      s.drawn = 0;
    }
    if (s.text && (all || !this.hasSelectionIn(s.text))) {
      s.text.remove();
      s.text = null;
      s.textIndex = null;
      s.textPromise = null;
    }
  }

  private hasSelectionIn(el: HTMLElement) {
    const sel = window.getSelection();
    return !!sel && sel.rangeCount > 0 && !sel.isCollapsed && el.contains(sel.getRangeAt(0).startContainer);
  }

  // ——— Zoom ———

  /** Zooms keeping the point under (clientX, clientY) in place. */
  zoomTo(zoom: number, clientX: number, clientY: number) {
    const z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
    const r = this.scroller.getBoundingClientRect();
    const fx = clientX - r.left;
    const fy = clientY - r.top;
    const pg = this.pageAt(this.scroller.scrollTop + fy);
    const s = this.slots[pg - 1];
    // Where the point is: on which page, and how far into it.
    const inX = (this.scroller.scrollLeft + fx) / this.pageWidth;
    const inY = s ? (this.scroller.scrollTop + fy - s.top) / s.height : 0;
    this.zoom = z;
    this.layout();
    this.scroller.scrollLeft = inX * this.pageWidth - fx;
    if (s) this.scroller.scrollTop = s.top + inY * s.height - fy;
    this.update();
  }

  private stretch(k: number, cx: number, cy: number) {
    const r = this.scroller.getBoundingClientRect();
    const ox = this.scroller.scrollLeft + cx - r.left;
    const oy = this.scroller.scrollTop + cy - r.top;
    this.col.style.transformOrigin = `${ox}px ${oy}px`;
    this.col.style.transform = k === 1 ? '' : `scale(${k})`;
  }

  private bindZoom() {
    const el = this.scroller;
    type GestureEvent = Event & { scale: number; clientX: number; clientY: number };
    const begin = (cx: number, cy: number) => {
      this.pinch = { startZoom: this.zoom, cx, cy };
    };
    const move = (scale: number) => {
      if (!this.pinch) return;
      const z = Math.max(MIN_ZOOM * 0.7, Math.min(MAX_ZOOM * 1.3, this.pinch.startZoom * scale));
      this.stretch(z / this.pinch.startZoom, this.pinch.cx, this.pinch.cy);
    };
    const end = (scale: number) => {
      if (!this.pinch) return;
      const { startZoom, cx, cy } = this.pinch;
      this.pinch = null;
      this.stretch(1, cx, cy);
      this.zoomTo(startZoom * scale, cx, cy);
    };
    if ('ongesturestart' in window) {
      // Safari's pinch events: two fingers, with the scale already worked out.
      let last = 1;
      el.addEventListener('gesturestart', (e) => {
        e.preventDefault();
        const g = e as GestureEvent;
        last = 1;
        begin(g.clientX, g.clientY);
      });
      el.addEventListener('gesturechange', (e) => {
        e.preventDefault();
        last = (e as GestureEvent).scale;
        move(last);
      });
      el.addEventListener('gestureend', (e) => {
        e.preventDefault();
        end((e as GestureEvent).scale || last);
      });
    } else {
      // Other browsers: work the pinch out from two touches.
      let d0 = 0;
      let last = 1;
      const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
      el.addEventListener(
        'touchstart',
        (e) => {
          if (e.touches.length !== 2) return;
          d0 = dist(e.touches);
          last = 1;
          begin((e.touches[0].clientX + e.touches[1].clientX) / 2, (e.touches[0].clientY + e.touches[1].clientY) / 2);
        },
        { passive: true },
      );
      el.addEventListener(
        'touchmove',
        (e) => {
          if (!this.pinch || e.touches.length !== 2) return;
          e.preventDefault();
          last = dist(e.touches) / d0;
          move(last);
        },
        { passive: false },
      );
      el.addEventListener('touchend', () => end(last), { passive: true });
    }
    // Trackpads and Ctrl + wheel on a computer.
    el.addEventListener(
      'wheel',
      (e) => {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        this.zoomTo(this.zoom * Math.exp(-e.deltaY / 200), e.clientX, e.clientY);
      },
      { passive: false },
    );
  }

  // ——— Positions on a page ———

  /** A point on screen as page units on its page. */
  pointOnPage(clientX: number, clientY: number): { pg: number; x: number; y: number } | null {
    for (let i = 0; i < this.slots.length; i++) {
      const r = this.slots[i].el.getBoundingClientRect();
      if (clientY >= r.top && clientY <= r.bottom) {
        const k = UNITS / r.width;
        return { pg: i + 1, x: (clientX - r.left) * k, y: (clientY - r.top) * k };
      }
    }
    return null;
  }

  /** Line boxes of a range on its page, as fractions of the page size. */
  rectsOf(pg: number, range: Range): [number, number, number, number][] {
    const s = this.slots[pg - 1];
    if (!s) return [];
    const r = s.el.getBoundingClientRect();
    return [...range.getClientRects()]
      .filter((b) => b.width > 0.5)
      .map((b) => [(b.left - r.left) / r.width, (b.top - r.top) / r.height, b.width / r.width, b.height / r.height].map((v) => Math.round(v * 10000) / 10000) as [number, number, number, number]);
  }
}

function cap(s: Slot): number {
  return Math.floor(Math.sqrt(MAX_PIXELS * (s.w / s.h)));
}

/** A saved word's place in a PDF magazine: page and character offset, packed into one number. */
export const packAt = (pg: number, offset: number) => pg * 1_000_000 + offset;
export const unpackAt = (at: number) => ({ pg: Math.floor(at / 1_000_000), offset: at % 1_000_000 });
