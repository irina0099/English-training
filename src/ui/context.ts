import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { SessionMode } from '../engine/session';
import type { Place } from '../reading/store';
import type { Deck } from './Flashcards';
import type { GameId } from './Games';

export type Tab = 'home' | 'read' | 'words' | 'games' | 'mistakes' | 'rules' | 'settings';

export interface Nav {
  go(tab: Tab, game?: GameId): void;
  startSession(mode: SessionMode): void;
  startCards(deck: Deck): void;
  openRule(id: string): void;
  /**
   * Opens a magazine page; `focus` is a character offset to zoom to, `at` a place in a
   * PDF magazine to open at (where reading stopped, or a page chosen in the contents).
   */
  openReader(issue: string, page: string, focus?: number, at?: Place): void;
}

export const NavContext = createContext<Nav>({ go: () => {}, startSession: () => {}, startCards: () => {}, openRule: () => {}, openReader: () => {} });

export const useNav = () => useContext(NavContext);
