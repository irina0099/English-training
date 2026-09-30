import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { SessionMode } from '../engine/session';
import type { Deck } from './Flashcards';
import type { GameId } from './Games';

export type Tab = 'home' | 'words' | 'games' | 'mistakes' | 'rules' | 'settings';

export interface Nav {
  go(tab: Tab, game?: GameId): void;
  startSession(mode: SessionMode): void;
  startCards(deck: Deck): void;
  openRule(id: string): void;
}

export const NavContext = createContext<Nav>({ go: () => {}, startSession: () => {}, startCards: () => {}, openRule: () => {} });

export const useNav = () => useContext(NavContext);
