import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch } from 'react';
import { acceptGiftCode } from '../lib/gift';
import type { ProgressAction } from '../state/experience';

export const GIFT_OPEN_MS = 900;

/** Commit the unlock first. A short, cancellable reveal never owns permission. */
export function useGiftUnlock(dispatch: Dispatch<ProgressAction>, reduced: boolean, onReveal: () => void) {
  const [opening, setOpening] = useState(false);
  const active = useRef(false);
  const alive = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reveal = useRef(onReveal);
  reveal.current = onReveal;
  const finish = useCallback(() => {
    if (!alive.current || !active.current) return;
    active.current = false;
    clearTimeout(timer.current);
    timer.current = undefined;
    setOpening(false);
    reveal.current();
  }, []);
  useEffect(() => {
    alive.current = true;
    const visibility = () => { if (document.hidden) finish(); };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      alive.current = false;
      active.current = false;
      clearTimeout(timer.current);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [finish]);
  useEffect(() => { if (reduced) finish(); }, [reduced, finish]);
  const unlock = useCallback((code: string): 'invalid' | 'busy' | 'accepted' => {
    if (!alive.current || active.current) return 'busy';
    if (!acceptGiftCode(code)) return 'invalid';
    active.current = true;
    try {
      dispatch({ type: 'unlock-gift', code });
      setOpening(true);
      // Even the static path yields until the saved business state has rendered.
      timer.current = setTimeout(finish, reduced ? 0 : GIFT_OPEN_MS);
      return 'accepted';
    } catch (error) {
      active.current = false;
      setOpening(false);
      throw error;
    }
  }, [dispatch, finish, reduced]);
  return { opening, unlock };
}
