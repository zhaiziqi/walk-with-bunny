/** An independent camera position in the garden. No route progress or preferred axis. */
export type JourneyPose = { x: number; y: number; zoom: number };
export const HOME_POSE: JourneyPose = { x: 0, y: 0, zoom: 1 };

/** Validate numbers here; the shared world projection owns viewport-dependent bounds. */
export function clampJourney(pose: JourneyPose): JourneyPose {
  return {
    x: Number.isFinite(pose.x) ? pose.x : 0,
    y: Number.isFinite(pose.y) ? pose.y : 0,
    zoom: Number.isFinite(pose.zoom) && pose.zoom > 0 ? pose.zoom : 1,
  };
}
const scaleOrOne = (scale: number) => Number.isFinite(scale) && scale > 0 ? scale : 1;

/** DOM_DELTA_PIXEL=0, DOM_DELTA_LINE=1, DOM_DELTA_PAGE=2. */
export function wheelPixels(delta: number, mode: number, pageHeight: number) {
  const multiplier = mode === 1 ? 16 : mode === 2 ? Math.max(1, pageHeight) : 1;
  return Number.isFinite(delta) ? delta * multiplier : 0;
}

/** Both axes follow the hand. The caller supplies each incremental pointer displacement. */
export function dragJourney(current: JourneyPose, dx: number, dy: number, scale = 1): JourneyPose {
  const pixelsPerUnit = scaleOrOne(scale);
  return clampJourney({ ...current, x: current.x - dx / pixelsPerUnit, y: current.y + dy / pixelsPerUnit });
}

/** Wheel direction matches scrolling a large canvas, independently on each axis. */
export function wheelJourney(current: JourneyPose, dx: number, dy: number, scale = 1): JourneyPose {
  const pixelsPerUnit = scaleOrOne(scale);
  return clampJourney({ ...current, x: current.x + dx / pixelsPerUnit, y: current.y - dy / pixelsPerUnit });
}

export function keyJourney(current: JourneyPose, key: string, scale = 1, pageHeight = 800): JourneyPose | null {
  const step = 64 / scaleOrOne(scale);
  const page = pageHeight * .7 / scaleOrOne(scale);
  switch (key) {
    case 'ArrowDown': return { ...current, y: current.y - step };
    case 'ArrowUp': return { ...current, y: current.y + step };
    case 'ArrowLeft': return { ...current, x: current.x - step };
    case 'ArrowRight': return { ...current, x: current.x + step };
    case 'PageDown': return { ...current, y: current.y - page };
    case 'PageUp': return { ...current, y: current.y + page };
    case 'Home': return { ...HOME_POSE };
    default: return null;
  }
}
