import { paths, regions } from './gardenAtlas';
import type { AtlasPoint, GardenPath, RegionId } from './gardenAtlas';
import { LARGE_POND_BANK } from './walkableGround';

type Progress = { puzzleSolved: boolean; envelopeStored: boolean; hasSong: boolean; giftUnlocked: boolean };
export type MainRouteGoal = { id: 'desk' | 'music' | 'gift'; region: RegionId; title: string };
const pointDistance = (a: AtlasPoint, b: AtlasPoint) => Math.hypot(a.x - b.x, a.y - b.y);
function clearBankSegment(a: AtlasPoint, b: AtlasPoint) {
  const bank = LARGE_POND_BANK;
  const x = (a.x - bank.x) / bank.radiusX, y = (a.y - bank.y) / bank.radiusY;
  const dx = (b.x - a.x) / bank.radiusX, dy = (b.y - a.y) / bank.radiusY;
  const length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, -(x * dx + y * dy) / length)) : 0;
  return Math.hypot(x + t * dx, y + t * dy) >= 1;
}

/** Main-line advice never grants progress or turns optional discoveries into gates. */
export function mainRouteGoal(progress: Progress): MainRouteGoal | null {
  if (progress.giftUnlocked) return null;
  if (!progress.puzzleSolved || !progress.envelopeStored) return { id: 'desk', region: 'lantern', title: 'The puzzle desk' };
  if (!progress.hasSong) return { id: 'music', region: 'orchard', title: 'The music garden' };
  return { id: 'gift', region: 'moon', title: 'The gift' };
}

/** Map paths have a logical pond-centre node. Advice follows its bank instead. */
function bankRoute(points: readonly AtlasPoint[]): AtlasPoint[] {
  const { x, y, radiusX, radiusY } = LARGE_POND_BANK;
  const normalized = (p: AtlasPoint) => ({ x: (p.x - x) / radiusX, y: (p.y - y) / radiusY });
  const rim = (angle: number) => ({ x: x + Math.cos(angle) * radiusX * 1.1, y: y + Math.sin(angle) * radiusY * 1.1 });
  const safe = points.map(p => { const q = normalized(p); return Math.hypot(q.x, q.y) < 1.1 ? rim(Math.hypot(q.x, q.y) < .001 ? Math.PI : Math.atan2(q.y, q.x)) : p; });
  const result: AtlasPoint[] = [safe[0]];
  for (const b of safe.slice(1)) {
    const a = result[result.length - 1], na = normalized(a), nb = normalized(b);
    const dx = nb.x - na.x, dy = nb.y - na.y, length = dx * dx + dy * dy;
    const t = length ? Math.max(0, Math.min(1, -(na.x * dx + na.y * dy) / length)) : 0;
    if (Math.hypot(na.x + t * dx, na.y + t * dy) < 1.05) {
      const start = Math.atan2(na.y, na.x), finish = Math.atan2(nb.y, nb.x);
      const angle = Math.atan2(Math.sin(finish - start), Math.cos(finish - start));
      const count = Math.max(1, Math.ceil(Math.abs(angle) / .15));
      for (let i = 0; i <= count; i++) result.push(rim(start + angle * i / count));
    }
    result.push(b);
  }
  return result;
}

type RouteEdge = GardenPath & { distances: number[]; length: number };
const edges: RouteEdge[] = paths.map(path => {
  const points = bankRoute(path.points), distances = [0];
  for (let i = 1; i < points.length; i++) distances.push(distances[i - 1] + pointDistance(points[i - 1], points[i]));
  return { ...path, points, distances, length: distances[distances.length - 1] };
});
const mainEdges = edges.filter(edge => !edge.id.endsWith('-sidepath'));

