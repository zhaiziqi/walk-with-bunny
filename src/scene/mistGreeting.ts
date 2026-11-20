export type MistGreetingRef = { current: { startedAt: number; side: number } | null };

const notice = 160;
export const mistGreetingPeakMs = 590;
const release = 910;
export const mistGreetingEndMs = 1620;

function ease(progress: number) {
  const t = Math.max(0, Math.min(1, progress));
  return t * t * (3 - 2 * t);
}

/** Signed crown displacement in world units. A stationary foot and shadow give
 * the little lean some weight. The clock is the DOM performance.now() clock. */
export function mistGreetingLean(greeting: MistGreetingRef['current'] | undefined, now: number) {
  if (!greeting || !Number.isFinite(greeting.side)) return 0;
  const age = now - greeting.startedAt;
  if (!Number.isFinite(age) || age <= notice || age >= mistGreetingEndMs) return 0;
  const side = Math.max(-1, Math.min(1, greeting.side));
  return side * 14 * ease((age - notice) / (mistGreetingPeakMs - notice))
    * (1 - ease((age - release) / (mistGreetingEndMs - release)));
}
