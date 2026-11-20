import { useEffect, useMemo, useState } from 'react';
import { sceneAssetUrl } from '../diagnostics/assetQA';
import { loadLocalImage } from './loadLocalImage';

/** Front feet define the shared ground anchor for the painting and its DOM target. */
export const puzzleDesk = {
  x: -475,
  y: 755,
  width: 210,
  height: 140,
  foot: 934 / 1024,
  src: '/art/floof/puzzle-desk-painting-v1.png',
} as const;

/** Deliberately quiet fallback when the local painted asset cannot be loaded. */
function createPuzzleDeskFallback() {
  const canvas = document.createElement('canvas');
  canvas.width = 384; canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#a39e8b';
  ctx.fillRect(61, 116, 9, 76); ctx.fillRect(311, 116, 9, 76);
  ctx.fillStyle = '#c1b9a5';
  ctx.fillRect(39, 133, 11, 101); ctx.fillRect(329, 133, 11, 101);
  ctx.fillStyle = '#b8b09b';
  ctx.fillRect(29, 130, 320, 20);
  ctx.fillStyle = '#d2c9b4';
  ctx.beginPath(); ctx.moveTo(43, 34); ctx.lineTo(342, 34);
  ctx.lineTo(366, 136); ctx.quadraticCurveTo(367, 143, 356, 143);
  ctx.lineTo(28, 143); ctx.quadraticCurveTo(16, 143, 18, 134); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f3ebd8';
  ctx.beginPath(); ctx.moveTo(108, 49); ctx.lineTo(271, 49);
  ctx.lineTo(285, 119); ctx.lineTo(94, 119); ctx.closePath(); ctx.fill();
  return canvas;
}

/** Both renderers keep the original generated alpha and share the same failure path. */
export function usePuzzleDeskArt() {
  const fallback = useMemo(createPuzzleDeskFallback, []);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    let active = true;
    const request = loadLocalImage(sceneAssetUrl(puzzleDesk.src));
    void request.promise.then(value => { if (active) setImage(value); });
    return () => { active = false; request.cancel(); };
  }, []);
  return image ?? fallback;
}
