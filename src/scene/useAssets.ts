import { useEffect, useState } from 'react';
import { art } from '../config/art';
import type { ArtKey } from '../config/art';
import { sceneAssetUrl } from '../diagnostics/assetQA';
import { loadLocalImage } from './loadLocalImage';
// Optional local artwork always has a procedural fallback in both renderers.
const artKeys: ArtKey[] = ['contact', 'glow', 'pondPaint', 'mushroomPaint', 'archPaint', 'doorPaint'];
export type LoadedArt = Partial<Record<ArtKey, HTMLImageElement>>;
export function useAssets() {
  const [state, setState] = useState<{ images: LoadedArt; settled: number; failed: ArtKey[] }>({ images: {}, settled: 0, failed: [] });
  const manifest = JSON.stringify(art);
  useEffect(() => {
    setState({ images: {}, settled: 0, failed: [] });
    let active = true;
    const cleanup: (() => void)[] = [];
    for (const key of artKeys) {
      const request = loadLocalImage(sceneAssetUrl(art[key]));
      void request.promise.then(image => {
        if (active) setState(previous => ({
          images: image ? { ...previous.images, [key]: image } : previous.images,
          settled: previous.settled + 1,
          failed: image ? previous.failed : [...previous.failed, key],
        }));
      });
      cleanup.push(request.cancel);
    }
    return () => { active = false; cleanup.forEach(fn => fn()); };
  }, [manifest]);
  return { ...state, ready: state.settled >= artKeys.length, total: artKeys.length };
}
