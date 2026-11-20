import { BILLBOARD_TILT, terrainHeight } from './depthWorld';

export type OrangeRestPoint = { x: number; y: number };

/** One quiet stop on the pond–hollow path. Cup coordinates are in the painted
 * billboard, measured upward from its planted foot; drinkSpot is world XY. */
export const orangeRest = {
  x: 440, y: 3890, width: 360, height: 240, foot: .835,
  cup: { x: -65, y: 75 },
  drinkSpot: { x: 290, y: 3875 },
  radius: 55,
} as const;

export type OrangeRestPhase = 'idle' | 'lean' | 'sip' | 'settle' | 'cancel';
export type OrangeRestState = {
  phase: OrangeRestPhase;
  elapsed: number;
  liquid: number;
  startLiquid: number;
  completed: boolean;
  origin: OrangeRestPoint | null;
  actor: OrangeRestPoint;
  amount: number;
  cancelAmount: number;
  directionX: number;
  directionY: number;
  requestCount: number;
};
export type OrangeRestRef = { current: OrangeRestState };

const FULL = .82, AFTER_SIP = .56;
const LEAN_SECONDS = .45, SIP_SECONDS = 1.15, SETTLE_SECONDS = .8;
const TOTAL_SECONDS = LEAN_SECONDS + SIP_SECONDS + SETTLE_SECONDS;
const CANCEL_SECONDS = .3;
const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const smooth = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t); };
const distance = (a: OrangeRestPoint, b: OrangeRestPoint) => Math.hypot(a.x - b.x, a.y - b.y);
const validPoint = (p: OrangeRestPoint) => Number.isFinite(p.x) && Number.isFinite(p.y);

export function createOrangeRest(): OrangeRestState {
  return { phase: 'idle', elapsed: 0, liquid: FULL, startLiquid: FULL, completed: false,
    origin: null, actor: { ...orangeRest.drinkSpot }, amount: 0, cancelAmount: 0,
    directionX: 1, directionY: 0, requestCount: 0 };
}

export function orangeSipAvailable(actor: OrangeRestPoint) {
  return validPoint(actor) && distance(actor, orangeRest.drinkSpot) <= orangeRest.radius;
}

function cupDirection(actor: OrangeRestPoint) {
  const dx = orangeRest.x + orangeRest.cup.x - 36 - actor.x;
  const strawHeight = orangeRest.cup.y + 66;
  const worldY = orangeRest.y + strawHeight * Math.cos(BILLBOARD_TILT);
  const worldZ = terrainHeight(orangeRest.x, orangeRest.y) + 3 + strawHeight * Math.sin(BILLBOARD_TILT);
  const dy = (worldY - actor.y) * Math.cos(BILLBOARD_TILT)
    + (worldZ - terrainHeight(actor.x, actor.y) - 3) * Math.sin(BILLBOARD_TILT) - 120 * 1.45 * .359;
  const magnitude = Math.hypot(dx, dy);
  return magnitude > .001 ? { x: dx / magnitude, y: dy / magnitude } : { x: 1, y: 0 };
}

/** Explicit local action only. No movement, score, collectible, or business-state
 * mutation. Replaying the little gesture never drains/refills the glass. */
export function requestOrangeSip(state: OrangeRestState, actor: OrangeRestPoint, reduced = false): OrangeRestState {
  if (!orangeSipAvailable(actor) || state.phase !== 'idle') return state;
  const direction = cupDirection(actor);
  const base = { ...state, actor: { ...actor }, origin: { ...actor },
    startLiquid: state.liquid, elapsed: 0, amount: 0, cancelAmount: 0,
    directionX: direction.x, directionY: direction.y, requestCount: state.requestCount + 1 };
  if (reduced) return { ...base, phase: 'idle', liquid: AFTER_SIP, startLiquid: AFTER_SIP,
    completed: true, origin: null };
  return { ...base, phase: 'lean' };
}

export function advanceOrangeRest(state: OrangeRestState, actor: OrangeRestPoint, delta: number, options: {
  paused?: boolean; speed?: number;
} = {}): OrangeRestState {
  if (options.paused || !validPoint(actor) || !Number.isFinite(delta) || delta <= 0 || delta > .25) return state;
  const dt = Math.min(delta, .05);
  if (state.phase === 'idle') {
    return distance(state.actor, actor) < .001 ? state : { ...state, actor: { ...actor } };
  }
  const movedAway = state.origin !== null && distance(actor, state.origin) > 24;
  const walking = Number.isFinite(options.speed) && options.speed! > 85;
  if (state.phase !== 'cancel' && (movedAway || walking || !orangeSipAvailable(actor))) {
    return { ...state, phase: 'cancel', elapsed: 0, cancelAmount: state.amount, actor: { ...actor } };
  }
  const elapsed = state.elapsed + dt;
  if (state.phase === 'cancel') {
    const amount = state.cancelAmount * (1 - smooth(elapsed / CANCEL_SECONDS));
    return elapsed >= CANCEL_SECONDS
      ? { ...state, phase: 'idle', elapsed: 0, amount: 0, cancelAmount: 0, origin: null, actor: { ...actor } }
      : { ...state, elapsed, amount, actor: { ...actor } };
  }
  const drink = smooth((elapsed - LEAN_SECONDS) / SIP_SECONDS);
  const liquid = state.completed ? state.liquid : state.startLiquid + (AFTER_SIP - state.startLiquid) * drink;
  const completed = state.completed || elapsed >= LEAN_SECONDS + SIP_SECONDS;
  if (elapsed >= TOTAL_SECONDS) return { ...state, phase: 'idle', elapsed: 0, liquid,
    completed, amount: 0, origin: null, actor: { ...actor } };
  const phase = elapsed < LEAN_SECONDS ? 'lean' : elapsed < LEAN_SECONDS + SIP_SECONDS ? 'sip' : 'settle';
  const amount = smooth(elapsed / LEAN_SECONDS) * (1 - smooth((elapsed - LEAN_SECONDS - SIP_SECONDS) / SETTLE_SECONDS));
  return { ...state, phase, elapsed, liquid, completed, amount, actor: { ...actor } };
}

/** The live and static renderers share this pose. Only upper-body vertices
 * deform: the authoritative actor position and its grounded foot stay exact. */
export function orangeRestPose(state: OrangeRestState | null | undefined, _actor?: OrangeRestPoint) {
  const amount = clamp(state?.amount ?? 0);
  return { amount, leanX: (state?.directionX ?? 1) * amount * 28,
    leanY: (state?.directionY ?? 0) * amount * 28, squash: amount * .055,
    liquid: state?.liquid ?? FULL, active: !!state && state.phase !== 'idle' };
}
export type OrangeRestPose = ReturnType<typeof orangeRestPose>;

export function orangeRestVertex(x: number, y: number, pose: OrangeRestPose) {
  const upper = smooth(y / 1.05), foot = smooth(y / .32);
  return { x: x * (1 + pose.squash * .45 * foot) + pose.leanX / 120 * upper,
    y: y * (1 - pose.squash * foot) + pose.leanY / 120 * upper };
}

export function inspectOrangeRest(state: OrangeRestState) {
  const pose = orangeRestPose(state);
  return { phase: state.phase, elapsed: +state.elapsed.toFixed(4), liquid: +state.liquid.toFixed(4),
    completed: state.completed, amount: +pose.amount.toFixed(4), leanX: +pose.leanX.toFixed(3),
    leanY: +pose.leanY.toFixed(3), requestCount: state.requestCount,
    actor: { ...state.actor }, origin: state.origin ? { ...state.origin } : null };
}
