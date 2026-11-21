import type { MagPage } from './types';

// Finding the articles of a magazine nobody has mapped: an article starts on a page
// with a headline, i.e. text set much larger than the body text of the issue. The
// headline becomes the article's title, and the pages after it belong to it until the
// next headline.

export interface TextRun {
  str: string;
  /** Font height in PDF points. */
  size: number;
  /** Position on the page, PDF points (y grows upwards). */
  x: number;
  y: number;
}

const letters = (s: string) => (s.match(/[A-Za-zÀ-ÿ]/g) ?? []).length;

/** Text that reads as words, not as a broken font or a lone drop cap. */
const readable = (s: string) => {
  const t = s.trim();
  return t.length >= 3 && letters(t) / t.length > 0.6;
};

/** The body text size of the issue: the size most characters are set in. */
export function bodySize(pages: TextRun[][]): number {
  const weight = new Map<number, number>();
  for (const runs of pages)
    for (const r of runs) {
      const k = Math.round(r.size * 2) / 2;
      weight.set(k, (weight.get(k) ?? 0) + r.str.length);
    }
  let best = 10;
  let most = 0;
  for (const [k, w] of weight) if (w > most && k >= 5) [best, most] = [k, w];
  return best;
}

/** The page's headline: its largest readable text (several runs if the headline wraps). */
export function headline(runs: TextRun[]): { text: string; size: number } | null {
  const big = runs.filter((r) => readable(r.str));
  if (!big.length) return null;
  const max = Math.max(...big.map((r) => r.size));
  const parts = big
    .filter((r) => r.size >= max * 0.85)
    .sort((a, b) => b.y - a.y || a.x - b.x)
    .map((r) => r.str.trim())
    // Some PDFs print a headline twice (a shadow or an outline copy): keep each piece once.
    .filter((t, i, all) => all.indexOf(t) === i);
  const text = parts.join(' ').replace(/\s+/g, ' ').trim();
  return text ? { text: tidy(text), size: max } : null;
}

function tidy(t: string): string {
  const short = t.length > 70 ? `${t.slice(0, 67).replace(/\s+\S*$/, '')}…` : t;
  // HEADLINES IN CAPITALS read better in sentence case in a list.
  if (letters(short) > 6 && short === short.toUpperCase()) return short.charAt(0) + short.slice(1).toLowerCase();
  return short;
}

/** Splits an issue into articles from its pages' text. */
export function detectArticles(pages: TextRun[][]): MagPage[] {
  const n = pages.length;
  const body = bodySize(pages);
  const heads = pages.map(headline);
  const starts = (k: number) =>
    heads.map((h, i) => i > 0 && !!h && h.size >= body * k && h.text.split(' ').length >= 2).map((s, i) => (s ? i : -1)).filter((i) => i > 0);
  // A headline is text at least ~2.4 times the body size; if that marks too many pages
  // (big pull quotes everywhere), ask for larger type.
  let found = starts(2.4);
  for (const k of [3, 3.6, 4.4]) if (found.length > n * 0.45) found = starts(k);
  const begin = [0, ...found];
  const out: MagPage[] = begin.map((from, i) => {
    const to = (begin[i + 1] ?? n) - 1;
    const title = i === 0 ? 'Cover' : heads[from]!.text;
    return { id: `d${from + 1}`, topic: 'Articles', title, html: '', pdf: { from: from + 1, to: to + 1 } };
  });
  // Long stretches without a headline (adverts, listings) read better split up a little.
  return out.flatMap((a) => {
    const len = a.pdf!.to - a.pdf!.from + 1;
    if (len <= 10) return [a];
    const parts: MagPage[] = [];
    for (let p = a.pdf!.from; p <= a.pdf!.to; p += 8) {
      const to = Math.min(a.pdf!.to, p + 7);
      parts.push({ ...a, id: `d${p}`, title: p === a.pdf!.from ? a.title : `${a.title} (continued)`, pdf: { from: p, to } });
    }
    return parts;
  });
}
