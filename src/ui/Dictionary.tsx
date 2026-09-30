import { useMemo, useState } from 'preact/hooks';
import { FAMILIES, VOCAB } from '../content';
import { isFixed, mistakesByItem } from '../engine/mistakes';
import { stage } from '../engine/fsrs';
import { makeRng, randomSeed, shuffle } from '../engine/random';
import { gapParts } from '../engine/session';
import { deleteCustomWord, getData, MAX_CUSTOM_WORDS, saveCustomWord, saveCustomWords } from '../engine/store';
import { createCustomWord, markTarget, parseBulk, sameWord, type WordDraft } from '../engine/words';
import type { Level, VocabItem } from '../types';
import { ConfirmButton, count, dueLabel, LevelChip, Modal, StageDot, WordCard } from './common';
import { useNav } from './context';
import { useData } from './hooks';
import { IconChevron, IconPlus, IconSearch } from './icons';

type Filter = 'all' | 'B1' | 'B2' | 'phrasal' | 'phrases' | 'own' | 'hard';

const FILTERS: [Filter, string][] = [
  ['all', 'All'],
  ['B1', 'B1'],
  ['B2', 'B2'],
  ['phrasal', 'Phrasal verbs'],
  ['phrases', 'Phrases'],
  ['own', 'Mine'],
  ['hard', 'Tricky'],
];

const DECK_SIZE = 30;
const FILTER_DECK: Record<Filter, string> = {
  all: 'Word cards',
  B1: 'B1 cards',
  B2: 'B2 cards',
  phrasal: 'Phrasal verb cards',
  phrases: 'Phrase cards',
  own: 'My word cards',
  hard: 'Tricky word cards',
};

/** Verbs with several phrasal verbs get their own group; the rest share one. */
const BIG_FAMILIES = FAMILIES.filter((f) => f.items.length >= 2);
const OTHER_PHRASAL = FAMILIES.filter((f) => f.items.length < 2).flatMap((f) => f.items);
const STAGE_ORDER = { learning: 0, new: 1, known: 2, mastered: 3 } as const;

/** Up to 30 cards: open mistakes first, then words being learnt, new ones, and known ones last. */
function deckFrom(list: VocabItem[]): VocabItem[] {
  const d = getData();
  const withMistakes = mistakesByItem(d.mistakes, Date.now());
  const rank = (w: VocabItem) => (withMistakes.has(w.id) && !isFixed(d.states[w.id]) ? -1 : STAGE_ORDER[stage(d.states[w.id])]);
  return shuffle(list, makeRng(randomSeed()))
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, DECK_SIZE);
}

