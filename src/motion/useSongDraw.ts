import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch } from 'react';
import { createSongDraw } from '../lib/draw';
import type { ProgressAction } from '../state/experience';

export const SONG_REVEAL_MS = 1150;

/** A draw is committed before its visual feedback; animation never owns the result. */
export function useSongDraw(dispatch: Dispatch<ProgressAction>, reduced: boolean) {
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const alive = useRef(true);
  const finish = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = undefined;
    locked.current = false;
    if (alive.current) setBusy(false);
  }, []);
  useEffect(() => {
    alive.current = true;
    const visibility = () => { if (document.hidden) finish(); };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      alive.current = false;
      clearTimeout(timer.current);
      locked.current = false;
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [finish]);
  useEffect(() => { if (reduced) finish(); }, [reduced, finish]);
  const draw = useCallback(() => {
    if (locked.current || !alive.current) return false;
    locked.current = true;
    try {
      const result = createSongDraw();
      dispatch({ type: 'record-draw', draw: result });
      setBusy(true);
      // This timer is also the escape hatch when CSS animation events are lost.
      timer.current = setTimeout(finish, reduced ? 180 : SONG_REVEAL_MS);
      return true;
    } catch (error) {
      finish();
      throw error;
    }
  }, [dispatch, reduced, finish]);
  return { draw, busy, animating: busy && !reduced };
}
