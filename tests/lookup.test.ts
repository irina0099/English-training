import { describe, expect, it } from 'vitest';
import { pickTranslations, type TranslatorReply } from '../src/reading/lookup';

// Replies recorded from the translator the app uses (MyMemory), trimmed.
const reply = (best: string, matches: [string, string][]): TranslatorReply => ({
  responseData: { translatedText: best },
  matches: matches.map(([translation, by]) => ({ translation, 'created-by': by })),
});

describe('pickTranslations', () => {
  it('puts machine translation before a stray memory entry', () => {
    const r = reply('Вкус', [['Вкус', 'Wikipedia'], ['пряный', 'MT!'], ['Свежий, терпкий, смелый.', 'Public_Corpora']]);
    expect(pickTranslations('tangy', r)).toEqual(['пряный', 'вкус']);
  });

  it('skips an answer left in English', () => {
    const r = reply('Rind', [['Rind', 'Public_Corpora'], ['кожура', 'MT!'], ['Шкварки', 'Wikipedia']]);
    expect(pickTranslations('rind', r)).toEqual(['кожура', 'шкварки']);
  });

  it('keeps the other guesses when there is no machine translation, without junk', () => {
    const r = reply('уравновешивание', [['уравновешивание', 'MateCat'], ['atmospheric', 'MateCat'], ['Атмосферный', 'MateCat']]);
    expect(pickTranslations('atmospheric', r)).toEqual(['уравновешивание', 'атмосферный']);
    const e = reply('результативный', [['результативный', 'MateCat'], ['эффективный', 'MateCat'], ['???', 'MateCat']]);
    expect(pickTranslations('efficient', e)).toEqual(['результативный', 'эффективный']);
  });

  it('keeps short phrases and drops sentences', () => {
    const r = reply('Сосновый конус', [['Сосновый конус', 'MateCat'], ['Шишка', 'Wikipedia'], ['Варенье из сосновой шишки', 'MateCat'], ['Я купил варенье из сосновой шишки на рынке.', 'MateCat']]);
    expect(pickTranslations('pine cone', r)).toEqual(['сосновый конус', 'шишка', 'варенье из сосновой шишки']);
  });

  it('keeps a capital letter for a capitalised word', () => {
    expect(pickTranslations('London', reply('Лондон', [['Лондон', 'MateCat']]))).toEqual(['Лондон']);
  });
});
