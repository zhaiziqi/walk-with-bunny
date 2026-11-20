import { BILLBOARD_TILT, terrainHeight } from './depthWorld';
import { hollowMushrooms } from './hollowArch';
import { mushroomLightPose, type MushroomListening } from './mushroomListening';

type Point = { x: number; y: number };
export type FloofAttention = {
  actor: Point; amount: number; directionX: number; directionY: number; source: number;
};
export type FloofAttentionRef = { current: FloofAttention | null };
const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const smooth = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
const ease = (a: number, b: number, dt: number, seconds: number) => a + (b - a) * (1 - Math.exp(-dt / seconds));
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const SIZE = 120, CENTER = SIZE * 1.45 * .359;

export function createFloofAttention(actor: Point): FloofAttention {
  return { actor: { ...actor }, amount: 0, directionX: 0, directionY: 1, source: -1 };
}

/** A visible visitor invites a single soft reply. The mushroom's finite outing is
 * the only clock: a parked companion cannot create extra acknowledgements. */
export function advanceFloofAttention(state: FloofAttention, actor: Point, delta: number, options: {
  mushrooms?: MushroomListening | null; speed?: number; moving?: boolean; paused?: boolean;
} = {}): FloofAttention {
  if (options.paused || !Number.isFinite(delta) || delta <= 0 || !Number.isFinite(actor.x) || !Number.isFinite(actor.y)) return state;
  const step = distance(actor, state.actor);
  if (step > 80) return createFloofAttention(actor);
  if (delta > .25) return { ...state, actor: { ...actor } };
  const dt = Math.min(delta, .05);
  const speed = Number.isFinite(options.speed) ? Math.max(0, options.speed!) : step / delta;
  const walking = options.moving === true || speed > 26;
  let target = 0, directionX = state.directionX, directionY = state.directionY, source = -1;
  const mushrooms = options.mushrooms, leader = mushrooms?.order[0] ?? -1;
  if (mushrooms?.engaged && leader >= 0 && leader < hollowMushrooms.length && Number.isFinite(mushrooms.sequenceTime)) {
    const light = mushroomLightPose(mushrooms, leader), cap = hollowMushrooms[leader];
    if (Number.isFinite(light.x) && Number.isFinite(light.y) && light.opacity > 0 && light.travel > .4) {
      // Resolve the same billboard position used by the actual peeking light.
      const x = cap.x + light.x * cap.w;
      const y = cap.y + light.y * cap.h * Math.cos(BILLBOARD_TILT);
      const z = terrainHeight(cap.x, cap.y) + 3 + light.y * cap.h * Math.sin(BILLBOARD_TILT);
      const dx = x - actor.x;
      const dy = (y - actor.y) * Math.cos(BILLBOARD_TILT)
        + (z - terrainHeight(actor.x, actor.y) - 3) * Math.sin(BILLBOARD_TILT) - CENTER;
      const magnitude = Math.hypot(dx, dy);
      const nearby = 1 - smooth((distance(actor, cap) - 270) / 160);
      // The companion notices the approach, holds its reply briefly, then relaxes
      // while the light is returning. Only the soft silhouette moves, not its root.
      const reply = smooth((mushrooms.sequenceTime - 1.08) / .50)
        * (1 - smooth((mushrooms.sequenceTime - 2.3) / .8));
      target = walking ? 0 : reply * smooth((light.travel - .4) / .45) * light.opacity * nearby;
      if (target > 0) {
        source = leader;
        if (magnitude > 1) { directionX = dx / magnitude; directionY = dy / magnitude; }
      }
    }
  }
  const amount = ease(state.amount, target, dt, walking ? .12 : target > state.amount ? .16 : .25);
  return { actor: { ...actor }, amount: amount < .00001 ? 0 : amount,
    directionX: ease(state.directionX, directionX, dt, .15),
    directionY: ease(state.directionY, directionY, dt, .15), source };
}

/** Renderer switches keep the exact reply. A map relocation starts with a neutral body. */
export function resumeFloofAttention(state: FloofAttention, actor: Point): FloofAttention {
  return distance(state.actor, actor) > 80 ? createFloofAttention(actor) : { ...state, actor: { ...actor } };
}

export function floofAttentionPose(state: FloofAttention | null) {
  const amount = clamp(state?.amount ?? 0), directionX = state?.directionX ?? 0, directionY = state?.directionY ?? 1;
  return { amount, directionX, directionY, leanX: directionX * amount * 11,
    leanY: directionY * amount * 6, puff: amount * .085, stretch: amount * .035 };
}
export type FloofAttentionPose = ReturnType<typeof floofAttentionPose>;

/** Normalized body coordinates, measured from the planted foot (120 world units
 * per unit). The live mesh and static texture use this identical deformation. */
export function floofAttentionVertex(x: number, y: number, pose: FloofAttentionPose) {
  const foot = smooth(y / .38), upper = clamp(y / 1.12) ** 2;
  const cy = y - .52, radius = Math.hypot(x, cy);
  const facing = radius > .001 ? smooth(((x * pose.directionX + cy * pose.directionY) / radius + 1) / 2) : .5;
  const puff = pose.puff * facing * foot;
  return { x: x * (1 + puff) + pose.leanX / SIZE * upper,
    y: y + cy * puff + pose.leanY / SIZE * upper + Math.max(0, y) * pose.stretch * foot };
}

export function inspectFloofAttention(state: FloofAttention) {
  const pose = floofAttentionPose(state);
  return { source: state.source, amount: +pose.amount.toFixed(4),
    directionX: +pose.directionX.toFixed(4), directionY: +pose.directionY.toFixed(4),
    leanX: +pose.leanX.toFixed(3), leanY: +pose.leanY.toFixed(3),
    puff: +pose.puff.toFixed(4), stretch: +pose.stretch.toFixed(4) };
}
