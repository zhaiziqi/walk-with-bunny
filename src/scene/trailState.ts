/** Optional environmental memories. None of these values complete a puzzle or unlock a gift. */
export type TrailPoint = { x: number; y: number };
export const trailSites = {
  flower: { x: 350, y: -1110, radius: 145 },
  lantern: { x: -650, y: 750, radius: 155 },
  perches: [
    { x: 365, y: -1070 }, { x: 408, y: -790 }, { x: 140, y: -545 },
    { x: -150, y: -360 }, { x: -430, y: -50 }, { x: -730, y: 180 },
    { x: -815, y: 395 }, { x: -655, y: 665 },
  ],
  passages: [
    { x: 175, y: -1560 }, { x: 365, y: -1170 }, { x: 415, y: -825 },
    { x: 105, y: -560 }, { x: -235, y: -265 }, { x: -560, y: 80 },
    { x: -840, y: 310 }, { x: -730, y: 565 },
  ],
};
export const trailFlowerOffsets = [[0, 0, 1], [-45, 24, .62], [37, 38, .74]] as const;
/** Stillness first loosens the bud; full opening continues from that pose without snapping shut. */
export function trailFlowerOpening(state: Pick<TrailState, 'flowerOpen' | 'flowerDwell' | 'bloomAge'>) {
  const smooth = (value: number) => { const p = Math.max(0, Math.min(1, value)); return p * p * (3 - 2 * p); };
  return state.flowerOpen ? .28 + .72 * smooth(state.bloomAge / 2.2) : .28 * smooth(state.flowerDwell / 1.35);
}
export type TrailState = {
  previous: TrailPoint; time: number; passages: boolean[];
  guideMet: boolean; guideIndex: number; guideProgress: number; guideFlying: boolean; guideDirection: 1 | -1;
  guideDuration: number;
  flowerDwell: number; flowerOpen: boolean; bloomAge: number; lanternAwake: boolean;
  returnReady: boolean; returned: boolean; returnAge: number;
};
export const passageEvent = (index: number) => `trail-passage-${index}`;
export const perchEvent = (index: number) => `trail-guide-perch-${index}`;
export const returnPerchEvent = (index: number) => `trail-guide-return-${index}`;
const distance = (a: TrailPoint, b: TrailPoint) => Math.hypot(a.x - b.x, a.y - b.y);
export function createTrailState(actor: TrailPoint, memories: readonly string[] = []): TrailState {
  const homeward = memories.includes('trail-guide-homeward');
  const lastReturn = [...memories].reverse().find(event => /^trail-guide-return-\d+$/.test(event));
  const returned = memories.includes('trail-returned');
  return {
    previous: { ...actor }, time: 0,
    passages: trailSites.passages.map((_, i) => memories.includes(passageEvent(i))),
    guideMet: memories.includes('trail-butterfly-met'),
    guideIndex: homeward ? (lastReturn ? Number(lastReturn.split('-').at(-1)) : trailSites.perches.length - 1)
      : trailSites.perches.reduce((latest, _, i) => memories.includes(perchEvent(i)) ? i : latest, 0),
    guideDirection: homeward ? -1 : 1,
    guideProgress: 0, guideFlying: false, guideDuration: 1, flowerDwell: 0,
    flowerOpen: memories.includes('trail-flower-open'), bloomAge: memories.includes('trail-flower-open') ? 10 : 0,
    lanternAwake: memories.includes('trail-lantern-awake'),
    returnReady: memories.includes('trail-lantern-awake') && distance(actor, trailSites.flower) > trailSites.flower.radius + 160,
    returned, returnAge: returned ? 10 : 0,
  };
}
export function segmentDistance(point: TrailPoint, a: TrailPoint, b: TrailPoint) {
  const dx = b.x - a.x, dy = b.y - a.y, length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / length)) : 0;
  return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy);
}
export const guideVisible = (state: TrailState) => state.flowerOpen || state.guideMet;
export const trailPassageBloom = (state: TrailState, index: number) => state.lanternAwake && state.passages[index];
export function guidePosition(state: TrailState) {
  const a = trailSites.perches[state.guideIndex];
  const b = trailSites.perches[Math.max(0, Math.min(state.guideIndex + state.guideDirection, trailSites.perches.length - 1))];
  const p = state.guideFlying ? state.guideProgress : 0, ease = p * p * (3 - 2 * p);
  return { x: a.x + (b.x - a.x) * ease + Math.sin(p * Math.PI * 2) * 21, y: a.y + (b.y - a.y) * ease, lift: Math.sin(p * Math.PI) * 72 };
}
/** Movement is measured, not inferred from a radius. Large navigation jumps never paint a walked trail. */
export function advanceTrail(state: TrailState, actor: TrailPoint, moving: boolean, delta: number, reading: boolean) {
  const events: string[] = [];
  if (reading || !Number.isFinite(delta) || delta <= 0) return { state, events };
  const dt = Math.min(.05, delta), travel = distance(actor, state.previous), jump = travel > 100;
  const walking = moving && travel > .001 && !jump;
  const next: TrailState = { ...state, previous: { ...actor }, time: state.time + dt, passages: [...state.passages] };
  if (walking) trailSites.passages.forEach((point, i) => {
    if (!state.passages[i] && segmentDistance(point, state.previous, actor) < 88) {
      next.passages[i] = true; events.push(passageEvent(i));
    }
  });
  const byFlower = distance(actor, trailSites.flower) < trailSites.flower.radius;
  next.flowerDwell = !moving && !jump && byFlower ? state.flowerDwell + dt : Math.max(0, state.flowerDwell - dt * 2);
  if (!state.flowerOpen && next.flowerDwell >= 1.35) {
    next.flowerOpen = true; next.bloomAge = 0; events.push('trail-flower-open');
  } else if (next.flowerOpen) next.bloomAge += dt;

  // The flower's opening reveals the next clue. Skipping it never closes the path.
  const guide = guidePosition(state), nearbyGuide = distance(actor, guide) < 185;
  const destinationIndex = state.guideIndex + state.guideDirection;
  const canFly = destinationIndex >= 0 && destinationIndex < trailSites.perches.length;
  const target = canFly ? trailSites.perches[destinationIndex] : guide;
  const towardNext = (actor.x - state.previous.x) * (target.x - actor.x) + (actor.y - state.previous.y) * (target.y - actor.y) > 0;
  if (guideVisible(next) && !state.guideFlying && canFly && walking && nearbyGuide && towardNext) {
    next.guideFlying = true; next.guideProgress = 0;
    // Choose the pace once at takeoff. It keeps its own short flight even when
    // the companion pauses or turns away, then waits on a real perch.
    const guideSpeed = Math.max(180, Math.min(300, travel / dt * 1.4));
    next.guideDuration = Math.max(1.05, distance(trailSites.perches[state.guideIndex], target) / guideSpeed);
    if (!state.guideMet) { next.guideMet = true; events.push('trail-butterfly-met'); }
  }
  // Movement starts a flight; the environmental clock completes it. Stillness
  // cannot freeze the butterfly halfway between two flowers.
  if (state.guideFlying && canFly) {
    next.guideProgress = Math.min(1, state.guideProgress + dt / state.guideDuration);
    if (next.guideProgress >= 1) {
      next.guideIndex += state.guideDirection; next.guideProgress = 0; next.guideFlying = false;
      events.push(state.guideDirection === 1 ? perchEvent(next.guideIndex) : returnPerchEvent(next.guideIndex));
    }
  }
  // Merely reaching the lantern is enough. Following the butterfly or waiting for flowers is optional.
  if (!state.lanternAwake && distance(actor, trailSites.lantern) < trailSites.lantern.radius) {
    next.lanternAwake = true; events.push('trail-lantern-awake');
  }
  if (next.lanternAwake && next.guideIndex === trailSites.perches.length - 1 && next.guideDirection === 1 && !next.guideFlying) {
    next.guideDirection = -1; events.push('trail-guide-homeward');
  }
  if (next.lanternAwake && !byFlower && distance(actor, trailSites.flower) > trailSites.flower.radius + 160) next.returnReady = true;
  if (!state.returned && state.returnReady && walking && byFlower && distance(state.previous, trailSites.flower) >= trailSites.flower.radius) {
    next.returned = true; next.returnAge = 0; events.push('trail-returned');
  } else if (next.returned) next.returnAge += dt;
  return { state: next, events };
}
