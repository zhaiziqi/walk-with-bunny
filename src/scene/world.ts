import type { JourneyPose } from './journey';
import type { ArtKey } from '../config/art';
import { cameraBounds, playBounds, regionAt, regionAtmosphere } from './gardenAtlas';
import { giftGate } from './giftGate';

export type Place = 'puzzle' | 'music' | 'lock';
export type WorldObject = { id: Place; art: ArtKey; x: number; y: number; z: number; width: number; height: number; footInset: number };
export const WORLD = { width: playBounds.maxX - playBounds.minX, height: playBounds.maxY - playBounds.minY };
export const HOME: JourneyPose = { x: 0, y: -1580, zoom: 1 };
export const RABBIT = { x: 0, y: -1890, z: 18, width: 125, height: 187.5, footInset: 10 };
export const objects: WorldObject[] = [
  { id: 'lock', art: 'door', x: -200, y: 8500, z: 8, width: giftGate.width, height: giftGate.height, footInset: giftGate.height * (1 - giftGate.foot) },
  { id: 'music', art: 'flower', x: 900, y: 2100, z: 14, width: 130, height: 195, footInset: 6.7 },
  // The shared painted sheet is 384×512; its base ends at pixel 490.
  { id: 'puzzle', art: 'lantern', x: -650, y: 750, z: 10, width: 204, height: 272, footInset: 272 * (1 - 490 / 512) },
];
/** Lighting follows location, so returning to the clearing always restores the same morning light. */
export function duskAt(pose: JourneyPose) {
  return regionAtmosphere(pose.x, pose.y - 220).dusk;
}
export function baseScale(width: number, height: number) { return Math.max(height / 1000, width / 1800); }
export function panBounds(_width: number, _height: number, _zoom = 1) {
  // Ground has a separate scenery skirt. Play limits therefore need not shrink on a wide monitor.
  return { x: cameraBounds.maxX, y: cameraBounds.maxY, ...cameraBounds };
}
export function constrainPose(pose: JourneyPose, width: number, height: number): JourneyPose {
  const zoom = Math.max(.85, Math.min(1.45, Number.isFinite(pose.zoom) ? pose.zoom : 1));
  const bounds = panBounds(width, height, zoom);
  return {
    x: Math.max(bounds.minX, Math.min(bounds.maxX, Number.isFinite(pose.x) ? pose.x : 0)),
    y: Math.max(bounds.minY, Math.min(bounds.maxY, Number.isFinite(pose.y) ? pose.y : 0)),
    zoom,
  };
}
/** Independent x/y camera coordinates: no route or forward-progress scalar. */
export function cameraFrame(pose: JourneyPose, width: number, height: number) {
  const safe = constrainPose(pose, width, height);
  const scale = baseScale(width, height) * safe.zoom;
  const z = 1600, focal = scale * z;
  return { ...safe, z, scale, focal, fov: Math.atan(height / (2 * focal)) * 360 / Math.PI };
}
export function project(x: number, y: number, pose: JourneyPose, width: number, height: number, z = 0) {
  const frame = cameraFrame(pose, width, height);
  const depth = frame.z - z, scale = frame.focal / depth;
  return { x: width / 2 + (x - frame.x) * scale, y: height / 2 - (y - frame.y) * scale, scale, depth };
}
export function focusPose(place: Place, width: number, height: number, reading = false): JourneyPose {
  const object = objects.find(item => item.id === place)!;
  const zoom = reading ? 1.22 : 1;
  const scale = baseScale(width, height) * zoom;
  // Keep the feet on the meadow in a destination view; reserve space above the mobile sheet.
  const groundOffset = reading && width < 700 ? -height * .1 / scale : height * .22 / scale;
  return constrainPose({ x: object.x + (reading && width > 700 ? width * .19 / scale : 0), y: object.y + groundOffset, zoom }, width, height);
}
export function gardenPlace(pose: JourneyPose) {
  return regionAt(pose.x, pose.y - 220).name;
}

/** The painted sky is a distant layer. Its small bounded parallax keeps the full composition airy. */
export function backdropFrame(pose: JourneyPose, width: number, height: number) {
  const frame = cameraFrame(pose, width, height);
  const cover = Math.max(width / 1448, height / 1086) * 1.12;
  const pixelW = 1448 * cover, pixelH = 1086 * cover;
  const maxX = (pixelW - width) / 2 - 2, maxY = (pixelH - height) / 2 - 2;
  const dx = Math.max(-maxX, Math.min(maxX, -frame.x * frame.scale * .075));
  const skyBias = Math.min((pixelH - height) * .28, height * .08);
  const dy = Math.max(-maxY, Math.min(maxY, skyBias + frame.y * frame.scale * .075));
  return { x: frame.x + dx / frame.scale, y: frame.y - dy / frame.scale, width: pixelW / frame.scale, height: pixelH / frame.scale };
}

/** Let complete silhouettes emerge from the mist; avoid stray cropped feet and doors at the frame. */
export function objectVisibility(object: Pick<WorldObject, 'x' | 'y' | 'z' | 'width' | 'height' | 'footInset'>, pose: JourneyPose, width: number, height: number) {
  const p = project(object.x, object.y, pose, width, height, object.z);
  const edge = Math.min(p.x - object.width * p.scale / 2 - 12, width - p.x - object.width * p.scale / 2 - 12,
    p.y - (object.height - object.footInset) * p.scale - 74, height - p.y - 54);
  const value = Math.max(0, Math.min(1, edge / 50));
  return value * value * (3 - 2 * value);
}
