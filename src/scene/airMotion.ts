import { gardenWind } from './gardenWind';
import type { MeadowPoint } from './meadowMotion';

export type AirSeed = {
  x: number; y: number; altitude: number; phase: number; drift: number;
  size: number; leaf: boolean; glint: boolean; angle: number;
};
const hash = (n: number) => { const value = Math.sin(n * 127.1 + 311.7) * 43758.5453; return value - Math.floor(value); };

/** Fixed world cells never recycle at the camera edge or follow the pointer. */
export function createAirSeeds(bounds: { minX: number; maxX: number; minY: number; maxY: number }) {
  const seeds: AirSeed[] = [], cell = 650;
  for (let y = Math.floor(bounds.minY / cell); y <= Math.ceil(bounds.maxY / cell); y++) {
    for (let x = Math.floor(bounds.minX / cell); x <= Math.ceil(bounds.maxX / cell); x++) {
      for (let i = 0; i < 1; i++) {
        const n = x * 563 + y * 7919 + i * 91763;
        const leaf = hash(n + 117) > .88, glint = !leaf && hash(n + 149) > .72;
        seeds.push({ x: (x + .15 + hash(n) * .7) * cell, y: (y + .15 + hash(n + 7) * .7) * cell,
          altitude: 60 + hash(n + 23) * 440, phase: hash(n + 47) * Math.PI * 2,
          drift: .75 + hash(n + 73) * .5, size: glint ? 28 + hash(n + 101) * 17 : leaf ? 15 + hash(n + 101) * 9 : 8 + hash(n + 101) * 10,
          leaf, glint, angle: hash(n + 131) * Math.PI,
        });
      }
    }
  }
  return seeds;
}

/** A nearby moving body gently parts the same air that keeps moving during stillness. */
export function airPosition(seed: AirSeed, time: number, actor: MeadowPoint, heading: MeadowPoint, wake: number) {
  const phase = seed.phase, t = time * seed.drift;
  const wind = gardenWind(time, seed.x, seed.y, .16);
  let x = seed.x + Math.sin(t * .09 + phase) * 95 + wind.lean * 16;
  let y = seed.y + Math.cos(t * .065 + phase * 1.7) * 64 + wind.flutter * 22;
  const distance = Math.hypot(x - actor.x, y - actor.y);
  const contact = Math.max(0, 1 - distance / 260), strength = contact * contact * Math.max(0, Math.min(1, wake));
  if (distance > .1) {
    x += ((x - actor.x) / distance * 38 + heading.x * 24) * strength;
    y += ((y - actor.y) / distance * 38 + heading.y * 24) * strength;
  }
  return { x, y, lift: seed.altitude + Math.sin(t * .24 + phase) * 23 + strength * 18,
    opacity: (.55 + Math.sin(t * .32 + phase) ** 2 * .45) * (seed.leaf ? .52 : seed.glint ? .84 : .74),
    angle: seed.angle + Math.sin(t * .43 + phase) * .55 + wind.flutter,
  };
}
