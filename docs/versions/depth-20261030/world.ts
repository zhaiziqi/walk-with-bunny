import type { JourneyPose } from './journey';
import type { ArtKey } from '../config/art';

export type Place = 'puzzle' | 'music' | 'lock';
export type WorldObject = { id: Place; art: ArtKey; x: number; y: number; z: number; width: number; height: number; footInset: number };
export const WORLD = { width: 3600, height: 1200 };
export function roadCenter(z: number) { return Math.sin((650 - z) / 470) * 32; }
export function groundHeight(x: number, z: number) {
  const base = Math.sin(z / 310) * 5;
  const side = Math.min(1, Math.max(0, (Math.abs(x - roadCenter(z)) - 85) / 330));
  return base + side * side * (60 + 35 * Math.sin(z / 210 + x / 400));
}
export const objects: WorldObject[] = [
  { id: 'lock', art: 'door', x: 102, y: groundHeight(102, 400), z: 400, width: 72, height: 108, footInset: 5.4 },
  { id: 'music', art: 'flower', x: -96, y: groundHeight(-96, 480), z: 480, width: 94, height: 141, footInset: 5.5 },
  { id: 'puzzle', art: 'lantern', x: -140, y: groundHeight(-140, -650), z: -650, width: 178, height: 208, footInset: 11.3 },
];
export const banks = Array.from({length: 18}, (_, i) => {
  const z = 820 - Math.floor(i / 2) * 190;
  const side = i % 2 ? 1 : -1;
  const x = roadCenter(z) + side * ((z < -250 ? 360 : 245) + ((i * 37) % 65));
  return { x, y: groundHeight(x, z), z, width: 230 + i % 3 * 25, height: 105 + i % 3 * 12, flip: side > 0 };
});
export const routeProgress: Record<Place, number> = { puzzle: 1, music: 0, lock: 0 };
/** A dolly into depth, with a separate, bounded lateral look. Shared by all renderers. */
export function cameraFrame(pose: JourneyPose, width: number, height: number) {
  const mobile = width < 700;
  const progress = Math.max(0, Math.min(1, pose.progress));
  const focal = Math.min(height * 1.27, width * 2);
  return {
    x: Math.sin(progress * Math.PI) * 25 + (mobile ? -125 : -30) * progress + pose.pan * (mobile ? 30 : 80),
    y: 215 - 65 * progress,
    z: 1050 - 1150 * progress,
    pitch: .16,
    focal,
    fov: Math.atan(height / (2 * focal)) * 360 / Math.PI,
  };
}
export function project(x: number, y: number, pose: JourneyPose, width: number, height: number, z = 0) {
  const frame = cameraFrame(pose, width, height);
  const dz = frame.z - z;
  const dy = y - frame.y;
  const depth = dz * Math.cos(frame.pitch) - dy * Math.sin(frame.pitch);
  const scale = frame.focal / Math.max(1, depth);
  return { x: width / 2 + (x - frame.x) * scale, y: height / 2 - (dy * Math.cos(frame.pitch) + dz * Math.sin(frame.pitch)) * scale, scale, depth };
}
export function journeyPlace(progress: number) { return progress < .18 ? '入口' : progress < .83 ? '花间小路' : '信号花圃'; }
