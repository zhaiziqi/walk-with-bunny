import { pondDriftPetals, pondFootprint } from './orchardPond';
import { advancePondDream, createPondDream, inspectPondDream, resumePondDream, type PondDreamState } from './pondDream';

type Point = { x: number; y: number };
export type PondRipple = Point & { age: number; strength: number; rotation: number; touched: number };
type PetalOffset = Point & { rotation: number; vx: number; vy: number; spin: number; lift: number; rise: number };
export type PondListeningState = {
  actor: Point; source: Point; speed: number; engaged: boolean; discovered: boolean;
  quiet: number; time: number; calm: number; presence: number; travel: number; lastEmit: number; serial: number;
  ripples: PondRipple[]; petals: PetalOffset[];
  secretAge: number; secretAmount: number; secretSeen: boolean; secretQuiet: number;
  dream: PondDreamState;
};
export type PondListeningRef = { current: PondListeningState | null };
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
const ease = (a: number, b: number, dt: number, seconds: number) => a + (b - a) * (1 - Math.exp(-dt / seconds));
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const waveLifetime = 4.8;
const emptyPetal = (): PetalOffset => ({ x: 0, y: 0, rotation: 0, vx: 0, vy: 0, spin: 0, lift: 0, rise: 0 });

// Exact critically damped spring: a finite push coasts, then very slowly returns
// to its resting patch of water. The same elapsed time gives the same settling
// at 30/60/120 Hz, without a frame-dependent velocity multiplier.
function settle(position: number, velocity: number, dt: number, damping: number) {
  const c = velocity + damping * position, decay = Math.exp(-damping * dt);
  return { position: (position + c * dt) * decay, velocity: (velocity - damping * c * dt) * decay };
}
const limit = (value: number, bound: number) => Math.max(-bound, Math.min(bound, value));

/** Closest point on the painted ellipse, slightly inset so a greeting belongs to
 * the water. The companion remains outside the larger walkable-bank ellipse. */
export function pondShoreContact(actor: Point) {
  const { x: cx, y: cy, waterRadiusX: a, waterRadiusY: b } = pondFootprint;
  const dx = actor.x - cx, dy = actor.y - cy;
  let ex: number, ey: number;
  if ((dx / a) ** 2 + (dy / b) ** 2 >= 1) {
    // For an exterior point the Lagrange multiplier is non-negative. Unlike a
    // radial clamp this follows the closest bank naturally around oblique shores.
    let low = 0, high = Math.max(a * Math.abs(dx) + b * Math.abs(dy), 1);
    for (let i = 0; i < 30; i++) {
      const lambda = (low + high) / 2;
      const x = a * dx / (a * a + lambda), y = b * dy / (b * b + lambda);
      if (x * x + y * y > 1) low = lambda; else high = lambda;
    }
    ex = a * a * dx / (a * a + high); ey = b * b * dy / (b * b + high);
  } else {
    // An old or invalid submerged pose gets a finite deterministic bank; this
    // does not alter the existing walkability constraint or move the companion.
    const angle = dx || dy ? Math.atan2(dy / b, dx / a) : -Math.PI / 2;
    ex = a * Math.cos(angle); ey = b * Math.sin(angle);
  }
  return { x: cx + ex * .82, y: cy + ey * .82,
    distance: Math.hypot(dx - ex, dy - ey), bankX: cx + ex, bankY: cy + ey };
}

export function createPondListening(actor: Point, discovered = false): PondListeningState {
  const contact = pondShoreContact(actor);
  return { actor: { ...actor }, source: { x: contact.x, y: contact.y }, speed: 0,
    engaged: false, discovered, quiet: 0, time: 0, calm: 1, presence: 0, travel: 0, lastEmit: -10, serial: 0,
    ripples: Array.from({ length: 4 }, () => ({ x: contact.x, y: contact.y, age: waveLifetime, strength: 0, rotation: 0, touched: 0 })),
    petals: pondDriftPetals.map(emptyPetal), secretAge: -1, secretAmount: 0, secretSeen: false, secretQuiet: 0,
    dream: createPondDream(actor) };
}

/** Reading is a hard pause. Real passage gives a small local wake, never a cursor
 * trail or a timed repeating show. Water and petals keep settling off screen. */
