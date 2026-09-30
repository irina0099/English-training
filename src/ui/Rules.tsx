import { useState } from 'preact/hooks';
import { BUILTIN, RULES, RULES_BY_ID } from '../content';
import { mistakesByCategory } from '../engine/mistakes';
import type { Level, Rule } from '../types';
import { plural } from './common';
import { useNav } from './context';
import { useData } from './hooks';
import { IconChevron, IconRule } from './icons';

export function RuleBody({ rule }: { rule: Rule }) {
  const nav = useNav();
  const drills = BUILTIN.filter((i) => i.rule === rule.id).length;
  return (
    <div class="stack">
      <div class="rule-note">
        <IconRule size={22} />
        <h4>Коротко</h4>
        <p>{rule.summary}</p>
      </div>
      <ul class="rule-points">
        {rule.points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <div class="stack-sm">
        <p class="section-title">Примеры</p>
        {rule.examples.map(([ok, bad]) => (
          <div class="ex-pair" key={ok}>
            <span class="ex-ok">{ok}</span>
            {bad && <span class="ex-bad">{bad}</span>}
          </div>
        ))}
      </div>
      <button type="button" class="btn btn-primary" onClick={() => nav.startSession({ kind: 'rule', rule: rule.id })}>
        Потренировать · {drills} {plural(drills, 'задание', 'задания', 'заданий')}
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
        <h1 class="title">Правила</h1>
        <p class="subtitle">Короткие объяснения типичных ошибок. Сверху — правила, в которых вы ошибаетесь чаще.</p>
      </div>
      <div class="segmented" role="group" aria-label="Уровень">
        {(['all', 'B1', 'B2'] as const).map((l) => (
          <button type="button" key={l} aria-pressed={level === l} onClick={() => setLevel(l)}>
            {l === 'all' ? 'Все' : l}
          </button>
        ))}
      </div>
      <div class="list">
        {shown.map((r) => {
          const count = weights.get(r.id) ?? 0;
          return (
            <button type="button" class="list-item" key={r.id} onClick={() => nav.openRule(r.id)} style={{ alignItems: 'flex-start' }}>
              <span class="list-item-main">
                <b>{r.title}</b>
                <span class="clamp">{r.summary}</span>
              </span>
              <span class="stack-sm" style={{ alignItems: 'flex-end' }}>
                <span class={`chip ${r.level === 'B2' ? 'chip-b2' : ''}`}>{r.level}</span>
                {count > 0 && <span class="chip chip-red">×{count}</span>}
              </span>
              <IconChevron class="chevron" style={{ alignSelf: 'center' }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ruleTitle(id: string): string {
  return RULES_BY_ID[id]?.title ?? 'Правило';
}
