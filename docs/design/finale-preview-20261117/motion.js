/** Total length of the isolated final-gift preview, in seconds. */
export const DURATION = 4.8;

const TIP_X = 0.966;
const TIP_Y = 0.582;
const PAPER = { x: -110, y: -72, width: 300, height: 170 };

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const smoothstep = (value) => {
  const progress = clamp01(value);
  return progress * progress * (3 - 2 * progress);
};
const between = (time, start, end) => smoothstep((time - start) / (end - start));
const mix = (from, to, progress) => from + (to - from) * progress;

/**
 * @typedef {'settling'|'approach'|'catch'|'unwrap'|'reaction'|'title'|'rest'} Phase
 */

/**
 * Return a deterministic pose in local scene units, without modifying scene state.
 * Times outside the sequence are clamped; NaN and non-number inputs show its start.
 * Rotations are degrees. Bird wing openness ranges from 0 (folded) to 1 (open).
 * Orb values are offsets from its existing resting position; the gift never moves.
 *
 * @param {number} seconds Elapsed sequence time in seconds.
 * @returns {{
 *   progress: number,
 *   phase: Phase,
 *   paper: {x: number, y: number, width: number, height: number},
 *   bird: {beakX: number, beakY: number, wing: number, rotation: number},
 *   orb: {x: number, y: number, rotation: number, scaleX: number, scaleY: number},
 *   titleAlpha: number,
 *   revealed: boolean
 * }} Complete pose; progress is the normalized overall sequence time.
 */
export function poseAt(seconds) {
  const time = typeof seconds === 'number' && !Number.isNaN(seconds)
    ? Math.min(DURATION, Math.max(0, seconds))
    : 0;
  const approach = between(time, 0.5, 1.3);
  const pull = between(time, 1.6, 3.1);
  const reaction = between(time, 3.1, 3.8);
  const pullLift = Math.sin(Math.PI * pull);
  const reactionLift = Math.sin(Math.PI * reaction);

  const paper = {
    x: PAPER.x + 185 * pull + 10 * reaction,
    // Its visible lower edge rests at .79 of the texture height. Hold that
    // ground line while the released fold collapses, rather than levitating it.
    y: PAPER.y - 18 * pullLift + (8 + 55 * .79) * reaction,
    width: PAPER.width - 100 * pull - 50 * reaction,
    height: PAPER.height - 25 * pull - 55 * reaction,
  };
  const tipX = paper.x + paper.width * TIP_X;
  const tipY = paper.y + paper.height * TIP_Y;

  let beakX = tipX;
  let beakY = tipY;
  let wing = 0;
  let rotation = 0;

  if (time < 1.3) {
    beakX = tipX + mix(100, 0, approach);
    beakY = tipY + mix(-46, 0, approach) - 12 * Math.sin(Math.PI * approach);
    wing = 0.75 * (1 - approach);
    rotation = mix(-10, 0, approach);
  } else if (time <= 3.1) {
    // Keeping this anchor exact makes the tissue's movement caused by the bird.
    wing = 0.12 * pullLift;
    rotation = 4 * pullLift;
  } else {
    // The paper is released: both settle, while the bird takes one short step.
    const releasedTipX = PAPER.x + 185 + (PAPER.width - 100) * TIP_X;
    const releasedTipY = PAPER.y + (PAPER.height - 25) * TIP_Y;
    beakX = releasedTipX + 24 * reaction;
    beakY = releasedTipY + 8 * reaction - 5 * reactionLift;
    wing = 0.18 * reactionLift;
    rotation = 3 * reactionLift;
  }

  const phase = time < 0.5 ? 'settling'
    : time < 1.3 ? 'approach'
      : time < 1.6 ? 'catch'
        : time < 3.1 ? 'unwrap'
          : time < 3.8 ? 'reaction'
            : time < 4.5 ? 'title'
              : 'rest';

  return {
    progress: time / DURATION,
    phase,
    paper,
    bird: { beakX, beakY, wing, rotation },
    orb: {
      x: 12 * reaction,
      y: -2 * reactionLift,
      rotation: 2 * reactionLift,
      scaleX: 1 + 0.015 * reactionLift,
      scaleY: 1 - 0.015 * reactionLift,
    },
    titleAlpha: between(time, 3.8, 4.5),
    revealed: time >= 3.1,
  };
}
