import { CanvasTexture, LinearMipmapLinearFilter, RepeatWrapping } from 'three';
import { createFloofBrushCanvas } from './floofBrushCanvas';

/** WebGL ownership is kept here; the static painter uses the canvas directly. */
export function createFloofBrushTexture() {
  const canvas = createFloofBrushCanvas();
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.anisotropy = 4;
  return texture;
}
