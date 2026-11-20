import { pondFootprint } from './orchardPond';

export type PondDreamPoint = { x: number; y: number };
export type PondDreamTrail = PondDreamPoint & { age: number; strength: number };
type Sample = PondDreamPoint & { time: number; angle: number };
export type PondDreamState = {
  actor: PondDreamPoint; reflection: PondDreamPoint & { vx: number; vy: number };
  target: PondDreamPoint; presence: number; playfulness: number; time: number;
  phase: 'dormant' | 'mirror' | 'play' | 'rest'; engaged: boolean;
  nearAge: number; quiet: number; direction: number;
  history: Sample[]; trail: PondDreamTrail[]; lastStamp: PondDreamPoint;
  coastTarget: PondDreamPoint; coastStarted: boolean;
};
export const DREAM_TRAIL_LIMIT = 18;
export const DREAM_TRAIL_LIFETIME = 8;
const HISTORY_LIMIT = 36;
const DELAY = .48;
const clamp = (value: number, low = 0, high = 1) => Math.max(low, Math.min(high, value));
const smooth = (value: number) => { const p = clamp(value); return p * p * (3 - 2 * p); };
const distance = (a: PondDreamPoint, b: PondDreamPoint) => Math.hypot(a.x - b.x, a.y - b.y);
const ease = (a: number, b: number, dt: number, seconds: number) => a + (b - a) * (1 - Math.exp(-dt / seconds));
const centre = { x: pondFootprint.x, y: pondFootprint.y };

function shore(actor: PondDreamPoint) {
  const dx = actor.x - centre.x, dy = actor.y - centre.y;
  const angle = dx || dy ? Math.atan2(dy / 250, dx / 380) : -Math.PI / 2;
  const point = { x: centre.x + Math.cos(angle) * 380, y: centre.y + Math.sin(angle) * 250 };
  return { angle, distance: distance(actor, point) };
}
function onWater(angle: number, radius = .56): PondDreamPoint {
  return { x: centre.x + Math.cos(angle) * 380 * radius, y: centre.y + Math.sin(angle) * 250 * radius };
}
function contained(point: PondDreamPoint, radius = .62): PondDreamPoint {
  const dx = point.x - centre.x, dy = point.y - centre.y;
  const size = Math.hypot(dx / 380, dy / 250), scale = size > radius ? radius / size : 1;
  return { x: centre.x + dx * scale, y: centre.y + dy * scale };
}
function shortestAngle(angle: number) { return Math.atan2(Math.sin(angle), Math.cos(angle)); }
function delayed(history: Sample[], time: number): Sample {
  if (time <= history[0].time) return history[0];
  for (let i = 1; i < history.length; i++) {
    if (history[i].time < time) continue;
    const a = history[i - 1], b = history[i], p = clamp((time - a.time) / Math.max(.00001, b.time - a.time));
    return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p,
      angle: a.angle + shortestAngle(b.angle - a.angle) * p, time };
  }
  return history[history.length - 1];
}
// Exact critically damped motion around a target: changing direction retains
// velocity, and equal elapsed time gives the same coasting at different rates.
function spring(position: number, velocity: number, target: number, dt: number) {
  const omega = 3.4, offset = position - target, c = velocity + omega * offset, decay = Math.exp(-omega * dt);
  return { position: target + (offset + c * dt) * decay, velocity: (velocity - omega * c * dt) * decay };
}

export function createPondDream(actor: PondDreamPoint): PondDreamState {
  const contact = shore(actor), point = onWater(contact.angle);
  return { actor: { ...actor }, reflection: { ...point, vx: 0, vy: 0 }, target: { ...point },
    presence: 0, playfulness: 0, time: 0, phase: 'dormant', engaged: false,
    nearAge: 0, quiet: 0, direction: 1, history: [{ ...point, angle: contact.angle, time: 0 }],
    trail: [], lastStamp: { ...point }, coastTarget: { ...point }, coastStarted: false };
}

/** A water companion remembers real travel. The player is never moved, and no
 * input is stolen. Its short history produces a visible delay; each real stop
 * gives it one last, independent swim instead of starting an idle patrol. */
