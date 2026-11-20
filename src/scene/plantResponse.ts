import type { AtlasPoint, GardenShrub } from './gardenAtlas';
import { paths } from './gardenAtlas';

export type LeafBend = { value: number; velocity: number };
const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n));
const smooth = (n: number) => { const t = clamp(n, 0, 1); return t * t * (3 - 2 * t); };

export function shrubDimensions(plant: Pick<GardenShrub, 'kind' | 'width' | 'height'>) {
  const art = plant.kind === 'fern' ? 'fern' : plant.kind === 'flower' ? 'flower' : 'grass';
  const width = plant.width * (art === 'fern' ? 2 : art === 'grass' ? 2.8 : 1.4);
  const height = art === 'grass' ? plant.height : width * 1.5;
  return { art, width, height, footInset: art === 'fern' ? .05533854 : .07 } as const;
}

/** The whole crown can be brushed. The rabbit's body adds a small margin to its footprint. */
export function canopyContact(plant: AtlasPoint, width: number, height: number, previous: AtlasPoint, actor: AtlasPoint) {
  const rx = width * .5 + 65, ry = Math.max(105, height * .55 + 65);
  const centerY = plant.y + height * .10;
  const end = { x: (actor.x - plant.x) / rx, y: (actor.y - centerY) / ry };
  // A map jump cannot sweep across an entire flowerbed.
  const distance = Math.hypot(actor.x - previous.x, actor.y - previous.y);
  const start = distance > 180 ? end : { x: (previous.x - plant.x) / rx, y: (previous.y - centerY) / ry };
  const dx = end.x - start.x, dy = end.y - start.y, length2 = dx * dx + dy * dy;
  const t = length2 > 1e-9 ? clamp(-(start.x * dx + start.y * dy) / length2, 0, 1) : 0;
  const proximity = Math.hypot(start.x + dx * t, start.y + dy * t);
  return smooth((1 - proximity) / .72);
}

/** Slightly damped leaves have a soft recovery, independent of the display's refresh rate. */
export function advanceLeafBend(state: LeafBend, target: number, delta: number): LeafBend {
  const dt = clamp(Number.isFinite(delta) ? delta : 0, 0, .05);
  if (!dt) return state;
  const omega = 10, damping = .72, decay = omega * damping, wd = omega * Math.sqrt(1 - damping * damping);
  const offset = state.value - target, cos = Math.cos(wd * dt), sin = Math.sin(wd * dt), envelope = Math.exp(-decay * dt);
  return {
    value: target + envelope * (offset * cos + (state.velocity + decay * offset) / wd * sin),
    velocity: envelope * (state.velocity * cos - (decay * state.velocity + omega * omega * offset) / wd * sin),
  };
}

/** Roots and the lowest part of each stem stay fixed; the upper crown can bend. */
export function leafFlex(heightFromRoot: number, height: number) {
  const t = clamp((heightFromRoot / height - .10) / .90, 0, 1);
  return t * t;
}

export type ReactiveGrassPatch = AtlasPoint & { width: number; phase: number; count: number };

/** Sparse irregular tufts are placed beside the real first route, including the new entrance. */
export function firstTrailGrass(): ReactiveGrassPatch[] {
  const path = paths.find(item => item.id === 'entry-lantern')!;
  const result: ReactiveGrassPatch[] = [];
  let traversed = 0, next = 48, cluster = 0;
  for (let i = 1; i < path.points.length; i++) {
    const a = path.points[i - 1], b = path.points[i], dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy);
    if (!length) continue;
    while (next <= traversed + length) {
      const t = (next - traversed) / length, x = a.x + dx * t, y = a.y + dy * t;
      const side = cluster % 3 === 0 ? -1 : 1, offset = 24 + (cluster * 19 % 34);
      result.push({ x: x - dy / length * offset * side, y: y + dx / length * offset * side, width: 23 + cluster * 11 % 20, phase: cluster * 2.399, count: 4 + cluster % 2 });
      if (cluster % 3 === 1) result.push({ x: x + dy / length * 41 + dx / length * 31, y: y - dx / length * 41 + dy / length * 31, width: 24, phase: cluster * 1.13, count: 3 });
      next += 155 + cluster * 29 % 72;
      cluster++;
    }
    traversed += length;
  }
  return result;
}
