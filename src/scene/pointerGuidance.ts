import type { MeadowPoint } from './meadowMotion';

const MIN_POINTER_TRAVEL = .4;

export type PointerGuide = {
  sample: MeadowPoint | null;
  target: MeadowPoint | null;
  lastMovedAt: number;
};
export type PointerMotion = {
  point: MeadowPoint;
  movementX: number;
  movementY: number;
  pointerType: string;
  buttons: number;
  enabled: boolean;
  entered: boolean;
  blocked: boolean;
};

export const emptyPointerGuide = (): PointerGuide => ({ sample: null, target: null, lastMovedAt: -Infinity });

/** Only fresh, unpressed mouse motion can guide. Layout/enter events cannot renew a walk. */
export function movePointerGuide(previous: PointerGuide, input: PointerMotion, now: number): PointerGuide {
  const { point } = input;
  if (!Number.isFinite(now) || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return emptyPointerGuide();
  if (!input.enabled || !input.entered || input.blocked || input.pointerType !== 'mouse' || input.buttons !== 0) {
    return emptyPointerGuide();
  }
  // After a panel, map or control releases the meadow, establish one fresh
  // coordinate before steering. WebViews can emit a compatibility move when
  // the overlay disappears even though the hand did not move.
  if (!previous.sample) return { sample: point, target: null, lastMovedAt: -Infinity };
  const travelled = previous.sample ? Math.hypot(point.x - previous.sample.x, point.y - previous.sample.y) : Math.hypot(input.movementX, input.movementY);
  if (!Number.isFinite(travelled) || travelled < MIN_POINTER_TRAVEL) {
    // Some WebViews report zero movementX/Y for unpressed trackpads. Retain
    // the first client coordinate so the next event can establish real travel.
    return previous.sample ? previous : { sample: point, target: null, lastMovedAt: -Infinity };
  }
  return { sample: point, target: point, lastMovedAt: now };
}

/** A deliberate direction stays active until the user changes it or leaves the garden. */
export function pointerGuideStrength(guide: PointerGuide, now: number): number {
  if (!guide.target || !Number.isFinite(now) || !Number.isFinite(guide.lastMovedAt)) return 0;
  const rawAge = now - guide.lastMovedAt;
  // Reject an inconsistent future timestamp, but never expire a stationary pointer.
  return rawAge < -50 ? 0 : 1;
}

/** Soften fine trackpad noise, while a deliberate change of direction catches up quickly. */
export function advancePointerTarget(previous: MeadowPoint | null, target: MeadowPoint, deltaSeconds: number): MeadowPoint {
  if (!previous) return { ...target };
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return previous;
  const distance = Math.hypot(target.x - previous.x, target.y - previous.y);
  if (distance < .01) return { ...target };
  const t = Math.min(1, distance / 90);
  const deliberate = t * t * (3 - 2 * t);
  const responseSeconds = .05 - .035 * deliberate;
  const amount = 1 - Math.exp(-Math.min(deltaSeconds, .05) / responseSeconds);
  return { x: previous.x + (target.x - previous.x) * amount, y: previous.y + (target.y - previous.y) * amount };
}
