/** Small, local encounters. These never change puzzle or gift progress. */
export type EcologyPoint = { x: number; y: number };
export const ecologySites = {
  pond: { x: -330, y: 260, radius: 155 },
  seeds: { x: -225, y: 175, radius: 125 },
  stones: { x: -470, y: 520, radius: 150 },
  butterflyTrail: [
    { x: -120, y: 70 }, { x: -300, y: 310 },
    { x: -475, y: 525 }, { x: -650, y: 750 },
  ],
};

export type EncounterState = { inside: boolean; dwell: number; visits: number };
export const emptyEncounter = (): EncounterState => ({ inside: false, dwell: 0, visits: 0 });

/** A local brush requires an actual short step; entering by map or standing still is not contact. */
export function walkedThrough(from: EcologyPoint, to: EcologyPoint, site: EcologyPoint & { radius: number }, moving: boolean) {
  const dx = to.x - from.x, dy = to.y - from.y, length2 = dx * dx + dy * dy;
  if (!moving || !Number.isFinite(length2) || length2 < .000001 || length2 > 10000) return false;
  const t = Math.max(0, Math.min(1, ((site.x - from.x) * dx + (site.y - from.y) * dy) / length2));
  return Math.hypot(from.x + t * dx - site.x, from.y + t * dy - site.y) < site.radius;
}

/** Entry hysteresis prevents a standing rabbit from retriggering every frame. */
export function advanceEncounter(state: EncounterState, distance: number, radius: number, dt: number, moving: boolean, paused: boolean) {
  if (paused) return state;
  const delta = Number.isFinite(dt) ? Math.max(0, Math.min(.05, dt)) : 0;
  const inside = state.inside ? distance < radius + 55 : distance < radius;
  return {
    inside,
    visits: state.visits + (inside && !state.inside ? 1 : 0),
    dwell: inside && !moving ? Math.min(4, state.dwell + delta) : 0,
  };
}

export function butterflyFlight(from: EcologyPoint, to: EcologyPoint, progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  const ease = p * p * (3 - 2 * p);
  return {
    x: from.x + (to.x - from.x) * ease + Math.sin(p * Math.PI * 2) * 26,
    y: from.y + (to.y - from.y) * ease,
    lift: Math.sin(p * Math.PI) * 95,
  };
}
