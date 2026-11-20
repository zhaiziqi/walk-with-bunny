import { groundVelocity, MEADOW_POINTER_DEAD_ZONE, MEADOW_POINTER_FULL_SPEED } from './meadowMotion.ts';
import type { MeadowPoint } from './meadowMotion';

type ScreenFoot = MeadowPoint & { scale: number };
export const POINTING_BRAKE_SECONDS = .36;

/** The soft body is centred 120 × 1.45 × .359 units above its planted foot. */
export function pointingNeutral(foot: ScreenFoot) {
  const scale = Number.isFinite(foot.scale) ? Math.max(0, foot.scale) : 0;
  return { x: foot.x, y: foot.y - 62.466 * scale, radius: Math.max(26, 60 * scale) };
}

/** Capture only on physical pointer travel, never recompute while the camera follows.
 * The cursor specifies a direction, not a ground destination for the actor to catch.
 */
export function capturePointingVelocity(pointer: MeadowPoint, foot: ScreenFoot, axisX: MeadowPoint, axisY: MeadowPoint): MeadowPoint {
  const centre = pointingNeutral(foot);
  const dx = pointer.x - centre.x, dy = pointer.y - centre.y, distance = Math.hypot(dx, dy);
  if (!Number.isFinite(distance) || distance <= centre.radius) return { x: 0, y: 0 };
  const fullSpeedDistance = Math.max(MEADOW_POINTER_FULL_SPEED, centre.radius + 1);
  const fraction = Math.min(1, (distance - centre.radius) / (fullSpeedDistance - centre.radius));
  const steeringDistance = MEADOW_POINTER_DEAD_ZONE + fraction * (MEADOW_POINTER_FULL_SPEED - MEADOW_POINTER_DEAD_ZONE);
  return groundVelocity({ x: foot.x + dx / distance * steeringDistance, y: foot.y + dy / distance * steeringDistance }, foot, axisX, axisY);
}
