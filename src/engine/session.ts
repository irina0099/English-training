import type { CardState, Drill, ExerciseType, Grade, Item, Mistake, VocabItem, Verdict } from '../types';
import { checkAnswer, normalize } from './check';
import { DAY } from './fsrs';
import { mistakesByCategory, mistakesByItem, isFixed } from './mistakes';
import { pick, shuffle, type Rng } from './random';

export type Exercise =
  | { t: 'intro'; item: VocabItem }
  | { t: 'pick-ru'; item: VocabItem; options: string[]; answer: string }
  | { t: 'pick-en'; item: VocabItem; prompt: string; options: string[]; answer: string }
  | { t: 'type-en'; item: VocabItem; answer: string }
  | { t: 'gap'; item: VocabItem; before: string; after: string; answer: string }
  | { t: 'build'; item: VocabItem; tiles: string[]; answer: string }
  | { t: 'drill-pick'; item: Drill; options: string[]; answer: string }
  | { t: 'drill-type'; item: Drill; answer: string }
  | { t: 'drill-fix'; item: Drill; options: string[]; answer: string }
  | { t: 'particle'; item: VocabItem; before: string; verb: string; middle: string; after: string; options: string[]; answer: string }
  | { t: 'card'; item: Item };

export interface Task {
  ex: Exercise;
  /** A repeat inside the same session after a mistake: it does not move the schedule. */
  retry?: boolean;
}

export type SessionMode =
  /** `more`: extra practice once the day's plan is done — open mistakes, words from games, weak spots. */
  | { kind: 'daily'; more?: boolean }
  | { kind: 'mistakes' }
  | { kind: 'custom' }
  | { kind: 'rule'; rule: string }
  /** A hand-picked set, e.g. all phrasal verbs with "get". */
  | { kind: 'set'; title: string; ids: string[] };

export interface SessionContext {
  /** Items the learner studies (selected levels plus own words). */
  items: readonly Item[];
  /** All vocabulary, for wrong options in multiple choice. */
  vocab: readonly VocabItem[];
  states: Readonly<Record<string, CardState>>;
  mistakes: readonly Mistake[];
  now: number;
  size: number;
  /** New items still allowed today. */
  newLeft: number;
  rng: Rng;
}

const isVocab = (item: Item): item is VocabItem => item.kind !== 'drill';

/** Splits "I can’t *afford* it" into the text around the single marked target. */
export function gapParts(ex: string | undefined): { before: string; answer: string; after: string } | null {
  if (!ex) return null;
  const parts = ex.split('*');
  if (parts.length !== 3 || !parts[1].trim()) return null;
  return { before: parts[0], answer: parts[1], after: parts[2] };
}

/** Word tiles for the "build the phrase" exercise. */
export function phraseTiles(en: string): string[] {
  return en
    .replace(/…/g, ' ')
    .replace(/[.,!?]+(?=\s|$)/g, '')
    .split(/\s+/)
    .filter(Boolean);
}

const PARTICLES = new Set([
  'up', 'down', 'in', 'out', 'on', 'off', 'over', 'away', 'back', 'through', 'along', 'around', 'round',
  'about', 'after', 'forward', 'together', 'apart', 'with', 'to', 'of', 'for', 'into', 'by', 'behind', 'across',
]);

/** Common particles to fill the options when a verb family is small, by number of words. */
const PARTICLE_POOL: Record<number, string[]> = {
  1: ['up', 'out', 'off', 'on', 'over', 'down', 'away', 'back', 'in', 'through'],
  2: ['up with', 'on with', 'out of', 'down on', 'away with', 'up for', 'out with', 'down with', 'forward to', 'up to'],
};

export interface ParticleParts {
  before: string;
  verb: string;
  middle: string;
  after: string;
  answer: string;
}

/**
 * Splits the example of a phrasal verb so the particle can be blanked:
 * "It took her months to *get over* the break-up." → before "It took her months to ",
 * verb "get", answer "over". Also handles a split verb: "I’ll *pick* you *up*".
 */
export function particleParts(item: VocabItem): ParticleParts | null {
  if (!item.family || !item.ex) return null;
  const words = item.en.trim().split(/\s+/);
  const particle = words.slice(1).join(' ');
  if (!particle || !words.slice(1).every((w) => PARTICLES.has(w.toLowerCase()))) return null;
  const parts = item.ex.split('*');
  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  if (parts.length === 3) {
    const [verb, ...rest] = parts[1].trim().split(/\s+/);
    const answer = rest.join(' ');
    if (!same(answer, particle)) return null;
    return { before: parts[0], verb, middle: ' ', after: parts[2], answer };
  }
  if (parts.length === 5 && same(parts[3], particle)) {
    return { before: parts[0], verb: parts[1], middle: parts[2], after: parts[4], answer: parts[3] };
  }
  return null;
}

