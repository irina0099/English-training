import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { DocView, packAt, UNITS, unpackAt } from '../reading/docview';
import { getIssue, markPageRead, markRead, notesOf, seenPages, setLast, setPlace, subscribeReading, updateNotes, type Place } from '../reading/store';
import { rangeFor, sentenceAround, wordAt } from '../reading/text';
import type { Highlight, HighlightColor, PageNotes, Stroke, TextNote, Tool } from '../reading/types';
import { speak } from '../tts';
import { Modal } from './common';
import { IconBack, IconCheck, IconChevron, IconList, IconMarkup, IconMore, IconRedo, IconShare, IconSpeaker, IconUndo } from './icons';
import { SaveCopy } from './Library';
import { AddWordSheet, COLORS, INKS, LookupSheet, round, strokePath, TextNoteSheet, ToolGlyph, TranslateSheet, uid, WIDTHS } from './Reader';

// The reader for magazines added as PDF: one continuous column of pages, like Preview.
// Pages, pictures and notes on them are handled by DocView outside of Preact, so
// scrolling never waits for a re-render.

const UNIT = 'pages';

interface PageSel {
  pg: number;
  start: number;
  end: number;
  rects: [number, number, number, number][];
}

type Sheet = { kind: 'lookup' | 'translate' | 'add'; text: string; sentence: string; at: number } | { kind: 'text'; note: TextNote } | null;

