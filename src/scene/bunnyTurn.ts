/** Visual orientation only: this module never changes the walker or camera. */
export type BunnyTurn = {
  /** Radians, counterclockwise from world east. Kept in [0, 2π). */
  angle: number;
  angularVelocity: number;
  targetAngle: number;
  /** Last deliberate arc, used to resolve noisy near-opposite headings. */
  turnSign: number;
  /** Cosmetic angles in radians; apply above the planted body edge only. */
  bodyLean: number;
  bodyLeanVelocity: number;
  earLag: number;
  earLagVelocity: number;
};

export type BunnyTurnInput = {
  headingX: number; headingY: number;
  moving: boolean; speed?: number;
  dt: number; reducedMotion?: boolean;
};

const TAU = Math.PI * 2;
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const wrap = (angle: number) => ((angle % TAU) + TAU) % TAU;
const deltaAngle = (from: number, to: number) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
const headingAngle = (x: number, y: number): number | null =>
  Number.isFinite(x) && Number.isFinite(y) && Math.hypot(x, y) > .001 ? wrap(Math.atan2(y, x)) : null;

/** Exact critically damped spring for a fixed target, with no Euler instability. */
function spring(value: number, velocity: number, target: number, dt: number, frequency: number) {
  const error = value - target;
  const carry = (velocity + frequency * error) * dt;
  const decay = Math.exp(-frequency * dt);
  return { value: target + (error + carry) * decay, velocity: (velocity - frequency * carry) * decay };
}

export function createBunnyTurn(heading: { x: number; y: number } = { x: 1, y: -1 }): BunnyTurn {
  const angle = headingAngle(heading.x, heading.y) ?? Math.PI * 1.75;
  return { angle, angularVelocity: 0, targetAngle: angle, turnSign: 1,
    bodyLean: 0, bodyLeanVelocity: 0, earLag: 0, earLagVelocity: 0 };
}

/**
 * Heading is the controller's actual heading, not the raw pointer position.
 * A stop retains the last intended direction and lets any unfinished turn settle.
 * A stalled render may advance at most 50 ms, so returning to a tab cannot flip it.
 */
export function advanceBunnyTurn(previous: BunnyTurn, input: BunnyTurnInput): BunnyTurn {
  const dt = clamp(Number.isFinite(input.dt) ? input.dt : 0, 0, .05);
  if (!dt) return previous;
  const speed = Number.isFinite(input.speed) ? clamp(input.speed!, 0, 240) : input.moving ? 240 : 0;
  const desired = (input.moving || speed > .5) ? headingAngle(input.headingX, input.headingY) : null;
  let targetAngle = desired ?? previous.targetAngle;
  let difference = deltaAngle(previous.angle, targetAngle);
  let turnSign = previous.turnSign;
  // Pointer noise around an exact reversal must not alternate the chosen arc.
  if (Math.abs(difference) > Math.PI - .06) difference = Math.abs(difference) * turnSign;
  else if (Math.abs(difference) > .08) turnSign = Math.sign(difference);
  targetAngle = wrap(previous.angle + difference);

  let angle = previous.angle, angularVelocity = previous.angularVelocity;
  let bodyLean = previous.bodyLean, bodyLeanVelocity = previous.bodyLeanVelocity;
  let earLag = previous.earLag, earLagVelocity = previous.earLagVelocity;
  const unwrappedTarget = previous.angle + difference;
  const steps = Math.max(1, Math.ceil(dt * 120));
  const step = dt / steps;
  for (let index = 0; index < steps; index++) {
    const turned = spring(angle, angularVelocity, unwrappedTarget, step, input.reducedMotion ? 24 : 18);
    // Even erratic input cannot rotate farther than 0.5 radians in a capped frame.
    angle += clamp(turned.value - angle, -10 * step, 10 * step);
    angularVelocity = clamp(turned.velocity, -10, 10);
    if (input.reducedMotion) {
      bodyLean = bodyLeanVelocity = earLag = earLagVelocity = 0;
    } else {
      // Both responses are bounded and local: no floating foot or springy travel.
      const lean = spring(bodyLean, bodyLeanVelocity, -Math.cos(angle) * speed / 240 * .022, step, 16);
      bodyLean = lean.value; bodyLeanVelocity = lean.velocity;
      const ears = spring(earLag, earLagVelocity, clamp(-angularVelocity * .014, -.075, .075), step, 13);
      earLag = ears.value; earLagVelocity = ears.velocity;
    }
  }
  if (Math.abs(unwrappedTarget - angle) < 1e-7 && Math.abs(angularVelocity) < 1e-6) {
    angle = unwrappedTarget; angularVelocity = 0;
  }
  return { angle: wrap(angle), angularVelocity, targetAngle, turnSign,
    bodyLean, bodyLeanVelocity, earLag, earLagVelocity };
}

export type BunnyTurnViews = {
  /** E, NE, N, NW, W, SW, S, SE. Blending crosses 7 → 0 continuously. */
  from: number; to: number; mix: number;
  weights: [number, number, number, number, number, number, number, number];
};

/** Adjacent views always sum to one: no opacity dip or abrupt atlas-frame switch. */
export function bunnyTurnViews(angle: number): BunnyTurnViews {
  const sector = wrap(Number.isFinite(angle) ? angle : 0) / (Math.PI / 4);
  const from = Math.floor(sector) % 8, to = (from + 1) % 8;
  const fraction = sector - Math.floor(sector);
  const mix = fraction * fraction * (3 - 2 * fraction);
  const weights: BunnyTurnViews['weights'] = [0, 0, 0, 0, 0, 0, 0, 0];
  weights[from] = 1 - mix; weights[to] = mix;
  return { from, to, mix, weights };
}