function particleOptions(item: VocabItem, answer: string, vocab: readonly VocabItem[], rng: Rng): string[] {
  const size = answer.split(' ').length;
  const key = (s: string) => s.toLowerCase();
  const seen = new Set([key(answer)]);
  const out: string[] = [];
  const add = (p: string) => {
    if (out.length >= 3 || seen.has(key(p)) || p.split(' ').length !== size) return;
    seen.add(key(p));
    out.push(p);
  };
  // Siblings first: get over / get on / get by makes the choice meaningful.
  shuffle(
    vocab.filter((v) => v.family === item.family && v.id !== item.id).map((v) => v.en.split(/\s+/).slice(1).join(' ')),
    rng,
  ).forEach(add);
  shuffle(PARTICLE_POOL[size] ?? PARTICLE_POOL[1], rng).forEach(add);
  return shuffle([answer, ...out], rng);
}

/** Main Russian meaning without notes in brackets: "позволить себе (по деньгам)" → "позволить себе". */
export function shortRu(ru: string): string {
  const plain = ru.replace(/\s*\([^)]*\)/g, '').trim();
  return plain.split(/[;,/]/)[0].trim() || ru;
}

/** Comparison key that keeps Cyrillic, unlike `normalize`. */
const sameKey = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

function distractors(item: VocabItem, vocab: readonly VocabItem[], key: 'en' | 'ru', rng: Rng): string[] {
  const seen = new Set([sameKey(item.en), sameKey(item.ru)]);
  const pool = shuffle(
    vocab.filter((v) => v.id !== item.id && v.kind === item.kind),
    rng,
  );
  // Same part of speech first: choosing among four adjectives is a real test.
  pool.sort((a, b) => Number(b.pos === item.pos) - Number(a.pos === item.pos));
  const out: string[] = [];
  for (const v of pool) {
    if (seen.has(sameKey(v.en)) || seen.has(sameKey(v.ru))) continue;
    seen.add(sameKey(v.en));
    seen.add(sameKey(v.ru));
    out.push(key === 'ru' ? v.ru : v.en);
    if (out.length === 3) break;
  }
  return out;
}

function vocabTypes(item: VocabItem, state: CardState | undefined): ExerciseType[] {
  const s = state?.s ?? 0;
  const hasGap = item.kind === 'word' && gapParts(item.ex) !== null;
  const canBuild = item.kind === 'phrase' && phraseTiles(item.en).length >= 3;
  if (particleParts(item)) {
    if (!state || s < 2) return ['pick-ru', 'particle'];
    if (s < 7) return hasGap ? ['particle', 'pick-en', 'gap'] : ['particle', 'pick-en'];
    return hasGap ? ['particle', 'type-en', 'gap'] : ['particle', 'type-en'];
  }
  if (!state || s < 2) return ['pick-ru', 'pick-en'];
  if (item.kind === 'phrase') return canBuild ? ['build', 'pick-en'] : ['pick-en', 'pick-ru'];
  if (s < 7) return hasGap ? ['pick-en', 'type-en', 'gap'] : ['pick-en', 'type-en'];
  return hasGap ? ['type-en', 'gap'] : ['type-en'];
}

/**
 * Picks an exercise that matches how well the item is known:
 * recognition first, then recall and typing. `avoid` gives a different
 * exercise type when an item comes back after a mistake.
 */
export function makeExercise(
  item: Item,
  state: CardState | undefined,
  ctx: Pick<SessionContext, 'vocab' | 'rng'>,
  avoid?: ExerciseType,
): Exercise {
  const { rng, vocab } = ctx;
  if (!isVocab(item)) {
    if (item.fix) {
      return { t: 'drill-fix', item, options: shuffle([item.a, ...item.wrong], rng), answer: item.a };
    }
    const typed = item.typeable !== false && (state?.s ?? 0) >= 3 && avoid !== 'drill-type';
    if (typed) return { t: 'drill-type', item, answer: item.a };
    return { t: 'drill-pick', item, options: shuffle([item.a, ...item.wrong], rng), answer: item.a };
  }
  let types = vocabTypes(item, state).filter((t) => t !== avoid);
  if (!types.length) types = item.kind === 'phrase' ? ['pick-en'] : ['type-en'];
  const t = pick(types, rng);
  switch (t) {
    case 'pick-ru':
      return { t, item, options: shuffle([item.ru, ...distractors(item, vocab, 'ru', rng)], rng), answer: item.ru };
    case 'pick-en': {
      const prompt = item.kind === 'phrase' && item.sit ? item.sit : item.ru;
      return { t, item, prompt, options: shuffle([item.en, ...distractors(item, vocab, 'en', rng)], rng), answer: item.en };
    }
    case 'gap': {
      const parts = gapParts(item.ex)!;
      return { t, item, before: parts.before, after: parts.after, answer: parts.answer };
    }
    case 'particle': {
      const p = particleParts(item)!;
      return { t, item, ...p, options: particleOptions(item, p.answer, vocab, rng) };
    }
    case 'build': {
      const tiles = phraseTiles(item.en);
      let mixed = shuffle(tiles, rng);
      for (let i = 0; i < 5 && mixed.join(' ') === tiles.join(' '); i++) mixed = shuffle(tiles, rng);
      return { t, item, tiles: mixed, answer: tiles.join(' ') };
    }
    default:
      return { t: 'type-en', item, answer: item.en };
  }
}

