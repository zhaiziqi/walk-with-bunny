import type { MeadowPoint } from './meadowMotion';

/** The water is 380×250; this slightly wider rim keeps the rabbit's feet on the bank. */
export const LARGE_POND_BANK = { x: -1200, y: 3200, radiusX: 420, radiusY: 290 };

/**
 * Project only submerged destinations to the closest point on the elliptical bank.
 * Small walking steps retain their tangent component, so the rabbit slides along a
 * curved shore without locking either axis. Outside points preserve their identity.
 */
export function constrainWalkableGround(next: MeadowPoint, previous?: MeadowPoint): MeadowPoint {
  if (!Number.isFinite(next.x) || !Number.isFinite(next.y)) return next;
  const { x: cx, y: cy, radiusX: a, radiusY: b } = LARGE_POND_BANK;
  const dx = next.x - cx, dy = next.y - cy;
  if ((dx / a) ** 2 + (dy / b) ** 2 >= 1) return next;

  const x = Math.abs(dx), y = Math.abs(dy), a2 = a * a, b2 = b * b;
  const signX = dx < 0 ? -1 : 1;
  // The major-axis medial line has two equally near banks. Prefer the approach side;
  // an old saved position at the exact centre has a deterministic front-bank escape.
  const signY = Math.abs(dy) > 1e-9 ? Math.sign(dy) : previous && previous.y > cy ? 1 : -1;
  let rimX: number, rimY: number;
  if (y <= 1e-9) {
    const threshold = (a2 - b2) / a;
    if (x >= threshold) { rimX = a; rimY = 0; }
    else {
      rimX = a2 * x / (a2 - b2);
      rimY = b * Math.sqrt(Math.max(0, 1 - (rimX / a) ** 2));
    }
  } else {
    // The Lagrange multiplier for an interior point lies in (-b², 0).
    // Bisection is bounded and monotone, including points close to the minor axis.
    let low = -b2, high = 0;
    for (let i = 0; i < 60; i++) {
      const lambda = (low + high) / 2;
      const ex = a * x / (a2 + lambda), ey = b * y / (b2 + lambda);
      if (ex * ex + ey * ey > 1) low = lambda; else high = lambda;
    }
    const lambda = (low + high) / 2;
    rimX = a2 * x / (a2 + lambda);
    rimY = b2 * y / (b2 + lambda);
  }
  // Round-off must not leave the next frame microscopically inside the water.
  const outside = 1 + 1e-8;
  return { x: cx + signX * rimX * outside, y: cy + signY * rimY * outside };
}
