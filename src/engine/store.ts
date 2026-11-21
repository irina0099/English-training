import { activeItems } from '../content';
import type { AppData, CardState, DayStat, Grade, Item, Level, Mistake, Settings, VocabItem, Verdict } from '../types';
import { review, stage } from './fsrs';
import { saveItem } from '../storage';
import { appendMistake } from './mistakes';
import type { Exercise } from './session';

export type Section = 'progress' | 'mistakes' | 'words';

const STORAGE_KEY = 'english-notebook.v1';
export const MAX_CUSTOM_WORDS = 600;
const KEEP_DAYS = 400;

export const DEFAULT_SETTINGS: Settings = {
  levels: ['B1'],
  sessionSize: 15,
  newPerDay: 10,
  autoSpeak: false,
  showTranslations: false,
};

export function defaultData(): AppData {
  return {
    v: 1,
    states: {},
    mistakes: [],
    custom: [],
    settings: { ...DEFAULT_SETTINGS },
    days: {},
    ruleStats: {},
    stamps: { progress: 0, mistakes: 0, words: 0 },
  };
}

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const num = (x: unknown, fallback = 0): number => (isNum(x) ? x : fallback);
const isStr = (x: unknown): x is string => typeof x === 'string';

/** Keeps the entries of a record that pass `fix`; `fix` returns null for one that can't be used. */
function cleanRecord<T>(x: unknown, fix: (v: Record<string, unknown>) => T | null): Record<string, T> {
  if (!isObject(x)) return {};
  const out: Record<string, T> = {};
  for (const [k, v] of Object.entries(x)) {
    const ok = isObject(v) ? fix(v) : null;
    if (ok) out[k] = ok;
  }
  return out;
}

const cleanCard = (c: Record<string, unknown>): CardState | null =>
  isNum(c.due) && isNum(c.s) && c.s > 0 && isNum(c.d)
    ? { due: c.due, s: c.s, d: c.d, reps: num(c.reps), lapses: num(c.lapses), last: num(c.last), ok: num(c.ok) }
    : null;

const cleanMistake = (m: unknown): Mistake | null =>
  isObject(m) && isStr(m.id) && isNum(m.at)
    ? {
        id: m.id,
        at: m.at,
        given: isStr(m.given) ? m.given : '',
        expected: isStr(m.expected) ? m.expected : '',
        ex: (isStr(m.ex) ? m.ex : 'card') as Mistake['ex'],
        cat: isStr(m.cat) ? m.cat : 'vocab',
      }
    : null;

const cleanWord = (w: unknown): VocabItem | null =>
  isObject(w) && isStr(w.id) && isStr(w.en) ? ({ ...w, ru: isStr(w.ru) ? w.ru : '' } as unknown as VocabItem) : null;

/** Keeps the items of a list that `fix` can use. */
const cleanList = <T>(x: unknown, fix: (v: unknown) => T | null): T[] =>
  Array.isArray(x) ? x.map(fix).filter((v): v is T => v !== null) : [];

const cleanDay = (d: Record<string, unknown>): DayStat | null =>
  isNum(d.n) ? { n: d.n, ok: num(d.ok), new: num(d.new), ...(isNum(d.lessons) ? { lessons: d.lessons } : {}) } : null;

const cleanRuleStat = (r: Record<string, unknown>) => (isNum(r.n) ? { n: r.n, e: num(r.e) } : null);

/** A whole number within the range, or the default. */
const intIn = (x: unknown, lo: number, hi: number, fallback: number) =>
  isNum(x) && Number.isInteger(x) && x >= lo && x <= hi ? x : fallback;

function cleanSettings(x: unknown): Settings {
  const base = DEFAULT_SETTINGS;
  const raw = isObject(x) ? x : {};
  const levels = Array.isArray(raw.levels) ? raw.levels.filter((l): l is Level => l === 'B1' || l === 'B2') : [];
  return {
    ...raw,
    levels: levels.length ? [...new Set(levels)] : [...base.levels],
    sessionSize: intIn(raw.sessionSize, 1, 200, base.sessionSize),
    newPerDay: intIn(raw.newPerDay, 0, 200, base.newPerDay),
    autoSpeak: typeof raw.autoSpeak === 'boolean' ? raw.autoSpeak : base.autoSpeak,
    showTranslations: typeof raw.showTranslations === 'boolean' ? raw.showTranslations : base.showTranslations,
  };
}

/**
 * Accepts saved, imported or synced data and fills in anything missing.
 * Each entry is checked, so one broken card or mistake can't break the schedule or the screens.
 */
export function sanitize(raw: unknown): AppData {
  const base = defaultData();
  if (!isObject(raw)) return base;
  const stamps = isObject(raw.stamps) ? raw.stamps : {};
  return {
    v: 1,
    states: cleanRecord(raw.states, cleanCard),
    mistakes: cleanList(raw.mistakes, cleanMistake),
    custom: cleanList(raw.custom, cleanWord),
    settings: cleanSettings(raw.settings),
    days: cleanRecord(raw.days, cleanDay),
    ruleStats: cleanRecord(raw.ruleStats, cleanRuleStat),
    stamps: { progress: num(stamps.progress), mistakes: num(stamps.mistakes), words: num(stamps.words) },
  };
}

