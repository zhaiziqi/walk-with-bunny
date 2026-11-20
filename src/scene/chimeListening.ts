import { archComposition } from './hollowArch';
import { chimeInteractionRadius } from './atlasInteraction';

type Point = { x: number; y: number };
type SwingCarry = { bellAngle: number; bellVelocity: number; paperAngle: number; paperVelocity: number };
export type ChimeListeningState = {
  actor: Point; time: number; speed: number; quiet: number; windLean: number;
  engaged: boolean; approachDistance: number; approachSide: number; playedVisit: boolean;
  discovered: boolean; replaySerial: number; responseAge: number; responseStrength: number; responseSide: number;
  noteSerial: number; notePlayed: boolean;
  carry: SwingCarry;
};
export type ChimeListeningRef = { current: ChimeListeningState | null };
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (n: number) => { const p = clamp(n); return p * p * (3 - 2 * p); };
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const responseDuration = 8.5;
const bellDelay = .24;
const bellFrequency = 4.3;
const carryDuration = .45;
const emptyCarry = (): SwingCarry => ({ bellAngle: 0, bellVelocity: 0, paperAngle: 0, paperVelocity: 0 });
export const chimeFirstCrossing = bellDelay + Math.PI / bellFrequency;

// Bring the old angle AND velocity into a new push, then hand over smoothly.
// A cubic Hermite tail reaches zero with zero velocity after the handover.
function carryAngle(angle: number, velocity: number, age: number) {
  const p = clamp(age / carryDuration);
  return (2 * p ** 3 - 3 * p ** 2 + 1) * angle + (p ** 3 - 2 * p ** 2 + p) * carryDuration * velocity;
}
function responseAt(state: ChimeListeningState, age = state.responseAge) {
  if (age < 0 || age >= responseDuration) return { bellAngle: 0, paperAngle: 0 };
  const force = state.responseSide * state.responseStrength * (1 - smooth((age - 6.5) / 2));
  const t = Math.max(0, age - bellDelay);
  return {
    bellAngle: force * .19 * Math.sin(t * bellFrequency) * Math.exp(-t * .62) * smooth(t / .2)
      + carryAngle(state.carry.bellAngle, state.carry.bellVelocity, age),
    paperAngle: force * .65 * Math.sin(age * 3.65) * Math.exp(-age * .57) * smooth(age / .16)
      + carryAngle(state.carry.paperAngle, state.carry.paperVelocity, age),
  };
}
function continueSwing(state: ChimeListeningState): SwingCarry {
  const pose = responseAt(state), next = responseAt(state, state.responseAge + .0001);
  return { ...pose, bellVelocity: (next.bellAngle - pose.bellAngle) / .0001,
    paperVelocity: (next.paperAngle - pose.paperAngle) / .0001 };
}

export function createChimeListening(actor: Point, discovered = false, replaySerial = -1): ChimeListeningState {
  return { actor: { ...actor }, time: 0, speed: 0, quiet: 0, windLean: 0, engaged: false,
    approachDistance: 0, approachSide: 1, playedVisit: false, discovered, replaySerial,
    responseAge: -1, responseStrength: 1, responseSide: 1, noteSerial: 0, notePlayed: true, carry: emptyCarry() };
}

/** The visitor's passage lifts the paper first. The heavier bell answers late, then
 * both settle. A map arrival is not a passage; a motionless stay never repeats it. */
