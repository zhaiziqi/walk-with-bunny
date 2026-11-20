import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createFloofCanvas } from '../src/scene/floofCompanionArt.ts';
import { fileURLToPath } from 'node:url';
import { advanceBunnyTurn, bunnyTurnViews, createBunnyTurn } from '../src/scene/bunnyTurn.ts';

let failures = 0;
const check = (name, run) => {
  try { run(); console.log(`PASS: ${name}`); }
  catch (error) { failures++; console.error(`FAIL: ${name}: ${error.stack}`); }
};
const near = (a, b, tolerance = 1e-7) => assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b} within ${tolerance}`);
const difference = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const input = (angle, extra = {}) => ({ headingX: Math.cos(angle), headingY: Math.sin(angle), moving: true, speed: 200, dt: 1 / 60, ...extra });
const advanceFor = (state, angle, seconds, fps = 60, extra = {}) => {
  for (let i = 0; i < seconds * fps; i++) state = advanceBunnyTurn(state, input(angle, { dt: 1 / fps, ...extra }));
  return state;
};
const finite = state => {
  Object.values(state).forEach(value => assert.ok(Number.isFinite(value)));
  assert.ok(state.angle >= 0 && state.angle < 2 * Math.PI);
  assert.ok(Math.abs(state.bodyLean) <= .035 && Math.abs(state.earLag) <= .08);
};

check('all eight headings settle to the correct view with normalized adjacent weights', () => {
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    const state = advanceFor(createBunnyTurn(), angle, 2);
    finite(state); near(difference(state.angle, angle), 0);
    const view = bunnyTurnViews(state.angle);
    near(view.weights[i], 1);
    near(view.weights.reduce((a, b) => a + b, 0), 1);
  }
});

check('a reversal begins gradually and does not instantly swap the character to the other side', () => {
  const initial = createBunnyTurn({ x: 1, y: 0 });
  const first = advanceBunnyTurn(initial, input(Math.PI));
  assert.ok(first.angle > 0 && first.angle < .13);
  assert.ok(bunnyTurnViews(first.angle).weights[0] > .93);
  const final = advanceFor(first, Math.PI, 2);
  near(difference(final.angle, Math.PI), 0);
  near(final.angularVelocity, 0);
});

check('crossing east takes the short arc and weights remain continuous through 7 → 0', () => {
  let state = createBunnyTurn({ x: Math.cos(-.12), y: Math.sin(-.12) });
  let total = 0;
  for (let i = 0; i < 120; i++) {
    const next = advanceBunnyTurn(state, input(.12));
    const delta = difference(state.angle, next.angle);
    assert.ok(delta >= -1e-8 && delta < .04);
    total += delta; state = next;
  }
  near(total, .24);
  const before = bunnyTurnViews(-1e-5).weights, after = bunnyTurnViews(1e-5).weights;
  before.forEach((weight, i) => near(weight, after[i], 1e-8));
});

check('near-opposite input noise does not reverse the selected turn arc', () => {
  let state = createBunnyTurn({ x: 1, y: 0 });
  for (let i = 0; i < 25; i++) {
    const next = advanceBunnyTurn(state, input(Math.PI + (i % 2 ? -.015 : .015), { dt: 1 / 120 }));
    assert.ok(difference(state.angle, next.angle) >= -1e-7);
    state = next;
  }
});

check('a stopped or near-zero heading holds the last intended direction and settles the ears', () => {
  let state = advanceFor(createBunnyTurn({ x: 1, y: 0 }), Math.PI / 2, .15);
  assert.ok(state.angularVelocity > 0);
  const target = state.targetAngle;
  for (let i = 0; i < 240; i++) state = advanceBunnyTurn(state, {
    headingX: 1e-10, headingY: -1e-10, moving: false, speed: 0, dt: 1 / 60,
  });
  near(state.targetAngle, target); near(difference(state.angle, target), 0);
  near(state.angularVelocity, 0); near(state.bodyLean, 0); near(state.earLag, 0);
  const stopped = state;
  for (let i = 0; i < 60; i++) state = advanceBunnyTurn(state, input(Math.PI, { moving: false, speed: 0 }));
  near(state.angle, stopped.angle);
});

check('30/60/120 fps produce matching turns and bounded decorative responses', () => {
  const states = [30, 60, 120].map(fps => {
    let state = createBunnyTurn({ x: 1, y: 0 });
    for (const angle of [Math.PI / 2, Math.PI, -.7, .1]) state = advanceFor(state, angle, .5, fps);
    return state;
  });
  for (const state of states) {
    finite(state); near(difference(state.angle, states[2].angle), 0, 1e-8);
    near(state.angularVelocity, states[2].angularVelocity, 1e-8);
    near(state.bodyLean, states[2].bodyLean, 1e-8);
    near(state.earLag, states[2].earLag, 1e-8);
  }
});

check('reduced motion keeps readable orientation while suppressing lean and ear flourish', () => {
  let state = advanceFor(createBunnyTurn(), Math.PI / 2, .2);
  assert.ok(Math.abs(state.earLag) > .001);
  state = advanceBunnyTurn(state, input(0, { reducedMotion: true }));
  near(state.earLag, 0); near(state.earLagVelocity, 0); near(state.bodyLean, 0); near(state.bodyLeanVelocity, 0);
  assert.ok(Math.abs(difference(state.angle, 0)) > .1, 'direction still turns rather than flipping');
  state = advanceFor(state, 0, 2, 60, { reducedMotion: true });
  near(difference(state.angle, 0), 0);
});

check('invalid inputs and stalled frames stay finite without unbounded rotation', () => {
  let state = createBunnyTurn({ x: NaN, y: Infinity }), seed = 17;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
  for (let i = 0; i < 2000; i++) {
    const prior = state;
    const dt = [NaN, Infinity, -1, 4, random() * .08][i % 5];
    state = advanceBunnyTurn(state, { ...input(random() * Math.PI * 2), dt,
      headingX: i % 9 === 0 ? NaN : random() - .5,
      headingY: i % 11 === 0 ? Infinity : random() - .5,
      speed: i % 13 === 0 ? NaN : random() * 1000,
    });
    finite(state);
    assert.ok(Math.abs(difference(prior.angle, state.angle)) < 1);
    const views = bunnyTurnViews(state.angle);
    views.weights.forEach(weight => assert.ok(weight >= 0 && weight <= 1));
    near(views.weights.reduce((a, b) => a + b, 0), 1);
    assert.ok(views.weights.filter(weight => weight > 0).length <= 2);
  }
  for (const angle of [NaN, Infinity, -Infinity]) assert.equal(bunnyTurnViews(angle).from, 0);
});

// Compile the real Vite flag both ways, then run the gate with an isolated location.
const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('vite/package.json'))('esbuild');
const previewGates = await Promise.all([false, true].map(async development => {
  const result = await build({
    absWorkingDir: fileURLToPath(new URL('..', import.meta.url)),
    entryPoints: ['src/scene/paintedBunnyArt.ts'],
    bundle: true, write: false, format: 'cjs', platform: 'node',
    define: { 'import.meta.env.DEV': String(development) },
  });
  const evaluate = new Function('module', 'location', result.outputFiles[0].text);
  return (location, gate = 'bunnyWalkPreview') => {
    const module = { exports: {} };
    evaluate(module, location);
    return module.exports[gate]();
  };
}));

check('only the isolated fresh development preview shows the ear tips', () => {
  const [productionGate, developmentGate] = previewGates;
  const sample = { search: '?bunny=painted&preview=fresh&run=character-study' };
  assert.equal(productionGate(sample), false);
  assert.equal(developmentGate(sample), true);
  for (const gate of previewGates) {
    assert.equal(gate(undefined), false);
    for (const search of ['', '?bunny=painted', '?preview=fresh', '?bunny=other&preview=fresh',
      '?bunny=painted&preview=fresh&walk=normal', '?bunny=painted&preview=fresh&walk=']) {
      assert.equal(gate({ search }), false, search);
    }
  }
});

check('the mist entrance uses the same ear tips only on its development preview', () => {
  const [productionGate, developmentGate] = previewGates;
  const key = 'mistGardenPreview', url = { search: '?mist=1&preview=fresh' };
  assert.equal(productionGate(url, key), false);
  assert.equal(developmentGate(url, key), true);
  for (const search of ['?mist=1', '?preview=fresh', '?bunny=painted&preview=fresh',
    '?mist=0&preview=fresh', '?mist=1&preview=fresh&walk=']) {
    assert.equal(developmentGate({ search }, key), false);
  }
});

// Record the painter's actual geometry and pigments, including each bristle's control point.
function recordOrb(earTips) {
  const fills = [], strokes = [], grain = [];
  let path = [];
  const context = {
    createLinearGradient(...axis) {
      const stops = [];
      return { axis, stops, addColorStop(offset, color) { stops.push([offset, color]); } };
    },
    beginPath() { path = []; },
    moveTo(x, y) { path.push([x, y]); },
    lineTo(x, y) { path.push([x, y]); },
    quadraticCurveTo(cx, cy, x, y) { path.push([cx, cy], [x, y]); },
    closePath() {},
    fill() { fills.push({ path, axis: this.fillStyle.axis, stops: this.fillStyle.stops }); },
    stroke() { strokes.push({ path, color: this.strokeStyle, width: this.lineWidth }); },
    fillRect(...rect) { grain.push([rect, this.fillStyle, this.globalCompositeOperation]); },
    save() {}, restore() {},
  };
  const canvas = { getContext: () => context };
  const priorDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => canvas } });
  try {
    createFloofCanvas(earTips);
    return { width: canvas.width, height: canvas.height, fills, strokes, grain };
  } finally {
    if (priorDocument) Object.defineProperty(globalThis, 'document', priorDocument);
    else delete globalThis.document;
  }
}

check('the ear study lifts only the crown of the original orb and retains its dry-brush surface', () => {
  const original = recordOrb(), study = recordOrb(true);
  assert.deepEqual([original.width, original.height, study.width, study.height], [512, 512, 512, 512]);
  assert.equal(original.fills.length, 1);
  assert.equal(study.fills.length, 1);
  const [base] = original.fills, [tipped] = study.fills;
  assert.deepEqual(tipped.axis, base.axis);
  assert.deepEqual(tipped.stops, base.stops);
  assert.deepEqual(study.grain, original.grain);

  const inCrown = point => point[1] < 160;
  assert.equal(tipped.path.length, base.path.length);
  for (let i = 0; i < base.path.length; i++) {
    if (!inCrown(base.path[i])) assert.deepEqual(tipped.path[i], base.path[i]);
  }
  // Read across the crown from left to right. Two modest lifts with a valley between
  // distinguish a pair of tips from accidentally stretching the whole body upwards.
  const crown = base.path.map(([x, y], i) => ({ x, y, lift: y - tipped.path[i][1] }))
    .filter(point => point.y < 160).sort((a, b) => a.x - b.x);
  const peaks = crown.filter((point, i) => i > 0 && i + 1 < crown.length
    && point.lift > 2 && point.lift > crown[i - 1].lift && point.lift >= crown[i + 1].lift);
  assert.equal(peaks.length, 2, 'two distinct short ear tips on the crown');
  const valley = crown.filter(point => point.x > peaks[0].x && point.x < peaks[1].x);
  assert.ok(valley.some(point => point.lift < Math.min(peaks[0].lift, peaks[1].lift) / 2));
  const baseHeight = Math.max(...base.path.map(point => point[1])) - Math.min(...base.path.map(point => point[1]));
  assert.ok(peaks.every(point => point.lift < baseHeight * .15), 'tips stay short relative to the body');

  assert.equal(study.strokes.length, original.strokes.length);
  let alteredCrownFibres = 0;
  for (let i = 0; i < original.strokes.length; i++) {
    const oldStroke = original.strokes[i], newStroke = study.strokes[i];
    assert.equal(newStroke.color, oldStroke.color);
    assert.equal(newStroke.width, oldStroke.width);
    if (oldStroke.path.every(point => !inCrown(point))) assert.deepEqual(newStroke.path, oldStroke.path);
    else if (oldStroke.path.some(([x, y], j) => newStroke.path[j][0] !== x || newStroke.path[j][1] !== y)) alteredCrownFibres++;
  }
  assert.ok(alteredCrownFibres > 0, 'the fur follows the two tips');
});

if (failures) process.exitCode = 1;
