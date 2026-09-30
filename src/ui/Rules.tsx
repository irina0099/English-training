import { useState } from 'preact/hooks';
import { BUILTIN, RULES } from '../content';
import { mistakesByCategory } from '../engine/mistakes';
import type { Level, Rule } from '../types';
import { count } from './common';
import { useNav } from './context';
import { useData } from './hooks';
import { IconChevron, IconRule } from './icons';

/** The full rule, in English with a Russian version one tap away. */
export function RuleBody({ rule }: { rule: Rule }) {
  const nav = useNav();
  const [ru, setRu] = useState(false);
  const text = ru ? rule.ru : rule;
  const drills = BUILTIN.filter((i) => i.rule === rule.id).length;
  return (
    <div class="stack">
      <div class="segmented" role="group" aria-label="Language of the explanation">
        <button type="button" aria-pressed={!ru} onClick={() => setRu(false)}>
          English
        </button>
        <button type="button" aria-pressed={ru} onClick={() => setRu(true)}>
          Русский
        </button>
      </div>
      <div class="rule-note" lang={ru ? 'ru' : 'en'}>
        <IconRule size={22} />
        <h4>{text.title}</h4>
        <p>{text.summary}</p>
      </div>
      <ul class="rule-points" lang={ru ? 'ru' : 'en'}>
        {text.points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <div class="stack-sm">
        <p class="section-title">Examples</p>
        {rule.examples.map(([ok, bad]) => (
          <div class="ex-pair" key={ok}>
            <span class="ex-ok">{ok}</span>
            {bad && <span class="ex-bad">{bad}</span>}
          </div>
        ))}
      </div>
      <button type="button" class="btn btn-primary" onClick={() => nav.startSession({ kind: 'rule', rule: rule.id })}>
        Practise · {count(drills, 'task')}
      </button>
    </div>
  );
}

export function Rules() {
  const d = useData();
  const nav = useNav();
  const [level, setLevel] = useState<Level | 'all'>('all');
  const weights = new Map(mistakesByCategory(d.mistakes, Date.now()).map((c) => [c.cat, c.count]));
  const shown = RULES.filter((r) => level === 'all' || r.level === level).sort((a, b) => (weights.get(b.id) ?? 0) - (weights.get(a.id) ?? 0));
  return (
    <div class="page">
      <div class="stack-sm">
        <h1 class="title">Grammar</h1>
        <p class="subtitle">Short explanations of typical mistakes. The rules you get wrong most often come first.</p>
      </div>
      <div class="segmented" role="group" aria-label="Level">
        {(['all', 'B1', 'B2'] as const).map((l) => (
          <button type="button" key={l} aria-pressed={level === l} onClick={() => setLevel(l)}>
            {l === 'all' ? 'All' : l}
          </button>
        ))}
      </div>
      <div class="list">
        {shown.map((r) => {
          const n = weights.get(r.id) ?? 0;
          return (
            <button type="button" class="list-item" key={r.id} onClick={() => nav.openRule(r.id)} style={{ alignItems: 'flex-start' }}>
              <span class="list-item-main">
                <b>{r.title}</b>
                <span class="clamp">{r.summary}</span>
              </span>
              <span class="stack-sm" style={{ alignItems: 'flex-end' }}>
                <span class={`chip ${r.level === 'B2' ? 'chip-b2' : ''}`}>{r.level}</span>
                {n > 0 && <span class="chip chip-red">×{n}</span>}
              </span>
              <IconChevron class="chevron" style={{ alignSelf: 'center' }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
