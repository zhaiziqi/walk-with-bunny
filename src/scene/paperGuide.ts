import { paths } from './gardenAtlas';
import { hillBirds } from './hillMoon';
import { objects } from './world';

type Point = { x: number; y: number };
type Rail = { points: Point[]; lengths: number[]; stops: number[] };
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => { const t = clamp(v); return t * t * (3 - 2 * t); };
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const ease = (a: number, b: number, dt: number, seconds: number) => a + (b - a) * (1 - Math.exp(-dt / seconds));
const path = paths.find(item => item.id === 'hill-moon')!.points;
const giftDoor = objects.find(object => object.id === 'lock')!;
const departureStart = 3.8, farewellDuration = 6.5;

function atY(y: number): Point {
  const index = path.findIndex(point => point.y >= y);
  const b = path[Math.max(1, index)], a = path[Math.max(0, index - 1)];
  const t = clamp((y - a.y) / (b.y - a.y));
  return { x: a.x + (b.x - a.x) * t, y };
}

/** Resting places are samples of the existing painted path. The last is before the gift lock. */
export const paperGuidePerches = [6970, 7150, 7440, 7700, 7950, 8140, 8310].map(atY);
const rails: Rail[] = hillBirds.map(bird => {
  const points = [{ x: bird.x, y: bird.y }, ...path.filter(point => point.y >= 6900 && point.y < 8310), ...paperGuidePerches]
    .sort((a, b) => a.y - b.y).filter((point, index, all) => index === 0 || distance(point, all[index - 1]) > .001);
  const lengths = [0];
  for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + distance(points[i], points[i - 1]));
  return { points, lengths, stops: [0, ...paperGuidePerches.map(perch => lengths[points.findIndex(point => distance(point, perch) < .01)])] };
});

export type PaperGuideState = {
  actor: Point; leader: number; ready: boolean; met: boolean; quiet: number; approachTime: number;
  time: number; playerSpeed: number; s: number; target: number; perch: number;
  speed: number; lift: number; unfold: number; bank: number;
  invitation: boolean; restTime: number; finished: boolean;
  farewellAge: number; farewellSide: number;
};
export type PaperGuideRef = { current: PaperGuideState | null };

export function createPaperGuide(actor: Point): PaperGuideState {
  return { actor: { ...actor }, leader: -1, ready: false, met: false, quiet: 0, approachTime: 0,
    time: 0, playerSpeed: 0, s: 0, target: 0, perch: 0, speed: 0, lift: 4,
    unfold: 0, bank: 0, invitation: false, restTime: 0, finished: false, farewellAge: -1, farewellSide: 1 };
}

function railPose(leader: number, s: number) {
  const rail = rails[Math.max(0, leader)];
  const index = Math.max(1, rail.lengths.findIndex(length => length >= s));
  const last = rail.lengths.at(-1)!;
  const i = s >= last ? rail.points.length - 1 : index;
  const a = rail.points[i - 1], b = rail.points[i], length = rail.lengths[i] - rail.lengths[i - 1];
  const t = clamp((s - rail.lengths[i - 1]) / length);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t,
    dx: (b.x - a.x) / length, dy: (b.y - a.y) / length };
}