export function Dictionary() {
  const d = useData();
  const nav = useNav();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<VocabItem | 'new' | null>(null);

  const now = Date.now();
  const byItem = useMemo(() => mistakesByItem(d.mistakes, now), [d.mistakes]);
  const all = useMemo(() => [...d.custom.slice().reverse(), ...VOCAB], [d.custom]);

  const shown = all.filter((w) => {
    const st = d.states[w.id];
    switch (filter) {
      case 'B1':
      case 'B2':
        if (w.level !== filter || w.kind !== 'word' || w.custom) return false;
        break;
      case 'phrasal':
        if (!w.family) return false;
        break;
      case 'phrases':
        if (w.kind !== 'phrase') return false;
        break;
      case 'own':
        if (!w.custom) return false;
        break;
      case 'hard':
        if (!(byItem.has(w.id) || (st?.lapses ?? 0) >= 2)) return false;
        break;
    }
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return w.en.toLowerCase().includes(q) || w.ru.toLowerCase().includes(q);
  });
  if (filter === 'hard') shown.sort((a, b) => (byItem.get(b.id)?.weight ?? 0) - (byItem.get(a.id)?.weight ?? 0));

  const renderRow = (w: VocabItem) => {
    const st = d.states[w.id];
    const m = byItem.get(w.id);
    const isOpen = open === w.id;
    return (
      <div key={w.id}>
        <button type="button" class="list-item" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : w.id)}>
          <StageDot state={st} />
          <span class="list-item-main">
            <b>{w.en}</b>
            <span>{w.ru}</span>
          </span>
          {m && <span class="chip chip-red">×{m.count}</span>}
          <LevelChip item={w} />
          <IconChevron class="chevron" />
        </button>
        {isOpen && (
          <div class="detail">
            <WordCard item={w} />
            <p class="muted small">{dueLabel(st, now)}</p>
            {w.custom && (
              <div class="row">
                <button type="button" class="btn btn-sm" onClick={() => setEditing(w)}>
                  Edit
                </button>
                <ConfirmButton class="btn btn-sm btn-ghost" label="Delete" confirmLabel="Delete word and progress" onConfirm={() => deleteCustomWord(w.id)} />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div class="page">
      <div class="page-head">
        <div class="stack-sm">
          <h1 class="title">Words</h1>
          <p class="subtitle">
            {VOCAB.length} B1–B2 words and phrases · {d.custom.length} of your own
          </p>
        </div>
        <button type="button" class="icon-btn" onClick={() => setEditing('new')} aria-label="New word" title="New word">
          <IconPlus size={22} />
        </button>
      </div>

      <label class="search">
        <IconSearch />
        <input type="search" placeholder="Search" value={query} onInput={(e) => setQuery(e.currentTarget.value)} aria-label="Search in English or Russian" />
      </label>
      <div class="chips" role="group" aria-label="Filter">
        {FILTERS.map(([id, label]) => (
          <button type="button" key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>
            {label}
          </button>
        ))}
      </div>

      {shown.length > 0 && (
        <div class="row">
          {filter === 'own' && (
            <button type="button" class="btn btn-primary" style={{ flex: 1 }} onClick={() => nav.startSession({ kind: 'custom' })}>
              Practise my words
            </button>
          )}
          <button type="button" class="btn" style={{ flex: 1 }} onClick={() => nav.startCards({ title: FILTER_DECK[filter], items: deckFrom(shown) })}>
            Flashcards · {Math.min(shown.length, DECK_SIZE)}
          </button>
        </div>
      )}

      {shown.length === 0 ? (
        <div class="sheet empty">
          {filter === 'own' ? (
            <>
              <p>Your own words go here: from films, books or work. They join your practice and the games, just like the built-in words.</p>
              <button type="button" class="btn btn-primary" onClick={() => setEditing('new')}>
                Add your first word
              </button>
            </>
          ) : filter === 'hard' ? (
            <p>No tricky words yet. Words you get wrong will appear here.</p>
          ) : (
            <p>Nothing found.</p>
          )}
        </div>
      ) : filter === 'phrasal' && !query.trim() ? (
        <>
          {BIG_FAMILIES.map((f) => (
            <section class="section" key={f.verb} aria-label={`Phrasal verbs with ${f.verb}`}>
              <div class="family-head">
                <h2>{f.verb}</h2>
                <span class="muted" lang="ru">
                  {f.ru}
                </span>
                <span class="spacer" />
                <button
                  type="button"
                  class="btn btn-sm"
                  onClick={() => nav.startSession({ kind: 'set', title: `${f.verb} + particles`, ids: f.items.map((i) => i.id) })}
                >
                  Practise
                </button>
              </div>
              <div class="list">{f.items.map(renderRow)}</div>
            </section>
          ))}
          <section class="section" aria-label="More phrasal verbs">
            <div class="family-head">
              <h2>More phrasal verbs</h2>
            </div>
            <div class="list">{OTHER_PHRASAL.map(renderRow)}</div>
          </section>
        </>
      ) : (
        <div class="list">{shown.map(renderRow)}</div>
      )}

      {editing && <WordEditor word={editing === 'new' ? null : editing} custom={d.custom} onClose={() => setEditing(null)} />}
    </div>
  );
}

function WordEditor({ word, custom, onClose }: { word: VocabItem | null; custom: VocabItem[]; onClose: () => void }) {
  const [mode, setMode] = useState<'one' | 'list'>('one');
  return (
    <Modal title={word ? 'Edit word' : 'New words'} onClose={onClose}>
      {!word && (
        <div class="segmented" role="group" aria-label="How to add">
          <button type="button" aria-pressed={mode === 'one'} onClick={() => setMode('one')}>
            One word
          </button>
          <button type="button" aria-pressed={mode === 'list'} onClick={() => setMode('list')}>
            A list
          </button>
        </div>
      )}
      {mode === 'one' || word ? <OneWordForm word={word} custom={custom} onDone={onClose} /> : <BulkForm custom={custom} onDone={onClose} />}
    </Modal>
  );
}

function LevelSelect({ value, onChange }: { value: Level | null; onChange: (l: Level | null) => void }) {
  return (
    <div class="field">
      <label for="w-level">Level</label>
      <select id="w-level" value={value ?? ''} onChange={(e) => onChange((e.currentTarget.value || null) as Level | null)}>
        <option value="">No level</option>
        <option value="B1">B1</option>
        <option value="B2">B2</option>
      </select>
    </div>
  );
}

function OneWordForm({ word, custom, onDone }: { word: VocabItem | null; custom: VocabItem[]; onDone: () => void }) {
  const [draft, setDraft] = useState<WordDraft>({
    en: word?.en ?? '',
    ru: word?.ru ?? '',
    ex: word?.ex?.replace(/\*/g, '') ?? '',
    exRu: word?.exRu ?? '',
    note: word?.note ?? '',
    level: word?.level ?? null,
  });
  const [error, setError] = useState('');
  const set = (patch: Partial<WordDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const builtIn = draft.en.trim() ? VOCAB.find((v) => sameWord(v.en, draft.en)) : undefined;
  const marked = draft.ex?.trim() ? markTarget(draft.ex, draft.en) : '';
  const exampleHasWord = !marked || gapParts(marked) !== null;

  const save = (e: Event) => {
    e.preventDefault();
    if (!draft.en.trim() || !draft.ru.trim()) return setError('Add both the word and its translation.');
    if (/[а-яё]/i.test(draft.en)) return setError('The first field is for the English word or phrase.');
    if (!word && custom.some((w) => sameWord(w.en, draft.en))) return setError('This word is already in your list.');
    if (!word && custom.length >= MAX_CUSTOM_WORDS) return setError(`You can keep up to ${MAX_CUSTOM_WORDS} of your own words. Delete some you know well to add new ones.`);
    saveCustomWord(createCustomWord(draft, word ?? undefined));
    onDone();
  };

  return (
    <form class="stack" onSubmit={save}>
      <div class="field">
        <label for="w-en">English word or phrase</label>
        <input id="w-en" value={draft.en} onInput={(e) => set({ en: e.currentTarget.value })} autocomplete="off" autocapitalize="off" lang="en" placeholder="kettle" />
        {builtIn && !word && (
          <span class="hint">
            This word is already in the {builtIn.level} list (“{builtIn.ru}”). You can still add your own meaning or example.
          </span>
        )}
      </div>
      <div class="field">
        <label for="w-ru">Russian translation</label>
        <input id="w-ru" value={draft.ru} onInput={(e) => set({ ru: e.currentTarget.value })} autocomplete="off" placeholder="чайник" />
      </div>
      <div class="field">
        <label for="w-ex">Example sentence (optional)</label>
        <input id="w-ex" value={draft.ex} onInput={(e) => set({ ex: e.currentTarget.value })} autocomplete="off" lang="en" placeholder="Put the kettle on, please." />
        <span class="hint">
          {exampleHasWord
            ? 'With an example, you’ll also get a “fill in the gap” task.'
            : 'The word isn’t in the example. Mark it with asterisks: I *boiled* the water.'}
        </span>
      </div>
      <div class="field">
        <label for="w-exru">Translation of the example (optional)</label>
        <input id="w-exru" value={draft.exRu} onInput={(e) => set({ exRu: e.currentTarget.value })} autocomplete="off" />
      </div>
      <div class="field">
        <label for="w-note">Note (optional)</label>
        <input id="w-note" value={draft.note} onInput={(e) => set({ note: e.currentTarget.value })} autocomplete="off" placeholder="put the kettle on = start boiling water" />
      </div>
      <LevelSelect value={draft.level} onChange={(level) => set({ level })} />
      {error && <p class="error">{error}</p>}
      <button type="submit" class="btn btn-primary">
        {word ? 'Save' : 'Add word'}
      </button>
    </form>
  );
}

function BulkForm({ custom, onDone }: { custom: VocabItem[]; onDone: () => void }) {
  const [text, setText] = useState('');
  const [level, setLevel] = useState<Level | null>(null);
  const { drafts, errors } = parseBulk(text, level);
  const fresh = drafts.filter((dr, i) => !custom.some((w) => sameWord(w.en, dr.en)) && drafts.findIndex((x) => sameWord(x.en, dr.en)) === i);
  const room = Math.max(0, MAX_CUSTOM_WORDS - custom.length);
  const toAdd = fresh.slice(0, room);
  return (
    <form
      class="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (!toAdd.length) return;
        saveCustomWords(toAdd.map((dr) => createCustomWord(dr)));
        onDone();
      }}
    >
      <div class="field">
        <label for="w-bulk">One word per line</label>
        <textarea
          id="w-bulk"
          value={text}
          onInput={(e) => setText(e.currentTarget.value)}
          lang="en"
          placeholder={'kettle — чайник — Put the kettle on.\nstove — плита\nsink — раковина'}
        />
        <span class="hint">Format: word — translation — example (optional). A tab, “;” or “|” also works, so you can paste from a spreadsheet.</span>
      </div>
      <LevelSelect value={level} onChange={setLevel} />
      {errors.length > 0 && (
        <div class="stack-sm">
          {errors.slice(0, 5).map((err) => (
            <p class="error" key={err}>
              {err}
            </p>
          ))}
        </div>
      )}
      {drafts.length > fresh.length && <p class="muted small">Skipped repeats and words you already have: {drafts.length - fresh.length}.</p>}
      {fresh.length > room && <p class="error">Only {room} of {fresh.length} fit: the limit is {MAX_CUSTOM_WORDS} words of your own.</p>}
      <button type="submit" class="btn btn-primary" disabled={!toAdd.length}>
        {toAdd.length ? `Add ${count(toAdd.length, 'word')}` : 'Add'}
      </button>
    </form>
  );
}
