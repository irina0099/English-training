import { useState } from 'preact/hooks';
import { shortRu } from '../engine/session';
import { addToPractice } from '../engine/store';
import type { VocabItem } from '../types';
import { count, Example, SpeakButton } from './common';
import { useNav } from './context';
import { IconCheck } from './icons';

/**
 * End-of-game list: the learner ticks the words that were new to them and
 * sends them to practice. Words they struggled with in the game come pre-ticked.
 */
export function AddToPractice({ items, preselected, examples = false }: { items: VocabItem[]; preselected: ReadonlySet<string>; examples?: boolean }) {
  const nav = useNav();
  const [selected, setSelected] = useState<Set<string>>(() => new Set(items.filter((i) => preselected.has(i.id)).map((i) => i.id)));
  const [added, setAdded] = useState<number | null>(null);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  if (added !== null) {
    return (
      <div class="sheet stack">
        <p class="title-2">{added ? `${count(added, 'word')} added to practice` : 'Nothing added'}</p>
        <p class="muted">
          {added
            ? 'They are now in Mistakes and will come up in your next practice until you get them right three times.'
            : 'You can always add words later from the Words tab.'}
        </p>
        {added > 0 && (
          <button type="button" class="btn" onClick={() => nav.go('mistakes')}>
            Open Mistakes
          </button>
        )}
      </div>
    );
  }

  return (
    <section class="section" aria-labelledby="add-to-practice">
      <p class="section-title" id="add-to-practice">
        New to you?
      </p>
      <div class="list">
        {items.map((w) => {
          const on = selected.has(w.id);
          return (
            <div class="list-item" key={w.id} style={{ alignItems: 'flex-start' }}>
              <button type="button" class="check-row" role="checkbox" aria-checked={on} onClick={() => toggle(w.id)}>
                <span class={`checkbox ${on ? 'on' : ''}`} aria-hidden="true">
                  {on && <IconCheck size={16} />}
                </span>
                <span class="list-item-main">
                  <b>{w.en}</b>
                  <span lang="ru">{shortRu(w.ru)}</span>
                </span>
              </button>
              <SpeakButton text={w.en} />
              {examples && w.ex && (
                <div class="check-example">
                  <Example text={w.ex} ru={w.exRu} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p class="footnote">Tick the words you didn’t know. Words you missed or needed a hint for are already ticked.</p>
      <div class="row">
        <button
          type="button"
          class="btn btn-primary"
          style={{ flex: 1 }}
          disabled={selected.size === 0}
          onClick={() => {
            addToPractice(items.filter((i) => selected.has(i.id)));
            setAdded(selected.size);
          }}
        >
          {selected.size ? `Add ${count(selected.size, 'word')} to practice` : 'Add to practice'}
        </button>
        <button type="button" class="btn btn-ghost" onClick={() => setAdded(0)}>
          Skip
        </button>
      </div>
    </section>
  );
}
