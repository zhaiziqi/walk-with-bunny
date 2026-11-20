import type { JourneyPose } from './journey';
import type { ArtKey } from '../config/art';

export type Place = 'puzzle' | 'music' | 'lock';
export type WorldObject = { id: Place; art: ArtKey; x: number; y: number; z: number; width: number; height: number; footInset: number };
export const WORLD = { width: 2600, height: 1950 };
export const HOME: JourneyPose = { x: 0, y: 0, zoom: 1 };
export const objects: WorldObject[] = [
  { id: 'lock', art: 'door', x: 680, y: 240, z: 8, width: 120, height: 180, footInset: 9.4 },
  { id: 'music', art: 'flower', x: 624, y: -312, z: 14, width: 190, height: 285, footInset: 11.1 },
  { id: 'puzzle', art: 'lantern', x: -650, y: -100, z: 10, width: 245, height: 286, footInset: 15.5 },
];
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
  return constrainPose({ x: object.x + (reading && width > 700 ? width * .19 / scale : 0), y: object.y + object.height * (reading && width < 700 ? -.05 : .35), zoom }, width, height);
}
export function gardenPlace(pose: JourneyPose) {
  const nearest = [...objects].sort((a, b) => Math.hypot(a.x - pose.x, a.y + a.height * .4 - pose.y) - Math.hypot(b.x - pose.x, b.y + b.height * .4 - pose.y))[0];
  return Math.hypot(pose.x, pose.y) < 160 ? '花园中央' : nearest.id === 'puzzle' ? '花灯深处' : nearest.id === 'music' ? '听花的角落' : '秘密小门';
}
