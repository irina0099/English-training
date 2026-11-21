import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { saveCustomWord } from '../engine/store';
import { createCustomWord, sameWord } from '../engine/words';
import { ISSUES_BY_ID } from '../reading/issues';
import { define, findKnown, googleTranslateUrl, lemmaCandidates, translate, type Definition } from '../reading/lookup';
import { getReading, markRead, notesOf, setLast, subscribeReading, updateNotes } from '../reading/store';
import { boxesFor, indexText, offsetAt, sentenceAround, wordAt, type Box, type TextIndex } from '../reading/text';
import { PAGE_WIDTH, type Highlight, type HighlightColor, type PageNotes, type Stroke, type TextNote, type Tool } from '../reading/types';
import { speak } from '../tts';
import type { VocabItem } from '../types';
import { Example, Modal, SpeakButton } from './common';
import { useData } from './hooks';
import { IconBack, IconChevron, IconMarkup, IconRedo, IconSpeaker, IconUndo } from './icons';

const uid = () => Math.random().toString(36).slice(2, 10);
const MAX_ZOOM = 6;
const PAD = 12;
const LONG_PRESS = 420;

interface View {
  s: number;
  x: number;
  y: number;
}

interface Selection {
  start: number;
  end: number;
  /** The highlight the selection came from, when the learner tapped one. */
  hl?: Highlight;
  /** Selected with iPhone's own selection, which shows the system menu. */
  native?: boolean;
}

type Sheet = { kind: 'lookup' | 'translate' | 'add'; text: string; sentence: string; at: number } | { kind: 'text'; note: TextNote } | null;

const COLORS: HighlightColor[] = ['yellow', 'green', 'blue', 'pink', 'underline'];
const INKS = ['#1c1c1e', '#0a62d0', '#d7263d', '#1f9d55', '#f2b705'];
const WIDTHS = { pen: [1.6, 3, 5], pencil: [1.2, 2.2, 3.4], marker: [10, 16, 24] } as const;

