import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { SessionMode } from '../engine/session';
import type { Deck } from './Flashcards';
import type { GameId } from './Games';

export type Tab = 'home' | 'read' | 'words' | 'games' | 'mistakes' | 'rules' | 'settings';

export interface Nav {
  go(tab: Tab, game?: GameId): void;
  startSession(mode: SessionMode): void;
  startCards(deck: Deck): void;
  openRule(id: string): void;
  /** Opens a magazine page; `focus` is a character offset to zoom to. */
  openReader(issue: string, page: string, focus?: number): void;
}

export const NavContext = createContext<Nav>({ go: () => {}, startSession: () => {}, startCards: () => {}, openRule: () => {}, openReader: () => {} });

export const useNav = () => useContext(NavContext);
