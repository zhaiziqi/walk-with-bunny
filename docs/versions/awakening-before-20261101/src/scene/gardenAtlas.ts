/** Shared world coordinates. Paths and scenery belong to the ground, never to the camera. */
export type AtlasPoint = { x: number; y: number };
export type RegionId = 'entry' | 'lantern' | 'orchard' | 'pond' | 'hollow' | 'arch' | 'hill' | 'moon';
export type AtmosphereColor = [number, number, number];
export type GardenRegion = AtlasPoint & {
  id: RegionId; name: string; radius: number; color: string;
  ground: AtmosphereColor; fog: AtmosphereColor; sky: AtmosphereColor; dusk: number;
};

/** Palette components are sRGB in the 0–1 range, suitable for Three.Color.setRGB. */
export const regions: GardenRegion[] = [
  { id: 'entry', name: '风的入口', x: 0, y: -220, radius: 650, color: '#d2dac0', ground: [.75, .81, .66], fog: [.88, .89, .82], sky: [.80, .87, .91], dusk: 0 },
  { id: 'lantern', name: '花灯小径', x: -650, y: 750, radius: 650, color: '#c6d2ae', ground: [.70, .78, .60], fog: [.84, .88, .78], sky: [.77, .85, .89], dusk: .08 },
  { id: 'orchard', name: '听花的果园', x: 900, y: 2100, radius: 850, color: '#d9c3cb', ground: [.74, .76, .65], fog: [.89, .82, .84], sky: [.82, .83, .91], dusk: .20 },
  { id: 'pond', name: '垂柳映月', x: -1200, y: 3200, radius: 850, color: '#a6c9c5', ground: [.56, .72, .65], fog: [.69, .81, .80], sky: [.69, .81, .88], dusk: .32 },
  { id: 'hollow', name: '蘑菇低语', x: 1400, y: 4300, radius: 800, color: '#a2b7b6', ground: [.53, .66, .61], fog: [.67, .74, .77], sky: [.65, .75, .84], dusk: .48 },
  { id: 'arch', name: '旧石拱门', x: -1100, y: 5400, radius: 900, color: '#b4b5cb', ground: [.57, .64, .63], fog: [.70, .72, .82], sky: [.65, .70, .82], dusk: .62 },
  { id: 'hill', name: '风经过的山丘', x: 1000, y: 6800, radius: 1000, color: '#c4bbb3', ground: [.61, .66, .57], fog: [.77, .73, .74], sky: [.69, .70, .82], dusk: .74 },
  { id: 'moon', name: '月亮的秘密', x: -200, y: 8500, radius: 950, color: '#939fbf', ground: [.42, .53, .56], fog: [.58, .64, .76], sky: [.48, .56, .72], dusk: 1 },
];

export const playBounds = { minX: -3100, maxX: 3100, minY: -1000, maxY: 10000 };
// The camera follows 220 units ahead of the rabbit's foot, as defined by meadowMotion.
export const cameraBounds = { minX: playBounds.minX, maxX: playBounds.maxX, minY: playBounds.minY + 220, maxY: playBounds.maxY + 220 };
// This skirt extends well beyond playable ground so oblique views never reveal a mesh edge.
export const groundExtent = { minX: -8000, maxX: 8000, minY: -5000, maxY: 16000 };

export type GardenPath = { id: string; from: RegionId; to: RegionId; width: number; points: AtlasPoint[] };

function point(x: number, y: number): AtlasPoint { return { x, y }; }
function center(id: RegionId) { const region = regions.find(item => item.id === id)!; return point(region.x, region.y); }

/** Catmull-Rom samples form one shared smooth centerline for paint, plants, and route tests. */
function curve(points: AtlasPoint[]) {
  const result: AtlasPoint[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[Math.max(0, i - 1)], b = points[i], c = points[i + 1], d = points[Math.min(points.length - 1, i + 2)];
    const steps = Math.max(6, Math.ceil(Math.hypot(c.x - b.x, c.y - b.y) / 65));
    for (let j = 0; j < steps; j++) {
      const t = j / steps, t2 = t * t, t3 = t2 * t;
      const axis = (key: 'x' | 'y') => .5 * (2 * b[key] + (-a[key] + c[key]) * t + (2 * a[key] - 5 * b[key] + 4 * c[key] - d[key]) * t2 + (-a[key] + 3 * b[key] - 3 * c[key] + d[key]) * t3);
      result.push(point(axis('x'), axis('y')));
    }
  }
  result.push({ ...points[points.length - 1] });
  return result;
}
function route(id: string, from: RegionId, to: RegionId, width: number, bends: AtlasPoint[]): GardenPath {
  return { id, from, to, width, points: curve([center(from), ...bends, center(to)]) };
}

