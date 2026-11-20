import assert from 'node:assert/strict';
import { DURATION, PAPER_REST_RECT, PAPER_GRIP, PAPER_FOLD_ROOT, poseAt, paperPoint } from './motion.js';

const near = (a, b, tolerance = 1e-8) => assert.ok(Math.abs(a - b) <= tolerance, `${a} differs from ${b}`);
const pointNear = (a, b, tolerance) => { near(a.x, b.x, tolerance); near(a.y, b.y, tolerance); };
const numericLeaves = value => typeof value === 'number' ? [value]
  : value && typeof value === 'object' ? Object.values(value).flatMap(numericLeaves) : [];

for (const input of [undefined, null, NaN, '3', -10, -Infinity]) assert.deepEqual(poseAt(input), poseAt(0));
for (const input of [DURATION, 100, Infinity]) assert.deepEqual(poseAt(input), poseAt(DURATION));
for (let i = 0; i <= 600; i++) {
  const t = i / 100;
  assert.deepEqual(poseAt(t), poseAt(t));
  assert.ok(numericLeaves(poseAt(t)).every(Number.isFinite));
  assert.ok(poseAt(t).pull >= 0 && poseAt(t).pull <= 1);
  assert.ok(poseAt(t).titleAlpha >= 0 && poseAt(t).titleAlpha <= 1);
  for (let u = 0; u <= 1; u += 0.1) {
    for (let v = 0; v <= 1; v += 0.1) {
      assert.ok(numericLeaves(paperPoint(u, v, poseAt(t))).every(Number.isFinite));
    }
  }
}

// Initial mapping preserves the stated source rectangle, without any hidden jump.
pointNear(paperPoint(0, 0, poseAt(0)), { x: PAPER_REST_RECT.x, y: PAPER_REST_RECT.y });
pointNear(paperPoint(1, 1, poseAt(0)), {
  x: PAPER_REST_RECT.x + PAPER_REST_RECT.width,
  y: PAPER_REST_RECT.y + PAPER_REST_RECT.height,
});

// An unchanged fold contact makes the moving cover belong to the fixed gift.
const rootAtStart = paperPoint(PAPER_FOLD_ROOT.u, PAPER_FOLD_ROOT.v, poseAt(0));
for (let i = 0; i <= 120; i++) {
  pointNear(paperPoint(PAPER_FOLD_ROOT.u, PAPER_FOLD_ROOT.v, poseAt(i / 20)), rootAtStart);
}

// The actual visible painted corner is the beak anchor throughout the pull.
for (let i = 0; i <= 230; i++) {
  const pose = poseAt(1.3 + i / 100);
  const tip = paperPoint(PAPER_GRIP.u, PAPER_GRIP.v, pose);
  pointNear({ x: pose.bird.beakX, y: pose.bird.beakY }, tip);
}

// Geometry changes continuously across approach/contact/pull/release/title cuts.
for (const cut of [0.65, 1.3, 1.65, 3.6, 3.75, 4.65, 4.8, 5.65, DURATION]) {
  const left = poseAt(cut - 1e-5), right = poseAt(cut + 1e-5);
  const a = numericLeaves(left), b = numericLeaves(right);
  a.forEach((value, i) => near(value, b[i], 0.003));
  for (const [u, v] of [[0, 0], [0.4, 0.6], [1, 1], [PAPER_GRIP.u, PAPER_GRIP.v]]) {
    pointNear(paperPoint(u, v, left), paperPoint(u, v, right), 0.003);
  }
}

// Final cover folds behind the folio rather than extending the actor group.
const firstTip = paperPoint(PAPER_GRIP.u, PAPER_GRIP.v, poseAt(0));
const lastTip = paperPoint(PAPER_GRIP.u, PAPER_GRIP.v, poseAt(DURATION));
assert.ok(lastTip.x - firstTip.x > 0 && lastTip.x - firstTip.x < 85);
assert.ok(lastTip.y < firstTip.y - 15);
for (const [u, v] of [[0.35, 0.60], [0.45, 0.72], [0.6, 0.55], [0.7, 0.55]]) {
  assert.ok(paperPoint(u, v, poseAt(DURATION)).y < -30, 'The cover must clear the main folio face.');
}
const release = poseAt(3.6), last = poseAt(DURATION);
assert.ok(Math.abs(last.bird.beakX - release.bird.beakX) <= 20);
near(poseAt(4.8).bird.beakY, -5);
near(last.bird.beakY, -5);
assert.ok(last.bird.beakY + 56 >= 49 && last.bird.beakY + 56 <= 52, 'Bird body settles on the common ground.');
const leftHem = paperPoint(0.2, 0.78, last);
assert.ok(leftHem.x < 0 && leftHem.y > -3 && leftHem.y < 10, 'Loose left hem touches the underpaper beside the folio.');
assert.ok(Math.hypot(last.bird.beakX - lastTip.x, last.bird.beakY - lastTip.y) > 8, 'Beak releases the sheet.');
assert.equal(last.phase, 'rest');
assert.equal(last.revealed, true);
assert.equal(last.titleAlpha, 1);
near(last.orb.rotation, 0);
near(last.orb.scaleX, 1);
near(last.orb.scaleY, 1);
assert.equal(poseAt(2.7).phase, 'unwrap');
assert.equal(poseAt(4.2).phase, 'reaction');
console.log('Finale motion: finite/deterministic poses, fixed fold, 231 beak contacts, phase continuity and compact final reveal passed.');