export function Reader({ issueId, pageId, focus, onClose }: { issueId: string; pageId: string; focus?: number; onClose: () => void }) {
  const issue = ISSUES_BY_ID[issueId];
  const [page, setPage] = useState(pageId);
  const index = Math.max(0, issue.pages.findIndex((p) => p.id === page));
  const mp = issue.pages[index];

  const d = useData();
  const [, bump] = useState(0);
  useEffect(() => subscribeReading(() => bump((x) => x + 1)), []);
  const sysMenu = getReading().menu !== 'app';
  const notes = notesOf(issueId, mp.id);

  const viewportRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const idxRef = useRef<TextIndex | null>(null);
  const [height, setHeight] = useState(800);
  const [view, setView] = useState<View>({ s: 1, x: 0, y: PAD });
  const viewRef = useRef(view);
  viewRef.current = view;
  const [fit, setFit] = useState(1);
  const [layoutTick, setLayoutTick] = useState(0);

  const [sel, setSel] = useState<Selection | null>(null);
  const [menu, setMenu] = useState<'main' | 'colors'>('main');
  const [sheet, setSheet] = useState<Sheet>(null);
  const [flash, setFlash] = useState<{ start: number; end: number } | null>(null);

  const [markup, setMarkup] = useState(false);
  const [tool, setTool] = useState<Tool>('pen');
  const [ink, setInk] = useState(INKS[0]);
  const [widthIdx, setWidthIdx] = useState(1);
  const [draft, setDraft] = useState<Stroke | null>(null);
  const history = useRef<{ undo: PageNotes[]; redo: PageNotes[] }>({ undo: [], redo: [] });

  // ——— Layout ———

  const fitView = (): View => {
    const vp = viewportRef.current;
    const W = vp?.clientWidth ?? 390;
    const s = Math.min(1.6, (W - PAD * 2) / PAGE_WIDTH);
    return { s, x: (W - PAGE_WIDTH * s) / 2, y: PAD };
  };

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    el.innerHTML = mp.html;
    idxRef.current = indexText(el);
    const measure = () => {
      const h = el.offsetHeight;
      setHeight(h);
      setLayoutTick((t) => t + 1);
    };
    measure();
    const v = fitView();
    setFit(v.s);
    setView(v);
    setSel(null);
    setMarkup(false);
    history.current = { undo: [], redo: [] };
    setLast(issueId, mp.id);
    // Web fonts change line breaks: measure again once they arrive.
    document.fonts?.ready.then(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [issueId, mp.id]);

  useEffect(() => {
    const onResize = () => {
      const v = fitView();
      setFit(v.s);
      setView(clamp(v));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [height]);

  // Jump to a word from the dictionary: zoom in on it and flash it.
  useEffect(() => {
    if (focus === undefined || page !== pageId || !idxRef.current) return;
    const w = wordAt(idxRef.current, focus);
    if (!w) return;
    const t = setTimeout(() => {
      const b = boxesFor(idxRef.current!, w.start, w.end)[0];
      const vp = viewportRef.current;
      if (!b || !vp) return;
      const s = Math.min(MAX_ZOOM, fit * 2.2);
      setView(clamp({ s, x: vp.clientWidth / 2 - (b.x + b.w / 2) * s, y: vp.clientHeight / 2.5 - (b.y + b.h / 2) * s }));
      setFlash(w);
      setTimeout(() => setFlash(null), 2200);
    }, 350);
    return () => clearTimeout(t);
  }, [layoutTick > 0, focus]);

  const clamp = (v: View, soft = false): View => {
    const vp = viewportRef.current;
    if (!vp) return v;
    const W = vp.clientWidth;
    const H = vp.clientHeight;
    const s = soft ? v.s : Math.max(fit, Math.min(MAX_ZOOM, v.s));
    const w = PAGE_WIDTH * s;
    const h = height * s;
    const x = w <= W ? (W - w) / 2 : Math.min(0, Math.max(W - w, v.x));
    const y = h + PAD * 2 <= H ? PAD : Math.min(PAD, Math.max(H - h - PAD - 64, v.y));
    return { s, x, y };
  };

  // Finishing the page: reaching its end counts as read.
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || notes.read) return;
    if (view.y + height * view.s <= vp.clientHeight + 40) markRead(issueId, mp.id);
  }, [view, height]);

  // ——— Annotations ———

  const pushHistory = () => {
    history.current.undo.push(notesOf(issueId, mp.id));
    history.current.redo = [];
  };
  const saveNotes = (patch: Partial<PageNotes>) => {
    pushHistory();
    updateNotes(issueId, mp.id, patch);
  };
  const undo = () => {
    const prev = history.current.undo.pop();
    if (!prev) return;
    history.current.redo.push(notesOf(issueId, mp.id));
    updateNotes(issueId, mp.id, prev);
  };
  const redo = () => {
    const next = history.current.redo.pop();
    if (!next) return;
    history.current.undo.push(notesOf(issueId, mp.id));
    updateNotes(issueId, mp.id, next);
  };

  const idx = idxRef.current;
  const box = (start: number, end: number): Box[] => (idx ? boxesFor(idx, start, end) : []);
  // Boxes depend on layout only; the scale cancels out.
  const hlBoxes = useMemo(() => notes.hl.map((h) => ({ h, boxes: box(h.start, h.end) })), [notes.hl, layoutTick, idx]);
  const savedBoxes = useMemo(() => {
    if (!idx) return [];
    const out: Box[] = [];
    for (const w of d.custom)
      for (const c of w.ctx ?? []) if (c.issue === issueId && c.page === mp.id && c.at !== undefined) {
        const r = wordAt(idx, c.at);
        if (r) out.push(...box(r.start, r.end));
      }
    return out;
  }, [d.custom, layoutTick, idx, mp.id]);

  const clearSel = () => {
    if (sel?.native) window.getSelection()?.removeAllRanges();
    setSel(null);
  };

  // iPhone's own selection: the system menu offers Look Up and Translate,
  // and the app adds its bar with Highlight and Add to Words.
  useEffect(() => {
    if (!sysMenu || markup) return;
    const onChange = () => {
      const s = window.getSelection();
      const el = contentRef.current;
      const ix = idxRef.current;
      if (!s || !el || !ix || s.isCollapsed || !s.rangeCount) {
        setSel((cur) => (cur?.native ? null : cur));
        return;
      }
      const r = s.getRangeAt(0);
      if (!el.contains(r.commonAncestorContainer)) return;
      const a = ix.nodes.find((n) => n.node === r.startContainer);
      const b = ix.nodes.find((n) => n.node === r.endContainer);
      if (!a || !b) return;
      const start = a.start + r.startOffset;
      const end = b.start + r.endOffset;
      if (end > start) setSel({ start, end, native: true });
    };
    document.addEventListener('selectionchange', onChange);
    return () => document.removeEventListener('selectionchange', onChange);
  }, [sysMenu, markup, mp.id]);

  const selText = sel && idx ? idx.text.slice(sel.start, sel.end) : '';
  const selBoxes = sel ? box(sel.start, sel.end) : [];

  const addHighlight = (color: HighlightColor) => {
    if (!sel || !idx) return;
    if (sel.hl) {
      saveNotes({ hl: notes.hl.map((h) => (h.id === sel.hl!.id ? { ...h, color } : h)) });
    } else {
      const overlapping = notes.hl.filter((h) => h.end > sel.start && h.start < sel.end);
      const start = Math.min(sel.start, ...overlapping.map((h) => h.start));
      const end = Math.max(sel.end, ...overlapping.map((h) => h.end));
      const kept = notes.hl.filter((h) => !overlapping.includes(h));
      saveNotes({ hl: [...kept, { id: uid(), start, end, color, text: idx.text.slice(start, end), at: Date.now() }] });
    }
    clearSel();
  };

  const removeHighlight = () => {
    if (!sel?.hl) return;
    saveNotes({ hl: notes.hl.filter((h) => h.id !== sel.hl!.id) });
    clearSel();
  };

  const openSheet = (kind: 'lookup' | 'translate' | 'add') => {
    if (!sel || !idx) return;
    setSheet({ kind, text: selText.trim(), sentence: sentenceAround(idx, sel.start, sel.end), at: sel.start });
    clearSel();
  };

  // ——— Gestures ———

  const g = useRef({
    pointers: new Map<number, { x: number; y: number }>(),
    mode: 'none' as 'none' | 'idle' | 'pan' | 'pinch' | 'select' | 'draw' | 'drag-text',
    startX: 0,
    startY: 0,
    startT: 0,
    moved: false,
    timer: 0,
    anchor: null as { start: number; end: number } | null,
    pinch: null as null | { dist: number; cx: number; cy: number; view: View },
    vel: { x: 0, y: 0, t: 0 },
    raf: 0,
    lastTap: 0,
    textId: '',
    textOffset: { x: 0, y: 0 },
  }).current;

  const toPage = (cx: number, cy: number) => {
    const r = viewportRef.current!.getBoundingClientRect();
    const v = viewRef.current;
    return { x: (cx - r.left - v.x) / v.s, y: (cy - r.top - v.y) / v.s };
  };

  const stopMomentum = () => cancelAnimationFrame(g.raf);

  const momentum = () => {
    let { x: vx, y: vy } = g.vel;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(32, now - last);
      last = now;
      vx *= Math.pow(0.94, dt / 16);
      vy *= Math.pow(0.94, dt / 16);
      const v = viewRef.current;
      setView(clamp({ ...v, x: v.x + vx * dt, y: v.y + vy * dt }));
      if (Math.hypot(vx, vy) > 0.02) g.raf = requestAnimationFrame(step);
    };
    g.raf = requestAnimationFrame(step);
  };

  const settle = () => {
    stopMomentum();
    const from = viewRef.current;
    const to = clamp(from);
    if (from.s === to.s && from.x === to.x && from.y === to.y) return;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 220);
      const e = 1 - Math.pow(1 - k, 3);
      setView({ s: from.s + (to.s - from.s) * e, x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e });
      if (k < 1) g.raf = requestAnimationFrame(step);
    };
    g.raf = requestAnimationFrame(step);
  };

  const zoomAt = (cx: number, cy: number, s: number, animate = true) => {
    const r = viewportRef.current!.getBoundingClientRect();
    const v = viewRef.current;
    const px = (cx - r.left - v.x) / v.s;
    const py = (cy - r.top - v.y) / v.s;
    const to = clamp({ s, x: cx - r.left - px * s, y: cy - r.top - py * s });
    if (!animate) return setView(to);
    stopMomentum();
    const from = v;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 260);
      const e = 1 - Math.pow(1 - k, 3);
      setView({ s: from.s + (to.s - from.s) * e, x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e });
      if (k < 1) g.raf = requestAnimationFrame(step);
    };
    g.raf = requestAnimationFrame(step);
  };

  const hitHighlight = (offset: number) => notes.hl.find((h) => offset >= h.start && offset < h.end);

  const onDown = (e: PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.callout, .text-note-input, .zoom-pill')) return;
    if (sysMenu && !markup && g.pointers.size === 0) {
      // Leave the touch to iPhone while text is selected (dragging the handles),
      // and leave mouse drags to select text on a computer.
      const s = window.getSelection();
      if ((s && !s.isCollapsed) || e.pointerType === 'mouse') {
        g.mode = 'idle';
        return;
      }
    }
    viewportRef.current!.setPointerCapture(e.pointerId);
    g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    stopMomentum();
    if (g.pointers.size === 2) {
      clearTimeout(g.timer);
      if (g.mode === 'draw') setDraft(null);
      const [a, b] = [...g.pointers.values()];
      g.mode = 'pinch';
      g.pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, view: viewRef.current };
      return;
    }
    if (g.pointers.size > 2) return;
    g.startX = e.clientX;
    g.startY = e.clientY;
    g.startT = performance.now();
    g.moved = false;
    g.vel = { x: 0, y: 0, t: g.startT };

    if (markup && tool !== 'text') {
      g.mode = 'draw';
      const p = toPage(e.clientX, e.clientY);
      if (tool === 'eraser') eraseAt(p.x, p.y, true);
      else setDraft({ id: uid(), tool, color: tool === 'marker' && ink === INKS[0] ? INKS[4] : ink, width: WIDTHS[tool][widthIdx], pts: [round(p.x), round(p.y)] });
      return;
    }
    if (markup && tool === 'text') {
      const noteEl = target.closest<HTMLElement>('[data-note]');
      if (noteEl) {
        const n = notes.texts.find((t) => t.id === noteEl.dataset.note);
        if (n) {
          const p = toPage(e.clientX, e.clientY);
          g.mode = 'drag-text';
          g.textId = n.id;
          g.textOffset = { x: p.x - n.x, y: p.y - n.y };
          pushHistory();
          return;
        }
      }
    }
    g.mode = 'pan';
    if (!markup && !sysMenu) {
      g.timer = window.setTimeout(() => {
        if (!idxRef.current) return;
        const off = offsetAt(idxRef.current, g.startX, g.startY);
        if (off === null) return;
        const w = wordAt(idxRef.current, off);
        if (!w) return;
        g.mode = 'select';
        g.anchor = w;
        setMenu('main');
        setSel(w);
        navigator.vibrate?.(8);
      }, LONG_PRESS);
    }
  };

  const onMove = (e: PointerEvent) => {
    if (!g.pointers.has(e.pointerId)) return;
    const prev = g.pointers.get(e.pointerId)!;
    g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (Math.hypot(e.clientX - g.startX, e.clientY - g.startY) > 8) {
      if (!g.moved) clearTimeout(g.timer);
      g.moved = true;
    }
    if (g.mode === 'pinch' && g.pinch && g.pointers.size >= 2) {
      const [a, b] = [...g.pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      const p0 = g.pinch.view;
      const s = Math.max(fit * 0.6, Math.min(MAX_ZOOM * 1.2, (p0.s * dist) / g.pinch.dist));
      const r = viewportRef.current!.getBoundingClientRect();
      const px = (g.pinch.cx - r.left - p0.x) / p0.s;
      const py = (g.pinch.cy - r.top - p0.y) / p0.s;
      setView({ s, x: cx - r.left - px * s, y: cy - r.top - py * s });
      return;
    }
    if (g.mode === 'select' && idxRef.current && g.anchor) {
      const off = offsetAt(idxRef.current, e.clientX, e.clientY);
      const w = off === null ? null : wordAt(idxRef.current, off);
      if (w) setSel({ start: Math.min(g.anchor.start, w.start), end: Math.max(g.anchor.end, w.end) });
      return;
    }
    if (g.mode === 'draw') {
      const p = toPage(e.clientX, e.clientY);
      if (tool === 'eraser') eraseAt(p.x, p.y, false);
      else setDraft((dr) => (dr ? { ...dr, pts: [...dr.pts, round(p.x), round(p.y)] } : dr));
      return;
    }
    if (g.mode === 'drag-text') {
      const p = toPage(e.clientX, e.clientY);
      updateNotes(issueId, mp.id, { texts: notes.texts.map((t) => (t.id === g.textId ? { ...t, x: round(p.x - g.textOffset.x), y: round(p.y - g.textOffset.y) } : t)) });
      return;
    }
    if (g.mode === 'pan' && g.moved) {
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      const now = performance.now();
      const dt = Math.max(1, now - g.vel.t);
      g.vel = { x: 0.8 * (dx / dt) + 0.2 * g.vel.x, y: 0.8 * (dy / dt) + 0.2 * g.vel.y, t: now };
      const v = viewRef.current;
      setView(clamp({ ...v, x: v.x + dx, y: v.y + dy }));
    }
  };

  const onUp = (e: PointerEvent) => {
    if (g.mode === 'idle' && !g.pointers.has(e.pointerId)) {
      g.mode = 'none';
      return;
    }
    if (!g.pointers.has(e.pointerId)) return;
    g.pointers.delete(e.pointerId);
    clearTimeout(g.timer);
    if (g.mode === 'pinch') {
      if (g.pointers.size === 0) {
        g.mode = 'none';
        settle();
      } else {
        // One finger left: keep panning from where it is.
        const [p] = [...g.pointers.values()];
        g.mode = 'pan';
        g.startX = p.x;
        g.startY = p.y;
        g.moved = true;
        g.vel = { x: 0, y: 0, t: performance.now() };
      }
      return;
    }
    const mode = g.mode;
    g.mode = 'none';
    if (mode === 'select') return;
    if (mode === 'draw') {
      if (draftRef.current && draftRef.current.pts.length >= 2) saveNotes({ strokes: [...notes.strokes, draftRef.current] });
      setDraft(null);
      return;
    }
    if (mode === 'drag-text') {
      if (!g.moved) {
        history.current.undo.pop();
        const n = notes.texts.find((t) => t.id === g.textId);
        if (n) setSheet({ kind: 'text', note: n });
      }
      return;
    }
    if (mode === 'pan' && g.moved) {
      if (performance.now() - g.vel.t < 80) momentum();
      return;
    }
    // A tap.
    const now = performance.now();
    if (markup && tool === 'text') {
      const p = toPage(e.clientX, e.clientY);
      setSheet({ kind: 'text', note: { id: uid(), x: round(p.x), y: round(p.y - 10), text: '', color: ink, size: 16 } });
      return;
    }
    if (now - g.lastTap < 300) {
      g.lastTap = 0;
      setSel(null);
      const v = viewRef.current;
      zoomAt(e.clientX, e.clientY, v.s > fit * 1.3 ? fit : fit * 2.4);
      return;
    }
    g.lastTap = now;
    if (sel) {
      setSel(null);
      return;
    }
    if (!markup && idxRef.current) {
      const off = offsetAt(idxRef.current, e.clientX, e.clientY);
      const h = off === null ? undefined : hitHighlight(off);
      if (h) {
        setMenu('main');
        setSel({ start: h.start, end: h.end, hl: h });
      }
    }
  };

  const draftRef = useRef(draft);
  draftRef.current = draft;

  const eraseAt = (x: number, y: number, first: boolean) => {
    const cur = notesOf(issueId, mp.id);
    const r = 10;
    const hit = cur.strokes.filter((s) => {
      for (let i = 0; i < s.pts.length; i += 2) if (Math.hypot(s.pts[i] - x, s.pts[i + 1] - y) < r + s.width / 2) return true;
      return false;
    });
    if (!hit.length) return;
    if (first || !g.moved) pushHistory();
    updateNotes(issueId, mp.id, { strokes: cur.strokes.filter((s) => !hit.includes(s)) });
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    stopMomentum();
    const v = viewRef.current;
    if (e.ctrlKey || e.metaKey) {
      zoomAt(e.clientX, e.clientY, Math.max(fit, Math.min(MAX_ZOOM, v.s * Math.exp(-e.deltaY / 120))), false);
    } else {
      setView(clamp({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    }
  };

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
  });

  // ——— Callout position ———

  const calloutRef = useRef<HTMLDivElement>(null);
  const [calloutW, setCalloutW] = useState(300);
  useLayoutEffect(() => {
    const w = calloutRef.current?.offsetWidth;
    if (w && Math.abs(w - calloutW) > 1) setCalloutW(w);
  });
  let callout: { left: number; top: number; below: boolean } | null = null;
  if (sel && !sel.native && selBoxes.length && viewportRef.current) {
    const first = selBoxes[0];
    const last = selBoxes[selBoxes.length - 1];
    const vw = viewportRef.current.clientWidth;
    const top = view.y + first.y * view.s;
    const bottom = view.y + (last.y + last.h) * view.s;
    const mid = view.x + ((first.x + last.x + last.w) / 2) * view.s;
    const below = top < 70;
    const half = calloutW / 2 + 8;
    callout = { left: Math.max(half, Math.min(vw - half, mid)), top: below ? bottom + 10 : top - 10, below };
  }

  const go = (delta: number) => {
    const next = issue.pages[index + delta];
    if (next) setPage(next.id);
  };

  const inStrokes = draft ? [...notes.strokes, draft] : notes.strokes;
  const zoomPct = Math.round((view.s / fit) * 100);

  return (
    <div class="reader" role="dialog" aria-label={`${issue.magazine}: ${mp.title}`}>
      <div class="reader-bar">
        <div class="reader-top">
          {markup ? (
            <>
              <span />
              <span class="reader-title">Markup</span>
              <button type="button" class="nav-btn done" onClick={() => setMarkup(false)}>
                Done
              </button>
            </>
          ) : (
            <>
              <button type="button" class="nav-back" onClick={onClose}>
                <IconBack size={22} />
                Library
              </button>
              <span class="reader-title">
                <b>{mp.topic}</b>
                <span>
                  {issue.magazine} · {index + 1} of {issue.pages.length}
                </span>
              </span>
              <button type="button" class="icon-btn reader-markup" aria-label="Markup" title="Markup" onClick={() => { setSel(null); setMarkup(true); }}>
                <IconMarkup size={21} />
              </button>
            </>
          )}
        </div>
      </div>

      <div
        class={`reader-viewport ${markup ? 'is-markup' : ''} ${sysMenu && !markup ? 'sys-select' : ''}`}
        ref={viewportRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div class="paper" ref={paperRef} style={{ width: `${PAGE_WIDTH}px`, transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})` }}>
          <div class={`mag ${issue.theme}`} ref={contentRef} />
          <div class="paper-layer" aria-hidden="true">
            {hlBoxes.map(({ h, boxes }) =>
              boxes.map((b, i) => <i key={`${h.id}-${i}`} class={`hl hl-${h.color}`} style={{ left: b.x - 1, top: b.y, width: b.w + 2, height: b.h }} />),
            )}
            {savedBoxes.map((b, i) => (
              <i key={`s${i}`} class="saved-word" style={{ left: b.x, top: b.y, width: b.w, height: b.h }} />
            ))}
            {flash && box(flash.start, flash.end).map((b, i) => <i key={`f${i}`} class="flash" style={{ left: b.x - 3, top: b.y - 2, width: b.w + 6, height: b.h + 4 }} />)}
            {!sel?.native && selBoxes.map((b, i) => (
              <i key={`sel${i}`} class="sel" style={{ left: b.x, top: b.y, width: b.w, height: b.h }} />
            ))}
          </div>
          <svg class="ink-layer" viewBox={`0 0 ${PAGE_WIDTH} ${height}`} width={PAGE_WIDTH} height={height} aria-hidden="true">
            {inStrokes.map((s) => (
              <path key={s.id} d={strokePath(s.pts)} class={`ink ink-${s.tool}`} stroke={s.color} stroke-width={s.width} />
            ))}
          </svg>
          {notes.texts.map((t) => (
            <div key={t.id} data-note={t.id} class="text-note" style={{ left: t.x, top: t.y, color: t.color, fontSize: `${t.size}px` }}>
              {t.text}
            </div>
          ))}
        </div>

        {callout && sel && (
          <div ref={calloutRef} class={`callout ${callout.below ? 'below' : ''}`} style={{ left: callout.left, top: callout.top }} role="menu">
            {menu === 'main' ? (
              <>
                <button type="button" role="menuitem" onClick={() => setMenu('colors')}>
                  Highlight
                </button>
                <button type="button" role="menuitem" onClick={() => openSheet('lookup')}>
                  Look Up
                </button>
                <button type="button" role="menuitem" onClick={() => openSheet('translate')}>
                  Translate
                </button>
                <button type="button" role="menuitem" onClick={() => openSheet('add')}>
                  Add to Words
                </button>
                <button type="button" role="menuitem" onClick={() => speak(selText)}>
                  Speak
                </button>
              </>
            ) : (
              <div class="swatches">
                {COLORS.map((c) => (
                  <button type="button" key={c} class={`swatch sw-${c}`} aria-label={c} aria-pressed={sel.hl?.color === c} onClick={() => addHighlight(c)} />
                ))}
                {sel.hl && (
                  <button type="button" class="swatch-remove" onClick={removeHighlight}>
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {!markup && zoomPct > 104 && (
          <button type="button" class="zoom-pill" onClick={() => zoomAt(window.innerWidth / 2, window.innerHeight / 2, fit)}>
            {zoomPct}% · Fit
          </button>
        )}
      </div>

      {markup ? (
        <div class="markup-bar" role="toolbar" aria-label="Markup tools">
          <div class="markup-row">
            <button type="button" class="mk-btn" onClick={undo} aria-label="Undo">
              <IconUndo size={20} />
            </button>
            <button type="button" class="mk-btn" onClick={redo} aria-label="Redo">
              <IconRedo size={20} />
            </button>
            <span class="spacer" />
            {(['pen', 'marker', 'pencil', 'eraser', 'text'] as Tool[]).map((t) => (
              <button
                type="button"
                key={t}
                class={`mk-tool mk-${t}`}
                aria-pressed={tool === t}
                aria-label={t}
                title={t}
                onClick={() => (tool === t && t !== 'eraser' && t !== 'text' ? setWidthIdx((widthIdx + 1) % 3) : setTool(t))}
              >
                <ToolGlyph tool={t} color={ink} width={t === tool ? widthIdx : 1} />
              </button>
            ))}
            <span class="spacer" />
          </div>
          <div class="markup-row inks">
            {INKS.map((c) => (
              <button type="button" key={c} class="ink-dot" style={{ background: c }} aria-label={`Colour ${c}`} aria-pressed={ink === c} onClick={() => setInk(c)} />
            ))}
            <span class="mk-hint">{tool === 'text' ? 'Tap to add text · drag to move' : tool === 'eraser' ? 'Swipe over a line to erase it' : 'Tap the tool again for thickness · two fingers to zoom'}</span>
          </div>
        </div>
      ) : sel?.native ? (
        <div class="sel-bar" role="toolbar" aria-label="Selected text">
          <div class="swatches">
            {COLORS.map((c) => (
              <button type="button" key={c} class={`swatch sw-${c}`} aria-label={`Highlight ${c}`} onClick={() => addHighlight(c)} />
            ))}
          </div>
          <button type="button" class="btn btn-sm btn-primary" onClick={() => openSheet('add')}>
            Add to Words
          </button>
          <button type="button" class="icon-btn" aria-label="Speak" onClick={() => speak(selText)}>
            <IconSpeaker size={20} />
          </button>
        </div>
      ) : (
        <div class="reader-foot">
          <button type="button" class="pager" disabled={index === 0} onClick={() => go(-1)}>
            <IconChevron size={16} style={{ transform: 'rotate(180deg)' }} />
            {issue.pages[index - 1]?.topic ?? ''}
          </button>
          <span class={`read-state ${notes.read ? 'is-read' : ''}`}>{notes.read ? 'Read ✓' : sysMenu ? 'Hold a word: Look Up, Translate' : 'Hold a word to look it up'}</span>
          <button type="button" class="pager" disabled={index === issue.pages.length - 1} onClick={() => go(1)}>
            {issue.pages[index + 1]?.topic ?? ''}
            <IconChevron size={16} />
          </button>
        </div>
      )}

      {sheet?.kind === 'lookup' && <LookupSheet text={sheet.text} sentence={sheet.sentence} onAdd={() => setSheet({ ...sheet, kind: 'add' })} onClose={() => setSheet(null)} />}
      {sheet?.kind === 'translate' && <TranslateSheet text={sheet.text} sentence={sheet.sentence} onAdd={() => setSheet({ ...sheet, kind: 'add' })} onClose={() => setSheet(null)} />}
      {sheet?.kind === 'add' && <AddWordSheet text={sheet.text} sentence={sheet.sentence} issue={issueId} page={mp.id} at={sheet.at} onClose={() => setSheet(null)} />}
      {sheet?.kind === 'text' && (
        <TextNoteSheet
          note={sheet.note}
          onSave={(n) => {
            const exists = notes.texts.some((t) => t.id === n.id);
            if (!n.text.trim()) saveNotes({ texts: notes.texts.filter((t) => t.id !== n.id) });
            else saveNotes({ texts: exists ? notes.texts.map((t) => (t.id === n.id ? n : t)) : [...notes.texts, n] });
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}

const round = (x: number) => Math.round(x * 10) / 10;

/** A smooth path through the stroke's points. */
function strokePath(pts: number[]): string {
  if (pts.length < 4) return `M${pts[0]} ${pts[1]} l0.01 0`;
  let d = `M${pts[0]} ${pts[1]}`;
  for (let i = 2; i < pts.length - 2; i += 2) {
    const mx = (pts[i] + pts[i + 2]) / 2;
    const my = (pts[i + 1] + pts[i + 3]) / 2;
    d += ` Q${pts[i]} ${pts[i + 1]} ${mx} ${my}`;
  }
  return d + ` L${pts[pts.length - 2]} ${pts[pts.length - 1]}`;
}

function ToolGlyph({ tool, color, width }: { tool: Tool; color: string; width: number }) {
  const tip = tool === 'eraser' ? '#f4a4b0' : tool === 'text' ? 'transparent' : color;
  return (
    <svg viewBox="0 0 28 52" width="24" height="44" aria-hidden="true">
      {tool === 'text' ? (
        <>
          <rect x="3" y="14" width="22" height="34" rx="5" fill="var(--card)" stroke="var(--label-3)" />
          <text x="14" y="37" text-anchor="middle" font-size="15" font-weight="700" fill="var(--label)">
            A
          </text>
        </>
      ) : (
        <>
          <path d={tool === 'marker' ? 'M7 14 h14 l-2 -10 h-10z' : tool === 'eraser' ? 'M6 16 v-8 a4 4 0 0 1 4 -4 h8 a4 4 0 0 1 4 4 v8z' : 'M9 16 L14 1 L19 16z'} fill={tip} />
          <rect x="5" y="15" width="18" height="34" rx="3" fill="var(--card)" stroke="var(--label-3)" />
          {tool !== 'eraser' && <rect x="5" y="24" width="18" height={2 + width * 2} fill={color} />}
        </>
      )}
    </svg>
  );
}

// ——— Sheets ———

function Loading() {
  return <p class="muted small">Loading…</p>;
}

function SentenceLine({ sentence, text }: { sentence: string; text: string }) {
  const i = sentence.toLowerCase().indexOf(text.toLowerCase());
  const marked = i >= 0 ? `${sentence.slice(0, i)}*${sentence.slice(i, i + text.length)}*${sentence.slice(i + text.length)}` : sentence;
  return <Example text={marked} />;
}

function KnownCard({ item }: { item: VocabItem }) {
  return (
    <div class="sheet stack-sm">
      <p class="eyebrow">{item.custom ? 'In your words' : 'In the app’s word list'}</p>
      <div class="row">
        <b>{item.en}</b>
        {item.pos && <span class="pos">{item.pos}</span>}
        <span lang="ru">{item.ru}</span>
      </div>
      {item.note && <p class="note">{item.note}</p>}
    </div>
  );
}

function LookupSheet({ text, sentence, onAdd, onClose }: { text: string; sentence: string; onAdd: () => void; onClose: () => void }) {
  const d = useData();
  const known = findKnown(text, d.custom);
  const [def, setDef] = useState<Definition | null | undefined>(undefined);
  const [error, setError] = useState(false);
  useEffect(() => {
    define(text).then(setDef, () => setError(true));
  }, [text]);
  return (
    <Modal title="Look Up" onClose={onClose}>
      <div class="row">
        <span class="word">{def?.word ?? text}</span>
        <SpeakButton text={def?.word ?? text} />
      </div>
      {def?.phonetic && <p class="muted">{def.phonetic}</p>}
      {known && <KnownCard item={known} />}
      <div class="sheet stack">
        <p class="eyebrow">Dictionary</p>
        {error ? (
          <p class="muted small">No connection to the dictionary right now.</p>
        ) : def === undefined ? (
          <Loading />
        ) : def === null ? (
          <p class="muted small">No dictionary entry for “{text}”. Try Translate.</p>
        ) : (
          def.meanings.map((m, i) => (
            <div class="stack-sm" key={i}>
              <span class="pos">{m.pos}</span>
              <ol class="defs">
                {m.defs.map((x, j) => (
                  <li key={j}>
                    {x.def}
                    {x.ex && <span class="def-ex">“{x.ex}”</span>}
                  </li>
                ))}
              </ol>
            </div>
          ))
        )}
      </div>
      <div class="sheet stack-sm">
        <p class="eyebrow">In this article</p>
        <SentenceLine sentence={sentence} text={text} />
      </div>
      <button type="button" class="btn btn-primary" onClick={onAdd}>
        Add to Words
      </button>
    </Modal>
  );
}

function useTranslation(text: string) {
  const [out, setOut] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (!text) return setOut(null);
    translate(text).then(setOut, () => setOut(null));
  }, [text]);
  return out;
}

function TranslateSheet({ text, sentence, onAdd, onClose }: { text: string; sentence: string; onAdd: () => void; onClose: () => void }) {
  const d = useData();
  const known = findKnown(text, d.custom);
  const word = useTranslation(known ? '' : text);
  const whole = useTranslation(sentence);
  return (
    <Modal title="Translate" onClose={onClose}>
      <div class="sheet stack-sm">
        <p class="eyebrow">English</p>
        <div class="row">
          <span class="word">{text}</span>
          <SpeakButton text={text} />
        </div>
        <p class="eyebrow" style={{ marginTop: '10px' }}>
          Russian
        </p>
        <p class="translation" lang="ru">
          {known ? known.ru : word === undefined ? '…' : word ?? 'No connection to the translator.'}
        </p>
      </div>
      <div class="sheet stack-sm">
        <p class="eyebrow">Sentence</p>
        <SentenceLine sentence={sentence} text={text} />
        <p class="example-ru" lang="ru">
          {whole === undefined ? '…' : whole ?? ''}
        </p>
      </div>
      <a class="link small" href={googleTranslateUrl(sentence)} target="_blank" rel="noreferrer">
        Open in Google Translate
      </a>
      <button type="button" class="btn btn-primary" onClick={onAdd}>
        Add to Words
      </button>
    </Modal>
  );
}

function AddWordSheet({ text, sentence, issue, page, at, onClose }: { text: string; sentence: string; issue: string; page: string; at: number; onClose: () => void }) {
  const d = useData();
  const known = findKnown(text, d.custom);
  const isPhrase = /\s/.test(text.trim());
  // Plurals go into the dictionary in the singular; other forms stay as met (edit if needed).
  const forms = lemmaCandidates(text);
  const plural = /[^s]s$/i.test(text) && forms.find((f) => f === text.toLowerCase().replace(/ies$/, 'y') || f === text.toLowerCase().slice(0, -1));
  const lemma = known?.en ?? (isPhrase ? text.toLowerCase() : plural || forms[0]);
  const [en, setEn] = useState(lemma);
  const [ru, setRu] = useState(known?.ru ?? '');
  const [exRu, setExRu] = useState('');
  const [saved, setSaved] = useState(false);
  const auto = useTranslation(known ? '' : text);
  const autoSentence = useTranslation(sentence);
  useEffect(() => {
    if (auto && !ru) setRu(auto.toLowerCase());
  }, [auto]);
  useEffect(() => {
    if (autoSentence && !exRu) setExRu(autoSentence);
  }, [autoSentence]);

  const mine = d.custom.find((w) => sameWord(w.en, en));
  const ctx = { text: sentence, issue, page, at };

  const save = (e: Event) => {
    e.preventDefault();
    if (!en.trim() || !ru.trim()) return;
    if (mine) {
      const others = (mine.ctx ?? []).filter((c) => c.text !== sentence);
      saveCustomWord({ ...mine, ctx: [ctx, ...others].slice(0, 8) });
    } else {
      const w = createCustomWord({ en, ru, ex: sentence, exRu, level: null });
      saveCustomWord({ ...w, ctx: [ctx] });
    }
    setSaved(true);
    setTimeout(onClose, 700);
  };

  return (
    <Modal title="Add to Words" onClose={onClose}>
      <form class="stack" onSubmit={save}>
        <div class="field">
          <label for="r-en">Word or phrase</label>
          <input id="r-en" value={en} onInput={(e) => setEn(e.currentTarget.value)} lang="en" autocomplete="off" autocapitalize="off" />
          {en.toLowerCase() !== text.toLowerCase() && <span class="hint">In the text: “{text}”. Saved in its dictionary form; edit if needed.</span>}
        </div>
        <div class="field">
          <label for="r-ru">Translation</label>
          <input id="r-ru" value={ru} onInput={(e) => setRu(e.currentTarget.value)} autocomplete="off" placeholder={auto === undefined && !known ? 'Translating…' : ''} />
        </div>
        <div class="sheet stack-sm">
          <p class="eyebrow">Sentence it came from</p>
          <SentenceLine sentence={sentence} text={text} />
          <p class="hint">The sentence is saved with the word. Practice will ask you to fill this word into it.</p>
        </div>
        <div class="field">
          <label for="r-exru">Sentence translation</label>
          <input id="r-exru" value={exRu} onInput={(e) => setExRu(e.currentTarget.value)} autocomplete="off" />
        </div>
        <button type="submit" class={`btn ${saved ? 'btn-success' : 'btn-primary'}`} disabled={!en.trim() || !ru.trim() || saved}>
          {saved ? 'Saved ✓' : mine ? 'Add this sentence to the word' : 'Save word'}
        </button>
      </form>
    </Modal>
  );
}

function TextNoteSheet({ note, onSave, onClose }: { note: TextNote; onSave: (n: TextNote) => void; onClose: () => void }) {
  const [text, setText] = useState(note.text);
  const [size, setSize] = useState(note.size);
  return (
    <Modal title={note.text ? 'Edit text' : 'Add text'} onClose={onClose}>
      <div class="field">
        <textarea class="text-note-input" value={text} onInput={(e) => setText(e.currentTarget.value)} placeholder="Your note" autofocus />
      </div>
      <div class="segmented" role="group" aria-label="Text size">
        {[12, 16, 22].map((s) => (
          <button type="button" key={s} aria-pressed={size === s} onClick={() => setSize(s)}>
            {s === 12 ? 'Small' : s === 16 ? 'Medium' : 'Large'}
          </button>
        ))}
      </div>
      <div class="row">
        {note.text && (
          <button type="button" class="btn btn-danger" style={{ flex: 1 }} onClick={() => onSave({ ...note, text: '' })}>
            Delete
          </button>
        )}
        <button type="button" class="btn btn-primary" style={{ flex: 1 }} onClick={() => onSave({ ...note, text, size })}>
          Save
        </button>
      </div>
    </Modal>
  );
}