/** Recompute from the actual actor position, including side paths and return trips. */
export function mainRouteFrom(actor: AtlasPoint, goal: MainRouteGoal) {
  const costs = new Map<RegionId, number>(regions.map(region => [region.id, Infinity]));
  const next = new Map<RegionId, { edge: RouteEdge; to: RegionId }>();
  const remaining = new Set(regions.map(region => region.id));
  costs.set(goal.region, 0);
  while (remaining.size) {
    const current = [...remaining].sort((a, b) => costs.get(a)! - costs.get(b)!)[0];
    remaining.delete(current);
    // The main trail is a paced journey. Optional shortcuts remain choices made
    // by the walker; advice must not replace the pond or hill with a faster trip.
    for (const edge of mainEdges) {
      const other = edge.from === current ? edge.to : edge.to === current ? edge.from : null;
      if (!other || !remaining.has(other)) continue;
      const cost = costs.get(current)! + edge.length;
      if (cost < costs.get(other)!) { costs.set(other, cost); next.set(other, { edge, to: current }); }
    }
  }
  const candidates = edges.flatMap(edge => edge.points.slice(1).map((b, j) => {
    const a = edge.points[j], dx = b.x - a.x, dy = b.y - a.y, length2 = dx * dx + dy * dy;
    const t = length2 ? Math.max(0, Math.min(1, ((actor.x - a.x) * dx + (actor.y - a.y) * dy) / length2)) : 0;
    const point = { x: a.x + dx * t, y: a.y + dy * t }, along = edge.distances[j] + Math.sqrt(length2) * t;
    const from = along + costs.get(edge.from)!, to = edge.length - along + costs.get(edge.to)!;
    return { edge, point, j, along, distance: pointDistance(actor, point), cost: Math.min(from, to), forward: to <= from };
  }));
  const mainCandidates = candidates.filter(candidate => !candidate.edge.id.endsWith('-sidepath'));
  const nearestMainDistance = Math.min(...mainCandidates.map(candidate => candidate.distance));
  const nearestSide = candidates.filter(candidate => candidate.edge.id.endsWith('-sidepath'))
    .sort((a, b) => a.distance - b.distance)[0];
  // At a junction stay with the main trail. Once the walker has deliberately
  // entered a side path, finish that first edge instead of calling them back.
  const occupiedSide = nearestSide && nearestSide.distance + 80 < nearestMainDistance
    && nearestSide.along > 220 && nearestSide.edge.length - nearestSide.along > 220
    ? nearestSide.edge.id : null;
  const approachCandidates = occupiedSide
    ? candidates.filter(candidate => candidate.edge.id === occupiedSide)
    : mainCandidates;
  const nearestDistance = Math.min(...approachCandidates.map(candidate => candidate.distance));
  // First join a nearby trail; do not suggest a straight shortcut across the garden.
  const start = approachCandidates.filter(candidate => candidate.distance <= nearestDistance + 100)
    .sort((a, b) => a.cost + a.distance - b.cost - b.distance)[0];
  let node = start.forward ? start.edge.to : start.edge.from;
  const points = [...bankRoute([actor, start.point]), ...(start.forward ? start.edge.points.slice(start.j + 1) : start.edge.points.slice(0, start.j + 1).reverse())];
  const pathIds = [start.edge.id];
  for (let count = 0; node !== goal.region && count < regions.length; count++) {
    const step = next.get(node);
    if (!step) break;
    points.push(...(step.edge.from === node ? step.edge.points : [...step.edge.points].reverse()).slice(1));
    pathIds.push(step.edge.id); node = step.to;
  }
  const destination = regions.find(region => region.id === goal.region)!;
  const nearby = pointDistance(actor, destination) < 340;
  let waypoint = points[0];
  let ahead = 0;
  for (let i = 1; i < points.length; i++) {
    const length = pointDistance(points[i - 1], points[i]);
    if (ahead + length >= 260) {
      const t = (260 - ahead) / length;
      const candidate = { x: points[i - 1].x + (points[i].x - points[i - 1].x) * t, y: points[i - 1].y + (points[i].y - points[i - 1].y) * t };
      if (clearBankSegment(actor, candidate)) waypoint = candidate;
      break;
    }
    if (!clearBankSegment(actor, points[i])) break;
    ahead += length; waypoint = points[i];
  }
  return { goal, destination, nearby, waypoint: nearby ? destination : waypoint, points, pathIds };
}

export function mainRouteText(goal: MainRouteGoal, nearby: boolean, puzzleSolved = false) {
  if (goal.id === 'desk') return nearby
    ? puzzleSolved ? 'Open the desk to keep your note.' : 'Click the paper to begin your questions.'
    : 'The puzzle desk is by the lantern.';
  if (goal.id === 'music') return nearby ? 'Click a flower to visit the music garden.' : 'Your note is safe. The music garden is next.';
  return nearby ? 'Open the little door. Your envelope is with you.' : 'A gift waits beyond the hill. Follow the path.';
}
