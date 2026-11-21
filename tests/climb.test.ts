import { describe, expect, it } from 'vitest';
import { climbOf, METERS, PEAKS, position } from '../src/engine/climb';
import { defaultData } from '../src/engine/store';
import { lemmaCandidates } from '../src/reading/lookup';

describe('climb', () => {
  it('moves up with every finished lesson and article', () => {
    const d = defaultData();
    expect(climbOf(d, 0).total).toBe(0);
    d.days['2026-11-20'] = { n: 10, ok: 0, new: 0, lessons: 2 };
    expect(climbOf(d, 0).total).toBe(2 * METERS.lesson);
    expect(climbOf(d, 1).total).toBe(2 * METERS.lesson + METERS.page);
  });

  it('starts the next mountain after the summit', () => {
    const c = position(PEAKS[0].h + 100);
    expect(c.peakIndex).toBe(1);
    expect(c.inPeak).toBe(100);
    expect(c.next?.name).toBe('Lower hut');
  });

  it('says how many lessons are left to the next camp', () => {
    const c = position(0);
    expect(c.next?.lessons).toBe(Math.ceil((PEAKS[0].h * 0.25) / METERS.lesson));
  });
});

describe('lemmaCandidates', () => {
  it('finds dictionary forms of words met in a text', () => {
    expect(lemmaCandidates('decided')).toContain('decide');
    expect(lemmaCandidates('studies')).toContain('study');
    expect(lemmaCandidates('stopped')).toContain('stop');
    expect(lemmaCandidates('making')).toContain('make');
    expect(lemmaCandidates('emissions')).toContain('emission');
  });
});
