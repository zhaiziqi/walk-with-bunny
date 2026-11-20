import type { MistHandSample } from './mistHandTracking';
import type { createMistPainter } from './mistPaint';

type Painter = ReturnType<typeof createMistPainter>;
type Point = { x: number; y: number };
type Stroke = { raw: MistHandSample; tip: Point; radius: number; paintedRadius: number; born: number; moved: number };
export type MistPhase = 'waiting' | 'found' | 'opening';

const strokeRules = {
  lostMs: 120, restMs: 260, jumpPx: 110, riseMs: 110, initialScale: .62, spacing: .30,
};
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export function createMistBrush(painter: Painter, anchor: Point, width: number, onFound: (side: number) => void) {
  let stroke: Stroke | null = null;
  let firstContact: Point | null = null;
  let found = false;
  let lastSeen = -Infinity;
  let missing = false;

  function lift() {
    stroke = null;
    missing = false;
    lastSeen = -Infinity;
    painter.setHand(null);
  }

  function offerEntry(tip: Point, radius: number) {
    if (found) return;
    firstContact ??= tip;
    const reach = distance(tip, firstContact);
    const nearBunny = distance(tip, anchor) < Math.max(84, radius * 1.6);
    if (reach > 12 && (nearBunny || reach >= Math.min(90, width * .08))) {
      found = true;
      onFound(tip.x < anchor.x ? -1 : 1);
    }
  }

  function begin(point: MistHandSample, hand: boolean, now: number) {
    const paintedRadius = point.radius * strokeRules.initialScale;
    stroke = { raw: point, tip: point, radius: point.radius, paintedRadius, born: now, moved: now };
    painter.dab(point.x, point.y, paintedRadius, 1);
    if (hand) painter.setHand(point);
    offerEntry(point, point.radius);
    return { x: point.x, y: point.y, radius: paintedRadius };
  }

  function sample(point: MistHandSample | null, hand: boolean, now: number) {
    if (!point) {
      missing = true;
      if (stroke && now - lastSeen >= strokeRules.lostMs) lift();
      return null;
    }
    const elapsed = now - lastSeen;
    const lost = missing && elapsed >= strokeRules.lostMs;
    lastSeen = now;
    missing = false;
    if (!stroke || lost || point.source !== stroke.raw.source || distance(point, stroke.raw) > strokeRules.jumpPx) {
      return begin(point, hand, now);
    }

    const noise = hand ? Math.max(2, Math.min(3.5, point.radius * .035)) : .5;
    const moved = distance(point, stroke.raw) >= noise;
    if (moved && now - stroke.moved >= strokeRules.restMs) return begin(point, hand, now);
    if (moved) {
      stroke.raw = point;
      stroke.moved = now;
    }

    const previous = stroke.tip;
    const target = stroke.raw;
    const remaining = distance(previous, target);
    const rise = Math.min(1, (now - stroke.born) / strokeRules.riseMs);
    const scale = strokeRules.initialScale + rise * (1 - strokeRules.initialScale);
    if (remaining < .25) {
      // A raised fingertip also makes contact when held still. Let the starter
      // blossom to the measured brush size once, then leave the glass alone.
      const r = stroke.radius * scale;
      if (hand && r > stroke.paintedRadius) {
        painter.dab(previous.x, previous.y, r, 1);
        stroke.paintedRadius = r;
      }
      return { x: previous.x, y: previous.y, radius: stroke.paintedRadius };
    }
    // Blend halfway per 33 ms. This keeps the same physical lag at 10 or 60 Hz
    // and lets the rendered tip catch up after the real finger comes to rest.
    const blend = 1 - .5 ** (Math.max(1, elapsed) / (1000 / 30));
    const tip = remaining < 1 ? target : {
      x: previous.x + (target.x - previous.x) * blend,
      y: previous.y + (target.y - previous.y) * blend,
    };
    const dx = tip.x - previous.x, dy = tip.y - previous.y;
    const radius = stroke.radius + (target.radius - stroke.radius) * blend;
    const r = radius * scale;
    const count = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (r * strokeRules.spacing)));
    for (let i = 1; i <= count; i++) {
      painter.dab(previous.x + dx * i / count, previous.y + dy * i / count, r, 1);
    }
    stroke.tip = tip;
    stroke.radius = radius;
    stroke.paintedRadius = r;
    painter.touch(tip.x, tip.y, r, dx, dy);
    if (hand) painter.setHand({ ...tip, radius });

    offerEntry(tip, radius);
    return { x: tip.x, y: tip.y, radius: r };
  }

  return { sample, lift };
}
