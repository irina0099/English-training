import { describe, expect, it } from 'vitest';
import { activeItems, PHRASES, RULES, VOCAB, WORDS_B1 } from '../src/content';
import { makeRng } from '../src/engine/random';
import { buildTasks, planItems } from '../src/engine/session';
import { addToPractice, getData, recordAnswer, resetProgress } from '../src/engine/store';
import { isFixed } from '../src/engine/mistakes';

const cyrillic = /[Ѐ-ӿ]/;

describe('English first', () => {
  it('has every rule in English with a Russian version', () => {
    for (const r of RULES) {
      // False friends name the Russian look-alikes on purpose.
      if (r.id !== 'false-friends') expect(cyrillic.test(r.title + r.summary + r.points.join('')), r.id).toBe(false);
      expect(cyrillic.test(r.ru.summary), r.id).toBe(true);
    }
  });

  it('describes phrase situations in English, keeping the Russian text', () => {
    for (const p of PHRASES) {
      expect(cyrillic.test(p.sit!), p.en).toBe(false);
      expect(p.sitRu, p.en).toBeTruthy();
    }
  });

  it('writes usage notes in English', () => {
    for (const v of VOCAB) {
      // Russian words may appear only as quoted false friends: «магазин».
      const outsideQuotes = (v.note ?? '').replace(/«[^»]*»/g, '').replace(/^(Магазин|Фабрика) is/, '');
      expect(cyrillic.test(outsideQuotes), `${v.en}: ${v.note}`).toBe(false);
    }
  });
});

describe('add to practice after a game', () => {
  it('puts the chosen words on the mistakes list and at the front of new words', () => {
    resetProgress();
    const chosen = [WORDS_B1[40], WORDS_B1[80]];
    addToPractice(chosen);
    const d = getData();
    expect(d.mistakes.filter((m) => m.cat === 'games').map((m) => m.id)).toEqual(chosen.map((w) => w.id));

    const ctx = {
      items: activeItems(['B1'], []),
      vocab: VOCAB,
      states: d.states,
      mistakes: d.mistakes,
      now: Date.now(),
      size: 10,
      newLeft: 10,
      rng: makeRng(7),
    };
    const daily = planItems({ kind: 'daily' }, ctx).map((i) => i.id);
    expect(daily).toEqual(expect.arrayContaining(chosen.map((w) => w.id)));
    const review = planItems({ kind: 'mistakes' }, ctx).map((i) => i.id);
    expect(review.slice(0, 2).sort()).toEqual(chosen.map((w) => w.id).sort());
    // Unseen words start with an introduction card.
    expect(buildTasks(planItems({ kind: 'mistakes' }, ctx), ctx)[0].ex.t).toBe('intro');
  });

  it('counts "Got it" on a flashcard towards fixing the word', () => {
    resetProgress();
    const word = WORDS_B1[5];
    addToPractice([word]);
    const t0 = Date.now();
    for (let i = 0; i < 3; i++) recordAnswer({ t: 'card', item: word }, 'ok', '', 3, false, t0 + i * 3 * 86400000, false);
    expect(isFixed(getData().states[word.id])).toBe(true);
  });

  it('does not log "Again" on a flashcard as a new mistake', () => {
    resetProgress();
    const word = WORDS_B1[6];
    recordAnswer({ t: 'card', item: word }, 'wrong', '', 1, false, Date.now(), false);
    expect(getData().mistakes).toHaveLength(0);
    expect(getData().states[word.id].lapses).toBe(1);
  });
});
