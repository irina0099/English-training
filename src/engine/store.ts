import { activeItems } from '../content';
import type { AppData, CardState, DayStat, Grade, Item, Level, Mistake, Settings, VocabItem, Verdict } from '../types';
import { review, stage } from './fsrs';
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

/** Accepts saved or imported data and fills in anything missing. */
export function sanitize(raw: unknown): AppData {
  const base = defaultData();
  if (!isObject(raw)) return base;
  const settings = isObject(raw.settings) ? { ...base.settings, ...raw.settings } : base.settings;
  const levels = Array.isArray(settings.levels) ? settings.levels.filter((l): l is Level => l === 'B1' || l === 'B2') : [];
  return {
    v: 1,
    states: isObject(raw.states) ? (raw.states as Record<string, CardState>) : {},
    mistakes: Array.isArray(raw.mistakes) ? (raw.mistakes as Mistake[]) : [],
    custom: Array.isArray(raw.custom) ? (raw.custom as VocabItem[]).filter((w) => isObject(w) && typeof w.en === 'string') : [],
    settings: { ...settings, levels: levels.length ? levels : ['B1'] },
    days: isObject(raw.days) ? (raw.days as Record<string, DayStat>) : {},
    ruleStats: isObject(raw.ruleStats) ? (raw.ruleStats as AppData['ruleStats']) : {},
    stamps: isObject(raw.stamps) ? { ...base.stamps, ...(raw.stamps as AppData['stamps']) } : base.stamps,
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    return true;
  } catch {
    return false;
  }
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

/** Saves one answer: schedule, daily stats, rule stats and the mistake log. */
export function recordAnswer(ex: Exercise, verdict: Verdict, given: string, grade: Grade, retry: boolean, now = Date.now()): AnswerRecord {
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
  if (verdict !== 'ok') {
    const cat = item.kind === 'drill' ? item.rule : verdict === 'typo' ? 'spelling' : 'vocab';
    const expected = 'answer' in ex ? ex.answer : '';
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

export function updateSettings(patch: Partial<Settings>) {
  commit({ settings: { ...data.settings, ...patch } }, ['progress']);
}

export function saveCustomWord(word: VocabItem) {
  const exists = data.custom.some((w) => w.id === word.id);
  const custom = exists ? data.custom.map((w) => (w.id === word.id ? word : w)) : [...data.custom, word];
  commit({ custom }, ['words']);
}

export function saveCustomWords(words: VocabItem[]) {
  commit({ custom: [...data.custom, ...words] }, ['words']);
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

export function exportJson(d: AppData): string {
  return JSON.stringify(d);
}

export function importJson(text: string): AppData {
  const parsed: unknown = JSON.parse(text);
  if (!isObject(parsed) || parsed.v !== 1) throw new Error('Это не резервная копия «Английской тетради».');
  const now = Date.now();
  const next = sanitize(parsed);
  return { ...next, stamps: { progress: now, mistakes: now, words: now } };
}
