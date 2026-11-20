import assert from 'node:assert/strict';
import { clampJourney, dragJourney, keyJourney, wheelJourney, wheelPixels } from '../src/scene/journey.ts';

const start = { progress: .5, pan: 0 };
const samePose = (actual, expected) => {
  assert.ok(Math.abs(actual.progress - expected.progress) < 1e-12);
  assert.ok(Math.abs(actual.pan - expected.pan) < 1e-12);
};
assert.deepEqual(dragJourney(start, 0, -440), { progress: .7, pan: 0 });
assert.deepEqual(dragJourney(start, 0, 440), { progress: .3, pan: 0 });
assert.deepEqual(dragJourney(start, 220, 0), { progress: .5, pan: -.5 });
assert.deepEqual(dragJourney(start, 10000, -10000), { progress: 1, pan: -1 });
assert.deepEqual(dragJourney(start, -10000, 10000), { progress: 0, pan: 1 });
assert.deepEqual(start, { progress: .5, pan: 0 }, 'drag snapshots must not be mutated');

// Equivalent physical wheel travel produces the same position in all delta modes.
assert.equal(wheelPixels(100, 0, 800), 100);
assert.equal(wheelPixels(6.25, 1, 800), 100);
assert.equal(wheelPixels(.125, 2, 800), 100);
samePose(wheelJourney(start, 0, wheelPixels(27.5, 1, 800)), { progress: .7, pan: 0 });
samePose(wheelJourney(start, 0, wheelPixels(.55, 2, 800)), { progress: .7, pan: 0 });
assert.deepEqual(wheelJourney(start, 440, -2200), { progress: 0, pan: 1 });

assert.deepEqual(keyJourney({ progress: .98, pan: .9 }, 'ArrowDown'), { progress: 1, pan: .9 });
assert.deepEqual(keyJourney({ progress: .02, pan: -.9 }, 'ArrowUp'), { progress: 0, pan: -.9 });
assert.deepEqual(keyJourney(start, 'Home'), { progress: 0, pan: 0 });
assert.deepEqual(keyJourney(start, 'End'), { progress: 1, pan: 0 });
assert.equal(keyJourney(start, 'Enter'), null, 'unhandled keyboard events remain native');
assert.deepEqual(clampJourney({ progress: NaN, pan: Infinity }), { progress: 0, pan: 0 });

console.log('PASS: bidirectional travel, bounded pan, delta-mode parity, keyboard endpoints, and immutable drag origins.');
