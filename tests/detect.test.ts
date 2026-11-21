import { describe, expect, it } from 'vitest';
import { detectArticles, headline, type TextRun } from '../src/reading/detect';

const body = (n: number): TextRun[] => Array.from({ length: n }, (_, i) => ({ str: 'Some ordinary body text on the page.', size: 9, x: 40, y: 700 - i * 12 }));
const head = (str: string, size = 36): TextRun => ({ str, size, x: 40, y: 760 });

describe('detectArticles', () => {
  it('starts an article on each page with a headline and keeps following pages with it', () => {
    const pages = [[head('COVER LINE'), ...body(5)], [head('The night train north'), ...body(40)], body(50), [head('In praise of soup'), ...body(40)], body(40)];
    const arts = detectArticles(pages);
    expect(arts.map((a) => [a.title, a.pdf!.from, a.pdf!.to])).toEqual([
      ['Cover', 1, 1],
      ['The night train north', 2, 3],
      ['In praise of soup', 4, 5],
    ]);
  });

  it('ignores broken fonts, lone letters and headlines printed twice', () => {
    expect(headline([head('!"#$%&'), head('A', 60), head('Making'), head('things last'), head('Making'), head('things last'), ...body(3)])?.text).toBe('Making things last');
  });

  it('does not list a magazine page by page when it finds no headlines', () => {
    const arts = detectArticles(Array.from({ length: 30 }, () => body(40)));
    expect(arts.length).toBeLessThanOrEqual(4);
  });
});
