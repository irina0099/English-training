import type { Level, VocabItem } from '../types';
import { normalize } from './check';

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Regex fragment for a word and its common inflected forms: decide → decided, deciding, decides. */
function inflections(word: string): string {
  const w = escapeRe(word);
  const forms = [`${w}(?:s|es|d|ed|ing|'s)?`];
  if (/e$/i.test(word)) forms.push(`${escapeRe(word.slice(0, -1))}(?:ing|ed)`);
  if (/[^aeiou]y$/i.test(word)) forms.push(`${escapeRe(word.slice(0, -1))}(?:ied|ies)`);
  if (/[^aeiou][aeiou][bdgklmnprt]$/i.test(word)) forms.push(`${w}${escapeRe(word.slice(-1))}(?:ed|ing)`);
  return `(?:${forms.join('|')})`;
}

/**
 * Wraps the learner's word in *asterisks* inside their example, so the example
 * can be shown highlighted and used for "fill the gap". Leaves the text alone
 * when it is already marked or the word isn't found.
 */
export function markTarget(example: string, en: string): string {
  const ex = example.trim();
  if (!ex || ex.includes('*')) return ex;
  const words = en
    .replace(/[.,!?…]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return ex;
  const last = words.pop()!;
  const pattern = [...words.map(escapeRe), inflections(last)].join('\\s+');
  const match = new RegExp(`(^|[^A-Za-z])(${pattern})(?![A-Za-z])`, 'i').exec(ex);
  if (!match) return ex;
  const start = match.index + match[1].length;
  const end = start + match[2].length;
  return `${ex.slice(0, start)}*${ex.slice(start, end)}*${ex.slice(end)}`;
}

export interface WordDraft {
  en: string;
  ru: string;
  ex?: string;
  exRu?: string;
  note?: string;
  level: Level | null;
}

function newId(): string {
  return `u-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** A phrase if it looks like a sentence; otherwise a word or phrasal verb. */
function kindOf(en: string): 'word' | 'phrase' {
  return /[?!.…]$/.test(en.trim()) || en.trim().split(/\s+/).length >= 4 ? 'phrase' : 'word';
}

export function createCustomWord(draft: WordDraft, existing?: VocabItem): VocabItem {
  const en = draft.en.trim().replace(/\s+/g, ' ');
  const ex = draft.ex?.trim() ? markTarget(draft.ex, en) : undefined;
  return {
    id: existing?.id ?? newId(),
    kind: kindOf(en),
    en,
    ru: draft.ru.trim(),
    level: draft.level,
    ex,
    exRu: draft.exRu?.trim() || undefined,
    note: draft.note?.trim() || undefined,
    custom: true,
    createdAt: existing?.createdAt ?? Date.now(),
  };
}

export interface BulkResult {
  drafts: WordDraft[];
  errors: string[];
}

/** Parses "word — перевод — example" lines; separators: dash, tab, semicolon or |. */
export function parseBulk(text: string, level: Level | null): BulkResult {
  const drafts: WordDraft[] = [];
  const errors: string[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const parts = line
      .split(/\s+[—–-]\s+|\t+|\s*;\s*|\s*\|\s*/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length < 2) {
      errors.push(`Line ${i + 1}: add a translation after a dash — “${line}”`);
      return;
    }
    const [en, ru, ex, exRu] = parts;
    if (/[а-яё]/i.test(en)) {
      errors.push(`Line ${i + 1}: put the English word first, then the translation — “${line}”`);
      return;
    }
    drafts.push({ en, ru, ex, exRu, level });
  });
  return { drafts, errors };
}

export function sameWord(a: string, b: string): boolean {
  return normalize(a) === normalize(b);
}
