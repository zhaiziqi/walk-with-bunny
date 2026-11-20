import { hollowMushrooms } from './hollowArch';

type Point = { x: number; y: number };
type Mushroom = { warmth: number; lean: number; opening: number; tilt: number };
export type MushroomListening = {
  actor: Point; speed: number; resting: boolean; quiet: number;
  focus: number; engaged: boolean; discovered: boolean; replaySerial: number;
  sequenceTime: number; order: number[]; performed: boolean; playedVisit: boolean; lightSide: number;
  mushrooms: Mushroom[];
};
export type MushroomListeningRef = { current: MushroomListening | null };
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (n: number) => { const p = clamp(n); return p * p * (3 - 2 * p); };
const ease = (from: number, to: number, dt: number, seconds: number) => from + (to - from) * (1 - Math.exp(-dt / seconds));
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export function createMushroomListening(actor: Point, discovered = false, replaySerial = -1): MushroomListening {
  return { actor: { ...actor }, speed: 0, resting: true, quiet: 12, focus: -1, engaged: false, discovered, replaySerial,
    sequenceTime: -1, order: [], performed: false, playedVisit: false, lightSide: 1,
    mushrooms: hollowMushrooms.map(() => ({ warmth: 0, lean: 0, opening: 0, tilt: 0 })) };
}

/** Nearby caps answer first. The smallest remaining cap always answers half a beat late. */
export function mushroomAnswerOrder(focus: number) {
  const others = hollowMushrooms.map((_, i) => i).filter(i => i !== focus);
  const late = [...others].sort((a, b) => hollowMushrooms[a].h - hollowMushrooms[b].h)[0];
  const nearby = others.filter(i => i !== late).sort((a, b) => distance(hollowMushrooms[focus], hollowMushrooms[a]) - distance(hollowMushrooms[focus], hollowMushrooms[b]));
  return [focus, ...nearby.slice(0, 1), late];
}
export const mushroomAnswerDelay = (rank: number) => [0, 3.15, 4.1][rank] ?? 0;

/** Rooted, finite acknowledgement. It is driven by the companion, never the cursor.
 * A brief rest reveals a little light. Repeat visits only nod; the optional replay can
 * tell the full small story again. Reading freezes both the sequence and its release. */
export function advanceMushroomListening(state: MushroomListening, actor: Point, delta: number, options: {
  paused?: boolean; speed?: number; replaySerial?: number;
} = {}): MushroomListening {
  if (options.paused || !Number.isFinite(delta) || delta <= 0 || !Number.isFinite(actor.x) || !Number.isFinite(actor.y)) return state;
  const dt = Math.min(delta, .05), step = distance(actor, state.actor), discontinuity = step > 80;
  if (delta > .25 && !discontinuity) return { ...state, actor: { ...actor } };
  const distances = hollowMushrooms.map(mushroom => distance(actor, mushroom));
  const closest = distances.indexOf(Math.min(...distances));
  const near = distance(actor, { x: 1400, y: 4300 }) < (state.engaged ? 440 : 370) && distances[closest] < 285;
  const serial = options.replaySerial ?? state.replaySerial;
  const manual = !discontinuity && near && serial !== state.replaySerial;
  const realStep = !discontinuity && step > .015;
  // Once the little light starts saying hello, a gentle step must not hide it.
  // A genuine departure still cancels it; an unseen first greeting remains available.
  const active = state.sequenceTime >= 0 && state.sequenceTime < 6.4;
  const following = active && state.order.length > 0 && distances[state.order[0]] < 520;
  const engaged = !discontinuity && ((near && (state.engaged || realStep || manual)) || following);
  const measuredSpeed = discontinuity ? 0 : Math.max(0, Number.isFinite(options.speed) ? options.speed! : step / delta);
  const speed = ease(state.speed, measuredSpeed, dt, .22);
  const resting = state.resting ? speed < 38 : speed < 20;
  let quiet = engaged ? (resting ? Math.min(12, state.quiet + dt) : Math.max(0, state.quiet - dt * 12)) : 0;
  if (engaged && !state.engaged) quiet = 0;
  if (manual) quiet = .65;
  let focus = state.focus;
  if (focus < 0 || !state.engaged || distances[closest] + 35 < distances[focus]) focus = closest;
  const presence = engaged ? smooth((285 - distances[closest]) / 165) : 0;
  let { sequenceTime, order, performed, playedVisit, lightSide } = state;
  if (!engaged) { sequenceTime = -1; playedVisit = false; }
  if (engaged && ((quiet >= .65 && presence > .30 && !playedVisit) || (manual && !active))) {
    order = !performed || manual ? mushroomAnswerOrder(focus) : [focus];
    sequenceTime = 0; playedVisit = true;
    // Fix the direction for this outing; crossing the stem must not flip the light.
    lightSide = actor.x < hollowMushrooms[focus].x ? -1 : 1;
  } else if (sequenceTime >= 0) sequenceTime = Math.min(12, sequenceTime + dt);
  if (sequenceTime >= 1.6 && sequenceTime <= 2.25 && order.length > 1 && distances[order[0]] < 360) performed = true;
  const settled = 1 - smooth((quiet - .35) / 1.25);
  const mushrooms = state.mushrooms.map((previous, index) => {
    const mushroom = hollowMushrooms[index], rank = order.indexOf(index);
    const elapsed = sequenceTime - mushroomAnswerDelay(rank);
    const fullLead = rank === 0 && order.length > 1;
    const answer = sequenceTime >= 0 && rank >= 0
      ? fullLead
        ? smooth((elapsed - .12) / .55) * (1 - smooth((elapsed - 3.25) / .7))
        : smooth(elapsed / .24) * (1 - smooth((elapsed - .38) / .62)) * .57
      : 0;
    const afterglow = fullLead && sequenceTime >= 0
      ? .38 * smooth((sequenceTime - 2.8) / .6) * (1 - smooth((sequenceTime - 5.2) / 1.2)) : 0;
    const local = index === focus ? 1 : 0;
    // Passing acknowledgement stays modest. The finite story has its own amplitude.
    const greeting = sequenceTime < 0 || sequenceTime >= 6.4 ? .46 * local * (resting ? settled : 1) : 0;
    const response = Math.max(presence * greeting, answer, afterglow);
    const openingTarget = Math.max(presence * greeting * .46, answer);
    const opening = ease(previous.opening, openingTarget, dt, openingTarget > previous.opening ? .13 : .32);
    const warmth = ease(previous.warmth, response, dt, response > previous.warmth ? .16 : .85);
    const direction = Math.max(-1, Math.min(1, (actor.x - mushroom.x) / 125));
    const lean = ease(previous.lean, -direction * response * .025, dt, .4);
    // Lift the edge nearest the light; keep the opposite edge rooted to the stalk.
    const tiltTarget = fullLead ? lightSide * opening * .22 : direction * opening * .13;
    const tilt = ease(previous.tilt, tiltTarget, dt, .18);
    return { warmth, lean, opening, tilt };
  });
  return { actor: { ...actor }, speed, resting, quiet, focus, engaged, sequenceTime, order, performed, playedVisit, lightSide,
    discovered: state.discovered || engaged, replaySerial: serial, mushrooms };
}