export function advancePondListening(state: PondListeningState, actor: Point, delta: number, options: { paused?: boolean; speed?: number } = {}): PondListeningState {
  if (options.paused || !Number.isFinite(delta) || delta <= 0 || !Number.isFinite(actor.x) || !Number.isFinite(actor.y)) return state;
  const dream = advancePondDream(state.dream ?? createPondDream(state.actor), actor, delta, options);
  const step = distance(actor, state.actor);
  if (step > 80) return { ...state, actor: { ...actor }, speed: 0, engaged: false, quiet: 0, travel: 0, secretAge: -1, secretAmount: 0, secretQuiet: 0, dream };
  if (delta > .25) return { ...state, actor: { ...actor }, dream };
  const dt = Math.min(.05, delta), realStep = step > .015;
  const sample = Number.isFinite(options.speed) ? Math.max(0, options.speed!) : step / delta;
  const speed = ease(state.speed, sample, dt, .24), time = state.time + dt;
  const contact = pondShoreContact(actor), near = contact.distance < (state.engaged ? 240 : 185);
  const engaged = near && (state.engaged || realStep);
  const presenceTarget = engaged ? smooth((240 - contact.distance) / 180) : 0;
  const presence = ease(state.presence ?? 0, presenceTarget, dt, presenceTarget > (state.presence ?? 0) ? .5 : .9);
  const quiet = engaged && speed < 24 ? Math.min(12, state.quiet + dt) : 0;
  const calmTarget = engaged ? smooth((quiet - .3) / 3) : 1;
  const calm = ease(state.calm, calmTarget, dt, calmTarget > state.calm ? .65 : .30);
  const source = { x: ease(state.source.x, contact.x, dt, .22), y: ease(state.source.y, contact.y, dt, .22) };
  // A quiet reflection briefly remembers the companion's rabbit shape. A real
  // step starts the encounter; simply mounting/teleporting beside water cannot.
  let secretAge = state.secretAge ?? -1, secretSeen = state.secretSeen ?? false;
  const unsettled = !engaged || sample > 26 || speed > 32;
  const secretQuiet = unsettled ? 0 : Math.min(12, (state.secretQuiet ?? 0) + dt);
  if (unsettled) secretAge = -1;
  else if (secretAge >= 0) secretAge = Math.min(4, secretAge + dt);
  else if (!secretSeen && secretQuiet >= 3 && presence > .35) secretAge = 0;
  const secretTarget = secretAge >= 0
    ? smooth(secretAge / .7) * (1 - smooth((secretAge - 2.2) / 1.2)) : 0;
  const secretAmount = ease(state.secretAmount ?? 0, secretTarget, dt, secretAge < 0 ? .12 : secretTarget > (state.secretAmount ?? 0) ? .14 : .22);
  // Only a visible pause consumes the secret. Walking away during its emergence
  // lets a later genuine pause discover it, without an idle replay loop.
  if (secretAge >= 1.2 && secretAge <= 2.2 && secretAmount > .75 && presence > .35) secretSeen = true;
  const ripples = state.ripples.map(ripple => ({ ...ripple, age: Math.min(waveLifetime, ripple.age + dt) }));
  let travel = engaged && realStep && speed > 14 ? Math.min(170, state.travel + step) : engaged ? state.travel : 0;
  let { lastEmit, serial } = state;
  const newlyApproached = engaged && !state.engaged;
  const wantsWave = engaged && realStep && (newlyApproached || speed > 14 && travel >= 85) && time - lastEmit >= 1.25;
  if (wantsWave) {
    // Never overwrite a visible wave when all four slots are still in use.
    const free = ripples.findIndex(ripple => ripple.age >= waveLifetime);
    if (free >= 0) {
      serial++; lastEmit = time; travel = 0;
      ripples[free] = { x: contact.x, y: contact.y, age: 0,
        strength: (.32 + .60 * presence) * (.65 + .35 * smooth(speed / 170)), rotation: serial * .61, touched: 0 };
    }
  }
  const petals = state.petals.map((previous, index) => {
    const home = pondDriftPetals[index], point = { x: home.x + previous.x, y: home.y + previous.y };
    const x = settle(previous.x, previous.vx ?? 0, dt, 1.50), y = settle(previous.y, previous.vy ?? 0, dt, 1.50);
    const turn = settle(previous.rotation, previous.spin ?? 0, dt, 1.10);
    const bob = settle(previous.lift ?? 0, previous.rise ?? 0, dt, 2.9);
    for (let slot = 0; slot < ripples.length; slot++) {
      const ripple = ripples[slot], bit = 1 << index;
      if (ripple.strength <= 0 || ripple.age >= waveLifetime || ripple.touched & bit) continue;
      const wave = pondRipplePose(ripple), dx = point.x - ripple.x, dy = point.y - ripple.y;
      const before = pondRipplePose({ ...ripple, age: Math.max(0, ripple.age - dt) });
      const front = Math.hypot(dx / wave.radiusX, dy / wave.radiusY);
      const previousFront = Math.hypot(dx / before.radiusX, dy / before.radiusY);
      // The visual ellipse itself is the trigger. No proximity-to-character force
      // reaches a petal before its visible front, and a front touches it only once.
      if (front <= 1 && previousFront > 1) {
        ripple.touched |= bit;
        const gap = Math.max(1, Math.hypot(dx, dy));
        const force = ripple.strength * (1 - smooth((ripple.age / waveLifetime - .68) / .32));
        const room = 1 - smooth((Math.hypot(previous.x, previous.y) - 12) / 16);
        const push = force * 53 * room;
        // Interpolate the crossing within this frame, so a slow frame cannot
        // give the same push an extra whole frame of travel.
        const fraction = clamp((previousFront - 1) / Math.max(.00001, previousFront - front));
        const remaining = dt * (1 - fraction);
        const addImpulse = (target: { position: number; velocity: number }, impulse: number, damping: number) => {
          const effect = settle(0, impulse, remaining, damping);
          target.position += effect.position; target.velocity += effect.velocity;
        };
        addImpulse(x, dx / gap * push, 1.50); addImpulse(y, dy / gap * push, 1.50);
        // Glancing pressure turns each irregular petal in its own direction.
        const glancing = Math.sin(Math.atan2(dy, dx) - home.rotation + .65);
        addImpulse(turn, (Math.abs(glancing) < .2 ? .2 : glancing) * force * 1.55, 1.10);
        addImpulse(bob, force * 17, 2.9);
      }
    }
    const velocity = Math.hypot(x.velocity, y.velocity), maximum = 52;
    if (velocity > maximum) { x.velocity *= maximum / velocity; y.velocity *= maximum / velocity; }
    return { x: x.position, y: y.position, vx: x.velocity, vy: y.velocity,
      rotation: turn.position, spin: limit(turn.velocity, 1.8), lift: bob.position, rise: limit(bob.velocity, 18) };
  });
  return { actor: { ...actor }, source, speed, engaged, discovered: state.discovered || engaged,
    quiet, time, calm, presence, travel, lastEmit, serial, ripples, petals,
    secretAge, secretAmount: secretAmount < .00001 ? 0 : secretAmount, secretSeen, secretQuiet, dream };
}