export function advancePondDream(state: PondDreamState, actor: PondDreamPoint, delta: number,
  options: { paused?: boolean; speed?: number } = {}): PondDreamState {
  if (options.paused || !Number.isFinite(delta) || delta <= 0 || !Number.isFinite(actor.x) || !Number.isFinite(actor.y)) return state;
  const step = distance(actor, state.actor);
  if (step > 80) return { ...createPondDream(actor), time: state.time };
  if (delta > .25) return { ...state, actor: { ...actor } };
  const dt = Math.min(.05, delta), time = state.time + dt, contact = shore(actor);
  const realStep = step > .015;
  const measuredSpeed = step / delta;
  const sampleSpeed = Number.isFinite(options.speed) ? Math.max(0, options.speed!) : measuredSpeed;
  const walking = realStep && Math.max(sampleSpeed, measuredSpeed) > 8;
  const near = contact.distance < (state.engaged ? 240 : 175);
  const engaged = near && (state.engaged || realStep);
  const entered = engaged && !state.engaged;
  const nearAge = engaged ? (entered ? dt : state.nearAge + dt) : 0;
  const quiet = engaged && !walking ? Math.min(20, state.quiet + dt) : 0;
  const presenceTarget = engaged ? smooth((260 - contact.distance) / 170) : 0;
  const presence = ease(state.presence, presenceTarget, dt, presenceTarget > state.presence ? .34 : .65);
  const playfulTarget = engaged ? smooth((nearAge - .65) / .7) : 0;
  const playfulness = ease(state.playfulness, playfulTarget, dt, .28);
  const home = onWater(contact.angle);
  const sample: Sample = { ...home, angle: contact.angle, time };
  let history = entered ? [sample] : state.history.slice();
  if (time - history[history.length - 1].time >= 1 / 30 - .000001) history.push(sample);
  if (history.length > HISTORY_LIMIT) history = history.slice(-HISTORY_LIMIT);
  const previousAngle = shore(state.actor).angle;
  const angleStep = shortestAngle(contact.angle - previousAngle);
  const directionTarget = walking && Math.abs(angleStep) > .0001 ? Math.sign(angleStep) : state.direction;
  const direction = ease(state.direction, directionTarget, dt, .22);
  const echo = delayed(history, time - DELAY);
  // At first it sits where a reflection should. Then it cuts a little farther
  // into the pond, and rounds a turn before following the delayed shore angle.
  const swimmingTarget = onWater(echo.angle + direction * .30 * playfulness, .56 - .16 * playfulness);
  let coastStarted = walking || !engaged ? false : state.coastStarted;
  let coastTarget = state.coastTarget;
  if (engaged && quiet > .12 && playfulness > .25 && !coastStarted) {
    const angle = Math.atan2((state.reflection.y - centre.y) / 250, (state.reflection.x - centre.x) / 380);
    const tx = -Math.sin(angle) * 380, ty = Math.cos(angle) * 250, magnitude = Math.max(1, Math.hypot(tx, ty));
    const ix = centre.x - state.reflection.x, iy = centre.y - state.reflection.y, inward = Math.max(1, Math.hypot(ix, iy));
    coastTarget = contained({ x: state.reflection.x + tx / magnitude * (direction >= 0 ? 110 : -110) + ix / inward * 18,
      y: state.reflection.y + ty / magnitude * (direction >= 0 ? 110 : -110) + iy / inward * 18 });
    coastStarted = true;
  }
  const target = engaged ? coastStarted && !walking ? coastTarget : swimmingTarget : { x: state.reflection.x, y: state.reflection.y };
  const x = spring(state.reflection.x, state.reflection.vx, target.x, dt), y = spring(state.reflection.y, state.reflection.vy, target.y, dt);
  const speed = Math.hypot(x.velocity, y.velocity), cap = speed > 240 ? 240 / speed : 1;
  const proposed = { x: state.reflection.x + clamp(x.position - state.reflection.x, -12, 12),
    y: state.reflection.y + clamp(y.position - state.reflection.y, -12, 12) };
  const point = contained(proposed);
  let vx = x.velocity * cap, vy = y.velocity * cap;
  if (distance(point, proposed) > .00001) {
    // Remove only outward motion at the safe ellipse; tangential flow survives.
    const nx = (point.x - centre.x) / (380 * 380), ny = (point.y - centre.y) / (250 * 250);
    const dot = vx * nx + vy * ny, length = nx * nx + ny * ny;
    if (dot > 0 && length) { vx -= dot / length * nx; vy -= dot / length * ny; }
  }
  if (quiet > 4 && Math.hypot(vx, vy) < .03) { vx = 0; vy = 0; }
  let trail = state.trail.map(p => ({ ...p, age: p.age + dt })).filter(p => p.age < DREAM_TRAIL_LIFETIME);
  let lastStamp = state.lastStamp;
  if (engaged && presence > .15 && playfulness > .10 && distance(point, lastStamp) > 12) {
    trail.push({ ...point, age: 0, strength: clamp(.5 + playfulness * .5) });
    trail = trail.slice(-DREAM_TRAIL_LIMIT); lastStamp = { ...point };
  }
  if (!engaged && presence < .005) trail = [];
  const phase = !engaged ? 'dormant' : playfulness < .25 ? 'mirror' : quiet > 2.8 ? 'rest' : 'play';
  return { actor: { ...actor }, reflection: { ...point, vx, vy }, target: { ...target },
    presence: presence < .00001 ? 0 : presence, playfulness: playfulness < .00001 ? 0 : playfulness,
    time, phase, engaged, nearAge, quiet, direction, history, trail, lastStamp,
    coastTarget: { ...coastTarget }, coastStarted };
}

/** A renderer handoff freezes the same picture. Map relocation starts a fresh,
 * unengaged reflection and cannot paint a star trail across the pond. */
export function resumePondDream(state: PondDreamState, actor: PondDreamPoint): PondDreamState {
  return distance(state.actor, actor) > 80 ? { ...createPondDream(actor), time: state.time } : { ...state, actor: { ...actor } };
}

export function inspectPondDream(state: PondDreamState) {
  const rounded = (value: number) => +value.toFixed(3);
  return { phase: state.phase, engaged: state.engaged, presence: rounded(state.presence), playfulness: rounded(state.playfulness),
    time: rounded(state.time), quiet: rounded(state.quiet), coastStarted: state.coastStarted,
    reflection: { x: rounded(state.reflection.x), y: rounded(state.reflection.y), vx: rounded(state.reflection.vx), vy: rounded(state.reflection.vy) },
    target: { x: rounded(state.target.x), y: rounded(state.target.y) },
    trail: state.trail.map(p => ({ x: rounded(p.x), y: rounded(p.y), age: rounded(p.age), strength: rounded(p.strength) })) };
}
