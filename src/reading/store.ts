import { ISSUES } from './issues';
import type { Issue, PageNotes } from './types';

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
  /** Magazines added from PDF files (the files themselves are in IndexedDB). */
  issues?: Issue[];
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

/** The learner's own magazines first, newest first, then the demo issue. */
export function allIssues(d: ReadingData = data): Issue[] {
  return [...(d.issues ?? []).slice().sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0)), ...ISSUES];
}

export function getIssue(id: string): Issue | undefined {
  return allIssues().find((i) => i.id === id);
}

export function addIssue(issue: Issue) {
  save({ ...data, issues: [...(data.issues ?? []), issue], last: { issue: issue.id, page: issue.pages[0].id } });
}

export function removeIssue(id: string) {
  const pages = Object.fromEntries(Object.entries(data.pages).filter(([k]) => !k.startsWith(`${id}/`)));
  save({ ...data, pages, issues: (data.issues ?? []).filter((i) => i.id !== id), last: data.last?.issue === id ? undefined : data.last });
}
