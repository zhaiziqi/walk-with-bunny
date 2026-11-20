/** One paused scene clock drives a travelling breeze; materials can respond with a small delay. */
export type GardenClock = { current: number };
export function advanceGardenClock(time: number, delta: number, paused: boolean) {
  return paused || !Number.isFinite(delta) ? time : time + Math.max(0, Math.min(.05, delta));
}
export function gardenWind(time: number, x: number, y: number, delay = 0) {
  const t = time - delay, travel = x / 520 + y / 850;
  const phase = ((t - travel) % 19 + 19) % 19;
  const gust = phase > 3 && phase < 8 ? Math.sin((phase - 3) / 5 * Math.PI) ** 2 : 0;
  const breeze = Math.sin(t * .48 - x * .0017 - y * .0008) * .24 + Math.sin(t * .21 + y * .0012) * .08;
  return { lean: breeze + gust * .72, gust, flutter: Math.sin(t * 1.45 - travel) * (.08 + gust * .12), x: .5 + gust * .7, y: .2 + breeze * .12 };
}
