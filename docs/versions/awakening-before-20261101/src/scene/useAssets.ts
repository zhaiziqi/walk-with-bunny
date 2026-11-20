import { useEffect, useState } from 'react';
import { art, artKeys } from '../config/art';
import type { ArtKey } from '../config/art';
export type LoadedArt = Partial<Record<ArtKey, HTMLImageElement>>;
export function useAssets() {
  const [state, setState] = useState<{ images: LoadedArt; settled: number; failed: ArtKey[] }>({ images: {}, settled: 0, failed: [] });
  const manifest = JSON.stringify(art);
  useEffect(() => {
    setState({ images: {}, settled: 0, failed: [] });
    let active = true;
    const cleanup: (() => void)[] = [];
    for (const key of artKeys) {
      const image = new Image();
      let done = false;
      const settle = (ok: boolean) => {
        if (done) return;
        done = true;
        clearTimeout(timeout);
        if (active) setState(previous => ({
          images: ok ? { ...previous.images, [key]: image } : previous.images,
          settled: previous.settled + 1,
          failed: ok ? previous.failed : [...previous.failed, key],
        }));
      };
      // Bound a stalled network request; progress is otherwise load/error driven.
      const timeout = window.setTimeout(() => settle(false), 15000);
      image.onload = () => settle(true);
      image.onerror = () => settle(false);
      image.src = import.meta.env.DEV && new URLSearchParams(location.search).get('qa') === 'asset-error' ? `${art[key]}.intentional-failure` : art[key];
      cleanup.push(() => { clearTimeout(timeout); image.onload = null; image.onerror = null; });
    }
    return () => { active = false; cleanup.forEach(fn => fn()); };
  }, [manifest]);
  return { ...state, ready: state.settled >= artKeys.length, total: artKeys.length };
}