export interface CheckResult {
  verdict: Verdict;
  expected: string;
}

/** Checks the learner's answer: a chosen option, typed text or built phrase. */
export function checkExercise(ex: Exercise, given: string): CheckResult {
  switch (ex.t) {
    case 'intro':
    case 'card':
      return { verdict: 'ok', expected: '' };
    case 'pick-ru':
    case 'pick-en':
    case 'drill-pick':
    case 'drill-fix':
    case 'particle':
      return { verdict: given === ex.answer ? 'ok' : 'wrong', expected: ex.answer };
    case 'build':
      return { verdict: normalize(given) === normalize(ex.answer) ? 'ok' : 'wrong', expected: ex.answer };
    case 'type-en':
      return { verdict: checkAnswer(given, [ex.item.en, ...(ex.item.alt ?? [])], { lenient: true }), expected: ex.item.en };
    case 'gap': {
      const accepted = [ex.answer];
      if (normalize(ex.answer) === normalize(ex.item.en)) accepted.push(...(ex.item.alt ?? []));
      return { verdict: checkAnswer(given, accepted, { lenient: true }), expected: ex.answer };
    }
    case 'drill-type':
      return { verdict: checkAnswer(given, [ex.item.a, ...(ex.item.alt ?? [])]), expected: ex.item.a };
  }
}

const TYPED: ExerciseType[] = ['type-en', 'gap', 'drill-type'];

/** Turns an answer into an FSRS grade without asking the learner to rate themselves. */
export function gradeFor(t: ExerciseType, verdict: Verdict, ms: number, usedHint: boolean): Grade {
  if (verdict === 'wrong') return 1;
  if (verdict === 'typo' || usedHint) return 2;
  if (TYPED.includes(t) && ms < 6000) return 4;
  return 3;
}

function itemWeights(ctx: SessionContext): Map<string, number> {
  const byItem = mistakesByItem(ctx.mistakes, ctx.now);
  const byRule = new Map(mistakesByCategory(ctx.mistakes, ctx.now).map((c) => [c.cat, c.weight]));
  const out = new Map<string, number>();
  for (const item of ctx.items) {
    const own = isFixed(ctx.states[item.id]) ? 0 : (byItem.get(item.id)?.weight ?? 0);
    // Drills also inherit part of their rule's weight: a weak rule pulls in its other sentences.
    const rule = item.kind === 'drill' ? (byRule.get(item.rule) ?? 0) * 0.3 : 0;
    const lapses = (ctx.states[item.id]?.lapses ?? 0) * 0.15;
    const w = own + rule + lapses;
    if (w > 0) out.set(item.id, w);
  }
  return out;
}

/**
 * Order of new items: own words first, then words added from games or with
 * mistakes, then B1 before B2 with some mixing.
 */
function freshOrder(items: readonly Item[], rng: Rng, weights: Map<string, number>): Item[] {
  const custom = items.filter((i) => isVocab(i) && i.custom).sort((a, b) => ((a as VocabItem).createdAt ?? 0) - ((b as VocabItem).createdAt ?? 0));
  const flagged = items
    .filter((i) => !(isVocab(i) && i.custom) && weights.has(i.id))
    .sort((a, b) => (weights.get(b.id) ?? 0) - (weights.get(a.id) ?? 0));
  const rest = items
    .filter((i) => !(isVocab(i) && i.custom) && !weights.has(i.id))
    .map((item) => ({ item, key: (item.level === 'B2' ? 0.6 : 0) + rng() }))
    .sort((a, b) => a.key - b.key)
    .map((x) => x.item);
  return [...custom, ...flagged, ...rest];
}

/** Chooses which items go into a session. */
/** Extra practice reviews ahead only what is due within this time. */
const REVIEW_AHEAD = 3 * DAY;

