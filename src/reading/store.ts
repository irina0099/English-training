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
  /** Printed pages read in each PDF magazine: the climb goes up with every one. */
  seen?: Record<string, number[]>;
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

/**
 * Pages read, for the climb: every printed page read in a PDF magazine, plus every
 * finished article of the demo issue (each is one page).
 */
export function pagesRead(d: ReadingData = data): number {
  const pdfIds = new Set((d.issues ?? []).map((i) => i.id));
  const printed = Object.values(d.seen ?? {}).reduce((n, pgs) => n + pgs.length, 0);
  const demo = Object.entries(d.pages).filter(([k, p]) => p.read && !pdfIds.has(k.split('/')[0])).length;
  return printed + demo;
}

export function seenPages(issue: string, d: ReadingData = data): number[] {
  return d.seen?.[issue] ?? [];
}

export function markPageRead(issue: string, pg: number) {
  const cur = seenPages(issue);
  if (cur.includes(pg)) return;
  save({ ...data, seen: { ...data.seen, [issue]: [...cur, pg].sort((a, b) => a - b) } });
}

/** New contents for a magazine (its articles found again); pages already read stay read. */
export function updateIssuePages(id: string, pages: Issue['pages']) {
  const issue = (data.issues ?? []).find((i) => i.id === id);
  if (!issue) return;
  // Pages marked read under the old page-by-page contents count as read pages.
  const old = Object.entries(data.pages).flatMap(([k, p]) => {
    const m = k.match(/^(.+)\/p(\d+)$/);
    return m && m[1] === id && p.read ? [Number(m[2])] : [];
  });
  const seen = [...new Set([...seenPages(id), ...old])].sort((a, b) => a - b);
  save({ ...data, issues: (data.issues ?? []).map((i) => (i.id === id ? { ...i, pages } : i)), seen: { ...data.seen, [id]: seen } });
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

/** Adds a magazine, or puts a fresh file under one added before (its notes stay). Returns the replaced file key. */
export function addIssue(issue: Issue): string | undefined {
  const old = (data.issues ?? []).find((i) => i.id === issue.id);
  const issues = [...(data.issues ?? []).filter((i) => i.id !== issue.id), issue];
  save({ ...data, issues, last: { issue: issue.id, page: issue.pages[0].id } });
  return old?.file && old.file !== issue.file ? old.file : undefined;
}

/** Magazine notes for the backup file: highlights, Markup and text notes, and which magazines they belong to. */
export function readingBackup(): ReadingData {
  return { pages: data.pages, issues: data.issues, menu: data.menu };
}

/** Brings notes back from a backup. Magazines whose PDF isn't on this device yet show up; adding the PDF again opens them with their notes. */
export function restoreReading(r: unknown) {
  if (!r || typeof r !== 'object') return;
  const b = r as ReadingData;
  const pages = { ...data.pages, ...(typeof b.pages === 'object' ? b.pages : {}) };
  const mine = data.issues ?? [];
  const incoming = Array.isArray(b.issues) ? b.issues.filter((i) => i && typeof i.id === 'string' && !mine.some((m) => m.id === i.id)) : [];
  save({ ...data, pages, issues: [...mine, ...incoming], menu: b.menu ?? data.menu });
}

export function removeIssue(id: string) {
  const pages = Object.fromEntries(Object.entries(data.pages).filter(([k]) => !k.startsWith(`${id}/`)));
  save({ ...data, pages, issues: (data.issues ?? []).filter((i) => i.id !== id), last: data.last?.issue === id ? undefined : data.last });
}
