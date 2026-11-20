import { paths, type GardenPath } from './gardenAtlas';

export type TrailPaint = { wash: number; quiet: number };
type TrailSegment = { ax: number; ay: number; dx: number; dy: number; length2: number; inner: number; outer: number; strength: number };

const cellSize = 320;
const primaryIds = new Set(['entry-lantern', 'lantern-orchard', 'orchard-pond', 'pond-hollow', 'hollow-arch', 'arch-hill', 'hill-moon']);
const smooth = (value: number) => { const p = Math.max(0, Math.min(1, value)); return p * p * (3 - 2 * p); };
const key = (x: number, y: number) => `${x},${y}`;

export const trailQuietClearing = { x: 350, y: -1110, radiusX: 240, radiusY: 190, textureReduction: .58 };
export const lanternQuietClearing = { x: -650, y: 750, radiusX: 350, radiusY: 280 };
export const trailTextureSoftening = .44;
/** A neutral paper wash keeps the trail legible without painting over the blue banks. */
export const trailPalette = {
  route: [.086, .081, .065], clearing: [.044, .040, .026], paperBase: .78, paperVariation: .22,
};
export const trailTextureReduction = (paint: TrailPaint) => Math.max(paint.wash * trailTextureSoftening, paint.quiet * trailQuietClearing.textureReduction);

/** A fixed world-space pigment field: it does not steer, unlock, or remember anything. */
export function createTrailField(routes: GardenPath[]) {
  const cells = new Map<string, TrailSegment[]>();
  let segmentCount = 0;
  for (const route of routes) {
    const strength = primaryIds.has(route.id) ? 1 : .32;
    // A narrow, softly lit centre dissolves into meadow on either side. The
    // generous feather survives both the 80-unit GPU and 105-unit static mesh.
    const inner = route.width * .25 + 35, outer = route.width * .5 + 175;
    for (let i = 1; i < route.points.length; i++) {
      const a = route.points[i - 1], b = route.points[i];
      const dx = b.x - a.x, dy = b.y - a.y;
      const segment = { ax: a.x, ay: a.y, dx, dy, length2: dx * dx + dy * dy, inner, outer, strength };
      segmentCount++;
      // Include the whole feather in the bucket bounds. Samples on a cell
      // boundary therefore see exactly the same contributing line segments.
      const minX = Math.floor((Math.min(a.x, b.x) - outer) / cellSize), maxX = Math.floor((Math.max(a.x, b.x) + outer) / cellSize);
      const minY = Math.floor((Math.min(a.y, b.y) - outer) / cellSize), maxY = Math.floor((Math.max(a.y, b.y) + outer) / cellSize);
      for (let cy = minY; cy <= maxY; cy++) for (let cx = minX; cx <= maxX; cx++) {
        const id = key(cx, cy), bucket = cells.get(id);
        if (bucket) bucket.push(segment); else cells.set(id, [segment]);
      }
    }
  }
  return {
    segmentCount,
    maxCandidates: Math.max(0, ...Array.from(cells.values(), bucket => bucket.length)),
    sample(x: number, y: number): TrailPaint {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return { wash: 0, quiet: 0 };
      let wash = 0;
      const bucket = cells.get(key(Math.floor(x / cellSize), Math.floor(y / cellSize)));
      if (bucket) for (const segment of bucket) {
        const px = x - segment.ax, py = y - segment.ay;
        const t = segment.length2 ? Math.max(0, Math.min(1, (px * segment.dx + py * segment.dy) / segment.length2)) : 0;
        const distance = Math.hypot(px - segment.dx * t, py - segment.dy * t);
        const amount = 1 - smooth((distance - segment.inner) / (segment.outer - segment.inner));
        // Max, rather than sum, keeps junctions from becoming bright discs.
        wash = Math.max(wash, amount * segment.strength);
      }
      // Slow, deterministic breaks in the pigment retain direction without
      // making a uniformly painted road. Fine paper grain stays in each renderer.
      const grain = .77 + .13 * Math.sin(x * .0081 + y * .0057) + .10 * Math.sin(y * .0143 - x * .0042);
      const qx = (x - trailQuietClearing.x) / trailQuietClearing.radiusX;
      const qy = (y - trailQuietClearing.y) / trailQuietClearing.radiusY;
      const lx = (x - lanternQuietClearing.x) / lanternQuietClearing.radiusX;
      const ly = (y - lanternQuietClearing.y) / lanternQuietClearing.radiusY;
      return { wash: wash * grain, quiet: Math.max(Math.exp(-2 * (qx * qx + qy * qy)), Math.exp(-2 * (lx * lx + ly * ly))) };
    },
  };
}

// Built once per module load. WebGL bakes this into vertex attributes; the
// reduced-motion renderer queries only nearby segments when its view changes.
export const trailField = createTrailField(paths);
export const sampleTrailField = trailField.sample;
