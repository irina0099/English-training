import { useEffect, useMemo, useState } from 'preact/hooks';
import { RULES_BY_ID } from '../content';
import { startCloudSync, type CloudStatus } from '../engine/cloud';
import { isFixed, mistakesByItem } from '../engine/mistakes';
import type { SessionMode } from '../engine/session';
import { Modal } from './common';
import { NavContext, type Nav, type Tab } from './context';
import { Dictionary } from './Dictionary';
import { Flashcards, type Deck } from './Flashcards';
import { Games, type GameId } from './Games';
import { Home } from './Home';
import { useData } from './hooks';
import { IconBook, IconGrid, IconHome, IconPen, IconRule } from './icons';
import { Mistakes } from './Mistakes';
import { RuleBody, Rules } from './Rules';
import { Session } from './Session';
import { Settings } from './Settings';

const TABS: [Tab, string, typeof IconHome][] = [
  ['home', 'Today', IconHome],
  ['words', 'Words', IconBook],
  ['games', 'Games', IconGrid],
  ['mistakes', 'Mistakes', IconPen],
  ['rules', 'Grammar', IconRule],
];
const ALL_TABS: Tab[] = ['home', 'words', 'games', 'mistakes', 'rules', 'settings'];

function readHash(): Tab {
  const h = location.hash.slice(1) as Tab;
  return ALL_TABS.includes(h) ? h : 'home';
}

export function App() {
  const d = useData();
  const [tab, setTab] = useState<Tab>(readHash);
  const [game, setGame] = useState<{ id: GameId | null; key: number }>({ id: null, key: 0 });
  const [session, setSession] = useState<{ mode: SessionMode; key: number } | null>(null);
  const [cards, setCards] = useState<{ deck: Deck; key: number } | null>(null);
  const [rule, setRule] = useState<string | null>(null);
  const [cloud, setCloud] = useState<CloudStatus>('local');

  useEffect(() => {
    startCloudSync(setCloud);
    const onHash = () => setTab(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const nav = useMemo<Nav>(
    () => ({
      go(next, gameId) {
        setSession(null);
        setCards(null);
        setTab(next);
        if (next === 'games') setGame({ id: gameId ?? null, key: Date.now() });
        try {
          history.replaceState(null, '', next === 'home' ? location.pathname + location.search : `#${next}`);
        } catch {
          // Some embedded views don't allow history changes; the tab still switches.
        }
        window.scrollTo(0, 0);
      },
      startSession(mode) {
        setRule(null);
        setCards(null);
        setSession({ mode, key: Date.now() });
      },
      startCards(deck) {
        setRule(null);
        setSession(null);
        if (deck.items.length) setCards({ deck, key: Date.now() });
      },
      openRule(id) {
        if (RULES_BY_ID[id]) setRule(id);
      },
    }),
    [],
  );

  const now = Date.now();
  const openMistakes = [...mistakesByItem(d.mistakes, now).keys()].filter((id) => !isFixed(d.states[id])).length;

  return (
    <NavContext.Provider value={nav}>
      <main>
        {tab === 'home' && <Home cloud={cloud} />}
        {tab === 'words' && <Dictionary />}
        {tab === 'games' && <Games key={game.key} initial={game.id} />}
        {tab === 'mistakes' && <Mistakes />}
        {tab === 'rules' && <Rules />}
        {tab === 'settings' && <Settings cloud={cloud} />}
      </main>

      <nav class="tabbar" aria-label="Sections">
        <div class="tabbar-inner">
          {TABS.map(([id, label, Icon]) => (
            <button type="button" key={id} class="tab" aria-current={tab === id ? 'page' : undefined} onClick={() => nav.go(id)}>
              <Icon size={22} />
              {label}
              {id === 'mistakes' && openMistakes > 0 && <span class="badge">{openMistakes > 99 ? '99+' : openMistakes}</span>}
            </button>
          ))}
        </div>
      </nav>

      {session && <Session key={session.key} mode={session.mode} onClose={() => setSession(null)} />}
      {cards && <Flashcards key={cards.key} deck={cards.deck} onClose={() => setCards(null)} />}
      {rule && (
        <Modal title={RULES_BY_ID[rule].title} onClose={() => setRule(null)}>
          <RuleBody rule={RULES_BY_ID[rule]} />
        </Modal>
      )}
    </NavContext.Provider>
  );
}
