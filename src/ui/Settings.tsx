import { useState } from 'preact/hooks';
import type { CloudStatus } from '../engine/cloud';
import { exportJson, importJson, replaceData, resetProgress, updateSettings } from '../engine/store';
import { canSpeak, speak } from '../tts';
import type { Level } from '../types';
import { BackButton, ConfirmButton } from './common';
import { useNav } from './context';
import { useData } from './hooks';
import { IconCheck } from './icons';

const IS_ARTIFACT = import.meta.env.MODE === 'artifact';

export function Settings({ cloud }: { cloud: CloudStatus }) {
  const d = useData();
  const nav = useNav();
  const s = d.settings;
  const [backup, setBackup] = useState('');
  const [message, setMessage] = useState('');

  const toggleLevel = (l: Level) => {
    const has = s.levels.includes(l);
    const levels = has ? s.levels.filter((x) => x !== l) : [...s.levels, l].sort();
    if (levels.length) updateSettings({ levels });
  };

  const copy = async () => {
    const text = exportJson(d);
    setBackup(text);
    try {
      await navigator.clipboard.writeText(text);
      setMessage('Копия скопирована. Сохраните её в Заметках или в файле.');
    } catch {
      setMessage('Скопируйте текст из поля ниже вручную.');
    }
  };

  const download = () => {
    const blob = new Blob([exportJson(d)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `english-notebook-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const restore = (text: string) => {
    try {
      replaceData(importJson(text), true);
      setMessage('Прогресс восстановлен из копии.');
      setBackup('');
    } catch (e) {
      setMessage(e instanceof Error && e.message.includes('резервная') ? e.message : 'Не удалось прочитать копию: проверьте, что текст скопирован целиком.');
    }
  };

  return (
    <div class="page">
      <div class="stack-sm">
        <BackButton label="Сегодня" onClick={() => nav.go('home')} />
        <h1 class="title">Настройки</h1>
      </div>

      <section class="section">
        <p class="section-title">Уровень</p>
        <div class="list">
          {(['B1', 'B2'] as const).map((l) => (
            <button type="button" key={l} class="list-item" role="menuitemcheckbox" aria-checked={s.levels.includes(l)} onClick={() => toggleLevel(l)}>
              <span class="list-item-main">
                <b>{l === 'B1' ? 'B1 — средний' : 'B2 — выше среднего'}</b>
              </span>
              {s.levels.includes(l) && <IconCheck class="check" size={20} />}
            </button>
          ))}
        </div>
        <p class="footnote">Можно выбрать оба уровня. Свои слова тренируются всегда.</p>
      </section>

      <section class="section">
        <p class="section-title">Заданий в тренировке</p>
        <div class="segmented" role="group" aria-label="Заданий в тренировке">
          {[10, 15, 20, 30].map((n) => (
            <button type="button" key={n} aria-pressed={s.sessionSize === n} onClick={() => updateSettings({ sessionSize: n })}>
              {n}
            </button>
          ))}
        </div>
      </section>

      <section class="section">
        <p class="section-title">Новых слов и заданий в день</p>
        <div class="segmented" role="group" aria-label="Новых в день">
          {[5, 10, 15, 20].map((n) => (
            <button type="button" key={n} aria-pressed={s.newPerDay === n} onClick={() => updateSettings({ newPerDay: n })}>
              {n}
            </button>
          ))}
        </div>
      </section>

      {canSpeak() && (
        <section class="section">
          <p class="section-title">Произношение</p>
          <div class="list">
            <label class="list-item" for="auto-speak">
              <span class="list-item-main">
                <b>Произносить новые слова</b>
              </span>
              <input id="auto-speak" type="checkbox" class="switch" checked={s.autoSpeak} onChange={(e) => updateSettings({ autoSpeak: e.currentTarget.checked })} />
            </label>
            <button type="button" class="list-item" onClick={() => speak('I’m looking forward to seeing you.')}>
              <span class="list-item-main">
                <b style={{ color: 'var(--blue)' }}>Проверить звук</b>
              </span>
            </button>
          </div>
        </section>
      )}

      <section class="section">
        <p class="section-title">Резервная копия</p>
        <div class="list">
          <button type="button" class="list-item" onClick={copy}>
            <span class="list-item-main">
              <b style={{ color: 'var(--blue)' }}>Скопировать копию прогресса</b>
            </span>
          </button>
          {!IS_ARTIFACT && (
            <button type="button" class="list-item" onClick={download}>
              <span class="list-item-main">
                <b style={{ color: 'var(--blue)' }}>Скачать файлом</b>
              </span>
            </button>
          )}
          <label class="list-item" style={{ cursor: 'pointer' }}>
            <span class="list-item-main">
              <b style={{ color: 'var(--blue)' }}>Восстановить из файла…</b>
            </span>
            <input
              type="file"
              accept="application/json,.json"
              class="sr-only"
              onChange={async (e) => {
                const file = e.currentTarget.files?.[0];
                if (file) restore(await file.text());
              }}
            />
          </label>
        </div>
        <p class="footnote">
          {cloud === 'synced'
            ? 'Прогресс хранится в вашем аккаунте Claude и виден на всех устройствах, где вы открываете эту страницу.'
            : cloud === 'connecting'
              ? 'Подключаемся к хранилищу аккаунта…'
              : 'Прогресс хранится в этом браузере. Чтобы перенести его на другое устройство, скопируйте копию и вставьте её там.'}
        </p>
      </section>

      <section class="section">
        <div class="field">
          <label for="backup">Вставьте копию, чтобы восстановить</label>
          <textarea id="backup" value={backup} onInput={(e) => setBackup(e.currentTarget.value)} spellcheck={false} />
        </div>
        <button type="button" class="btn" disabled={!backup.trim()} onClick={() => restore(backup)}>
          Восстановить из текста
        </button>
        {message && <p class="footnote">{message}</p>}
      </section>

      <section class="section">
        <ConfirmButton class="btn btn-danger btn-block" label="Сбросить прогресс" confirmLabel="Да, сбросить всё" onConfirm={resetProgress} />
        <p class="footnote">Сотрёт расписание повторений, статистику и журнал ошибок. Ваши слова останутся.</p>
      </section>
    </div>
  );
}
