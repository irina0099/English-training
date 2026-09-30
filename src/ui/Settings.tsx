import { useState } from 'preact/hooks';
import type { CloudStatus } from '../engine/cloud';
import { exportJson, importJson, replaceData, resetProgress, updateSettings } from '../engine/store';
import { canSpeak, speak } from '../tts';
import type { Level } from '../types';
import { ConfirmButton } from './common';
import { useNav } from './context';
import { useData } from './hooks';
import { IconBack } from './icons';

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
      setMessage('Копия скопирована. Сохраните её в заметках или файле.');
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
      <div class="page-head">
        <button type="button" class="icon-btn" onClick={() => nav.go('home')} aria-label="Назад">
          <IconBack size={20} />
        </button>
        <h1 class="title" style={{ flex: 1 }}>
          Настройки
        </h1>
      </div>

      <section class="sheet stack">
        <p class="section-title">Уровень</p>
        <div class="segmented" role="group" aria-label="Уровни">
          {(['B1', 'B2'] as const).map((l) => (
            <button type="button" key={l} aria-pressed={s.levels.includes(l)} onClick={() => toggleLevel(l)}>
              {l}
            </button>
          ))}
        </div>
        <p class="muted small">Можно выбрать оба уровня. Свои слова тренируются всегда.</p>

        <p class="section-title">Заданий в тренировке</p>
        <div class="segmented" role="group" aria-label="Длина тренировки">
          {[10, 15, 20, 30].map((n) => (
            <button type="button" key={n} aria-pressed={s.sessionSize === n} onClick={() => updateSettings({ sessionSize: n })}>
              {n}
            </button>
          ))}
        </div>

        <p class="section-title">Новых слов и заданий в день</p>
        <div class="segmented" role="group" aria-label="Новых в день">
          {[5, 10, 15, 20].map((n) => (
            <button type="button" key={n} aria-pressed={s.newPerDay === n} onClick={() => updateSettings({ newPerDay: n })}>
              {n}
            </button>
          ))}
        </div>

        {canSpeak() && (
          <>
            <p class="section-title">Произношение</p>
            <label class="row">
              <input type="checkbox" checked={s.autoSpeak} onChange={(e) => updateSettings({ autoSpeak: e.currentTarget.checked })} />
              Произносить новое слово автоматически
            </label>
            <button type="button" class="btn btn-sm btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={() => speak('I’m looking forward to seeing you.')}>
              Проверить звук
            </button>
          </>
        )}
      </section>

      <section class="sheet stack">
        <p class="section-title">Где хранится прогресс</p>
        <p>
          {cloud === 'synced'
            ? 'В вашем аккаунте Claude: прогресс виден на всех устройствах, где вы открываете эту страницу.'
            : cloud === 'connecting'
              ? 'Подключаемся к хранилищу аккаунта…'
              : 'В этом браузере. На другом устройстве прогресс не появится — перенесите его через резервную копию.'}
        </p>
        <div class="row">
          <button type="button" class="btn btn-sm" onClick={copy}>
            Скопировать резервную копию
          </button>
          {!IS_ARTIFACT && (
            <button type="button" class="btn btn-sm btn-ghost" onClick={download}>
              Скачать файлом
            </button>
          )}
        </div>
        <div class="field">
          <label for="backup">Резервная копия (вставьте сюда, чтобы восстановить)</label>
          <textarea id="backup" value={backup} onInput={(e) => setBackup(e.currentTarget.value)} spellcheck={false} />
        </div>
        <div class="row">
          <button type="button" class="btn btn-sm" disabled={!backup.trim()} onClick={() => restore(backup)}>
            Восстановить из текста
          </button>
          <label class="btn btn-sm btn-ghost">
            Из файла…
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
        {message && <p class="muted small">{message}</p>}
      </section>

      <section class="sheet stack">
        <p class="section-title">Начать заново</p>
        <p class="muted small">Сотрёт расписание повторений, статистику и журнал ошибок. Ваши слова останутся.</p>
        <ConfirmButton label="Сбросить прогресс" confirmLabel="Да, сбросить всё" onConfirm={resetProgress} />
      </section>
    </div>
  );
}
