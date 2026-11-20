import type { MeadowPoint } from './meadowMotion';
import { trailSites } from './trailState';

type GuideContext = {
  actor: MeadowPoint;
  events: readonly string[];
  started: boolean;
  solved: boolean;
  packed: boolean;
  reduced: boolean;
};

/** One contextual sentence, never a movement constraint or a progress command. */
export function firstRouteGuide({ actor, events, started, solved, packed, reduced }: GuideContext) {
  const distance = (point: MeadowPoint) => Math.hypot(actor.x - point.x, actor.y - point.y);
  const nearDesk = distance(trailSites.lantern) < 350;
  if (actor.y > 1400) return null;
  if (packed) return actor.y > 100 || nearDesk
    ? { stage: 'onward', text: 'Keep your note. The path continues to the music garden.' } : null;
  if (solved) return nearDesk
    ? { stage: 'keep-note', text: 'Your four digits are ready. Open the desk to keep the note.' } : null;
  if (nearDesk) return { stage: 'desk', text: started ? 'Click the paper to continue your questions.' : 'Click the paper to begin four small questions.' };
  if (started) return { stage: 'resume', text: 'Your questions are waiting beneath the lantern. Find it on the map.' };
  if (!reduced && !events.includes('trail-flower-open') && distance(trailSites.flower) < trailSites.flower.radius) {
    return { stage: 'flower', text: 'Rest beside the first flower for a moment.' };
  }
  if (actor.y < -1400 && !events.includes('trail-flower-open')) {
    return { stage: 'path', text: 'Follow the pale path to the first flower.' };
  }
  return { stage: 'lantern', text: events.includes('trail-flower-open') && !events.includes('trail-guide-homeward') && !reduced
    ? 'Follow the path and the butterfly towards the lantern.'
    : 'Follow the pale path to the lantern. A small desk waits there.' };
}
