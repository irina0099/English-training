import { describe, expect, it } from 'vitest';
import { addIssue, articleAt, getReading, placeOf, removeIssue, resumeOf, setLast, setPlace } from '../src/reading/store';
import type { Issue } from '../src/reading/types';

const mag = (id: string): Issue => ({
  id,
  magazine: 'Test Weekly',
  issue: 'May',
  date: '',
  theme: 'mag-pdf',
  cover: { bg: '#000', fg: '#fff', accent: '#f90' },
  file: `pdf-${id}`,
  pages: [
    { id: 'a0', topic: 'Contents', title: 'Cover', html: '', pdf: { from: 1, to: 5 } },
    { id: 'a1', topic: 'Contents', title: 'Up with the lark', html: '', pdf: { from: 6, to: 13 } },
    { id: 'a2', topic: 'Contents', title: 'Spring forth', html: '', pdf: { from: 14, to: 15 } },
  ],
});

describe('where reading stopped', () => {
  it('opens a new magazine at its first article', () => {
    const iss = mag('m1');
    addIssue(iss);
    expect(resumeOf(iss)).toEqual({ page: iss.pages[0] });
  });

  it('opens at the page it was left on, inside the right article', () => {
    const iss = mag('m2');
    addIssue(iss);
    setLast(iss.id, 'a0');
    setPlace(iss.id, { pg: 9, y: 0.4321 });
    expect(resumeOf(iss)).toEqual({ page: iss.pages[1], at: { pg: 9, y: 0.43 } });
  });

  it('keeps one place per magazine', () => {
    const a = mag('m3');
    const b = mag('m4');
    addIssue(a);
    addIssue(b);
    setPlace(a.id, { pg: 14, y: 0 });
    setPlace(b.id, { pg: 2, y: 0.5 });
    expect(resumeOf(a).page.title).toBe('Spring forth');
    expect(resumeOf(b).at).toEqual({ pg: 2, y: 0.5 });
  });

  it('finds the article a page belongs to', () => {
    const iss = mag('m5');
    expect([1, 5, 6, 13, 14, 15].map((pg) => articleAt(iss, pg).id)).toEqual(['a0', 'a0', 'a1', 'a1', 'a2', 'a2']);
  });

  it('does not save the same place twice, and forgets it with the magazine', () => {
    const iss = mag('m6');
    addIssue(iss);
    setPlace(iss.id, { pg: 3, y: 0.25 });
    const before = getReading();
    setPlace(iss.id, { pg: 3, y: 0.251 });
    expect(getReading()).toBe(before);
    removeIssue(iss.id);
    expect(placeOf(iss.id)).toBeUndefined();
  });
});

describe('the demo issue', () => {
  it('can be hidden from the library and brought back, notes kept', async () => {
    const { allIssues, setDemoHidden, updateNotes, notesOf } = await import('../src/reading/store');
    const { ISSUES } = await import('../src/reading/issues');
    const demo = ISSUES[0];
    updateNotes(demo.id, demo.pages[0].id, { read: 1 });
    setLast(demo.id, demo.pages[0].id);

    setDemoHidden(true);
    expect(allIssues().some((i) => i.id === demo.id)).toBe(false);
    // "Continue reading" no longer points at a hidden issue.
    expect(getReading().last).toBeUndefined();

    setDemoHidden(false);
    expect(allIssues().some((i) => i.id === demo.id)).toBe(true);
    expect(notesOf(demo.id, demo.pages[0].id).read).toBe(1);
  });
});
