import type { Level, VocabItem } from '../types';

/** [english, russian, part of speech, example with *target*, example translation, extra fields] */
export type Row = [string, string, string, string, string, Partial<VocabItem>?];

export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildVocab(level: Level, kind: 'word' | 'phrase', rows: Row[]): VocabItem[] {
  return rows.map(([en, ru, pos, ex, exRu, extra]) => ({
    id: `${level.toLowerCase()}-${kind === 'phrase' ? 'p-' : ''}${slug(en)}`,
    kind,
    en,
    ru,
    level,
    pos,
    ex,
    exRu,
    ...extra,
  }));
}
