import type { JourneyPose } from './journey';
import type { ArtKey } from '../config/art';

export type Place = 'puzzle' | 'music' | 'lock';
export type WorldObject = { id: Place; art: ArtKey; x: number; y: number; z: number; width: number; height: number; footInset: number };
export const WORLD = { width: 4800, height: 7200 };
export const HOME: JourneyPose = { x: 0, y: 0, zoom: 1 };
export const RABBIT = { x: 0, y: -310, z: 18, width: 125, height: 187.5, footInset: 10 };
export const objects: WorldObject[] = [
  { id: 'lock', art: 'door', x: -250, y: 2350, z: 8, width: 116, height: 174, footInset: 9.1 },
  { id: 'music', art: 'flower', x: 550, y: 1550, z: 14, width: 130, height: 195, footInset: 6.7 },
  { id: 'puzzle', art: 'lantern', x: -650, y: 750, z: 10, width: 180, height: 210.1, footInset: 9.3 },
];
/** Lighting follows location, so returning to the clearing always restores the same morning light. */
export function duskAt(pose: JourneyPose) {
  const d = Math.max(0, Math.min(1, (Math.hypot(pose.x, pose.y) - 80) / 760));
  return d * d * (3 - 2 * d);
}
export function baseScale(width: number, height: number) { return Math.max(height / 1000, width / 1800); }
export function panBounds(width: number, height: number, zoom = 1) {
  const scale = baseScale(width, height) * zoom;
  return { x: Math.max(0, WORLD.width / 2 - width / (2 * scale) - 28), y: Math.max(0, WORLD.height / 2 - height / (2 * scale) - 28) };
}
export function constrainPose(pose: JourneyPose, width: number, height: number): JourneyPose {
  const zoom = Math.max(.85, Math.min(1.45, Number.isFinite(pose.zoom) ? pose.zoom : 1));
  const bounds = panBounds(width, height, zoom);
  return {
    x: Math.max(-bounds.x, Math.min(bounds.x, Number.isFinite(pose.x) ? pose.x : 0)),
    y: Math.max(-bounds.y, Math.min(bounds.y, Number.isFinite(pose.y) ? pose.y : 0)),
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
  const nearest = [...objects].sort((a, b) => Math.hypot(a.x - pose.x, a.y + a.height * .4 - pose.y) - Math.hypot(b.x - pose.x, b.y + b.height * .4 - pose.y))[0];
  return Math.hypot(pose.x, pose.y) < 160 ? '花园中央' : nearest.id === 'puzzle' ? '花灯深处' : nearest.id === 'music' ? '听花的角落' : '秘密小门';
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
