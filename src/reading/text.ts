// Text positions on a rendered page. Everything is anchored by character offsets
// in the page's text, so highlights and saved words survive re-rendering.

export interface TextIndex {
  root: HTMLElement;
  nodes: { node: Text; start: number; end: number }[];
  text: string;
}

export function indexText(root: HTMLElement): TextIndex {
  const nodes: TextIndex['nodes'] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let pos = 0;
  let text = '';
  for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
    if (n.parentElement?.closest('svg')) continue;
    const len = n.data.length;
    nodes.push({ node: n, start: pos, end: pos + len });
    text += n.data;
    pos += len;
  }
  return { root, nodes, text };
}

/** Text node and offset under a point on the screen. */
function caretAt(x: number, y: number): { node: Node; offset: number } | null {
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  if (doc.caretPositionFromPoint) {
    const p = doc.caretPositionFromPoint(x, y);
    return p ? { node: p.offsetNode, offset: p.offset } : null;
  }
  const r = doc.caretRangeFromPoint?.(x, y);
  return r ? { node: r.startContainer, offset: r.startOffset } : null;
}

export function offsetAt(idx: TextIndex, x: number, y: number): number | null {
  const c = caretAt(x, y);
  if (!c || c.node.nodeType !== Node.TEXT_NODE) return null;
  const entry = idx.nodes.find((n) => n.node === c.node);
  if (!entry) return null;
  // The caret can land just past the last letter; make sure the point is really over text.
  const r = rangeFor(idx, entry.start + Math.max(0, c.offset - 1), entry.start + Math.min(entry.end - entry.start, c.offset + 1));
  if (r) {
    const hit = [...r.getClientRects()].some((b) => x >= b.left - 6 && x <= b.right + 6 && y >= b.top - 6 && y <= b.bottom + 6);
    if (!hit) return null;
  }
  return entry.start + c.offset;
}

const WORD_CHAR = /[A-Za-zÀ-ÿ0-9'’-]/;

/** The word around a character offset, without surrounding quotes or dashes. */
export function wordAt(idx: TextIndex, offset: number): { start: number; end: number } | null {
  const t = idx.text;
  let s = offset;
  let e = offset;
  if (!WORD_CHAR.test(t[s] ?? '') && WORD_CHAR.test(t[s - 1] ?? '')) s = e = offset - 1;
  if (!WORD_CHAR.test(t[s] ?? '')) return null;
  while (s > 0 && WORD_CHAR.test(t[s - 1])) s--;
  while (e < t.length && WORD_CHAR.test(t[e])) e++;
  while (s < e && /['’-]/.test(t[s])) s++;
  while (e > s && /['’-]/.test(t[e - 1])) e--;
  return e > s ? { start: s, end: e } : null;
}

export function rangeFor(idx: TextIndex, start: number, end: number): Range | null {
  const a = idx.nodes.find((n) => start >= n.start && start < n.end);
  const b = idx.nodes.find((n) => end > n.start && end <= n.end);
  if (!a || !b) return null;
  const r = document.createRange();
  r.setStart(a.node, start - a.start);
  r.setEnd(b.node, end - b.start);
  return r;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Line boxes of a text range, in unscaled page coordinates. */
export function boxesFor(idx: TextIndex, start: number, end: number): Box[] {
  const r = rangeFor(idx, start, end);
  if (!r) return [];
  const origin = idx.root.getBoundingClientRect();
  // The page is drawn scaled; read the scale from the layout itself, not from state.
  const scale = origin.width / (idx.root.offsetWidth || 1);
  return [...r.getClientRects()]
    .filter((b) => b.width > 0.5)
    .map((b) => ({ x: (b.left - origin.left) / scale, y: (b.top - origin.top) / scale, w: b.width / scale, h: b.height / scale }));
}

const BLOCK = 'p, li, h1, h2, h3, h4, blockquote, figcaption, dd, dt, td';

/** The sentence that contains the given range, taken from its paragraph. */
export function sentenceAround(idx: TextIndex, start: number, end: number): string {
  const entry = idx.nodes.find((n) => start >= n.start && start < n.end);
  const block = entry?.node.parentElement?.closest(BLOCK) ?? idx.root;
  const inner = idx.nodes.filter((n) => block.contains(n.node));
  if (!inner.length) return idx.text.slice(start, end);
  const from = inner[0].start;
  const text = idx.text.slice(from, inner[inner.length - 1].end);
  const a = start - from;
  const b = end - from;
  const re = /[^.!?…]+(?:[.!?…]+["'”’)]*|$)\s*/g;
  let sentence = text;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index <= a && m.index + m[0].length >= b) {
      sentence = m[0];
      break;
    }
    if (!m[0]) break;
  }
  return sentence.replace(/\s+/g, ' ').trim().replace(/^[“"]([^”"]*)$/, '$1');
}
