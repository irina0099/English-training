import { useMemo, useState } from 'preact/hooks';
import { VOCAB } from '../content';
import { mistakesByItem } from '../engine/mistakes';
import { gapParts } from '../engine/session';
import { deleteCustomWord, MAX_CUSTOM_WORDS, saveCustomWord, saveCustomWords } from '../engine/store';
import { createCustomWord, markTarget, parseBulk, sameWord, type WordDraft } from '../engine/words';
import type { Level, VocabItem } from '../types';
import { ConfirmButton, dueLabel, LevelChip, Modal, plural, StageDot, WordCard } from './common';
import { useNav } from './context';
import { useData } from './hooks';
import { IconChevron, IconPlus, IconSearch } from './icons';

type Filter = 'all' | 'B1' | 'B2' | 'phrases' | 'own' | 'hard';

const FILTERS: [Filter, string][] = [
  ['all', 'Все'],
  ['B1', 'B1'],
  ['B2', 'B2'],
  ['phrases', 'Фразы'],
  ['own', 'Мои'],
  ['hard', 'Сложные'],
];

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

  return (
    <div class="page">
      <div class="page-head">
        <div class="stack-sm">
          <h1 class="title">Словарь</h1>
          <p class="subtitle">
            Слов и фраз B1–B2: {VOCAB.length} · своих: {d.custom.length}
          </p>
        </div>
        <button type="button" class="icon-btn" onClick={() => setEditing('new')} aria-label="Новое слово" title="Новое слово">
          <IconPlus size={22} />
        </button>
      </div>

      <label class="search">
        <IconSearch />
        <input type="search" placeholder="Поиск" value={query} onInput={(e) => setQuery(e.currentTarget.value)} aria-label="Поиск по-английски или по-русски" />
      </label>
      <div class="chips" role="group" aria-label="Фильтр">
        {FILTERS.map(([id, label]) => (
          <button type="button" key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>
            {label}
          </button>
        ))}
      </div>

      {filter === 'own' && d.custom.length > 0 && (
        <button type="button" class="btn btn-primary btn-block" onClick={() => nav.startSession({ kind: 'custom' })}>
          Тренировать мои слова
        </button>
      )}

      {shown.length === 0 ? (
        <div class="sheet empty">
          {filter === 'own' ? (
            <>
              <p>Здесь будут ваши слова: из фильмов, книг, с работы. Они попадут в тренировки и игры наравне со встроенными.</p>
              <button type="button" class="btn btn-primary" onClick={() => setEditing('new')}>
                Добавить первое слово
              </button>
            </>
          ) : filter === 'hard' ? (
            <p>Сложных слов пока нет. Сюда попадают слова, в которых вы ошибались.</p>
          ) : (
            <p>Ничего не найдено.</p>
          )}
        </div>
      ) : (
        <div class="list">
          {shown.map((w) => {
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
                          Изменить
                        </button>
                        <ConfirmButton class="btn btn-sm btn-ghost" label="Удалить" confirmLabel="Удалить слово и его прогресс" onConfirm={() => deleteCustomWord(w.id)} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editing && <WordEditor word={editing === 'new' ? null : editing} custom={d.custom} onClose={() => setEditing(null)} />}
    </div>
  );
}

function WordEditor({ word, custom, onClose }: { word: VocabItem | null; custom: VocabItem[]; onClose: () => void }) {
  const [mode, setMode] = useState<'one' | 'list'>('one');
  return (
    <Modal title={word ? 'Изменить слово' : 'Новые слова'} onClose={onClose}>
      {!word && (
        <div class="segmented" role="group" aria-label="Способ добавления">
          <button type="button" aria-pressed={mode === 'one'} onClick={() => setMode('one')}>
            Одно слово
          </button>
          <button type="button" aria-pressed={mode === 'list'} onClick={() => setMode('list')}>
            Списком
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
      <label for="w-level">Уровень</label>
      <select id="w-level" value={value ?? ''} onChange={(e) => onChange((e.currentTarget.value || null) as Level | null)}>
        <option value="">Без уровня</option>
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
    if (!draft.en.trim() || !draft.ru.trim()) return setError('Нужны слово и перевод.');
    if (/[а-яё]/i.test(draft.en)) return setError('В первом поле — английское слово или фраза.');
    if (!word && custom.some((w) => sameWord(w.en, draft.en))) return setError('Это слово уже есть в ваших словах.');
    if (!word && custom.length >= MAX_CUSTOM_WORDS) return setError(`Можно сохранить до ${MAX_CUSTOM_WORDS} своих слов. Удалите выученные, чтобы добавить новые.`);
    saveCustomWord(createCustomWord(draft, word ?? undefined));
    onDone();
  };

  return (
    <form class="stack" onSubmit={save}>
      <div class="field">
        <label for="w-en">Слово или фраза по-английски</label>
        <input id="w-en" value={draft.en} onInput={(e) => set({ en: e.currentTarget.value })} autocomplete="off" autocapitalize="off" lang="en" placeholder="kettle" />
        {builtIn && !word && (
          <span class="hint">
            Это слово уже есть в словаре {builtIn.level}: «{builtIn.ru}». Можно добавить своё значение или пример.
          </span>
        )}
      </div>
      <div class="field">
        <label for="w-ru">Перевод</label>
        <input id="w-ru" value={draft.ru} onInput={(e) => set({ ru: e.currentTarget.value })} autocomplete="off" placeholder="чайник" />
      </div>
      <div class="field">
        <label for="w-ex">Пример предложения (по желанию)</label>
        <input id="w-ex" value={draft.ex} onInput={(e) => set({ ex: e.currentTarget.value })} autocomplete="off" lang="en" placeholder="Put the kettle on, please." />
        <span class="hint">
          {exampleHasWord
            ? 'С примером появится задание «вставьте слово в предложение».'
            : 'Слово не найдено в примере — отметьте его звёздочками: I *boiled* the water.'}
        </span>
      </div>
      <div class="field">
        <label for="w-exru">Перевод примера (по желанию)</label>
        <input id="w-exru" value={draft.exRu} onInput={(e) => set({ exRu: e.currentTarget.value })} autocomplete="off" />
      </div>
      <div class="field">
        <label for="w-note">Заметка или правило (по желанию)</label>
        <input id="w-note" value={draft.note} onInput={(e) => set({ note: e.currentTarget.value })} autocomplete="off" placeholder="put the kettle on — поставить чайник" />
      </div>
      <LevelSelect value={draft.level} onChange={(level) => set({ level })} />
      {error && <p class="error">{error}</p>}
      <button type="submit" class="btn btn-primary">
        {word ? 'Сохранить' : 'Добавить слово'}
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
        <label for="w-bulk">По одному слову на строке</label>
        <textarea
          id="w-bulk"
          value={text}
          onInput={(e) => setText(e.currentTarget.value)}
          lang="en"
          placeholder={'kettle — чайник — Put the kettle on.\nstove — плита\nsink — раковина'}
        />
        <span class="hint">Формат: слово — перевод — пример (необязательно). Вместо тире подойдут табуляция, «;» или «|» — удобно вставлять из таблицы.</span>
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
      {drafts.length > fresh.length && <p class="muted small">Повторы и уже добавленные слова пропущены: {drafts.length - fresh.length}.</p>}
      {fresh.length > room && <p class="error">Поместится только {room} из {fresh.length}: лимит — {MAX_CUSTOM_WORDS} своих слов.</p>}
      <button type="submit" class="btn btn-primary" disabled={!toAdd.length}>
        {toAdd.length ? `Добавить ${toAdd.length} ${plural(toAdd.length, 'слово', 'слова', 'слов')}` : 'Добавить'}
      </button>
    </form>
  );
}
