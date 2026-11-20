/** Input-space state only. World layout and projection live in world.ts. */
export type JourneyPose = { progress: number; pan: number };

export const JOURNEY_TRAVEL_PIXELS = 2200;
export const JOURNEY_PAN_PIXELS = 440;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function clampJourney(pose: JourneyPose): JourneyPose {
  return {
    progress: clamp(Number.isFinite(pose.progress) ? pose.progress : 0, 0, 1),
    pan: clamp(Number.isFinite(pose.pan) ? pose.pan : 0, -1, 1),
  };
}

/** DOM_DELTA_PIXEL=0, DOM_DELTA_LINE=1, DOM_DELTA_PAGE=2. */
export function wheelPixels(delta: number, mode: number, pageHeight: number) {
  const multiplier = mode === 1 ? 16 : mode === 2 ? Math.max(1, pageHeight) : 1;
  return Number.isFinite(delta) ? delta * multiplier : 0;
}

/** A drag is always calculated from the pointer-down pose, so event frequency cannot change travel. */
export function dragJourney(start: JourneyPose, dx: number, dy: number): JourneyPose {
  return clampJourney({
    progress: start.progress - dy / JOURNEY_TRAVEL_PIXELS,
    pan: start.pan - dx / JOURNEY_PAN_PIXELS,
  });
}

export function wheelJourney(start: JourneyPose, dx: number, dy: number): JourneyPose {
  return clampJourney({
    progress: start.progress + dy / JOURNEY_TRAVEL_PIXELS,
    pan: start.pan + dx / JOURNEY_PAN_PIXELS,
  });
}

export function keyJourney(start: JourneyPose, key: string): JourneyPose | null {
  switch (key) {
    case 'ArrowDown': return clampJourney({ ...start, progress: start.progress + .06 });
    case 'ArrowUp': return clampJourney({ ...start, progress: start.progress - .06 });
    case 'PageDown': return clampJourney({ ...start, progress: start.progress + .24 });
    case 'PageUp': return clampJourney({ ...start, progress: start.progress - .24 });
    case 'ArrowLeft': return clampJourney({ ...start, pan: start.pan - .2 });
    case 'ArrowRight': return clampJourney({ ...start, pan: start.pan + .2 });
    case 'Home': return { progress: 0, pan: 0 };
    case 'End': return { progress: 1, pan: 0 };
    default: return null;
  }
}
