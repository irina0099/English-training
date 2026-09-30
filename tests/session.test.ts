import { describe, expect, it } from 'vitest';
import { activeItems, VOCAB, WORDS_B1 } from '../src/content';
import { DAY } from '../src/engine/fsrs';
import { makeRng } from '../src/engine/random';
import {
  buildTasks,
  checkExercise,
  gapParts,
  gradeFor,
  makeExercise,
  phraseTiles,
  planItems,
  shortRu,
  type SessionContext,
} from '../src/engine/session';
import type { CardState, Mistake, VocabItem } from '../src/types';

const NOW = Date.UTC(2026, 5, 1, 12);

function ctx(over: Partial<SessionContext> = {}): SessionContext {
  return {
    items: activeItems(['B1'], []),
    vocab: VOCAB,
    states: {},
    mistakes: [],
    now: NOW,
    size: 15,
    newLeft: 10,
    rng: makeRng(42),
    ...over,
  };
}

const seen = (due: number, extra: Partial<CardState> = {}): CardState => ({ due, s: 5, d: 5, reps: 3, lapses: 0, last: due - 5 * DAY, ok: 3, ...extra });

describe('planItems', () => {
  it('gives a new learner only new items, within the daily limit', () => {
    const plan = planItems({ kind: 'daily' }, ctx());
    expect(plan.length).toBe(10);
    const tasks = buildTasks(plan, ctx());
    const firstIntro = tasks.findIndex((t) => t.ex.t === 'intro');
    expect(firstIntro).toBeGreaterThanOrEqual(0);
  });

  it('puts due reviews first and still adds new items', () => {
    const states: Record<string, CardState> = {};
    WORDS_B1.slice(0, 30).forEach((w) => (states[w.id] = seen(NOW - DAY)));
    const plan = planItems({ kind: 'daily' }, ctx({ states }));
    expect(plan.length).toBe(15);
    const due = plan.filter((i) => states[i.id]).length;
    expect(due).toBeGreaterThanOrEqual(9);
    expect(plan.length - due).toBeGreaterThan(0);
  });

  it('brings back items with recent mistakes even when they are not due', () => {
    const states: Record<string, CardState> = {};
    WORDS_B1.slice(0, 20).forEach((w) => (states[w.id] = seen(NOW + 5 * DAY, { ok: 0, last: NOW - DAY })));
    const target = WORDS_B1[7];
    const mistakes: Mistake[] = [
      { id: target.id, at: NOW - DAY, given: 'x', expected: target.en, ex: 'type-en', cat: 'vocab' },
      { id: target.id, at: NOW - 2 * DAY, given: 'y', expected: target.en, ex: 'type-en', cat: 'vocab' },
    ];
    const plan = planItems({ kind: 'daily' }, ctx({ states, mistakes, newLeft: 0 }));
    expect(plan.map((i) => i.id)).toContain(target.id);
    const review = planItems({ kind: 'mistakes' }, ctx({ states, mistakes }));
    expect(review[0]?.id === target.id || review.some((i) => i.id === target.id)).toBe(true);
  });

  it('keeps mistakes answered today out of the regular plan', () => {
    // Nothing due and no new words left; four mistakes were answered right today.
    const states: Record<string, CardState> = {};
    const mistakes: Mistake[] = [];
    WORDS_B1.slice(0, 4).forEach((w) => {
      states[w.id] = seen(NOW + DAY, { ok: 2, lapses: 1, last: NOW - 60_000 });
      mistakes.push({ id: w.id, at: NOW - 3_600_000, given: 'x', expected: w.en, ex: 'type-en', cat: 'vocab' });
    });
    expect(planItems({ kind: 'daily' }, ctx({ states, mistakes, newLeft: 0 }))).toEqual([]);
    // "Practise more" and the mistakes practice still offer them.
    expect(planItems({ kind: 'daily', more: true }, ctx({ states, mistakes, newLeft: 0 })).length).toBe(4);
    expect(planItems({ kind: 'mistakes' }, ctx({ states, mistakes })).length).toBeGreaterThanOrEqual(4);
  });

  describe('practise more, once the day is done', () => {
    const states: Record<string, CardState> = {};
    const mistakes: Mistake[] = [];
    const answeredToday = WORDS_B1.slice(0, 4);
    const fromGames = WORDS_B1.slice(4, 10);
    const dueSoon = WORDS_B1.slice(10, 13);
    const dueLater = WORDS_B1.slice(13, 16);
    answeredToday.forEach((w) => {
      states[w.id] = seen(NOW + DAY, { ok: 2, lapses: 1, last: NOW - 60_000 });
      mistakes.push({ id: w.id, at: NOW - 3_600_000, given: 'x', expected: w.en, ex: 'type-en', cat: 'vocab' });
    });
    // Added after a game and never studied: no card state yet.
    fromGames.forEach((w) => mistakes.push({ id: w.id, at: NOW - 7_200_000, given: '', expected: w.en, ex: 'game', cat: 'games' }));
    dueSoon.forEach((w) => (states[w.id] = seen(NOW + DAY, { last: NOW - 2 * DAY })));
    dueLater.forEach((w) => (states[w.id] = seen(NOW + 20 * DAY, { last: NOW - 2 * DAY })));
    const ids = (list: readonly { id: string }[]) => list.map((w) => w.id);

    it('trains every open mistake and word from games, then reviews ahead', () => {
      const plan = ids(planItems({ kind: 'daily', more: true }, ctx({ states, mistakes, newLeft: 0 })));
      expect(plan).toEqual(expect.arrayContaining([...ids(answeredToday), ...ids(fromGames), ...ids(dueSoon)]));
      expect(plan.some((id) => ids(dueLater).includes(id))).toBe(false);
      // No new words beyond the mistakes.
      expect(plan.filter((id) => !states[id] && !ids(fromGames).includes(id))).toEqual([]);
    });

    it('starts with what was not practised today when there are too many', () => {
      const plan = ids(planItems({ kind: 'daily', more: true }, ctx({ states, mistakes, newLeft: 0, size: 6 })));
      expect(plan.sort()).toEqual(ids(fromGames).sort());
    });
  });

  it('trains own words in the custom mode', () => {
    const mine: VocabItem = { id: 'u-1', kind: 'word', en: 'kettle', ru: 'чайник', level: null, custom: true, createdAt: 1 };
    const c = ctx({ items: activeItems(['B1'], [mine]) });
    const plan = planItems({ kind: 'custom' }, c);
    expect(plan.map((i) => i.id)).toEqual(['u-1']);
  });

  it('trains one rule', () => {
    const plan = planItems({ kind: 'rule', rule: 'make-do' }, ctx());
    expect(plan.length).toBeGreaterThan(3);
    expect(plan.every((i) => i.rule === 'make-do')).toBe(true);
  });
});