function loadLocal(): AppData {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    return text ? sanitize(JSON.parse(text)) : defaultData();
  } catch {
    return defaultData();
  }
}

function saveLocal(d: AppData): boolean {
  // A failure is reported to the app (storage.ts), which tells the learner.
  return saveItem(STORAGE_KEY, JSON.stringify(d));
}

let data: AppData = typeof window === 'undefined' ? defaultData() : loadLocal();
const listeners = new Set<() => void>();
const changeHooks = new Set<(d: AppData, sections: Section[]) => void>();

export function getData(): AppData {
  return data;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Lets the cloud sync hear about local changes. */
export function onLocalChange(fn: (d: AppData, sections: Section[]) => void): () => void {
  changeHooks.add(fn);
  return () => changeHooks.delete(fn);
}

function emit() {
  for (const fn of listeners) fn();
}

export function commit(patch: Partial<AppData>, sections: Section[], now = Date.now()) {
  const stamps = { ...data.stamps };
  for (const s of sections) stamps[s] = now;
  data = { ...data, ...patch, stamps };
  saveLocal(data);
  emit();
  for (const fn of changeHooks) fn(data, sections);
}

/** Replaces data that came from the cloud or an import, without echoing it back as a local change. */
export function replaceData(next: AppData, echo = false) {
  data = next;
  saveLocal(data);
  emit();
  if (echo) for (const fn of changeHooks) fn(data, ['progress', 'mistakes', 'words']);
}

export function todayKey(now = Date.now()): string {
  const d = new Date(now);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function pruneDays(days: Record<string, DayStat>): Record<string, DayStat> {
  const keys = Object.keys(days).sort();
  if (keys.length <= KEEP_DAYS) return days;
  return Object.fromEntries(keys.slice(keys.length - KEEP_DAYS).map((k) => [k, days[k]]));
}

const round = (x: number) => Math.round(x * 1000) / 1000;

export interface AnswerRecord {
  id: string;
  prev: CardState | undefined;
  mistakeAt?: number;
  verdict: Verdict;
  scheduled: boolean;
}

/**
 * Saves one answer: schedule, daily stats, rule stats and the mistake log.
 * Flashcards pass `logMistake: false`: "Again" on a card resets the streak but is not a new mistake.
 */
export function recordAnswer(
  ex: Exercise,
  verdict: Verdict,
  given: string,
  grade: Grade,
  retry: boolean,
  now = Date.now(),
  logMistake = true,
): AnswerRecord {
  const item = ex.item;
  const prev = data.states[item.id];
  const sections: Section[] = ['progress'];
  const states = { ...data.states };
  const scheduled = !retry;
  if (scheduled) {
    const next = review(prev, grade, now);
    states[item.id] = { ...next, s: round(next.s), d: round(next.d) };
  }
  const key = todayKey(now);
  const day = { ...(data.days[key] ?? { n: 0, ok: 0, new: 0 }) };
  day.n += 1;
  if (verdict !== 'wrong') day.ok += 1;
  if (scheduled && !prev) day.new += 1;
  const days = pruneDays({ ...data.days, [key]: day });

  const ruleStats = { ...data.ruleStats };
  if (item.kind === 'drill') {
    const cur = ruleStats[item.rule] ?? { n: 0, e: 0 };
    ruleStats[item.rule] = { n: cur.n + 1, e: cur.e + (verdict === 'wrong' ? 1 : 0) };
  }

  let mistakes = data.mistakes;
  let mistakeAt: number | undefined;
  if (verdict !== 'ok' && logMistake) {
    const cat = item.kind === 'drill' ? item.rule : verdict === 'typo' ? 'spelling' : 'vocab';
    const expected = 'answer' in ex ? ex.answer : item.kind === 'drill' ? item.a : item.en;
    mistakes = appendMistake(mistakes, { id: item.id, at: now, given, expected, ex: ex.t, cat });
    mistakeAt = now;
    sections.push('mistakes');
  }
  commit({ states, days, ruleStats, mistakes }, sections, now);
  return { id: item.id, prev, mistakeAt, verdict, scheduled };
}

/** "My answer was right": the learner overrides a typed answer the checker did not accept. */
export function acceptAnswer(rec: AnswerRecord, now = Date.now()) {
  const states = { ...data.states };
  if (rec.scheduled) {
    const next = review(rec.prev, 3, now);
    states[rec.id] = { ...next, s: round(next.s), d: round(next.d) };
  }
  const mistakes = data.mistakes.filter((m) => !(m.id === rec.id && m.at === rec.mistakeAt));
  const key = todayKey(now);
  const day = data.days[key];
  const days = day && rec.verdict === 'wrong' ? { ...data.days, [key]: { ...day, ok: day.ok + 1 } } : data.days;
  commit({ states, mistakes, days }, ['progress', 'mistakes'], now);
}

/** Words the learner chose to practise after a game: they join the mistakes list until answered right 3 times. */
export function addToPractice(items: readonly Item[], now = Date.now()) {
  let mistakes = data.mistakes;
  for (const item of items) {
    const expected = item.kind === 'drill' ? item.a : item.en;
    mistakes = appendMistake(mistakes, { id: item.id, at: now, given: '', expected, ex: 'game', cat: 'games' });
  }
  const states = { ...data.states };
  // Already studied words come up for review right away.
  for (const item of items) if (states[item.id]) states[item.id] = { ...states[item.id], due: Math.min(states[item.id].due, now), ok: 0 };
  commit({ mistakes, states }, ['mistakes', 'progress'], now);
}

/** A finished practice session: one lesson further up the mountain. */
export function recordLesson(now = Date.now()) {
  const key = todayKey(now);
  const day = data.days[key] ?? { n: 0, ok: 0, new: 0 };
  commit({ days: pruneDays({ ...data.days, [key]: { ...day, lessons: (day.lessons ?? 0) + 1 } }) }, ['progress'], now);
}

export function updateSettings(patch: Partial<Settings>) {
  commit({ settings: { ...data.settings, ...patch } }, ['progress']);
}

/** The message shown when the learner's own list is full. */
export const WORDS_FULL = `You can keep up to ${MAX_CUSTOM_WORDS} of your own words. Delete some you know well to add new ones.`;

/** Adds a word or updates one already saved; returns false when the list is full and the word is new. */
export function saveCustomWord(word: VocabItem): boolean {
  const exists = data.custom.some((w) => w.id === word.id);
  if (!exists && data.custom.length >= MAX_CUSTOM_WORDS) return false;
  const custom = exists ? data.custom.map((w) => (w.id === word.id ? word : w)) : [...data.custom, word];
  commit({ custom }, ['words']);
  return true;
}

/** Adds new words, skipping ones already saved, up to the limit; returns how many were added. */
export function saveCustomWords(words: VocabItem[]): number {
  const ids = new Set(data.custom.map((w) => w.id));
  const room = MAX_CUSTOM_WORDS - data.custom.length;
  const fresh: VocabItem[] = [];
  for (const w of words) {
    if (fresh.length >= room) break;
    if (ids.has(w.id)) continue;
    ids.add(w.id);
    fresh.push(w);
  }
  if (fresh.length) commit({ custom: [...data.custom, ...fresh] }, ['words']);
  return fresh.length;
}

export function deleteCustomWord(id: string) {
  const states = { ...data.states };
  delete states[id];
  commit(
    {
      custom: data.custom.filter((w) => w.id !== id),
      states,
      mistakes: data.mistakes.filter((m) => m.id !== id),
    },
    ['words', 'progress', 'mistakes'],
  );
}

export function resetProgress() {
  commit({ states: {}, mistakes: [], days: {}, ruleStats: {} }, ['progress', 'mistakes']);
}

export function clearMistakes() {
  commit({ mistakes: [] }, ['mistakes']);
}

// ——— Selectors ———

export function studyItems(d: AppData): Item[] {
  return activeItems(d.settings.levels, d.custom);
}

export function dueCount(d: AppData, now = Date.now()): number {
  return studyItems(d).filter((i) => d.states[i.id] && d.states[i.id].due <= now).length;
}

export function newLeftToday(d: AppData, now = Date.now()): number {
  return Math.max(0, d.settings.newPerDay - (d.days[todayKey(now)]?.new ?? 0));
}

export function unseenCount(d: AppData): number {
  return studyItems(d).filter((i) => !d.states[i.id]).length;
}

/** Days in a row with at least one answer, counting today or yesterday as the latest day. */
export function streak(d: AppData, now = Date.now()): number {
  let day = new Date(now);
  if (!d.days[todayKey(day.getTime())]?.n) day.setDate(day.getDate() - 1);
  let count = 0;
  while (d.days[todayKey(day.getTime())]?.n) {
    count++;
    day = new Date(day.getFullYear(), day.getMonth(), day.getDate() - 1, 12);
  }
  return count;
}

export interface Progress {
  total: number;
  started: number;
  known: number;
}

export function progressOf(items: readonly Item[], states: AppData['states']): Progress {
  let started = 0;
  let known = 0;
  for (const item of items) {
    const st = stage(states[item.id]);
    if (st !== 'new') started++;
    if (st === 'known' || st === 'mastered') known++;
  }
  return { total: items.length, started, known };
}

export class BackupError extends Error {}

export function exportJson(d: AppData): string {
  return JSON.stringify(d);
}

export function importJson(text: string): AppData {
  const parsed: unknown = JSON.parse(text);
  if (!isObject(parsed) || parsed.v !== 1) throw new BackupError('This is not an English Notebook backup.');
  // A backup cut short when copying can still be valid JSON: it must not wipe the progress.
  if (!['states', 'mistakes', 'custom', 'days'].some((k) => k in parsed)) throw new BackupError('This backup has no progress or words in it. Check that you copied all of the text.');
  const now = Date.now();
  const next = sanitize(parsed);
  return { ...next, stamps: { progress: now, mistakes: now, words: now } };
}
