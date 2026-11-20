export type FloofMotion = {
  speed: number; stretch: number; stretchVelocity: number; bend: number; bendVelocity: number;
  wasMoving: boolean; settleAge: number;
};
export const emptyFloof = (): FloofMotion => ({ speed: 0, stretch: 0, stretchVelocity: 0, bend: 0, bendVelocity: 0, wasMoving: false, settleAge: 1 });
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
/** A critically damped spring resolves the shape without changing the world anchor. */
function spring(value: number, velocity: number, target: number, dt: number, frequency: number) {
  const error = value - target, c = (velocity + frequency * error) * dt, decay = Math.exp(-frequency * dt);
  return { value: target + (error + c) * decay, velocity: (velocity - frequency * c) * decay };
}
export function advanceFloof(previous: FloofMotion, input: { travel: number; dt: number; moving: boolean; headingX: number; intent: number; speed?: number }): FloofMotion {
  const dt = clamp(Number.isFinite(input.dt) ? input.dt : 0, 0, .05);
  if (!dt) return previous;
  if (!Number.isFinite(input.travel) || input.travel < 0 || input.travel > 80) return emptyFloof();
  // Use controller speed when available: duplicate render samples are not a
  // stop, and a later double-distance sample must not halve the average gait.
  // Older static/preview callers can still derive speed from displacement.
  const walking = input.moving;
  const reportedSpeed = input.speed === undefined ? input.travel / dt : Number.isFinite(input.speed) ? input.speed : 0;
  const measuredSpeed = walking ? clamp(reportedSpeed, 0, 240) : 0;
  const speed = previous.speed + (measuredSpeed - previous.speed) * (1 - Math.exp(-dt / .13));
  const settleAge = previous.wasMoving && !walking ? 0 : Math.min(1, previous.settleAge + dt);
  const settling = !walking && settleAge < .45 ? -Math.sin(settleAge / .45 * Math.PI) * .044 : 0;
  const anticipation = !walking ? clamp(Number.isFinite(input.intent) ? input.intent : 0, 0, 1) * -.018 : 0;
  const stretch = spring(previous.stretch, previous.stretchVelocity, speed / 240 * .055 + settling + anticipation, dt, 18);
  const bend = spring(previous.bend, previous.bendVelocity, -clamp(Number.isFinite(input.headingX) ? input.headingX : 0, -1, 1) * speed / 240 * 5.5, dt, 12);
  return { speed, stretch: stretch.value, stretchVelocity: stretch.velocity, bend: bend.value, bendVelocity: bend.velocity, wasMoving: walking, settleAge };
}
