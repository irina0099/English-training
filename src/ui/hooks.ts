import { useEffect, useReducer } from 'preact/hooks';
import { getData, subscribe } from '../engine/store';
import type { AppData } from '../types';

/** Re-renders the component whenever saved data changes. */
export function useData(): AppData {
  const [, bump] = useReducer((x: number) => x + 1, 0);
  useEffect(() => subscribe(() => bump(0)), []);
  return getData();
}
