import type { JourneyPose } from './journey';

export type MeadowPoint = { x: number; y: number };
export const SHARED_RABBIT_FOOT_OFFSET = 220;
export const MEADOW_SPEED = 240;
export const MEADOW_HOLD_DELAY_MS = 90;

/** The character and the pointer controller use this same screen-space foot anchor. */
export function meadowScreenFoot(width: number, height: number, scale: number): MeadowPoint {
  return { x: width / 2, y: height / 2 + SHARED_RABBIT_FOOT_OFFSET * scale };
}

/** A pointer indicates a direction, not a route. x and y always remain independent. */
export function meadowVelocity(pointer: MeadowPoint | null, foot: MeadowPoint): MeadowPoint {
  if (!pointer) return { x: 0, y: 0 };
  const dx = pointer.x - foot.x, dy = foot.y - pointer.y;
  const distance = Math.hypot(dx, dy);
  if (!Number.isFinite(distance) || distance <= 12) return { x: 0, y: 0 };
  const speed = MEADOW_SPEED * Math.min(1, (distance - 12) / 28);
  return { x: dx / distance * speed, y: dy / distance * speed };
}

/** One frame of walking, capped so a resumed background tab cannot cause a large leap. */
export function advanceMeadow(current: JourneyPose, velocity: MeadowPoint, deltaSeconds: number, active = true): JourneyPose {
  if (!active || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return current;
  const dt = Math.min(deltaSeconds, .05);
  const vx = Number.isFinite(velocity.x) ? velocity.x : 0;
  const vy = Number.isFinite(velocity.y) ? velocity.y : 0;
  if (!vx && !vy) return current;
  return { ...current, x: current.x + vx * dt, y: current.y + vy * dt };
}

export const MEADOW_ACCELERATION_TIME = .15;
export const MEADOW_TURN_RATE = 8;
export const MEADOW_FOLLOW_TIME = .23;
export const MEADOW_MAX_CAMERA_LEAD = 90;

/** Match pointer directions to a foreshortened ground plane, rather than treating pixels as metres. */
export function groundVelocity(pointer: MeadowPoint | null, foot: MeadowPoint, axisX: MeadowPoint, axisY: MeadowPoint): MeadowPoint {
  const screen = meadowVelocity(pointer, foot);
  const speed = Math.hypot(screen.x, screen.y);
  if (!speed) return { x: 0, y: 0 };
  const ax = axisX.x - foot.x, ay = axisX.y - foot.y;
  const bx = axisY.x - foot.x, by = axisY.y - foot.y;
  const determinant = ax * by - ay * bx;
  if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-8) return screen;
  // meadowVelocity uses up-positive y; projected coordinates use down-positive y.
  const px = screen.x, py = -screen.y;
  const x = (px * by - py * bx) / determinant;
  const y = (ax * py - ay * px) / determinant;
  const length = Math.hypot(x, y);
  return length > 0 ? { x: x / length * speed, y: y / length * speed } : { x: 0, y: 0 };
}

export type MeadowLocomotion = { heading: MeadowPoint; speed: number; velocity: MeadowPoint };
/** A short, controlled start and turn give the rabbit weight. Releasing never calls this integrator. */
export function steerMeadow(heading: MeadowPoint, speed: number, target: MeadowPoint, deltaSeconds: number): MeadowLocomotion {
  const dt = Math.max(0, Math.min(.05, Number.isFinite(deltaSeconds) ? deltaSeconds : 0));
  const desiredSpeed = Math.hypot(target.x, target.y);
  if (!Number.isFinite(desiredSpeed) || desiredSpeed < .001) return { heading, speed: 0, velocity: { x: 0, y: 0 } };
  const from = Math.atan2(heading.y, heading.x), to = Math.atan2(target.y, target.x);
  const turn = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  const angle = from + Math.max(-MEADOW_TURN_RATE * dt, Math.min(MEADOW_TURN_RATE * dt, turn));
  const nextHeading = { x: Math.cos(angle), y: Math.sin(angle) };
  const nextSpeed = Math.min(desiredSpeed, Math.max(0, speed) + MEADOW_SPEED / MEADOW_ACCELERATION_TIME * dt);
  // Slow naturally while making a sharp turn, rather than sliding sideways through the bend.
  const strideSpeed = nextSpeed * (.35 + .65 * Math.max(0, Math.cos(turn)));
  return { heading: nextHeading, speed: nextSpeed, velocity: { x: nextHeading.x * strideSpeed, y: nextHeading.y * strideSpeed } };
}

/** Follow only during active walking. The actor may lead by a small amount; there is no release drift. */
export function followMeadowCamera(camera: JourneyPose, actor: MeadowPoint, deltaSeconds: number, active = true): JourneyPose {
  if (!active || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return camera;
  const dt = Math.min(.05, deltaSeconds);
  const target = { x: actor.x, y: actor.y + SHARED_RABBIT_FOOT_OFFSET };
  const amount = 1 - Math.exp(-dt / MEADOW_FOLLOW_TIME);
  let x = camera.x + (target.x - camera.x) * amount;
  let y = camera.y + (target.y - camera.y) * amount;
  const dx = target.x - x, dy = target.y - y, lag = Math.hypot(dx, dy);
  if (lag > MEADOW_MAX_CAMERA_LEAD) {
    x = target.x - dx / lag * MEADOW_MAX_CAMERA_LEAD;
    y = target.y - dy / lag * MEADOW_MAX_CAMERA_LEAD;
  }
  return { ...camera, x, y };
}
