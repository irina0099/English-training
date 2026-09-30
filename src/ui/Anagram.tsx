import { useEffect, useMemo, useState } from 'preact/hooks';
import { makeRng, randomSeed, shuffle, type Rng } from '../engine/random';
import type { VocabItem } from '../types';
import { Example, SpeakButton } from './common';
import type { PoolId } from './Games';

const ROUND = 10;
const fits = (w: VocabItem) => /^[A-Za-z]{4,10}$/.test(w.en);

/** Own/difficult words first, topped up from the learner's level when there are too few. */
export function roundWords(words: VocabItem[], fallback: VocabItem[], count: number, rng: Rng, ok: (w: VocabItem) => boolean): VocabItem[] {
  const main = shuffle(words.filter(ok), rng);
  const extra = shuffle(fallback.filter((w) => ok(w) && !main.includes(w)), rng);
  return [...main, ...extra].slice(0, count);
}

function scramble(word: string, rng: Rng): string[] {
  const letters = word.toLowerCase().split('');
  let out = shuffle(letters, rng);
  for (let i = 0; i < 10 && out.join('') === letters.join(''); i++) out = shuffle(letters, rng);
  return out;
}

interface Result {
  item: VocabItem;
  solved: boolean;
  hinted: boolean;
}

export function Anagram({ words, fallback, pool }: { words: VocabItem[]; fallback: VocabItem[]; pool: PoolId }) {
  const [seed, setSeed] = useState(randomSeed);
  const list = useMemo(() => roundWords(words, fallback, ROUND, makeRng(seed), fits), [seed, pool, words.length]);
  return <Round key={seed} list={list} seed={seed} onAgain={() => setSeed(randomSeed())} />;
}

function Round({ list, seed, onAgain }: { list: VocabItem[]; seed: number; onAgain: () => void }) {
  const rng = useMemo(() => makeRng(seed + 1), [seed]);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const item = list[index];

  if (!item) {
    const solved = results.filter((r) => r.solved).length;
    return (
      <div class="stack">
        <div class="sheet stack">
          <p class="title">
            {solved} из {results.length}
          </p>
          <p class="muted">{solved === results.length ? 'Все слова собраны без пропусков.' : 'Пропущенные слова стоит повторить в словаре.'}</p>
        </div>
        <div class="list">
          {results.map((r) => (
            <div class="list-item" key={r.item.id} style={{ alignItems: 'flex-start' }}>
              <span class={`chip ${r.solved ? (r.hinted ? '' : 'chip-green') : 'chip-red'}`}>{r.solved ? (r.hinted ? 'с подсказкой' : 'верно') : 'пропуск'}</span>
              <div class="list-item-main">
                <b>
                  {r.item.en} <span class="muted">— {r.item.ru}</span>
                </b>
                {r.item.ex && <Example text={r.item.ex} />}
              </div>
            </div>
          ))}
        </div>
        <button type="button" class="btn btn-primary" onClick={onAgain}>
          Ещё 10 слов
        </button>
      </div>
    );
  }

  return (
    <Puzzle
      key={item.id}
      item={item}
      letters={scramble(item.en, rng)}
      position={`${index + 1} / ${list.length}`}
      onDone={(r) => {
        setResults((list) => [...list, r]);
        setIndex((i) => i + 1);
      }}
    />
  );
}

function Puzzle({ item, letters, position, onDone }: { item: VocabItem; letters: string[]; position: string; onDone: (r: Result) => void }) {
  const word = item.en.toLowerCase();
  const [chosen, setChosen] = useState<number[]>([]);
  const [hinted, setHinted] = useState(false);
  const [state, setState] = useState<'play' | 'right' | 'skipped'>('play');
  const [wrong, setWrong] = useState(false);
  const typed = chosen.map((i) => letters[i]).join('');

  const add = (i: number) => {
    if (state !== 'play' || chosen.includes(i) || chosen.length >= word.length) return;
    const next = [...chosen, i];
    setChosen(next);
    if (next.length === word.length) {
      if (next.map((k) => letters[k]).join('') === word) {
        setState('right');
        setTimeout(() => onDone({ item, solved: true, hinted }), 900);
      } else {
        setWrong(true);
        setTimeout(() => setWrong(false), 320);
      }
    }
  };

  const removeAt = (pos: number) => state === 'play' && setChosen((c) => c.filter((_, k) => k !== pos));

  const hint = () => {
    let prefix = 0;
    while (prefix < chosen.length && letters[chosen[prefix]] === word[prefix]) prefix++;
    const next: number[] = [];
    for (let k = 0; k <= Math.min(prefix, word.length - 1); k++) {
      const i = letters.findIndex((ch, idx) => ch === word[k] && !next.includes(idx));
      next.push(i);
    }
    setHinted(true);
    setChosen(next);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (state !== 'play') return;
      if (e.key === 'Backspace') {
        setChosen((c) => c.slice(0, -1));
        return;
      }
      const ch = e.key.toLowerCase();
      if (!/^[a-z]$/.test(ch)) return;
      const i = letters.findIndex((l, idx) => l === ch && !chosen.includes(idx));
      if (i >= 0) add(i);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div class="stack">
      <div class="row">
        <span class="muted small">{position}</span>
        <span class="spacer" />
        {item.pos && <span class="pos">{item.pos}</span>}
      </div>
      <div class="sheet stack-sm">
        <p class="prompt">{item.ru}</p>
      </div>
      <div class={`slots ${wrong ? 'shake' : ''}`} aria-label={`Собрано: ${typed}`}>
        {word.split('').map((_, pos) => (
          <button
            type="button"
            key={pos}
            class={`slot ${pos < chosen.length ? 'filled' : ''} ${state !== 'play' ? 'good' : ''}`}
            onClick={() => removeAt(pos)}
            aria-label={pos < chosen.length ? `Убрать букву ${letters[chosen[pos]]}` : 'Пустая клетка'}
          >
            {state === 'skipped' ? word[pos] : pos < chosen.length ? letters[chosen[pos]] : ''}
          </button>
        ))}
      </div>
      <div class="letters" hidden={state !== 'play'}>
        {letters.map((ch, i) => (
          <button type="button" key={i} class={`letter ${chosen.includes(i) ? 'used' : ''}`} onClick={() => add(i)} disabled={state !== 'play'}>
            {ch}
          </button>
        ))}
      </div>
      {state === 'play' ? (
        <div class="row" style={{ justifyContent: 'center' }}>
          <button type="button" class="btn btn-sm" onClick={hint}>
            Подсказка
          </button>
          <button type="button" class="btn btn-sm btn-ghost" onClick={() => setChosen([])}>
            Стереть
          </button>
          <button type="button" class="btn btn-sm btn-ghost" onClick={() => setState('skipped')}>
            Не знаю
          </button>
        </div>
      ) : (
        <div class="sheet stack">
          <div class="row">
            <span class="word">{item.en}</span>
            <SpeakButton text={item.en} />
          </div>
          {item.ex && <Example text={item.ex} ru={item.exRu} />}
          {state === 'skipped' && (
            <button type="button" class="btn btn-primary" onClick={() => onDone({ item, solved: false, hinted })}>
              Дальше
            </button>
          )}
        </div>
      )}
    </div>
  );
}
