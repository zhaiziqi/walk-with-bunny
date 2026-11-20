import { useEffect, useState } from 'react';
import { sceneAssetUrl } from '../diagnostics/assetQA';
import { loadLocalImage } from './loadLocalImage';

export type FloofPaintedLeaves = { blue: HTMLCanvasElement; sage: HTMLCanvasElement };
export const FLOOF_PAINTED_LEAF_URL = '/art/floof/painted-leaf-bank-v1.png';
let cached: FloofPaintedLeaves | null = null;
let pending: Promise<FloofPaintedLeaves | null> | undefined;

function leafVariants(image: HTMLImageElement): FloofPaintedLeaves {
  const blue = document.createElement('canvas'); blue.width = image.naturalWidth; blue.height = image.naturalHeight;
  blue.getContext('2d')!.drawImage(image, 0, 0);
  const sage = document.createElement('canvas'); sage.width = blue.width; sage.height = blue.height;
  const ctx = sage.getContext('2d')!;
  ctx.drawImage(image, 0, 0);
  // Hue changes preserve the asset's dry strokes. Restore original alpha after
  // the colour pass, so its transparent surroundings never become a rectangle.
  ctx.globalCompositeOperation = 'color'; ctx.fillStyle = '#819b89'; ctx.fillRect(0, 0, sage.width, sage.height);
  ctx.globalCompositeOperation = 'source-atop'; ctx.globalAlpha = .26;
  ctx.fillStyle = '#bdc9ad'; ctx.fillRect(0, 0, sage.width, sage.height);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(image, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  return { blue, sage };
}

/** One real asset load is shared by the WebGL scene and the non-WebGL fallback. */
export function loadFloofPaintedLeaves() {
  return pending ??= loadLocalImage(sceneAssetUrl(FLOOF_PAINTED_LEAF_URL)).promise.then(image => {
    if (!image) return null;
    try { cached = leafVariants(image); return cached; }
    catch { return null; }
  });
}

export function useFloofPaintedLeaves() {
  const [leaves, setLeaves] = useState<FloofPaintedLeaves | null>(cached);
  useEffect(() => {
    let active = true;
    void loadFloofPaintedLeaves().then(value => { if (active) setLeaves(value); });
    return () => { active = false; };
  }, []);
  return leaves;
}
