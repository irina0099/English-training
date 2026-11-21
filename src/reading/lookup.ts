import { VOCAB } from '../content';
import { normalize } from '../engine/check';
import type { VocabItem } from '../types';

/** Possible dictionary forms of a word met in a text: decided → decide, studies → study, stopped → stop. */
export function lemmaCandidates(word: string): string[] {
  const w = word.toLowerCase().replace(/[’']s$/, '').replace(/[’']/g, "'");
  const out = [w];
  const add = (x: string) => x.length > 1 && !out.includes(x) && out.push(x);
  if (w.endsWith('ies')) add(w.slice(0, -3) + 'y');
  if (w.endsWith('ied')) add(w.slice(0, -3) + 'y');
  if (w.endsWith('es')) add(w.slice(0, -2));
  if (w.endsWith('s') && !w.endsWith('ss')) add(w.slice(0, -1));
  if (w.endsWith('ed')) {
    add(w.slice(0, -2));
    add(w.slice(0, -1));
    if (/([bdgklmnprt])\1ed$/.test(w)) add(w.slice(0, -3));
  }
  if (w.endsWith('ing')) {
    add(w.slice(0, -3));
    add(w.slice(0, -3) + 'e');
    if (/([bdgklmnprt])\1ing$/.test(w)) add(w.slice(0, -4));
  }
  if (w.endsWith('er')) add(w.slice(0, -2));
  if (w.endsWith('est')) add(w.slice(0, -3));
  if (w.endsWith('ly')) add(w.slice(0, -2));
  return out;
}

/** A built-in or own word matching the selection, trying the dictionary forms too. */
export function findKnown(text: string, custom: readonly VocabItem[]): VocabItem | undefined {
  const all = [...custom, ...VOCAB];
  const target = normalize(text);
  const exact = all.find((v) => normalize(v.en) === target);
  if (exact || /\s/.test(text.trim())) return exact;
  for (const c of lemmaCandidates(text)) {
    const hit = all.find((v) => normalize(v.en) === c || normalize(v.en) === `to ${c}`);
    if (hit) return hit;
  }
  return undefined;
}

export interface Definition {
  word: string;
  phonetic?: string;
  meanings: { pos: string; defs: { def: string; ex?: string }[] }[];
}

const cache = new Map<string, Promise<unknown>>();
function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  if (!cache.has(key)) {
    const p = load();
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return cache.get(key) as Promise<T>;
}

interface ApiEntry {
  word: string;
  phonetic?: string;
  phonetics?: { text?: string }[];
  meanings?: { partOfSpeech: string; definitions: { definition: string; example?: string }[] }[];
}

/** English definitions from the free dictionary API; tries the dictionary forms of the word. */
export function define(word: string): Promise<Definition | null> {
  return cached(`def:${word.toLowerCase()}`, async () => {
    for (const w of lemmaCandidates(word).slice(0, 4)) {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`);
      if (res.status === 404) continue;
      if (!res.ok) throw new Error('lookup failed');
      const entries = (await res.json()) as ApiEntry[];
      const first = entries[0];
      const meanings = entries
        .flatMap((e) => e.meanings ?? [])
        .slice(0, 3)
        .map((m) => ({ pos: m.partOfSpeech, defs: m.definitions.slice(0, 2).map((d) => ({ def: d.definition, ex: d.example })) }));
      return { word: first.word, phonetic: first.phonetic ?? first.phonetics?.find((p) => p.text)?.text, meanings };
    }
    return null;
  });
}

export interface TranslatorReply {
  responseData?: { translatedText?: string };
  matches?: { translation?: string; 'created-by'?: string; match?: number }[];
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/**
 * Russian for a word or a short phrase, best first, from the translator's reply. Its "best" for
 * single words is often a stray memory entry ("tangy" → «Вкус», a Wikipedia title; "rind" left
 * untranslated), while its machine translation is right; so machine translation goes first, then
 * the other entries that are Russian and short, without repeats.
 */
export function pickTranslations(query: string, reply: TranslatorReply): string[] {
  const best = reply.responseData?.translatedText ?? '';
  const matches = reply.matches ?? [];
  const machine = matches.filter((m) => m['created-by'] === 'MT!').map((m) => m.translation ?? '');
  const others = matches.filter((m) => m['created-by'] !== 'MT!').map((m) => m.translation ?? '');
  const lower = /^[a-z]/.test(query.trim());
  const out: string[] = [];
  for (const raw of [...machine, best, ...others]) {
    // A piece of a sentence ("Свежий, терпкий, смелый.") is not a translation of the word.
    const sentenceLike = (/[,.!]/.test(raw.trim()) && !/[,.!]/.test(query)) || words(raw) > Math.max(4, words(query) + 2);
    let t = raw.trim();
    if (!/[а-яё]/i.test(t) || t.includes('?') || sentenceLike) continue;
    // "Шишка" for "pine cone": a lower-case word gets a lower-case translation.
    if (lower && /^[А-ЯЁ][а-яё]/.test(t)) t = t[0].toLowerCase() + t.slice(1);
    if (!out.some((o) => o.toLowerCase() === t.toLowerCase())) out.push(t);
  }
  return out.slice(0, 3);
}

/** Whether a text is a word or a short phrase (not a sentence): those get several translations. */
const isShort = (text: string) => words(text) <= 3 && !/[.!?]/.test(text.trim());

/**
 * English → Russian machine translation. A sentence gets one translation; a word or a short
 * phrase gets up to three, the likeliest first, so the learner can pick the right one.
 */
export function translations(text: string): Promise<string[]> {
  return cached(`tr:${text}`, async () => {
    const res = await fetch(`https://api.mymemory.translated.net/get?langpair=en|ru&q=${encodeURIComponent(text.slice(0, 480))}`);
    if (!res.ok) throw new Error('translate failed');
    const json = (await res.json()) as TranslatorReply;
    const out = isShort(text) ? pickTranslations(text, json) : [json.responseData?.translatedText?.trim() ?? ''].filter(Boolean);
    if (!out.length) throw new Error('translate failed');
    return out;
  });
}

/** The likeliest translation of a word, a phrase or a sentence. */
export const translate = (text: string): Promise<string> => translations(text).then((t) => t[0]);

export const googleTranslateUrl = (text: string) => `https://translate.google.com/?sl=en&tl=ru&text=${encodeURIComponent(text)}`;
