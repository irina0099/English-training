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
  ['own', 'Мои'],
  ['hard', 'Сложные'],
];

const POOL_TITLE: Record<PoolId, string> = { B1: 'Слова B1', B2: 'Слова B2', own: 'Мои слова', hard: 'Сложные для меня' };

const GAMES: { id: GameId; title: string; text: string; icon: preact.ComponentChildren; color: string }[] = [
  { id: 'filword', title: 'Филворд', text: 'Слова идут змейкой и занимают всю сетку. Ищите их по переводу.', icon: <IconGrid size={18} />, color: 'var(--blue)' },
  { id: 'anagram', title: 'Анаграммы', text: 'Соберите слово из перепутанных букв — тренирует написание.', icon: <IconShuffle size={18} />, color: 'var(--purple)' },
  { id: 'pairs', title: 'Пары', text: 'Соедините слово с переводом быстро и без ошибок.', icon: <IconCards size={18} />, color: 'var(--green)' },
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
          <BackButton label="Игры" onClick={() => setGame(null)} />
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
        <h1 class="title">Игры</h1>
        <p class="subtitle">Лёгкий способ повторить слова. На расписание повторений игры не влияют.</p>
      </div>
      <div class="section">
        <p class="section-title">Какие слова</p>
        <div class="segmented" role="group" aria-label="Набор слов">
          {POOLS.map(([id, label]) => (
            <button type="button" key={id} aria-pressed={pool === id} onClick={() => setPool(id)}>
              {label}
            </button>
          ))}
        </div>
        <p class="footnote">
          {words.length
            ? `В наборе ${words.length} слов.`
            : pool === 'own'
              ? 'Своих слов пока нет — добавьте их в словаре. Пока игры возьмут слова вашего уровня.'
              : 'Сложных слов пока нет: сюда попадают слова, в которых вы ошибались. Пока игры возьмут слова вашего уровня.'}
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