describe('exercises', () => {
  it('offers four different options that include the answer', () => {
    const item = WORDS_B1[0];
    for (let seed = 0; seed < 20; seed++) {
      const ex = makeExercise(item, undefined, { vocab: VOCAB, rng: makeRng(seed) });
      if (ex.t !== 'pick-ru' && ex.t !== 'pick-en') throw new Error(`unexpected ${ex.t}`);
      expect(ex.options).toHaveLength(4);
      expect(new Set(ex.options).size).toBe(4);
      expect(ex.options).toContain(ex.answer);
    }
  });

  it('moves to typing once an item is well known', () => {
    const item = WORDS_B1.find((w) => w.en === 'receipt')!;
    const types = new Set<string>();
    for (let seed = 0; seed < 30; seed++) {
      types.add(makeExercise(item, seen(NOW, { s: 20 }), { vocab: VOCAB, rng: makeRng(seed) }).t);
    }
    expect([...types].sort()).toEqual(['gap', 'type-en']);
  });

  it('checks typed answers with accepted alternatives', () => {
    const item = WORDS_B1.find((w) => w.en === 'neighbour')!;
    const ex = { t: 'type-en' as const, item, answer: item.en };
    expect(checkExercise(ex, 'neighbor').verdict).toBe('ok');
    expect(checkExercise(ex, 'neighbuor').verdict).toBe('typo');
    expect(checkExercise(ex, 'friend').verdict).toBe('wrong');
  });

  it('finds the gap and phrase tiles', () => {
    expect(gapParts('I can’t *afford* it.')).toEqual({ before: 'I can’t ', answer: 'afford', after: ' it.' });
    expect(gapParts('I’ll *pick* you *up*.')).toBeNull();
    expect(phraseTiles('By the way, …')).toEqual(['By', 'the', 'way']);
    expect(phraseTiles('Could you say that again?')).toEqual(['Could', 'you', 'say', 'that', 'again']);
  });

  it('shortens translations for games', () => {
    expect(shortRu('позволить себе (по деньгам, времени)')).toBe('позволить себе');
    expect(shortRu('снимать, арендовать')).toBe('снимать');
  });

  it('grades answers without self-rating', () => {
    expect(gradeFor('type-en', 'wrong', 1000, false)).toBe(1);
    expect(gradeFor('type-en', 'typo', 1000, false)).toBe(2);
    expect(gradeFor('type-en', 'ok', 3000, true)).toBe(2);
    expect(gradeFor('type-en', 'ok', 3000, false)).toBe(4);
    expect(gradeFor('pick-ru', 'ok', 1000, false)).toBe(3);
  });
});
