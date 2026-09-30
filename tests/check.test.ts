import { describe, expect, it } from 'vitest';
import { checkAnswer, distance, normalize } from '../src/engine/check';

describe('normalize', () => {
  it('expands contractions and drops punctuation', () => {
    expect(normalize("I'm fine.")).toBe('i am fine');
    expect(normalize('I’m not sure about that!')).toBe('i am not sure about that');
    expect(normalize('can’t')).toBe(normalize('cannot'));
    expect(normalize('mustn’t')).toBe(normalize('must not'));
  });
});

describe('checkAnswer', () => {
  it('accepts leading "to" and articles in vocabulary mode', () => {
    expect(checkAnswer('to afford', ['afford'], { lenient: true })).toBe('ok');
    expect(checkAnswer('a receipt', ['receipt'], { lenient: true })).toBe('ok');
  });

  it('marks a close spelling as a typo', () => {
    expect(checkAnswer('reciept', ['receipt'], { lenient: true })).toBe('typo');
    expect(checkAnswer('opportunty', ['opportunity'], { lenient: true })).toBe('typo');
    expect(checkAnswer('table', ['receipt'], { lenient: true })).toBe('wrong');
  });

  it('accepts British and American spelling', () => {
    expect(checkAnswer('neighbor', ['neighbour'], { lenient: true })).toBe('ok');
    expect(checkAnswer('apologize', ['apologise'], { lenient: true })).toBe('ok');
    expect(checkAnswer('center', ['centre'], { lenient: true })).toBe('ok');
  });

  it('is strict for grammar drills', () => {
    expect(checkAnswer('on', ['in'])).toBe('wrong');
    expect(checkAnswer('made', ['make'])).toBe('wrong');
    expect(checkAnswer('To buy', ['to buy'])).toBe('ok');
    expect(checkAnswer("mustn't", ['mustn’t'])).toBe('ok');
    expect(checkAnswer('', ['in'])).toBe('wrong');
  });

  it('does not treat short words as typos', () => {
    expect(checkAnswer('at', ['on'], { lenient: true })).toBe('wrong');
  });
});

describe('distance', () => {
  it('counts a swap of neighbours as one edit', () => {
    expect(distance('ei', 'ie')).toBe(1);
    expect(distance('kitten', 'sitting')).toBe(3);
  });
});
