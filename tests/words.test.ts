import { describe, expect, it } from 'vitest';
import { createCustomWord, markTarget, parseBulk } from '../src/engine/words';
import { gapParts } from '../src/engine/session';

describe('markTarget', () => {
  it('marks the word and its inflected forms', () => {
    expect(markTarget('I boiled the kettle.', 'kettle')).toBe('I boiled the *kettle*.');
    expect(markTarget('We decided to go.', 'decide')).toBe('We *decided* to go.');
    expect(markTarget('She is studying hard.', 'study')).toBe('She is *studying* hard.');
    expect(markTarget('He studies law.', 'study')).toBe('He *studies* law.');
    expect(markTarget('They stopped talking.', 'stop')).toBe('They *stopped* talking.');
    expect(markTarget('Kettles are cheap.', 'kettle')).toBe('*Kettles* are cheap.');
  });

  it('marks phrasal verbs and phrases', () => {
    expect(markTarget('I need to look into it.', 'look into')).toBe('I need to *look into* it.');
    expect(markTarget('She gave up smoking.', 'give up')).toBe('She gave up smoking.');
  });

  it('leaves the example alone when the word is missing or already marked', () => {
    expect(markTarget('Nothing here.', 'kettle')).toBe('Nothing here.');
    expect(markTarget('A *big* kettle.', 'kettle')).toBe('A *big* kettle.');
    expect(markTarget('The cattle are here.', 'cat')).toBe('The cattle are here.');
  });
});

describe('createCustomWord', () => {
  it('builds a trainable own word with a gap example', () => {
    const w = createCustomWord({ en: ' kettle ', ru: 'чайник', ex: 'Put the kettle on.', level: null });
    expect(w.custom).toBe(true);
    expect(w.kind).toBe('word');
    expect(w.id).toMatch(/^u-/);
    expect(gapParts(w.ex)?.answer).toBe('kettle');
  });

  it('treats sentences as phrases', () => {
    expect(createCustomWord({ en: 'Break a leg!', ru: 'Ни пуха ни пера!', level: 'B2' }).kind).toBe('phrase');
  });
});

describe('parseBulk', () => {
  it('reads lines with different separators', () => {
    const { drafts, errors } = parseBulk('kettle — чайник — Put the kettle on.\nstove\tплита\nsink; раковина\n\nбред', null);
    expect(drafts.map((d) => d.en)).toEqual(['kettle', 'stove', 'sink']);
    expect(drafts[0].ex).toBe('Put the kettle on.');
    expect(errors).toHaveLength(1);
  });

  it('keeps hyphenated words intact', () => {
    const { drafts } = parseBulk('well-known - известный', 'B1');
    expect(drafts[0]).toMatchObject({ en: 'well-known', ru: 'известный', level: 'B1' });
  });

  it('rejects reversed lines', () => {
    expect(parseBulk('чайник - kettle', null).errors).toHaveLength(1);
  });
});