/** One small visitor, shared by live and static renderers. Coordinates are local
 * billboard units; radius is world units. It fully clears the cap, waits, and returns. */
export function mushroomLightPose(state: MushroomListening, index: number) {
  const t = state.sequenceTime, mushroom = hollowMushrooms[index];
  const visible = state.order.length > 1 && state.order[0] === index && t >= .48 && t < 3.5;
  const travel = t < 1.55 ? smooth((t - .6) / .95) : 1 - smooth((t - 2.25) / 1);
  return { x: state.lightSide * (.10 + travel * .60),
    y: .43 - travel * .15 + Math.sin(Math.PI * travel) * .18,
    opacity: visible ? smooth((t - .48) / .18) * (1 - smooth((t - 3.25) / .25)) : 0,
    radius: Math.max(7, Math.min(11, mushroom.h * .065)), travel: visible ? travel : 0 };
}

export function resumeMushroomListening(state: MushroomListening, actor: Point) {
  const relocated = distance(state.actor, actor) > 80;
  return { ...state, actor: { ...actor }, speed: 0, resting: true,
    engaged: relocated ? false : state.engaged, quiet: relocated ? 0 : state.quiet,
    sequenceTime: relocated ? -1 : state.sequenceTime, playedVisit: relocated ? false : state.playedVisit };
}

export function listeningMushroomPose(state: MushroomListening, index: number, windLean = 0) {
  const mushroom = state.mushrooms[index];
  return { lean: windLean * .012 + mushroom.lean, stretch: 1, footOffset: 0,
    capTilt: mushroom.tilt, capLift: mushroom.opening * .15,
    glow: .012 + mushroom.warmth * .20, warmth: mushroom.warmth };
}
export type MushroomPose = ReturnType<typeof listeningMushroomPose>;

/** Normalized billboard geometry, with y=0 exactly at the painted foot. The cap
 * rotates around its neck as one piece while the stalk bends continuously below it.
 * The original illustration and all its brush edges remain unchanged. */
export function mushroomVertex(x: number, y: number, pose: MushroomPose) {
  const neck = .40, blend = smooth((y - .04) / (neck - .04));
  const angle = pose.capTilt * blend;
  const bend = pose.lean * Math.max(0, y) * blend;
  return { x: x * Math.cos(angle) - (y - neck) * Math.sin(angle) + bend,
    y: neck + x * Math.sin(angle) + (y - neck) * Math.cos(angle) + pose.capLift * blend };
}

export function inspectMushroomListening(state: MushroomListening) {
  return { focus: state.focus, quiet: +state.quiet.toFixed(2), engaged: state.engaged,
    sequenceTime: +state.sequenceTime.toFixed(2), order: state.order, performed: state.performed, lightSide: state.lightSide,
    lights: state.mushrooms.map((_, i) => mushroomLightPose(state, i)),
    warmth: state.mushrooms.map(cap => +cap.warmth.toFixed(3)),
    opening: state.mushrooms.map(cap => +cap.opening.toFixed(3)),
    lean: state.mushrooms.map(cap => +cap.lean.toFixed(4)) };
}
