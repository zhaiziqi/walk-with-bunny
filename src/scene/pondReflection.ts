import { pondFootprint } from './orchardPond';
import type { PondListeningState } from './pondListening';

/** The same small, uneven pair is used by the live water and static snapshot.
 * Offsets point into the water so even a northern-bank visit keeps the ears
 * inside the painted shore. There is no new creature or face on the surface. */
export const pondReflectionEars = [
  { x: -14, y: 38, radiusX: 9, radiusY: 27, rotation: -.14 },
  { x: 13, y: 42, radiusX: 8.5, radiusY: 31, rotation: .18 },
] as const;

/** The shoreline wave source sits behind the companion's painted body from a
 * low camera. Put the reflected light a small fixed distance into the water;
 * waves still originate at the unchanged shore contact. No secret-driven slide. */
export function pondReflectionCenter(state: PondListeningState | null) {
  const source = state?.source ?? pondFootprint;
  const dx = pondFootprint.x - source.x, dy = pondFootprint.y - source.y;
  const length = Math.hypot(dx, dy), inset = Math.min(80, length);
  return { x: source.x + (length > 0 ? dx / length * inset : 0),
    y: source.y + (length > 0 ? dy / length * inset : 0) };
}

export function pondSecretPose(state: PondListeningState | null) {
  const amount = Math.max(0, Math.min(1, state?.secretAmount ?? 0));
  const source = pondReflectionCenter(state);
  const angle = Math.atan2(pondFootprint.y - source.y, pondFootprint.x - source.x) - Math.PI / 2;
  const c = Math.cos(angle), s = Math.sin(angle);
  const opacity = amount * (state?.presence ?? 0) * (.08 + .24 * (state?.calm ?? 1));
  return { amount, ears: pondReflectionEars.map(ear => ({
    x: ear.x * c - ear.y * s, y: ear.x * s + ear.y * c,
    radiusX: ear.radiusX, radiusY: ear.radiusY, rotation: ear.rotation + angle, opacity,
  })) };
}