export function advanceChimeListening(state: ChimeListeningState, actor: Point, delta: number, options: {
  paused?: boolean; speed?: number; replaySerial?: number; windLean?: number;
} = {}): ChimeListeningState {
  if (options.paused || !Number.isFinite(delta) || delta <= 0 || !Number.isFinite(actor.x) || !Number.isFinite(actor.y)) return state;
  const step = distance(actor, state.actor), discontinuity = step > 80;
  if (delta > .25 && !discontinuity) return { ...state, actor: { ...actor } };
  const dt = Math.min(delta, .05), near = distance(actor, archComposition);
  const engaged = !discontinuity && near < (state.engaged ? 440 : 380);
  const serial = options.replaySerial ?? state.replaySerial;
  const manual = !discontinuity && near < chimeInteractionRadius && serial !== state.replaySerial;
  const measuredSpeed = discontinuity ? 0 : Math.max(0, Number.isFinite(options.speed) ? options.speed! : step / delta);
  const speed = state.speed + (measuredSpeed - state.speed) * (1 - Math.exp(-dt / .18));
  const quiet = engaged && speed < 20 ? state.quiet + dt : 0;
  // A few pixels of pointer jitter are insufficient. Count actual ground travel,
  // resetting it after leaving or a relocation so opening the map cannot greet us.
  const approachDistance = engaged ? Math.min(500, (state.engaged ? state.approachDistance : 0) + step) : 0;
  let approachSide = state.approachSide;
  if (engaged && !state.engaged) approachSide = actor.x < archComposition.x ? -1 : 1;
  let playedVisit = engaged && state.playedVisit;
  let { responseAge, responseStrength, responseSide, noteSerial, notePlayed, discovered, carry } = state;
  if (discontinuity) { responseAge = -1; notePlayed = true; carry = emptyCarry(); }
  const active = responseAge >= 0 && responseAge < responseDuration;
  // Coalesce a double-click during the visible initial lift, not the long tail.
  const manualPush = manual && (!active || responseAge >= .4);
  const listening = near < 300 && quiet >= .5 && approachDistance >= 20;
  const passing = near < 145 && speed > 20 && approachDistance >= 55;
  // A deliberate E press reaches farther than the natural passing/stopping response.
  if (manualPush || (!active && engaged && !playedVisit && (listening || passing))) {
    carry = manual && active ? continueSwing(state) : emptyCarry();
    responseAge = 0; responseStrength = manual ? 1 : discovered ? .64 : 1;
    responseSide = manual && !engaged ? (actor.x < archComposition.x ? -1 : 1) : approachSide;
    discovered = true; playedVisit = true; notePlayed = false;
  } else if (responseAge >= 0) responseAge = Math.min(responseDuration, responseAge + dt);
  // Exactly one optional note at the first return through the bell's resting axis.
  // Bounded session IDs avoid unbounded world-event history on many revisits.
  if (!notePlayed && responseAge >= chimeFirstCrossing) {
    noteSerial = Math.min(64, noteSerial + 1); notePlayed = true;
  }
  return { actor: { ...actor }, time: state.time + dt, speed, quiet,
    windLean: Number.isFinite(options.windLean) ? options.windLean! : state.windLean, engaged,
    approachDistance, approachSide, playedVisit, discovered, replaySerial: serial,
    responseAge, responseStrength, responseSide, noteSerial, notePlayed, carry };
}

/** Remounting at the same place preserves the exact snapshot and sound phase.
 * Relocating cancels an unseen response, consumes no note, and requires real travel. */
export function resumeChimeListening(state: ChimeListeningState, actor: Point): ChimeListeningState {
  if (distance(state.actor, actor) <= 80) return { ...state, actor: { ...actor } };
  return { ...state, actor: { ...actor }, speed: 0, quiet: 0, engaged: false,
    approachDistance: 0, playedVisit: false, responseAge: -1, notePlayed: true, carry: emptyCarry() };
}

/** Angles are in billboard coordinates. The paper angle is relative to a hinge
 * under the bell, not a second rotation about the fixed suspension point. */
export function chimeListeningPose(state: ChimeListeningState, windLean = state.windLean) {
  const age = state.responseAge, active = age >= 0 && age < responseDuration;
  const response = responseAt(state);
  return {
    bellAngle: windLean * .055 + Math.sin(state.time * .61) * .012 + response.bellAngle,
    paperAngle: windLean * .035 + Math.sin(state.time * .83 + .4) * .018 + response.paperAngle,
    responseAge: age < 0 ? 100 : age, active,
  };
}

export function inspectChimeListening(state: ChimeListeningState) {
  const pose = chimeListeningPose(state);
  return { engaged: state.engaged, quiet: +state.quiet.toFixed(2), travel: +state.approachDistance.toFixed(1),
    responseAge: +state.responseAge.toFixed(2), responseStrength: state.responseStrength, side: state.responseSide,
    bellAngle: +pose.bellAngle.toFixed(3), paperAngle: +pose.paperAngle.toFixed(3), noteSerial: state.noteSerial };
}
