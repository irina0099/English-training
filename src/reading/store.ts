import type { PageNotes } from './types';

// Highlights, Markup and reading progress live in their own storage key, so the
// main progress (and its cloud sync) stays as it was. Words saved while reading
// go to the learner's own words in the main store.

const KEY = 'english-notebook.reading.v1';

export interface ReadingData {
  pages: Record<string, PageNotes>;
  /** The last page opened: issue id and page id. */
  last?: { issue: string; page: string };
  /** Holding a word shows iPhone's own menu (Look Up, Translate) or the app's menu. */
  menu?: 'system' | 'app';
}

const empty = (): ReadingData => ({ pages: {} });

function load(): ReadingData {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as ReadingData) : null;
    return parsed && typeof parsed.pages === 'object' ? parsed : empty();
  } catch {
    return empty();
  }
}

let data: ReadingData = typeof window === 'undefined' ? empty() : load();
const listeners = new Set<() => void>();

export const pageKey = (issue: string, page: string) => `${issue}/${page}`;

export function getReading(): ReadingData {
  return data;
}

export function subscribeReading(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function save(next: ReadingData) {
  data = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Storage full or blocked: the notes stay for this visit.
  }
  for (const fn of listeners) fn();
}

export function notesOf(issue: string, page: string): PageNotes {
  return data.pages[pageKey(issue, page)] ?? { hl: [], strokes: [], texts: [] };
}

export function updateNotes(issue: string, page: string, patch: Partial<PageNotes>) {
  const key = pageKey(issue, page);
  save({ ...data, pages: { ...data.pages, [key]: { ...notesOf(issue, page), ...patch } } });
}

export function markRead(issue: string, page: string, now = Date.now()) {
  if (notesOf(issue, page).read) return;
  updateNotes(issue, page, { read: now });
}

export function setLast(issue: string, page: string) {
  if (data.last?.issue === issue && data.last.page === page) return;
  save({ ...data, last: { issue, page } });
}

export function pagesRead(d: ReadingData = data): number {
  return Object.values(d.pages).filter((p) => p.read).length;
}

export function setMenuStyle(menu: 'system' | 'app') {
  save({ ...data, menu });
}
