/** Local prototype timing. The production lock and saved progress are untouched. */
export const DURATION = 6;

export const PAPER_REST_RECT = Object.freeze({ x: -110, y: -100, width: 390, height: 245 });
export const PAPER_GRIP = Object.freeze({ u: 0.961, v: 0.287 });
export const PAPER_FOLD_ROOT = Object.freeze({ u: 0.42, v: 0.31 });

const clamp01 = value => Math.min(1, Math.max(0, value));
const smoothstep = value => {
  const p = clamp01(value);
  return p * p * (3 - 2 * p);
};
const between = (time, start, end) => smoothstep((time - start) / (end - start));
const mix = (a, b, p) => a + (b - a) * p;

/**
 * Warp a point on the painted cover sheet. The underpaper is a separate,
 * stationary illustration. A fold root remains against the gift while the
 * foreground of this sheet rises and rolls behind it; the pointed right edge
 * follows a smaller, higher arc toward the bird. This is a folded surface,
 * rather than a translated/scaled rectangular sprite.
 *
 * u/v are normalized texture coordinates. Returns local scene coordinates.
 */
export function paperPoint(u, v, pose) {
  u = Number.isFinite(u) ? clamp01(u) : 0;
  v = Number.isFinite(v) ? clamp01(v) : 0;
  const pull = Number.isFinite(pose?.pull) ? clamp01(pose.pull) : 0;
  const settle = Number.isFinite(pose?.settle) ? clamp01(pose.settle) : 0;
  const { x, y, width, height } = PAPER_REST_RECT;
  const rootX = x + width * PAPER_FOLD_ROOT.u;
  const rootY = y + height * PAPER_FOLD_ROOT.v;
  const dx = width * (u - PAPER_FOLD_ROOT.u);
  const dy = height * (v - PAPER_FOLD_ROOT.v);
  const right = smoothstep((u - PAPER_FOLD_ROOT.u) / (1 - PAPER_FOLD_ROOT.u));
  const foreground = smoothstep((v - PAPER_FOLD_ROOT.v) / (1 - PAPER_FOLD_ROOT.v));
  const curl = Math.sin(Math.PI * clamp01((v - PAPER_FOLD_ROOT.v) / (1 - PAPER_FOLD_ROOT.v)));
  const freeEdge = Math.min(1, Math.hypot(u - PAPER_FOLD_ROOT.u, v - PAPER_FOLD_ROOT.v) * 2);
  const lift = Math.sin(Math.PI * pull);
  // The loose left hem crumples onto the underpaper instead of the whole
  // folded sheet becoming one flat horizontal strip. It falls outside the
  // main folio face; the fixed root and gripped right corner are unaffected.
  const leftHem = 1 - smoothstep((u - 0.08) / 0.32);
  const drape = 105 * pull * leftHem * foreground;

  return {
    x: rootX + dx * (1 - 0.22 * pull) + 72 * pull * right,
    y: rootY + dy * (1 - 1.25 * pull)
      - 46 * pull * right
      - 32 * lift * foreground
      - 15 * pull * curl
      + drape
      + 9 * settle * freeEdge,
  };
}

/**
 * Pure, seekable six-second sequence. All movement is derived from time;
 * pause/resume and keyframe inspection do not accumulate simulation state.
 */
export function poseAt(seconds) {
  const time = typeof seconds === 'number' && !Number.isNaN(seconds)
    ? Math.min(DURATION, Math.max(0, seconds)) : 0;
  const approach = between(time, 0.65, 1.3);
  const pull = between(time, 1.65, 3.6);
  const settle = between(time, 3.6, 4.65);
  const reaction = between(time, 3.75, 4.65);
  const reactionArc = Math.sin(Math.PI * reaction);
  const pose = {
    time,
    progress: time / DURATION,
    phase: time < 0.65 ? 'settling'
      : time < 1.3 ? 'approach'
        : time < 1.65 ? 'catch'
          : time < 3.6 ? 'unwrap'
            : time < 4.65 ? 'reaction'
              : time < 5.65 ? 'title' : 'rest',
    pull,
    settle,
    orb: {
      x: 14 * reaction,
      y: -3 * reactionArc,
      rotation: 2.5 * reactionArc,
      scaleX: 1 + 0.025 * reactionArc,
      scaleY: 1 - 0.02 * reactionArc,
    },
    bird: { beakX: 0, beakY: 0, rotation: 0 },
    titleAlpha: between(time, 4.65, 5.65),
    revealed: time >= 3.6,
  };
  const tip = paperPoint(PAPER_GRIP.u, PAPER_GRIP.v, pose);

  if (time < 1.3) {
    pose.bird = {
      beakX: tip.x + mix(54, 0, approach),
      beakY: tip.y + mix(-40, 0, approach) - 8 * Math.sin(Math.PI * approach),
      rotation: mix(-8, 0, approach),
    };
  } else if (time <= 3.6) {
    // Render the bird about this beak anchor so rotating it cannot lose contact.
    pose.bird = {
      beakX: tip.x,
      beakY: tip.y,
      rotation: 3 * Math.sin(Math.PI * pull),
    };
  } else {
    const releasedTip = paperPoint(PAPER_GRIP.u, PAPER_GRIP.v, { pull: 1, settle: 0 });
    const landing = between(time, 3.6, 4.8);
    const releaseArc = Math.sin(Math.PI * landing);
    pose.bird = {
      beakX: releasedTip.x + 14 * landing,
      beakY: mix(releasedTip.y, -5, landing) - 5 * releaseArc,
      rotation: -2.5 * releaseArc,
    };
  }
  return pose;
}
