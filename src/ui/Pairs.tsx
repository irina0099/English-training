import { useEffect, useMemo, useState } from 'preact/hooks';
import { makeRng, randomSeed, shuffle } from '../engine/random';
import { shortRu } from '../engine/session';
import type { VocabItem } from '../types';
import { roundWords } from './Anagram';
import { AddToPractice } from './AddToPractice';
import type { PoolId } from './Games';

const PAIRS = 6;

export function Pairs({ words, fallback, pool }: { words: VocabItem[]; fallback: VocabItem[]; pool: PoolId }) {
  const [seed, setSeed] = useState(randomSeed);
  const set = useMemo(() => {
    const rng = makeRng(seed);
    const seen = new Set<string>();
    // Translations must differ, or two answers would be right.
    const unique = (w: VocabItem) => {
      const ru = shortRu(w.ru);
      if (seen.has(ru)) return false;
      seen.add(ru);
      return true;
    };
    const chosen = roundWords(words, fallback, 40, rng, () => true).filter(unique).slice(0, PAIRS);
    return { en: shuffle(chosen, rng), ru: shuffle(chosen, rng) };
  }, [seed, pool, words.length]);
  return <Board key={seed} en={set.en} ru={set.ru} onAgain={() => setSeed(randomSeed())} />;
}

function Board({ en, ru, onAgain }: { en: VocabItem[]; ru: VocabItem[]; onAgain: () => void }) {
  const [pickEn, setPickEn] = useState<string | null>(null);
  const [pickRu, setPickRu] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [bad, setBad] = useState<[string, string] | null>(null);
  const [errors, setErrors] = useState(0);
  /** Words involved in a wrong match. */
  const [confused, setConfused] = useState<Set<string>>(new Set());
  const [started] = useState(Date.now());
  const [finished, setFinished] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (finished) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [finished]);

  const check = (a: string | null, b: string | null) => {
    if (!a || !b) return;
    if (a === b) {
      const next = new Set(done).add(a);
      setDone(next);
      setPickEn(null);
      setPickRu(null);
      if (next.size === en.length) setFinished(Date.now());
    } else {
      setBad([a, b]);
      setErrors((n) => n + 1);
      setConfused((s) => new Set([...s, a, b]));
      setTimeout(() => {
        setBad(null);
        setPickEn(null);
        setPickRu(null);
      }, 600);
    }
  };

  const tapEn = (id: string) => {
    if (bad) return;
    setPickEn(id);
    check(id, pickRu);
  };
  const tapRu = (id: string) => {
    if (bad) return;
    setPickRu(id);
    check(pickEn, id);
  };

  const seconds = (((finished ?? now) - started) / 1000).toFixed(1);

  if (finished) {
    return (
      <div class="stack">
        <div class="sheet stack">
          <p class="title">{seconds} s</p>
          <p class="muted">{errors === 0 ? 'No mistakes at all!' : `Mistakes: ${errors}.`}</p>
        </div>
        <AddToPractice items={en} preselected={confused} examples />
        <button type="button" class="btn" onClick={onAgain}>
          Another round
        </button>
      </div>
    );
  }

  const cls = (id: string, side: 'en' | 'ru') => {
    const picked = side === 'en' ? pickEn === id : pickRu === id;
    const isBad = bad && (side === 'en' ? bad[0] === id : bad[1] === id);
    return `pair ${side} ${done.has(id) ? 'done' : ''} ${isBad ? 'bad' : picked ? 'sel' : ''}`;
  };

  return (
    <div class="stack">
      <div class="row">
        <span class="muted small">
          Pairs: {done.size} of {en.length} · mistakes: {errors}
        </span>
        <span class="spacer" />
        <span class="muted small" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {seconds} s
        </span>
      </div>
      <div class="pairs">
        {en.map((w, i) => [
          <button type="button" key={`en-${w.id}`} class={cls(w.id, 'en')} onClick={() => tapEn(w.id)} lang="en">
            {w.en}
          </button>,
          <button type="button" key={`ru-${ru[i].id}`} class={cls(ru[i].id, 'ru')} onClick={() => tapRu(ru[i].id)}>
            {shortRu(ru[i].ru)}
          </button>,
        ])}
      </div>
    </div>
  );
}