/** Real approach, one invitation, then short flights paced by the visitor. No timer can finish the route. */
export function advancePaperGuide(state: PaperGuideState, actor: Point, delta: number, options: { paused?: boolean; speed?: number; moonlightReady?: boolean } = {}): PaperGuideState {
  if (options.paused || !Number.isFinite(delta) || delta <= 0 || !Number.isFinite(actor.x) || !Number.isFinite(actor.y)) return state;
  const step = distance(actor, state.actor);
  if (step > 80) return { ...state, actor: { ...actor }, ready: false, invitation: false, quiet: 0, approachTime: 0, playerSpeed: 0 };
  // Suspension is not a departure: neither skip the encounter nor cancel a half-finished greeting.
  if (delta > .25) return { ...state, actor: { ...actor } };
  const dt = Math.min(.05, delta), actualStep = step > .015;
  const speedSample = Number.isFinite(options.speed) ? Math.max(0, options.speed!) : step / delta;
  const playerSpeed = ease(state.playerSpeed, speedSample, dt, .20);
  let leader = state.leader;
  if (leader < 0 && actualStep) {
    const distances = hillBirds.map(bird => distance(actor, bird));
    const nearest = distances.indexOf(Math.min(...distances));
    if (distances[nearest] < 270) leader = nearest;
  }
  if (leader < 0) return { ...state, actor: { ...actor }, playerSpeed, time: state.time + dt };
  const current = railPose(leader, state.s), gap = distance(actor, current);
  const ready = state.ready || (actualStep && gap < 390);
  const quiet = ready && gap < 280 && playerSpeed < 28 ? Math.min(2, state.quiet + dt) : Math.max(0, state.quiet - dt * 4);
  const projected = step ? ((actor.x - state.actor.x) * current.dx + (actor.y - state.actor.y) * current.dy) / delta : 0;
  const walkingForward = playerSpeed > 24 && projected > 5;
  // A deliberate close pass can meet the guide without discovering an invisible
  // mandatory stop. Stationary mounts, backwards travel and map jumps cannot
  // accumulate this short exposure; the original quiet invitation remains valid.
  const approachTime = !state.met && ready && actualStep && gap < 250 && walkingForward
    ? Math.min(.28, state.approachTime + dt) : 0;
  let { met, target, perch, invitation, finished, restTime } = state;
  const rail = rails[leader];
  if (!met && ready && (quiet >= .9 || approachTime >= .28)) {
    met = true; target = 1; invitation = quiet >= .9; restTime = 0;
  }
  if (projected < -18 || gap > 430 || !ready) invitation = false;
  // A waiting bird takes off when approached. During a continuous walk it can
  // glide through a perch; mandatory full stops would eventually strand it.
  if (met && target === perch && !finished && ready && gap < 360 && walkingForward && restTime > .25) {
    target = Math.min(perch + 1, rail.stops.length - 1); restTime = 0;
  }
  const remaining = Math.max(0, rail.stops[target] - state.s);
  const allowed = met && target > perch && ready && gap < 430 && (invitation || walkingForward);
  const continueGlide = allowed && !invitation && walkingForward && gap < 360 && target < rail.stops.length - 1;
  const landingSpeed = Math.min(255, remaining * 3);
  const desired = allowed ? (continueGlide ? 255 : landingSpeed) * (.35 + .65 * smooth((state.lift - 4) / 35)) : 0;
  const easedSpeed = ease(state.speed, desired, dt, !allowed ? .22 : continueGlide ? .28 : .075);
  let speed = state.speed + Math.max(-600 * dt, Math.min(600 * dt, easedSpeed - state.speed));
  const travelled = state.s + speed * dt;
  let s = Math.min(rail.stops[target], travelled);
  // Releasing input can leave a visually landed guide a fraction of a pixel
  // before its last stop. Finish that tiny residual only after braking; ordinary
  // flights and intermediate perches retain their existing landing tolerance.
  const lastPerchRest = target === rail.stops.length - 1 && !allowed && rail.stops[target] - s < 2 && speed < 5;
  if (target > perch && ((continueGlide ? rail.stops[target] - s < .01 : rail.stops[target] - s < .3 && speed < 2) || lastPerchRest)) {
    s = rail.stops[target]; perch = target; invitation = false; restTime = 0;
    finished = perch === rail.stops.length - 1;
    if (continueGlide) { target = perch + 1; s = Math.min(rail.stops[target], travelled); }
    else speed = 0;
  }
  if (speed < .03) speed = 0;
  if (target === perch) restTime += dt;
  const liftTarget = allowed || speed > 25 ? 4 + 72 * (continueGlide ? 1 : smooth(remaining / 100)) : 4;
  let lift = ease(state.lift, liftTarget, dt, liftTarget > state.lift ? .33 : .48);
  if (Math.abs(lift - 4) < .02) lift = 4;
  const unfold = ease(state.unfold, ready ? smooth((310 - gap) / 180) : 0, dt, .55);
  const tangent = railPose(leader, s);
  const bank = ease(state.bank, -tangent.dx * smooth(speed / 180) * .15, dt, .4);
  let { farewellAge, farewellSide } = state;
  // Arriving at the last perch is not the goodbye: wait for the visitor to
  // catch up. A map jump clears ready, so waiting after teleport cannot start it.
  if (farewellAge < 0 && options.moonlightReady !== false && finished && ready && gap < 220 && lift === 4 && speed < 2 && restTime >= .3) {
    farewellAge = 0;
    farewellSide = actor.x < tangent.x ? -1 : 1;
  } else if (farewellAge >= 0) farewellAge = Math.min(farewellDuration, farewellAge + dt);
  return { actor: { ...actor }, leader, ready, met, quiet, approachTime, time: state.time + dt, playerSpeed,
    s, target, perch, speed, lift, unfold, bank, invitation, restTime, finished, farewellAge, farewellSide };
}

/** Switching renderers rebases input history, preserving the bird's exact position and pending leg. */
export function resumePaperGuide(state: PaperGuideState, actor: Point): PaperGuideState {
  return { ...state, actor: { ...actor }, ready: false, playerSpeed: 0, quiet: 0, approachTime: 0, speed: 0, invitation: false };
}

export function paperGuideVisibility(actor: Point, bird: Point) {
  return smooth((1250 - distance(actor, bird)) / 650);
}