export function DocReader({ issueId, pageId, focus, at, onClose }: { issueId: string; pageId: string; focus?: number; at?: Place; onClose: () => void }) {
  const issue = getIssue(issueId)!;
  const order = useMemo(() => issue.pages.slice().sort((a, b) => (a.pdf?.from ?? 0) - (b.pdf?.from ?? 0)), [issue]);
  const [article, setArticle] = useState(pageId);
  const index = Math.max(0, order.findIndex((p) => p.id === article));
  const mp = order[index];

  const [, bump] = useState(0);
  useEffect(() => subscribeReading(() => bump((x) => x + 1)), []);
  const notes = notesOf(issueId, UNIT);
  const notesRef = useRef(notes);
  notesRef.current = notes;

  const scrollerRef = useRef<HTMLDivElement>(null);
  const colRef = useRef<HTMLDivElement>(null);
  const dvRef = useRef<DocView | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const userScrolled = useRef(false);

  const [sel, setSel] = useState<PageSel | null>(null);
  const [hlSel, setHlSel] = useState<Highlight | null>(null);
  const [barColors, setBarColors] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);

  const [markup, setMarkup] = useState(false);
  const [tool, setTool] = useState<Tool>('pen');
  const [ink, setInk] = useState(INKS[0]);
  const [widthIdx, setWidthIdx] = useState(1);
  const history = useRef<{ undo: PageNotes[]; redo: PageNotes[] }>({ undo: [], redo: [] });

  // ——— Notes drawn on the pages ———

  const decorate = (pg: number, overlay: HTMLElement) => {
    const dv = dvRef.current;
    const slot = dv?.slots[pg - 1];
    const n = notesRef.current;
    overlay.textContent = '';
    for (const h of n.hl)
      if (h.pg === pg)
        for (const [x, y, w, hh] of h.rects ?? []) {
          const i = document.createElement('i');
          i.className = `hl hl-${h.color}`;
          i.style.cssText = `left:${x * 100}%;top:${y * 100}%;width:${w * 100}%;height:${hh * 100}%`;
          overlay.appendChild(i);
        }
    const strokes = n.strokes.filter((s) => s.pg === pg);
    const heightUnits = slot ? (UNITS * slot.h) / slot.w : UNITS;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'ink-layer');
    svg.setAttribute('viewBox', `0 0 ${UNITS} ${heightUnits}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    for (const s of strokes) svg.appendChild(pathFor(s));
    overlay.appendChild(svg);
    for (const t of n.texts)
      if (t.pg === pg) {
        const div = document.createElement('div');
        div.className = 'text-note';
        div.dataset.note = t.id;
        div.textContent = t.text;
        div.style.cssText = `left:${(t.x / UNITS) * 100}%;top:${(t.y / heightUnits) * 100}%;color:${t.color};font-size:calc(var(--pu) * ${t.size}px)`;
        overlay.appendChild(div);
      }
  };

  useEffect(() => {
    const dv = dvRef.current;
    if (!dv || !ready) return;
    dv.slots.forEach((s, i) => decorate(i + 1, s.overlay));
  }, [notes, ready]);

  // ——— Opening ———

  useEffect(() => {
    const scroller = scrollerRef.current;
    const col = colRef.current;
    if (!scroller || !col || !issue.file) return;
    const dv = new DocView(scroller, col, issue.file, () => onScrolled(), (pg, overlay) => decorate(pg, overlay));
    dvRef.current = dv;
    dv.init()
      .then(async () => {
        setReady(true);
        const target = focus !== undefined ? unpackAt(focus) : null;
        if (target && target.pg) {
          dv.scrollToPage(target.pg);
          const idx = await dv.textOf(target.pg);
          const w = idx && wordAt(idx, target.offset);
          const r = w && rangeFor(idx, w.start, w.end);
          if (r) {
            const [rect] = dv.rectsOf(target.pg, r);
            const slot = dv.slots[target.pg - 1];
            if (rect) {
              scroller.scrollTop = slot.top + rect[1] * slot.height - scroller.clientHeight * 0.4;
              flash(slot.overlay, rect);
            }
          }
        } else if (at && dv.slots[at.pg - 1]) {
          // Back where reading stopped, or on the page chosen in the contents.
          dv.scrollToPage(at.pg, at.y * dv.slots[at.pg - 1].height);
        } else dv.scrollToPage(mp.pdf?.from ?? 1);
      })
      .catch(() => setError(true));
    const mark = () => (userScrolled.current = true);
    scroller.addEventListener('touchstart', mark, { passive: true });
    scroller.addEventListener('wheel', mark, { passive: true });
    return () => {
      clearTimeout(placeTimer.current);
      savePlace();
      dv.destroy();
      dvRef.current = null;
      scroller.removeEventListener('touchstart', mark);
      scroller.removeEventListener('wheel', mark);
    };
  }, [issueId]);

  /** Called by DocView after scrolling or zooming settles on a frame. */
  const onScrolled = () => {
    const dv = dvRef.current;
    const scroller = scrollerRef.current;
    if (!dv || !scroller) return;
    setZoomed(dv.zoom > 1.05);
    const middle = dv.pageAt(scroller.scrollTop + scroller.clientHeight / 2);
    const here = [...order].reverse().find((a) => (a.pdf?.from ?? 1) <= middle) ?? order[0];
    setArticle(here.id);
    setLast(issueId, here.id);
    // The place is saved once scrolling stops: saving on every frame would slow it down.
    clearTimeout(placeTimer.current);
    placeTimer.current = window.setTimeout(savePlace, 400);
  };

  /** Remembers the page at the top of the screen and how far down it, to open there next time. */
  const placeTimer = useRef(0);
  const savePlace = () => {
    const dv = dvRef.current;
    const scroller = scrollerRef.current;
    if (!dv || !scroller || !dv.slots.length) return;
    const y = scroller.scrollTop + dv.col.offsetTop;
    const pg = dv.pageAt(y + 1);
    const slot = dv.slots[pg - 1];
    setPlace(issueId, { pg, y: slot.height ? (y - slot.top) / slot.height : 0 });
  };

  // ——— Pages read (they move the climb up) ———
  // A page counts as read after about 6 seconds well in view, once its bottom edge has
  // been on screen: flicking past doesn't count, reading does.
  const dwell = useRef(new Map<number, number>());
  const sawBottom = useRef(new Set<number>());
  useEffect(() => {
    if (!ready) return;
    const tick = window.setInterval(() => {
      const dv = dvRef.current;
      const sc = scrollerRef.current;
      if (!dv || !sc || document.hidden || markup) return;
      const top = sc.scrollTop;
      const H = sc.clientHeight;
      dv.slots.forEach((s, i) => {
        const pg = i + 1;
        const shown = Math.min(s.top + s.height, top + H) - Math.max(s.top, top);
        if (shown <= 0) return;
        if (s.top + s.height <= top + H + 4) sawBottom.current.add(pg);
        // "Well in view": a third of the screen, or most of the page when zoomed out.
        if (shown < Math.min(H * 0.33, s.height * 0.6)) return;
        const t = (dwell.current.get(pg) ?? 0) + 1;
        dwell.current.set(pg, t);
        if (t >= 6 && sawBottom.current.has(pg) && userScrolled.current) {
          markPageRead(issueId, pg);
          // An article is read when all its pages are.
          const art = order.find((a) => a.pdf && pg >= a.pdf.from && pg <= a.pdf.to);
          if (art?.pdf) {
            const seen = new Set([...seenPages(issueId), pg]);
            let all = true;
            for (let k = art.pdf.from; k <= art.pdf.to; k++) if (!seen.has(k)) all = false;
            if (all) markRead(issueId, art.id);
          }
        }
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [ready, markup]);

  const go = (delta: number) => {
    const next = order[index + delta];
    const dv = dvRef.current;
    if (!next || !dv) return;
    scrollerRef.current?.scrollTo({ top: dv.scrollTargetOf(next.pdf?.from ?? 1), behavior: 'smooth' });
  };

  // ——— Selection: iPhone's own, with the app's bar below ———

  const collapseTimer = useRef(0);
  useEffect(() => {
    if (markup) return;
    const onChange = () => {
      const s = window.getSelection();
      const col = colRef.current;
      const dv = dvRef.current;
      if (!s || !col || !dv || s.isCollapsed || !s.rangeCount) {
        clearTimeout(collapseTimer.current);
        collapseTimer.current = window.setTimeout(() => setSel(null), 450);
        return;
      }
      const r = s.getRangeAt(0);
      if (!col.contains(r.commonAncestorContainer)) return;
      const slotEl = (r.startContainer.parentElement ?? null)?.closest<HTMLElement>('.pdf-page');
      const pg = Number(slotEl?.dataset.page);
      const idx = pg ? dv.indexOf(pg) : null;
      if (!idx) return;
      const a = idx.nodes.find((n) => n.node === r.startContainer);
      if (!a) return;
      const b = idx.nodes.find((n) => n.node === r.endContainer);
      const start = a.start + r.startOffset;
      // A selection running onto the next page stops at the end of this one.
      const end = b ? b.start + r.endOffset : idx.text.length;
      if (end <= start) return;
      const onPage = rangeFor(idx, start, end);
      clearTimeout(collapseTimer.current);
      setHlSel(null);
      setSel({ pg, start, end, rects: onPage ? dv.rectsOf(pg, onPage) : [] });
    };
    document.addEventListener('selectionchange', onChange);
    return () => document.removeEventListener('selectionchange', onChange);
  }, [markup]);
  useEffect(() => setBarColors(false), [sel?.pg, sel?.start, hlSel?.id]);

  const selIdx = sel ? dvRef.current?.indexOf(sel.pg) : null;
  const selText = sel && selIdx ? selIdx.text.slice(sel.start, sel.end).trim() : '';

  const clearSel = () => {
    window.getSelection()?.removeAllRanges();
    setSel(null);
    setHlSel(null);
  };

  // ——— Notes ———

  const pushHistory = () => {
    history.current.undo.push(notesOf(issueId, UNIT));
    history.current.redo = [];
  };
  const saveNotes = (patch: Partial<PageNotes>) => {
    pushHistory();
    updateNotes(issueId, UNIT, patch);
  };
  const undo = () => {
    const prev = history.current.undo.pop();
    if (!prev) return;
    history.current.redo.push(notesOf(issueId, UNIT));
    updateNotes(issueId, UNIT, prev);
  };
  const redo = () => {
    const next = history.current.redo.pop();
    if (!next) return;
    history.current.undo.push(notesOf(issueId, UNIT));
    updateNotes(issueId, UNIT, next);
  };

  /** Highlights the selected words already touch: a new colour replaces them, and they can be removed. */
  const touched = sel ? notes.hl.filter((h) => h.pg === sel.pg && h.end > sel.start && h.start < sel.end) : [];

  const stackOf = (h: Highlight) => notes.hl.filter((x) => x.pg === h.pg && x.end > h.start && x.start < h.end);

  const addHighlight = (color: HighlightColor) => {
    if (hlSel) {
      // Highlights stacked on the same words (from before) become one, in the new colour.
      const stack = stackOf(hlSel);
      saveNotes({ hl: [...notes.hl.filter((h) => !stack.includes(h)), { ...hlSel, color }] });
    } else if (sel && selIdx) {
      // One highlight over the selection and anything it overlaps, in the new colour.
      const start = Math.min(sel.start, ...touched.map((h) => h.start));
      const end = Math.max(sel.end, ...touched.map((h) => h.end));
      const range = rangeFor(selIdx, start, end);
      const rects = range && dvRef.current ? dvRef.current.rectsOf(sel.pg, range) : sel.rects;
      const kept = notes.hl.filter((h) => !touched.includes(h));
      saveNotes({ hl: [...kept, { id: uid(), pg: sel.pg, start, end, rects, color, text: selIdx.text.slice(start, end).trim(), at: Date.now() }] });
    }
    clearSel();
  };

  const removeHighlight = () => {
    const gone = hlSel ? stackOf(hlSel) : touched;
    if (!gone.length) return;
    saveNotes({ hl: notes.hl.filter((h) => !gone.some((g) => g.id === h.id)) });
    clearSel();
  };

  const openSheet = (kind: 'lookup' | 'translate' | 'add') => {
    if (!sel || !selIdx) return;
    setSheet({ kind, text: selText, sentence: sentenceAround(selIdx, sel.start, sel.end), at: packAt(sel.pg, sel.start) });
    clearSel();
  };

  // ——— Taps: double-tap zoom, tapping a highlight; Markup drawing ———

  const lastTap = useRef({ t: 0, x: 0, y: 0 });
  const chromeTimer = useRef(0);
  const [chrome, setChrome] = useState(true);
  const [panel, setPanel] = useState<'contents' | 'more' | null>(null);
  const draft = useRef<{ stroke: Stroke; path: SVGPathElement } | null>(null);
  const drag = useRef({ moved: false, x: 0, y: 0 });

  const onPointerDown = (e: PointerEvent) => {
    drag.current = { moved: false, x: e.clientX, y: e.clientY };
    const dv = dvRef.current;
    if (!markup || !dv || !e.isPrimary) return;
    const p = dv.pointOnPage(e.clientX, e.clientY);
    if (!p) return;
    if (tool === 'eraser') {
      pushHistory();
      erase(p.pg, p.x, p.y);
    } else if (tool !== 'text') {
      const stroke: Stroke = { id: uid(), pg: p.pg, tool, color: tool === 'marker' && ink === INKS[0] ? INKS[4] : ink, width: WIDTHS[tool][widthIdx], pts: [round(p.x), round(p.y)] };
      const svg = dv.slots[p.pg - 1].overlay.querySelector('svg');
      const path = pathFor(stroke);
      svg?.appendChild(path);
      draft.current = { stroke, path };
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (Math.hypot(e.clientX - drag.current.x, e.clientY - drag.current.y) > 8) drag.current.moved = true;
    const dv = dvRef.current;
    if (!markup || !dv || !e.isPrimary) return;
    const p = dv.pointOnPage(e.clientX, e.clientY);
    if (!p) return;
    if (tool === 'eraser') erase(p.pg, p.x, p.y);
    const d = draft.current;
    if (d && p.pg === d.stroke.pg) {
      d.stroke.pts.push(round(p.x), round(p.y));
      d.path.setAttribute('d', strokePath(d.stroke.pts));
    }
  };

  const onPointerUp = (e: PointerEvent) => {
    const dv = dvRef.current;
    if (!dv) return;
    const d = draft.current;
    if (d) {
      draft.current = null;
      if (d.stroke.pts.length >= 4) saveNotes({ strokes: [...notes.strokes, d.stroke] });
      else d.path.remove();
      return;
    }
    if (drag.current.moved) return;
    const p = dv.pointOnPage(e.clientX, e.clientY);
    if (markup && tool === 'text' && p) {
      const hit = (e.target as HTMLElement).closest<HTMLElement>('[data-note]');
      const existing = hit && notes.texts.find((t) => t.id === hit.dataset.note);
      setSheet({ kind: 'text', note: existing ?? { id: uid(), pg: p.pg, x: round(p.x), y: round(p.y - 10), text: '', color: ink, size: 16 } });
      return;
    }
    if (markup) return;
    // Double tap: zoom in on that spot, or back to the page width.
    const now = performance.now();
    const l = lastTap.current;
    if (now - l.t < 320 && Math.hypot(e.clientX - l.x, e.clientY - l.y) < 30) {
      lastTap.current = { t: 0, x: 0, y: 0 };
      clearTimeout(chromeTimer.current);
      dv.zoomTo(dv.zoom > 1.2 ? 1 : 2.5, e.clientX, e.clientY);
      return;
    }
    lastTap.current = { t: now, x: e.clientX, y: e.clientY };
    // Tapping a highlight offers its colours and Remove.
    const s = window.getSelection();
    if (p && (!s || s.isCollapsed)) {
      const slot = dv.slots[p.pg - 1];
      const fx = p.x / UNITS;
      const fy = (p.y / UNITS) * (slot.w / slot.h);
      const h = notes.hl.find((x) => x.pg === p.pg && (x.rects ?? []).some(([rx, ry, rw, rh]) => fx >= rx && fx <= rx + rw && fy >= ry && fy <= ry + rh));
      setHlSel(h ?? null);
      // A plain tap on the page shows or hides the buttons, like in Preview
      // (after a moment, in case it's the first half of a double tap).
      if (!h) {
        clearTimeout(chromeTimer.current);
        chromeTimer.current = window.setTimeout(() => setChrome((c) => !c), 330);
      }
    }
  };

  const erase = (pg: number, x: number, y: number) => {
    const cur = notesOf(issueId, UNIT);
    const hit = cur.strokes.filter((s) => {
      if (s.pg !== pg) return false;
      for (let i = 0; i < s.pts.length; i += 2) if (Math.hypot(s.pts[i] - x, s.pts[i + 1] - y) < 10 + s.width / 2) return true;
      return false;
    });
    if (hit.length) updateNotes(issueId, UNIT, { strokes: cur.strokes.filter((s) => !hit.includes(s)) });
  };

  const fit = () => {
    const sc = scrollerRef.current;
    const r = sc?.getBoundingClientRect();
    if (r) dvRef.current?.zoomTo(1, r.left + r.width / 2, r.top + r.height / 2);
  };

  const bar = sel || hlSel;
  // Buttons stay visible while something needs them.
  const showChrome = chrome || markup || !!bar;

  return (
    <div class={`reader doc-reader ${showChrome ? '' : 'chrome-hidden'}`} role="dialog" aria-label={`${issue.magazine}: ${mp.title}`}>
      <div
        class={`doc-scroll ${markup ? 'is-markup' : ''}`}
        ref={scrollerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          draft.current?.path.remove();
          draft.current = null;
        }}
      >
        <div class="doc-col mag-pdf" ref={colRef} lang="en" />
        {!ready && !error && (
          <div class="reader-error" role="status">
            <span class="spinner" aria-hidden="true" />
          </div>
        )}
        {error && (
          <div class="reader-error">
            <p>This magazine’s file isn’t on this device any more. Add the PDF again in Read.</p>
          </div>
        )}
      </div>

      {/* Floating glass buttons over the page, as in Preview. */}
      <div class="glass-top">
        {markup ? (
          <>
            <span class="glass-spacer" />
            <span class="glass glass-title">
              <b>Markup</b>
            </span>
            <button type="button" class="glass glass-pill-btn" onClick={() => setMarkup(false)}>
              Done
            </button>
          </>
        ) : (
          <>
            <button type="button" class="glass glass-round" onClick={onClose} aria-label="Back to Library">
              <IconBack size={22} />
            </button>
            <button type="button" class="glass glass-title" onClick={() => setPanel('contents')} aria-label="Contents">
              <b>{mp.title}</b>
              <IconChevron size={12} style={{ transform: 'rotate(90deg)', flex: 'none' }} />
            </button>
            <button type="button" class="glass glass-round" onClick={() => setPanel('more')} aria-label="More">
              <IconMore size={22} />
            </button>
          </>
        )}
      </div>

      {!markup && zoomed && !bar && (
        <button type="button" class="glass glass-pill-btn doc-zoom" onClick={fit}>
          Fit width
        </button>
      )}

      <div class="glass-bottom">
        {markup ? (
          <div class="glass markup-glass" role="toolbar" aria-label="Markup tools">
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
              <span class="mk-hint">{tool === 'text' ? 'Tap to add text, tap a note to edit it' : 'Draw with one finger · pinch to zoom'}</span>
            </div>
          </div>
        ) : bar ? (
          <div class="glass glass-bar sel-glass" role="toolbar" aria-label="Selected text" onPointerDown={(e) => e.preventDefault()} onMouseDown={(e) => e.preventDefault()}>
            {barColors || hlSel ? (
              <div class="swatches">
                {COLORS.map((c) => (
                  <button type="button" key={c} class={`swatch sw-${c}`} aria-label={`Highlight ${c}`} aria-pressed={(hlSel ?? touched[0])?.color === c} onClick={() => addHighlight(c)} />
                ))}
                {(hlSel || touched.length > 0) && (
                  <button type="button" class="bar-btn remove" onClick={removeHighlight}>
                    Remove
                  </button>
                )}
                {!hlSel && (
                  <button type="button" class="bar-btn" onClick={() => setBarColors(false)}>
                    Cancel
                  </button>
                )}
              </div>
            ) : (
              <>
                <button type="button" class="bar-btn" onClick={() => setBarColors(true)}>
                  <i class={`bar-hl ${touched.length ? `on-${touched[0].color}` : ''}`} aria-hidden="true" />
                  Highlight
                </button>
                <button type="button" class="bar-btn" onClick={() => openSheet('lookup')}>
                  Look Up
                </button>
                <button type="button" class="bar-btn" onClick={() => openSheet('translate')}>
                  Translate
                </button>
                <button type="button" class="bar-btn strong" onClick={() => openSheet('add')}>
                  + Words
                </button>
                <button type="button" class="bar-btn" aria-label="Speak" onClick={() => speak(selText)}>
                  <IconSpeaker size={20} />
                </button>
              </>
            )}
          </div>
        ) : (
          <div class="glass glass-bar" role="toolbar" aria-label="Reader tools">
            <button
              type="button"
              class="glass-icon"
              aria-label="Markup"
              title="Markup"
              onClick={() => {
                clearSel();
                setMarkup(true);
              }}
            >
              <IconMarkup size={24} />
            </button>
            <button type="button" class="glass-icon" aria-label="Previous article" title="Previous article" disabled={index === 0} onClick={() => go(-1)}>
              <IconChevron size={20} style={{ transform: 'rotate(180deg)' }} />
            </button>
            <button type="button" class="glass-icon" aria-label="Contents" title="Contents" onClick={() => setPanel('contents')}>
              <IconList size={24} />
            </button>
            <button type="button" class="glass-icon" aria-label="Next article" title="Next article" disabled={index === order.length - 1} onClick={() => go(1)}>
              <IconChevron size={20} />
            </button>
            <button type="button" class="glass-icon" aria-label="Save a copy with notes" title="Save a copy with notes" onClick={() => setPanel('more')}>
              <IconShare size={24} />
            </button>
          </div>
        )}
      </div>

      {panel === 'contents' && (
        <Modal title={[issue.magazine, issue.issue].filter(Boolean).join(' ')} onClose={() => setPanel(null)}>
          <div class="list">
            {order.map((a) => (
              <button
                type="button"
                key={a.id}
                class="list-item page-row"
                aria-current={a.id === mp.id ? 'true' : undefined}
                onClick={() => {
                  setPanel(null);
                  const dv = dvRef.current;
                  if (dv) scrollerRef.current?.scrollTo({ top: dv.scrollTargetOf(a.pdf?.from ?? 1) });
                }}
              >
                <span class="list-item-main">
                  <b>{a.title}</b>
                  <span>
                    {a.topic} · {a.pdf && (a.pdf.from === a.pdf.to ? `p. ${a.pdf.from}` : `pp. ${a.pdf.from}–${a.pdf.to}`)}
                  </span>
                </span>
                {notesOf(issueId, a.id).read && <IconCheck class="check" size={18} />}
              </button>
            ))}
          </div>
        </Modal>
      )}
      {panel === 'more' && (
        <Modal title={mp.title} onClose={() => setPanel(null)}>
          <SaveCopy iss={issue} />
          <div class="list">
            <button
              type="button"
              class="list-item"
              onClick={() => {
                setPanel(null);
                fit();
              }}
            >
              <span class="list-item-main">
                <b>Fit page width</b>
              </span>
            </button>
          </div>
        </Modal>
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

function pathFor(s: Stroke): SVGPathElement {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', strokePath(s.pts));
  path.setAttribute('class', `ink ink-${s.tool}`);
  path.setAttribute('stroke', s.color);
  path.setAttribute('stroke-width', String(s.width));
  return path;
}

function flash(overlay: HTMLElement, [x, y, w, h]: [number, number, number, number]) {
  const i = document.createElement('i');
  i.className = 'flash';
  i.style.cssText = `left:calc(${x * 100}% - 3px);top:calc(${y * 100}% - 2px);width:calc(${w * 100}% + 6px);height:calc(${h * 100}% + 4px)`;
  overlay.appendChild(i);
  setTimeout(() => i.remove(), 2300);
}