/** Midnight at the start of the learner's day, in local time. */
function startOfDay(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function planItems(mode: SessionMode, ctx: SessionContext): Item[] {
  const { items, states, now, size } = ctx;
  const chosen: Item[] = [];
  const taken = new Set<string>();
  const take = (list: readonly Item[], count: number) => {
    for (const item of list) {
      if (chosen.length >= size || count <= 0) break;
      if (taken.has(item.id)) continue;
      taken.add(item.id);
      chosen.push(item);
      count--;
    }
  };
  const weights = itemWeights(ctx);
  const byWeight = (list: Item[]) => list.sort((a, b) => (weights.get(b.id) ?? 0) - (weights.get(a.id) ?? 0));
  // Most overdue first; items due at the same moment come in random order.
  const due = shuffle(
    items.filter((i) => states[i.id] && states[i.id].due <= now),
    ctx.rng,
  ).sort((a, b) => states[a.id].due - states[b.id].due);
  const fresh = freshOrder(
    items.filter((i) => !states[i.id]),
    ctx.rng,
    weights,
  );

  switch (mode.kind) {
    case 'daily': {
      const today = startOfDay(now);
      const answeredToday = (i: Item) => !!states[i.id] && states[i.id].last >= today;
      if (mode.more) {
        // The day's plan is done: work through every open mistake, including words
        // added from games that were never studied, then other weak spots. What has
        // not been practised yet today comes first, so rounds don't open the same way.
        const notTodayFirst = (list: Item[]) => [...list.filter((i) => !answeredToday(i)), ...list.filter(answeredToday)];
        const open = byWeight(items.filter((i) => (weights.get(i.id) ?? 0) > 0 && !isFixed(states[i.id])));
        const weak = byWeight(items.filter((i) => states[i.id] && (weights.get(i.id) ?? 0) >= 0.4));
        take(notTodayFirst(open), size);
        take(notTodayFirst(weak), size);
        // Room left: review ahead what would come back soonest.
        const ahead = items
          .filter((i) => states[i.id] && states[i.id].due > now && states[i.id].due - now < REVIEW_AHEAD && !answeredToday(i))
          .sort((a, b) => states[a.id].due - states[b.id].due);
        take(ahead, size);
        break;
      }
      // An item answered today has had its practice: in the regular plan it comes
      // back when it is due rather than as a weak spot the same day.
      const weak = byWeight(items.filter((i) => states[i.id] && states[i.id].due > now && !answeredToday(i) && (weights.get(i.id) ?? 0) >= 0.4));
      take(due, Math.ceil(size * 0.6));
      take(weak, Math.ceil(size * 0.25));
      take(fresh, Math.min(ctx.newLeft, Math.max(Math.ceil(size * 0.15), size - chosen.length)));
      take(due, size);
      take(weak, size);
      break;
    }
    case 'mistakes': {
      const withMistakes = byWeight(items.filter((i) => (weights.get(i.id) ?? 0) > 0 && !isFixed(states[i.id])));
      take(withMistakes, size);
      const weakRules = new Set(mistakesByCategory(ctx.mistakes, now).slice(0, 3).map((c) => c.cat));
      take(shuffle(items.filter((i) => i.kind === 'drill' && weakRules.has(i.rule)), ctx.rng), size);
      break;
    }
    case 'custom': {
      const own = items.filter((i) => isVocab(i) && i.custom);
      take(due.filter((i) => own.includes(i)), size);
      take(fresh.filter((i) => own.includes(i)), size);
      take(byWeight(own.slice()), Math.ceil(size / 2));
      take(own.filter((i) => states[i.id]).sort((a, b) => states[a.id].s - states[b.id].s), size);
      break;
    }
    case 'set': {
      const wanted = new Set(mode.ids);
      const related = items.filter((i) => wanted.has(i.id));
      take(due.filter((i) => wanted.has(i.id)), size);
      take(byWeight(related.filter((i) => weights.has(i.id))), size);
      take(shuffle(related, ctx.rng), size);
      break;
    }
    case 'rule': {
      const related = items.filter((i) => i.rule === mode.rule);
      take(due.filter((i) => related.includes(i)), size);
      take(byWeight(related.filter((i) => weights.has(i.id))), size);
      take(shuffle(related, ctx.rng), size);
      break;
    }
  }
  return shuffle(chosen, ctx.rng);
}

/** Builds the task queue: a new word gets an introduction card before its first question. */
export function buildTasks(items: readonly Item[], ctx: SessionContext): Task[] {
  const tasks: Task[] = [];
  for (const item of items) {
    const state = ctx.states[item.id];
    if (isVocab(item) && !state) {
      tasks.push({ ex: { t: 'intro', item } });
      tasks.push({ ex: makeExercise(item, undefined, ctx) });
    } else {
      tasks.push({ ex: makeExercise(item, state, ctx) });
    }
  }
  return tasks;
}

/** Where to put a repeat of a failed item: a few tasks later, not right away. */
export function retryPosition(current: number, length: number, rng: Rng): number {
  return Math.min(length, current + 3 + Math.floor(rng() * 3));
}