export function paperGuideBirdPose(state: PaperGuideState | null, index: number, time: number, windLean = 0) {
  const home = hillBirds[index], leading = state?.leader === index;
  const point = leading ? railPose(index, state.s) : home;
  const lift = leading ? state.lift : 4;
  const flight = smooth((lift - 4) / 45), unfold = leading ? state.unfold : 0;
  // At rest the paper wings are slightly folded. Approaching opens them; lift adds a soft wingbeat.
  const wingAngle = (.42 - unfold * .34) * (1 - flight) + flight * (.12 + Math.sin(time * 6.2 + home.phase) ** 2 * .75);
  const ordinaryWing = wingAngle + Math.max(0, windLean) * .018;
  const goodbye = leading && state.farewellAge >= 0, age = goodbye ? state.farewellAge : -1;
  const bow = goodbye ? smooth(age / .48) * (1 - smooth((age - .62) / .55)) : 0;
  const fold = goodbye ? smooth(age / .55) * (1 - smooth((age - 1.18) / .55)) : 0;
  const pointWing = goodbye ? smooth((age - 1.28) / .48) * (1 - smooth((age - 2.48) / .62)) : 0;
  const settle = goodbye ? smooth((age - 2.8) / .8) : 0;
  const folded = ordinaryWing + (.98 - ordinaryWing) * fold;
  const rest = folded + (.52 - folded) * settle;
  // The same local wing may face left or right after the sheet is mirrored.
  const worldDoorSide = giftDoor.x < point.x ? -1 : 1;
  const localDoorSide = worldDoorSide * (home.flip ? -1 : 1);
  const pointing = rest + (-.10 - rest) * pointWing;
  const waitingWing = rest + (.82 - rest) * pointWing;
  // The goodbye lives entirely in farewellAge, so renderer changes preserve
  // the flight and a completed bird cannot reappear on a later visit.
  const departureProgress = goodbye ? clamp((age - departureStart) / (farewellDuration - departureStart)) : 0;
  const departure = smooth(departureProgress), departed = departureProgress >= 1;
  const departureSide = goodbye ? -state.farewellSide : 1;
  const takeoff = smooth((age - departureStart) / .65);
  const opacity = 1 - smooth((age - (farewellDuration - .85)) / .85);
  const flightWing = .12 + Math.sin(Math.max(0, age - departureStart) * 5.2 + home.phase) ** 2 * .75;
  const departureWing = flightWing + (.52 - flightWing) * smooth((departureProgress - .92) / .08);
  const leftWing = goodbye ? (localDoorSide < 0 ? pointing : waitingWing) : ordinaryWing;
  const rightWing = goodbye ? (localDoorSide > 0 ? pointing : waitingWing) : ordinaryWing;
  const departingLift = lift + 72 * smooth((age - departureStart) / 1.4);
  return { x: point.x + departureSide * 360 * departure, y: point.y + 145 * departure, lift: departingLift,
    bank: (leading ? state.bank : 0) + windLean * .012 + departureSide * .12 * takeoff * (1 - smooth((departureProgress - .7) / .3)),
    wingAngle: ordinaryWing + (departureWing - ordinaryWing) * takeoff, flying: !departed && departingLift > 5,
    opacity, departureProgress, departed,
    farewellLean: (goodbye ? -state.farewellSide * .22 * bow + worldDoorSide * -.055 * pointWing : 0) || 0,
    leftWingAngle: leftWing + (departureWing - leftWing) * takeoff,
    rightWingAngle: rightWing + (departureWing - rightWing) * takeoff };
}

/** The visible pose is included for read-only browser QA and static snapshots. */
export function inspectPaperGuide(state: PaperGuideState, time = state.time) {
  const lead = state.leader < 0 ? null : paperGuideBirdPose(state, state.leader, time);
  const rounded = (value: number) => +value.toFixed(3);
  return { leader: state.leader, met: state.met, perch: state.perch, target: state.target,
    s: rounded(state.s), speed: rounded(state.speed), quiet: rounded(state.quiet), approachTime: rounded(state.approachTime), lift: rounded(state.lift), ready: state.ready,
    finished: state.finished, farewellAge: rounded(state.farewellAge), farewellSide: state.farewellSide,
    x: lead ? rounded(lead.x) : null, y: lead ? rounded(lead.y) : null,
    opacity: lead ? rounded(lead.opacity) : 1, departureProgress: lead ? rounded(lead.departureProgress) : 0, departed: lead?.departed ?? false,
    farewellLean: lead ? rounded(lead.farewellLean) : 0,
    leftWingAngle: lead ? rounded(lead.leftWingAngle) : 0, rightWingAngle: lead ? rounded(lead.rightWingAngle) : 0 };
}
