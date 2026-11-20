import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMistBrush } from '../src/ui/mistBrush.ts';
import { projectMistHand } from '../src/ui/mistHandTracking.ts';

function mirror() {
  const dabs = [], events = [];
  const painter = {
    dab(x, y, radius, strength) { dabs.push({ x, y, radius, strength }); },
    touch() {}, setHand() {},
  };
  const brush = createMistBrush(painter, { x: 580, y: 430 }, 1200, () => events.push('greeting'));
  const finger = (x, y, now, source = 'index') => brush.sample({ x, y, radius: 55, source }, true, now);
  return { brush, finger, dabs, events };
}

test('lifting a still finger opens at once and reaches full width in 110ms without feeding the same mark forever', () => {
  const { finger, brush, dabs, events } = mirror();
  assert.equal(brush.sample(null, true, 0), null);
  assert.equal(dabs.length, 0);
  assert.deepEqual(finger(580, 430, 100), { x: 580, y: 430, radius: 55 * .62 });
  assert.deepEqual(dabs, [{ x: 580, y: 430, radius: 55 * .62, strength: 1 }]);
  const middle = finger(581, 430, 155);
  assert.ok(middle.radius > 55 * .62 && middle.radius < 55);
  assert.deepEqual(finger(580, 430, 210), { x: 580, y: 430, radius: 55 });
  const settled = dabs.length;
  for (let now = 240; now < 2000; now += 40) finger(580 + Math.sin(now) * 1.5, 430, now);
  assert.equal(dabs.length, settled);
  assert.equal(dabs.at(-1).radius, 55);
  assert.deepEqual(events, []);
});

test('missing hand, discontinuity, prolonged rest and a switch of landmarks start independent marks', () => {
  for (const cause of ['loss', 'jump', 'rest', 'occlusion']) {
    const { finger, dabs, brush } = mirror();
    finger(100, 180, 0);
    finger(132, 180, 40);
    if (cause === 'loss') brush.sample(null, true, 130);
    if (cause === 'rest') for (let t = 70; t <= 350; t += 40) finger(132, 180, t);
    const before = dabs.length;
    const x = cause === 'jump' ? 340 : 226;
    const time = cause === 'rest' ? 400 : cause === 'loss' ? 182 : 75;
    const source = cause === 'occlusion' ? 'palm' : 'index';
    finger(x, 180, time, source);
    assert.deepEqual(dabs.slice(before), [{ x, y: 180, radius: 55 * .62, strength: 1 }], cause);
    finger(x + 30, 182, time + 40, source);
    assert.ok(dabs.length > before + 1);
    assert.ok(dabs.slice(before).every(dab => dab.x >= x));
  }
});

test('intermittently detected samples leave visible spots even at a three-Hz cadence', () => {
  for (const [step, interval] of [[25, 320], [115, 80]]) {
    const { finger, dabs, events } = mirror();
    for (let i = 0; i < 7; i++) finger(50 + i * step, 100, i * interval);
    assert.deepEqual(dabs.map(d => d.x), Array.from({ length: 7 }, (_, i) => 50 + i * step));
    assert.ok(dabs.every(d => d.strength === 1));
    assert.deepEqual(events, ['greeting'], 'separate marks also enable the optional gesture to enter');
  }
});

test('a continuous sweep paints at most .3 radii apart and stays aligned when the fingertip stops', () => {
  const { finger, dabs } = mirror();
  finger(80, 150, 0);
  for (let n = 1; n <= 7; n++) finger(80 + n * 30, 150, n * 45);
  for (let n = 1; n <= 6; n++) finger(290, 150, 315 + n * 40);
  for (let n = 1; n < dabs.length; n++) assert.ok(Math.abs(dabs[n].x - dabs[n - 1].x) <= dabs[n].radius * .3 + .001);
  assert.ok(Math.abs(dabs.at(-1).x - 290) < 1);
});

test('very slow deliberate motion accumulates rather than disappearing into the jitter threshold', () => {
  const { finger, dabs } = mirror();
  for (let t = 0; t <= 60; t++) finger(100 + t * .45, 180, t * 40);
  assert.ok(dabs.at(-1).x > 124);
});

test('after the greeting repeated full sweeps keep clearing the mirror until the user chooses to enter', () => {
  const { finger, brush, dabs, events } = mirror();
  for (let i = 0; i <= 9; i++) finger(40 + 26 * i, 120, i * 45);
  assert.deepEqual(events, ['greeting']);
  for (let pass = 1; pass <= 4; pass++) {
    brush.lift();
    const before = dabs.length;
    for (let i = 0; i <= 14; i++) finger(800 - 25 * i, 330 - i * 8, pass * 1000 + i * 45);
    assert.ok(dabs.length - before > 14, 'wiping still works');
  }
  assert.deepEqual(events, ['greeting']);
});

test('the detected fingertip matches a centered, horizontally mirrored cover crop in CSS pixels', () => {
  const hand = [];
  hand[5] = { x: .4, y: .4 };
  hand[17] = { x: .5, y: .4 };
  hand[8] = { x: .625, y: .75 };
  hand[9] = { x: .51, y: .6 };
  const camera = { width: 1280, height: 720 }, screen = { width: 480, height: 480 };
  const tip = projectMistHand(hand, camera, screen);
  assert.equal(tip.source, 'index');
  assert.ok(Math.abs(tip.x - (240 - .125 * 1280 * 480 / 720)) < 1e-8);
  assert.equal(tip.y, 360);
  assert.ok(Math.abs(tip.radius - .55 * .1 * 1280 * 480 / 720) < 1e-8);
  hand[8].x = .05;
  assert.equal(projectMistHand(hand, camera, screen).source, 'palm', 'index outside the displayed crop');
  hand[8].x = NaN;
  assert.equal(projectMistHand(hand, camera, screen).source, 'palm', 'incomplete fingertip');
  hand[9].x = .99;
  assert.equal(projectMistHand(hand, camera, screen), null);
  assert.equal(projectMistHand([], camera, screen), null);
});

test('letterboxing crop and radius limits use CSS units, independent of canvas pixel density', () => {
  const hand = [];
  hand[5] = { x: .50, y: .4 };
  hand[17] = { x: .51, y: .4 };
  hand[8] = { x: .20, y: .56 };
  const camera = { width: 640, height: 480 };
  const screen = { width: 1440, height: 450 };
  const distant = projectMistHand(hand, camera, screen);
  assert.equal(distant.radius, 26);
  assert.equal(distant.x, 1152);
  assert.ok(Math.abs(distant.y - 289.8) < 1e-8);
  hand[17].x = .85;
  assert.equal(projectMistHand(hand, camera, screen).radius, 140);
  assert.equal(projectMistHand(hand, camera, { width: 0, height: 0 }), null);
});
