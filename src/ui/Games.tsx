import { useState } from 'preact/hooks';
import { VOCAB } from '../content';
import { mistakesByItem } from '../engine/mistakes';
import type { AppData, VocabItem } from '../types';
import { Anagram } from './Anagram';
import { useData } from './hooks';
import { Filword } from './Filword';
import { BackButton, Row } from './common';
import { IconCards, IconGrid, IconShuffle } from './icons';
import { Pairs } from './Pairs';

export type GameId = 'filword' | 'anagram' | 'pairs';
export type PoolId = 'B1' | 'B2' | 'own' | 'hard';

const POOLS: [PoolId, string][] = [
  ['B1', 'B1'],
  ['B2', 'B2'],
  ['own', 'Mine'],
  ['hard', 'Tricky'],
];

const POOL_TITLE: Record<PoolId, string> = { B1: 'B1 words', B2: 'B2 words', own: 'My words', hard: 'Tricky words' };

const GAMES: { id: GameId; title: string; text: string; icon: preact.ComponentChildren; color: string }[] = [
  { id: 'filword', title: 'Fillword', text: 'Words bend like a snake and fill the whole grid. Find them from the Russian clues.', icon: <IconGrid size={18} />, color: 'var(--blue)' },
  { id: 'anagram', title: 'Anagrams', text: 'Put the letters in the right order. Good for spelling.', icon: <IconShuffle size={18} />, color: 'var(--purple)' },
  { id: 'pairs', title: 'Pairs', text: 'Match each word with its translation, fast and without mistakes.', icon: <IconCards size={18} />, color: 'var(--green)' },
];

/** Single words (not phrases) from the chosen pool. */
export function poolWords(d: AppData, pool: PoolId): VocabItem[] {
  const words = [...VOCAB, ...d.custom].filter((w) => w.kind === 'word');
  switch (pool) {
    case 'B1':
    case 'B2':
      return words.filter((w) => !w.custom && w.level === pool);
    case 'own':
      return words.filter((w) => w.custom);
    case 'hard': {
      const withMistakes = mistakesByItem(d.mistakes, Date.now());
      return words.filter((w) => withMistakes.has(w.id) || (d.states[w.id]?.lapses ?? 0) >= 1);
    }
  }
}

export function poolLabel(pool: PoolId): string {
  return POOL_TITLE[pool];
}

export function Games({ initial }: { initial: GameId | null }) {
  const d = useData();
  const [pool, setPool] = useState<PoolId>(d.settings.levels.includes('B1') ? 'B1' : 'B2');
  const [game, setGame] = useState<GameId | null>(initial);
  const words = poolWords(d, pool);
  const fallback = poolWords(d, d.settings.levels[0] ?? 'B1');

  if (game) {
    const meta = GAMES.find((g) => g.id === game)!;
    return (
      <div class="page">
        <div class="stack-sm">
          <BackButton label="Games" onClick={() => setGame(null)} />
          <h1 class="title">{meta.title}</h1>
          <p class="subtitle">{poolLabel(pool)}</p>
        </div>
        {game === 'filword' && <Filword words={words} fallback={fallback} pool={pool} />}
        {game === 'anagram' && <Anagram words={words} fallback={fallback} pool={pool} />}
        {game === 'pairs' && <Pairs words={words} fallback={fallback} pool={pool} />}
      </div>
    );
  }

  return (
    <div class="page">
      <div class="stack-sm">
        <h1 class="title">Games</h1>
        <p class="subtitle">A relaxed way to meet words again. After each game you can add new words to your practice.</p>
      </div>
      <div class="section">
        <p class="section-title">Word set</p>
        <div class="segmented" role="group" aria-label="Word set">
          {POOLS.map(([id, label]) => (
            <button type="button" key={id} aria-pressed={pool === id} onClick={() => setPool(id)}>
              {label}
            </button>
          ))}
        </div>
        <p class="footnote">
          {words.length
            ? `${words.length} words in this set.`
            : pool === 'own'
              ? 'You haven’t added any words yet. For now the games will use words from your level.'
              : 'No tricky words yet — words you get wrong will appear here. For now the games will use words from your level.'}
        </p>
      </div>
      <div class="list with-icons">
        {GAMES.map((g) => (
          <Row key={g.id} icon={g.icon} color={g.color} title={g.title} subtitle={g.text} onClick={() => setGame(g.id)} />
        ))}
      </div>
    </div>
  );
}