/** Switching renderers preserves the same still-water encounter. Rebasing input
 * prevents a fake step; only relocating to another place cancels its engagement. */
export function resumePondListening(state: PondListeningState, actor: Point): PondListeningState {
  const relocated = distance(state.actor, actor) > 80;
  return { ...state, actor: { ...actor }, speed: 0,
    engaged: relocated ? false : state.engaged,
    quiet: relocated ? 0 : state.quiet, travel: relocated ? 0 : state.travel,
    secretAge: relocated ? -1 : state.secretAge, secretAmount: relocated ? 0 : state.secretAmount,
    secretQuiet: relocated ? 0 : state.secretQuiet,
    dream: resumePondDream(state.dream ?? createPondDream(state.actor), actor) };
}

export function pondRipplePose(ripple: PondRipple) {
  const p = clamp(ripple.age / waveLifetime);
  return { radiusX: 12 + p * 410, radiusY: 9 + p * 290,
    opacity: smooth(p / .07) * (1 - smooth((p - .56) / .44)) * ripple.strength * .42,
    rotation: ripple.rotation };
}

/** Only the original three petals move: wave-driven drift, plus a little common wind.
 * Reduced motion passes time/lean zero; no state is advanced by drawing. */
export function pondPetalPose(state: PondListeningState | null, index: number, time: number, windLean = 0) {
  const home = pondDriftPetals[index], offset = state?.petals[index] ?? emptyPetal();
  const t = Number.isFinite(time) ? time : 0, wind = Number.isFinite(windLean) ? Math.max(-1, Math.min(1, windLean)) : 0;
  return { x: home.x + offset.x + Math.sin(t * .13 + index * 2) * 2.5 * wind,
    y: home.y + offset.y + Math.sin(t * .10 + index) * 1.7 * wind,
    rotation: home.rotation + offset.rotation + Math.sin(t * .18 + index) * .055 * wind,
    lift: offset.lift ?? 0, tilt: (offset.lift ?? 0) * .045 };
}

/** Read-only observations shared by both renderers; never used to drive input. */
export function inspectPondListening(state: PondListeningState) {
  return { engaged: state.engaged, discovered: state.discovered, dream: inspectPondDream(state.dream),
    secretQuiet: +(state.secretQuiet ?? 0).toFixed(2), secretAge: +(state.secretAge ?? -1).toFixed(2), secretAmount: +(state.secretAmount ?? 0).toFixed(3), secretSeen: state.secretSeen ?? false,
    quiet: +state.quiet.toFixed(2), calm: +state.calm.toFixed(3), presence: +state.presence.toFixed(3), serial: state.serial,
    source: { x: +state.source.x.toFixed(2), y: +state.source.y.toFixed(2) },
    ripples: state.ripples.map(r => ({ x: +r.x.toFixed(2), y: +r.y.toFixed(2), age: +r.age.toFixed(2), touched: r.touched, opacity: +pondRipplePose(r).opacity.toFixed(3) })),
    petals: pondDriftPetals.map((_p, i) => { const p = pondPetalPose(state, i, 0); return { x: +p.x.toFixed(2), y: +p.y.toFixed(2), rotation: +p.rotation.toFixed(3), lift: +p.lift.toFixed(3), speed: +Math.hypot(state.petals[i].vx ?? 0, state.petals[i].vy ?? 0).toFixed(3) }; }) };
}