/** Width is the complete painted trail width. Side paths are narrow but freely traversable. */
export const paths: GardenPath[] = [
  route('entry-lantern', 'entry', 'lantern', 154, [point(-100, 70), point(-330, 310), point(-560, 460)]),
  route('lantern-orchard', 'lantern', 'orchard', 142, [point(-280, 1080), point(270, 1240), point(610, 1620)]),
  route('orchard-pond', 'orchard', 'pond', 122, [point(560, 2470), point(-180, 2640), point(-790, 2850), point(-1180, 2950)]),
  route('pond-hollow', 'pond', 'hollow', 118, [point(-640, 3500), point(-50, 3710), point(780, 3750), point(1260, 4030)]),
  route('hollow-arch', 'hollow', 'arch', 128, [point(980, 4690), point(290, 4850), point(-360, 4850), point(-880, 5100)]),
  route('arch-hill', 'arch', 'hill', 134, [point(-730, 5770), point(-210, 5860), point(380, 6150), point(690, 6550)]),
  route('hill-moon', 'hill', 'moon', 132, [point(1260, 7190), point(880, 7590), point(270, 7980), point(-210, 8180)]),
  // Quiet alternate routes reconnect: the garden can be explored in loops and in either direction.
  route('willow-sidepath', 'lantern', 'pond', 84, [point(-1210, 1200), point(-1740, 1730), point(-1890, 2390), point(-1540, 2850)]),
  route('petal-sidepath', 'orchard', 'hollow', 84, [point(1660, 2500), point(2100, 3080), point(2020, 3720)]),
  route('fern-sidepath', 'pond', 'arch', 80, [point(-1910, 3640), point(-2190, 4290), point(-1850, 4920)]),
  route('firefly-sidepath', 'hollow', 'hill', 82, [point(2180, 4740), point(2340, 5440), point(1990, 6140), point(1450, 6510)]),
  route('moon-sidepath', 'arch', 'moon', 86, [point(-1760, 5900), point(-1900, 6660), point(-1690, 7330), point(-1020, 8010)]),
];

export function pathDistance(x: number, y: number) {
  let nearest = { distance: Infinity, width: 0, pathId: '', point: point(0, 0) };
  for (const path of paths) for (let i = 1; i < path.points.length; i++) {
    const a = path.points[i - 1], b = path.points[i], dx = b.x - a.x, dy = b.y - a.y;
    const length2 = dx * dx + dy * dy;
    const t = length2 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / length2)) : 0;
    const closest = point(a.x + t * dx, a.y + t * dy), distance = Math.hypot(x - closest.x, y - closest.y);
    if (distance < nearest.distance) nearest = { distance, width: path.width, pathId: path.id, point: closest };
  }
  return nearest;
}

export function regionAt(x: number, y: number) {
  let nearest = regions[0], distance = Infinity;
  for (const region of regions) {
    const next = Math.hypot(x - region.x, y - region.y);
    if (next < distance) { nearest = region; distance = next; }
  }
  return nearest;
}

/** Blend all nearby regions continuously, so crossing an imaginary zone boundary cannot flash. */
export function regionAtmosphere(x: number, y: number) {
  const output = { ground: [0, 0, 0] as AtmosphereColor, fog: [0, 0, 0] as AtmosphereColor, sky: [0, 0, 0] as AtmosphereColor, dusk: 0 };
  let total = 0;
  for (const region of regions) {
    const distance2 = (x - region.x) ** 2 + (y - region.y) ** 2;
    const weight = 1 / (distance2 + (region.radius * .45) ** 2) ** 2;
    total += weight;
    for (const key of ['ground', 'fog', 'sky'] as const) for (let i = 0; i < 3; i++) output[key][i] += region[key][i] * weight;
    output.dusk += region.dusk * weight;
  }
  for (const key of ['ground', 'fog', 'sky'] as const) for (let i = 0; i < 3; i++) output[key][i] /= total;
  output.dusk /= total;
  return output;
}

export type GardenShrub = AtlasPoint & { width: number; height: number; kind: 'grass' | 'fern' | 'flower' | 'mushroom'; phase: number };
// Curated island anchors with deterministic irregular scatter; no camera-relative wrapping or rows.
const shrubIslands: [number, number, GardenShrub['kind'], number][] = [
  [-270, -110, 'flower', 8], [430, 390, 'grass', 10], [-930, 700, 'fern', 9], [-220, 1040, 'flower', 8],
  [550, 1850, 'flower', 14], [1280, 2110, 'flower', 14], [1770, 2780, 'grass', 10], [-1220, 2780, 'fern', 12],
  [-1710, 3110, 'fern', 13], [-850, 3590, 'grass', 10], [-2020, 4050, 'fern', 13], [1010, 4070, 'mushroom', 12],
  [1660, 4480, 'mushroom', 15], [400, 4700, 'fern', 9], [-1500, 5370, 'fern', 13], [-680, 5550, 'flower', 8],
  [2080, 5800, 'grass', 12], [620, 6510, 'grass', 16], [1390, 6910, 'flower', 11], [-1550, 7190, 'grass', 12],
  [300, 8220, 'flower', 14], [-680, 8590, 'grass', 11], [-250, 9060, 'flower', 10],
];
export const gardenShrubs: GardenShrub[] = shrubIslands.flatMap(([x, y, kind, count], island) => {
  const items: GardenShrub[] = [];
  for (let i = 0; i < count; i++) {
    const phase = i * 2.399963 + island * 1.71, radius = 40 + Math.sqrt(i / count) * 175;
    const px = x + Math.cos(phase) * radius, py = y + Math.sin(phase) * radius * .74;
    const nearest = pathDistance(px, py);
    if (nearest.distance < nearest.width * .65) continue;
    items.push({ x: px, y: py, width: 25 + (i * 17 % 29), height: 30 + (i * 11 % 36), kind, phase });
  }
  return items;
});
