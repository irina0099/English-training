import { useEffect, useMemo, useState } from 'preact/hooks';
import { makeRng, randomSeed, shuffle } from '../engine/random';
import { recordAnswer } from '../engine/store';
import type { Item } from '../types';
import { count, Example, LevelChip, RuleNote, SpeakButton, Translation } from './common';

export interface Deck {
  title: string;
  items: Item[];
}

type Side = 'en' | 'ru';

/**
 * Classic flashcards: look at the front, try to remember, flip, then say
 * honestly whether you knew it. "Got it" moves the card along the schedule
 * and counts towards fixing a mistake; "Again" brings it back sooner.
 */
export function Flashcards({ deck, onClose }: { deck: Deck; onClose: () => void }) {
  const [round, setRound] = useState(() => ({ items: shuffle(deck.items, makeRng(randomSeed())), retry: false }));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [front, setFront] = useState<Side>('en');
  const [missed, setMissed] = useState<Item[]>([]);
  const [known, setKnown] = useState(0);
  const item = round.items[index];

  const answer = (knewIt: boolean) => {
    if (!item || !flipped) return;
    recordAnswer({ t: 'card', item }, knewIt ? 'ok' : 'wrong', '', knewIt ? 3 : 1, round.retry, Date.now(), false);
    if (knewIt) setKnown((n) => n + 1);
    else setMissed((list) => [...list, item]);
    setFlipped(false);
    setIndex((i) => i + 1);
  };

  const again = () => {
    setRound({ items: shuffle(missed, makeRng(randomSeed())), retry: true });
    setMissed([]);
    setKnown(0);
    setIndex(0);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === '1') answer(false);
      else if (e.key === '2') answer(true);
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const progress = round.items.length ? (index / round.items.length) * 100 : 0;

  return (
    <div class="session" role="dialog" aria-label={deck.title}>
      <div class="session-bar">
        <div class="session-top">
          <button type="button" class="nav-btn" style={{ justifySelf: 'start' }} onClick={onClose}>
            Close
          </button>
          <span class="counter">{item ? `${index + 1} of ${round.items.length}` : deck.title}</span>
          <button
            type="button"
            class="nav-btn"
            style={{ justifySelf: 'end' }}
            onClick={() => {
              setFront(front === 'en' ? 'ru' : 'en');
              setFlipped(false);
            }}
            aria-label="Switch which side comes first"
          >
            {front === 'en' ? 'EN → RU' : 'RU → EN'}
          </button>
        </div>
        <div class="session-progress" aria-hidden="true">
          <i style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div class="session-inner">
        {item ? (
          <>
            <div class="row">
              <p class="task-kind">{round.retry ? 'Second round · ' : ''}{deck.title}</p>
              <span class="spacer" />
              <LevelChip item={item} />
            </div>
            <Card key={`${round.retry}-${index}`} item={item} front={front} flipped={flipped} onFlip={() => setFlipped(!flipped)} />
            {flipped ? (
              <div class="row card-actions">
                <button type="button" class="btn btn-danger" onClick={() => answer(false)}>
                  Again
                </button>
                <button type="button" class="btn btn-success" onClick={() => answer(true)}>
                  Got it
                </button>
              </div>
            ) : (
              <button type="button" class="btn btn-primary btn-block" onClick={() => setFlipped(true)}>
                Show answer
              </button>
            )}
            <p class="footnote" style={{ textAlign: 'center' }}>
              Tap the card to flip it. Keyboard: Space to flip, 1 — Again, 2 — Got it.
            </p>
          </>
        ) : (
          <Finished deck={deck} known={known} missed={missed} total={round.items.length} onAgain={again} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

function Finished({ deck, known, missed, total, onAgain, onClose }: { deck: Deck; known: number; missed: Item[]; total: number; onAgain: () => void; onClose: () => void }) {
  return (
    <div class="stack">
      <div class="sheet stack">
        <p class="section-title" style={{ paddingInline: 0 }}>
          {deck.title}
        </p>
        <p class="title-2">
          You knew {known} of {total}
        </p>
        <p class="muted">
          {missed.length === 0
            ? 'Every card is done. Cards you know three times in a row leave the mistakes list.'
            : 'The cards you missed will come back sooner in your practice.'}
        </p>
      </div>
      {missed.length > 0 && (
        <div class="list">
          {missed.map((m) => (
            <div class="list-item" key={m.id}>
              <span class="list-item-main">
                <b>{m.kind === 'drill' ? fillGap(m.q, m.a) : m.en}</b>
                {m.kind !== 'drill' && <span lang="ru">{m.ru}</span>}
              </span>
            </div>
          ))}
        </div>
      )}
      <div class="sticky-actions">
        {missed.length > 0 && (
          <button type="button" class="btn" onClick={onAgain}>
            Repeat {count(missed.length, 'card')}
          </button>
        )}
        <button type="button" class="btn btn-primary" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

function fillGap(q: string, a: string): string {
  return q.includes('___') ? q.replace('___', a) : a;
}

function Card({ item, front, flipped, onFlip }: { item: Item; front: Side; flipped: boolean; onFlip: () => void }) {
  const faces = useMemo(() => cardFaces(item, front), [item, front]);
  return (
    <div
      class="flashcard"
      role="button"
      tabIndex={0}
      aria-label={flipped ? 'Card, answer side. Tap to see the question.' : 'Card, question side. Tap to see the answer.'}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        onFlip();
      }}
    >
      <div class={`flashcard-inner ${flipped ? 'flipped' : ''}`}>
        <div class="face" aria-hidden={flipped}>
          {faces.front}
        </div>
        <div class="face back" aria-hidden={!flipped}>
          {faces.back}
        </div>
      </div>
    </div>
  );
}

function cardFaces(item: Item, front: Side) {
  if (item.kind === 'drill') {
    return {
      front: (
        <>
          <p class="face-label">{item.fix ? 'Correct this sentence' : 'Fill the gap'}</p>
          <p class="face-text">{item.q.replace('___', '…')}</p>
        </>
      ),
      back: (
        <>
          <p class="face-label">Answer</p>
          <Example text={item.fix ? `*${item.a}*` : item.q.replace('___', `*${item.a}*`)} ru={item.ru} />
          <RuleNote ruleId={item.rule} />
        </>
      ),
    };
  }
  const english = (sub = false) => (
    <div class="row" style={{ justifyContent: 'center' }}>
      <span class={sub ? 'face-word face-sub' : 'face-word'}>{item.en}</span>
      <SpeakButton text={item.en} />
    </div>
  );
  const russian = (sub = false) => (
    <p class={sub ? 'face-word face-sub' : 'face-word'} lang="ru">
      {item.ru}
    </p>
  );
  return {
    front: (
      <>
        <p class="face-label">{front === 'en' ? 'What does it mean?' : 'Say it in English'}</p>
        {front === 'en' ? english() : russian()}
        {item.pos && <p class="pos">{item.pos}</p>}
      </>
    ),
    back: (
      <>
        {/* The answer first and large, the question below it. */}
        {front === 'en' ? russian() : english()}
        {front === 'en' ? english(true) : russian(true)}
        {item.ex && <Example text={item.ex} ru={item.exRu} />}
        {item.note && <p class="note">{item.note}</p>}
        {item.sit && <Translation text={item.sit} label="When do people say it?" lang="en" />}
      </>
    ),
  };
}
