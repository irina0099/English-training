import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { adjacent, DIFFICULTY, generateFilword, type Difficulty, type Filword as Puzzle, type PoolWord } from '../engine/filword';
import { makeRng, randomSeed } from '../engine/random';
import { shortRu } from '../engine/session';
import type { VocabItem } from '../types';
import { Example, SpeakButton } from './common';
import type { PoolId } from './Games';

const toPoolWord = (w: VocabItem): PoolWord => ({ word: w.en, itemId: w.id, clue: shortRu(w.ru) });

export function Filword({ words, fallback, pool }: { words: VocabItem[]; fallback: VocabItem[]; pool: PoolId }) {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [seed, setSeed] = useState(randomSeed);
  const items = useMemo(() => new Map([...fallback, ...words].map((w) => [w.id, w])), [pool, words.length]);

  const { puzzle, mixed } = useMemo(() => {
    const own = words.map(toPoolWord);
    const alone = generateFilword(own, difficulty, makeRng(seed));
    if (alone) return { puzzle: alone, mixed: false };
    const preferred = new Set(own.map((w) => w.itemId));
    return { puzzle: generateFilword([...own, ...fallback.map(toPoolWord)], difficulty, makeRng(seed), preferred), mixed: own.length > 0 };
  }, [seed, difficulty, pool, words.length]);

  return (
    <div class="stack">
      <div class="segmented" role="group" aria-label="Сложность">
        {(Object.keys(DIFFICULTY) as Difficulty[]).map((d) => (
          <button type="button" key={d} aria-pressed={difficulty === d} onClick={() => setDifficulty(d)}>
            {DIFFICULTY[d].label}
          </button>
        ))}
      </div>
      {mixed && <p class="muted small">Ваших слов подходящей длины не хватает на всю сетку, поэтому добавлены слова вашего уровня. Ваши слова стоят в сетке первыми.</p>}
      {puzzle ? (
        <Board key={`${seed}-${difficulty}-${pool}`} puzzle={puzzle} items={items} onNew={() => setSeed(randomSeed())} />
      ) : (
        <div class="sheet empty">
          <p>Не получилось собрать сетку из этих слов. Выберите другой набор или уровень сложности.</p>
        </div>
      )}
    </div>
  );
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function Board({ puzzle, items, onNew }: { puzzle: Puzzle; items: Map<string, VocabItem>; onNew: () => void }) {
  const { size, letters, words } = puzzle;
  const [found, setFound] = useState<Map<number, number>>(new Map());
  const [path, setPath] = useState<number[]>([]);
  const [hints, setHints] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState('Проведите пальцем или мышью по буквам слова.');
  const [shake, setShake] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [started] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  const dragging = useRef(false);
  const pathRef = useRef<number[]>([]);

  const complete = found.size === words.length;
  useEffect(() => {
    if (complete) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [complete]);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  useEffect(() => {
    if (complete && !finishedAt) setFinishedAt(Date.now());
  }, [complete]);

  const cellColor = useMemo(() => {
    const map = new Map<number, number>();
    found.forEach((color, wi) => words[wi].cells.forEach((c) => map.set(c, color)));
    return map;
  }, [found, words]);

  const updatePath = (next: number[]) => {
    pathRef.current = next;
    setPath(next);
  };

  const cellAt = (x: number, y: number): number | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const cell = el?.closest<HTMLElement>('[data-cell]');
    return cell ? Number(cell.dataset.cell) : null;
  };

  const extend = (target: number) => {
    const p = pathRef.current;
    const last = p[p.length - 1];
    if (last === undefined || target === last) return;
    if (p.length > 1 && target === p[p.length - 2]) return updatePath(p.slice(0, -1));
    // A quick swipe can skip cells: fill a straight run step by step.
    const lr = Math.floor(last / size);
    const lc = last % size;
    const tr = Math.floor(target / size);
    const tc = target % size;
    if (lr !== tr && lc !== tc) return;
    const step = lr === tr ? Math.sign(tc - lc) : Math.sign(tr - lr) * size;
    const next = p.slice();
    let cur = last;
    while (cur !== target) {
      const n = cur + step;
      if (!adjacent(cur, n, size) || next.includes(n) || cellColor.has(n)) break;
      next.push(n);
      cur = n;
    }
    if (next.length !== p.length) updatePath(next);
  };

  const flash = (text: string) => {
    setMessage(text);
    setShake(true);
    setTimeout(() => setShake(false), 320);
  };

  const finish = () => {
    const p = pathRef.current;
    dragging.current = false;
    updatePath([]);
    if (p.length < 2) return;
    const key = p.join(',');
    const rev = p.slice().reverse().join(',');
    const wi = words.findIndex((w, i) => !found.has(i) && (w.cells.join(',') === key || w.cells.join(',') === rev));
    if (wi >= 0) {
      const next = new Map(found);
      next.set(wi, (found.size % 6) + 1);
      setFound(next);
      setMessage(`${words[wi].word.toUpperCase()} — ${words[wi].clue}`);
      return;
    }
    const spelled = p.map((c) => letters[c]).join('');
    const reversed = spelled.split('').reverse().join('');
    if (words.some((w, i) => !found.has(i) && (w.word === spelled || w.word === reversed))) {
      flash('Такое слово есть, но в сетке оно идёт другим путём.');
    } else {
      flash(`«${spelled.toUpperCase()}» — такого слова здесь нет.`);
    }
  };

  const onDown = (e: PointerEvent) => {
    if (complete) return;
    const c = cellAt(e.clientX, e.clientY);
    if (c === null || cellColor.has(c)) return;
    dragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    updatePath([c]);
  };

  const onMove = (e: PointerEvent) => {
    if (!dragging.current) return;
    const c = cellAt(e.clientX, e.clientY);
    if (c !== null) extend(c);
  };

  const hint = () => {
    const open = words.map((_, i) => i).filter((i) => !found.has(i) && !hints.has(words[i].cells[0]));
    if (!open.length) return;
    const wi = open[Math.floor(Math.random() * open.length)];
    setHints(new Set([...hints, words[wi].cells[0]]));
    setMessage(`Слово «${words[wi].clue}» начинается с подсвеченной буквы.`);
  };

  const reveal = () => {
    const next = new Map(found);
    words.forEach((_, i) => {
      if (!next.has(i)) next.set(i, (next.size % 6) + 1);
    });
    setRevealed(true);
    setFound(next);
  };

  const selected = new Set(path);
  const elapsed = (finishedAt ?? now) - started;

  return (
    <div class="stack">
      <div class="row">
        <span class="muted small">
          Найдено {found.size} из {words.length}
        </span>
        <span class="spacer" />
        <span class="muted small" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatTime(elapsed)}
        </span>
      </div>
      <div
        class={`fw-grid ${shake ? 'shake' : ''}`}
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={finish}
        onPointerCancel={() => {
          dragging.current = false;
          updatePath([]);
        }}
      >
        {letters.map((ch, i) => {
          const color = cellColor.get(i);
          const cls = ['fw-cell', selected.has(i) ? 'sel' : '', color ? `found-${color}` : '', hints.has(i) && !color ? 'hint' : ''].join(' ');
          return (
            <div key={i} data-cell={i} class={cls}>
              {ch}
            </div>
          );
        })}
      </div>
      <p class="toast" aria-live="polite">
        {complete ? (revealed ? 'Ответы открыты.' : `Все слова найдены за ${formatTime(elapsed)}!`) : message}
      </p>

      <section class="section">
        <p class="section-title">Найдите по переводу</p>
        <div class="sheet">
        <ul class="clues">
          {words.map((w, i) => {
            const color = found.get(i);
            return (
              <li key={w.itemId} class={color ? 'done' : ''}>
                <span class="clue-swatch" style={{ background: color ? `var(--f${color})` : 'transparent' }} />
                <span>
                  {w.clue} <span class="muted">({w.word.length})</span>
                  {color && (
                    <>
                      {' '}
                      — <b>{w.word}</b>
                    </>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
        </div>
      </section>

      {!complete && (
        <div class="row">
          <button type="button" class="btn btn-sm" onClick={hint}>
            Подсказка
          </button>
          <button type="button" class="btn btn-sm btn-ghost" onClick={reveal}>
            Показать ответы
          </button>
          <span class="spacer" />
          <button type="button" class="btn btn-sm btn-ghost" onClick={onNew}>
            Новая сетка
          </button>
        </div>
      )}

      {complete && (
        <div class="stack">
          <p class="section-title">Слова из этой сетки</p>
          <div class="list">
            {words.map((w) => {
              const item = items.get(w.itemId);
              return (
                <div class="list-item" key={w.itemId} style={{ alignItems: 'flex-start' }}>
                  <div class="list-item-main">
                    <b>
                      {item?.en ?? w.word} <span class="muted">— {item?.ru ?? w.clue}</span>
                    </b>
                    {item?.ex && <Example text={item.ex} ru={item.exRu} />}
                  </div>
                  <SpeakButton text={item?.en ?? w.word} />
                </div>
              );
            })}
          </div>
          <button type="button" class="btn btn-primary" onClick={onNew}>
            Новая сетка
          </button>
        </div>
      )}
    </div>
  );
}
