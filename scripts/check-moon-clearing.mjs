import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';
registerHooks({ resolve(specifier, context, next) {
  return next(specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/src/') ? `${specifier}.ts` : specifier, context);
} });
const { createMoonClearing, resumeMoonClearing, advanceMoonClearing, inspectMoonClearing, moonClearingField, moonObjectTint } = await import('../src/scene/moonClearing.ts');
const { objects } = await import('../src/scene/world.ts');
const { regions } = await import('../src/scene/gardenAtlas.ts');
const door = objects.find(object => object.id === 'lock');
let checks = 0, failures = 0;
const check = (name, run) => { checks++; try { run(); console.log(`PASS: ${name}`); } catch (error) { failures++; console.error(`FAIL: ${name}\n${error.stack}`); } };
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const near = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) < tolerance, `${a} differs from ${b}`);
function hold(state, seconds, fps = 60, paused = false, observe) {
  const count = Math.ceil(seconds * fps), dt = seconds / count;
  for (let i = 0; i < count; i++) { state = advanceMoonClearing(state, state.actor, dt, paused); observe?.(state); }
  return state;
}
function begin(fps = 60) {
  let state = createMoonClearing({ x: -80, y: 7900 });
  for (let frame = 0; frame < fps * 2 && state.age < 0; frame++) {
    state = advanceMoonClearing(state, { x: state.actor.x, y: state.actor.y + 180 / fps }, 1 / fps);
  }
  assert.equal(state.age, 0, 'natural walking must begin the arrival');
  return state;
}

check('a natural approach starts only after four tenths of a second inside the clearing', () => {
  for (const fps of [30, 60, 120]) {
    let state = createMoonClearing({ x: -80, y: 7600 }), firstInside = -1, began = -1;
    for (let frame = 1; frame < fps * 4 && state.age < 0; frame++) {
      const actor = { x: -80, y: 7600 + 180 * frame / fps };
      if (firstInside < 0 && Math.hypot((actor.x + 80) / 680, (actor.y - 8220) / 510) < 1) firstInside = frame;
      state = advanceMoonClearing(state, actor, 1 / fps);
      if (state.age >= 0) began = frame;
    }
    assert.ok(firstInside > 0 && began > firstInside);
    const exposure = (began - firstInside + 1) / fps;
    assert.ok(exposure >= .4 - 1e-9 && exposure <= .4 + 1 / fps + 1e-9);
    assert.equal(state.age, 0); assert.equal(state.phase, 0); assert.equal(state.completed, false);
  }
});

check('a stationary spawn or a long stationary mount cannot create an arrival', () => {
  for (const actor of [{ x: -80, y: 8220 }, { x: door.x, y: door.y }]) {
    const state = hold(createMoonClearing(actor), 30);
    assert.equal(state.age, -1); assert.equal(state.phase, 0); assert.equal(state.armed, false); assert.equal(state.approach, 0);
  }
});

check('a map jump clears approach evidence and waiting does not substitute for a real step', () => {
  const target = { x: -80, y: 8220 };
  let state = advanceMoonClearing(createMoonClearing({ x: 1000, y: 6800 }), target, 1 / 60);
  state = hold(state, 30);
  assert.equal(state.armed, false); assert.equal(state.age, -1);
  state = advanceMoonClearing(state, { x: target.x + 2, y: target.y }, 1 / 60);
  state = hold(state, .5);
  assert.ok(state.age >= 0 && state.phase > 0, 'a subsequent real approach may start the scene');
});

check('leaving during a partial approach resets its dwell exposure', () => {
  let state = createMoonClearing({ x: -80, y: 7711 });
  for (let i = 0; i < 10; i++) state = advanceMoonClearing(state, { x: -80, y: 7711 + i }, 1 / 60);
  assert.ok(state.approach > 0 && state.age < 0);
  state = advanceMoonClearing(state, { x: -80, y: 7705 }, 1 / 60);
  assert.equal(state.approach, 0); assert.equal(state.age, -1);
  const back = advanceMoonClearing(state, { x: -80, y: 7712 }, 1 / 60);
  near(back.approach, 1 / 60); assert.equal(back.age, -1);
});

check('one cloud crossing finishes in 2.4 seconds with bounded monotonic phase', () => {
  for (const fps of [30, 60, 120]) {
    let previous = begin(fps), finishedAt = null, elapsed = 0;
    const state = hold(previous, 3, fps, false, next => {
      elapsed += 1 / fps;
      assert.ok(next.age >= previous.age && next.phase >= previous.phase);
      assert.ok(next.phase >= 0 && next.phase <= 1);
      assert.ok(next.phase - previous.phase < .023, 'the clearing cannot flash between frames');
      if (next.completed && finishedAt === null) finishedAt = elapsed;
      previous = next;
    });
    assert.ok(finishedAt >= 2.4 - 1e-8 && finishedAt <= 2.4 + 1 / fps + 1e-8);
    assert.equal(state.age, 2.4); assert.equal(state.phase, 1); assert.equal(state.completed, true);
  }
});

check('a completed clearing persists across map travel, revisits and remembered reconstruction', () => {
  let state = hold(begin(), 3);
  for (const actor of [{ x: 0, y: 0 }, { x: -80, y: 8220 }, { x: 900, y: 2100 }, { x: door.x, y: door.y }]) {
    state = advanceMoonClearing(state, actor, 1 / 60);
    state = hold(state, 5);
    assert.equal(state.phase, 1); assert.equal(state.age, 2.4); assert.equal(state.completed, true);
  }
  const remembered = createMoonClearing({ x: -80, y: 8220 }, true);
  assert.equal(remembered.phase, 1); assert.equal(remembered.age, 2.4); assert.equal(remembered.completed, true);
  assert.equal(hold(remembered, 20).phase, 1);
});

check('reading and static pauses return the same state reference at every stage', () => {
  for (const state of [createMoonClearing({ x: -80, y: 8220 }), begin(), hold(begin(), 1.2), hold(begin(), 3)]) {
    const before = structuredClone(state);
    const paused = advanceMoonClearing(state, { x: 900, y: 2100 }, 5, true);
    assert.equal(paused, state); assert.deepEqual(paused, before);
    assert.equal(hold(state, 15, 60, true), state);
    assert.deepEqual(inspectMoonClearing(paused), inspectMoonClearing(state));
  }
});

check('a suspended frame rebases input without fast-forwarding the reveal', () => {
  const state = hold(begin(), 1.1), suspended = advanceMoonClearing(state, { x: state.actor.x + 3, y: state.actor.y }, 8);
  assert.equal(suspended.age, state.age); assert.equal(suspended.phase, state.phase);
  assert.equal(suspended.armed, false); assert.equal(suspended.approach, 0);
  assert.equal(distance(suspended.actor, state.actor), 3);
  const next = advanceMoonClearing(suspended, suspended.actor, 1 / 60);
  near(next.age - suspended.age, 1 / 60);
});

check('small static-mode movement cannot start a new clearing on renderer remount', () => {
  let state = createMoonClearing({ x: -80, y: 8220 });
  state = advanceMoonClearing(state, { x: -78, y: 8220 }, 1 / 60);
  state = hold(state, .15);
  assert.ok(state.armed && state.approach > 0 && state.age < 0);
  const restored = resumeMoonClearing(state, { x: -60, y: 8220 });
  assert.equal(restored.armed, false); assert.equal(restored.approach, 0); assert.equal(restored.age, -1);
  const waited = hold(restored, 20);
  assert.equal(waited.age, -1); assert.equal(waited.phase, 0);
  const stepped = advanceMoonClearing(waited, { x: -58, y: 8220 }, 1 / 60);
  assert.ok(hold(stepped, .5).age >= 0, 'a new walking gesture still starts the scene');
});

check('static remount preserves an active or completed cloud crossing and resumes it once', () => {
  for (const state of [hold(begin(), 1.1), hold(begin(), 3)]) {
    for (const actor of [state.actor, { x: state.actor.x + 20, y: state.actor.y }]) {
      const restored = resumeMoonClearing(state, actor);
      assert.equal(restored.age, state.age); assert.equal(restored.phase, state.phase); assert.equal(restored.completed, state.completed);
      const next = advanceMoonClearing(restored, actor, 1 / 60);
      near(next.age, Math.min(2.4, state.age + 1 / 60));
      const end = hold(next, 3);
      assert.equal(end.age, 2.4); assert.equal(end.phase, 1); assert.equal(end.completed, true);
    }
  }
});

check('invalid time and input samples cannot poison or advance arrival state', () => {
  const state = hold(begin(), .8);
  for (const delta of [0, -1, NaN, Infinity, -Infinity]) assert.equal(advanceMoonClearing(state, state.actor, delta), state);
  for (const actor of [{ x: NaN, y: 0 }, { x: 0, y: Infinity }, { x: -Infinity, y: 8000 }]) assert.equal(advanceMoonClearing(state, actor, 1 / 60), state);
});

check('30, 60 and 120 FPS produce the same reveal at the same elapsed time', () => {
  for (const seconds of [.2, .6, 1.2, 1.8, 2.4, 3]) {
    const states = [30, 60, 120].map(fps => hold(begin(fps), seconds, fps));
    for (const state of states) { near(state.age, states[1].age); near(state.phase, states[1].phase); }
  }
});

check('the finite light field leaves every earlier region unchanged', () => {
  for (const region of regions.filter(region => region.id !== 'moon')) for (const phase of [0, .5, 1]) {
    assert.deepEqual(moonClearingField(region.x, region.y, phase), { coverage: 0, light: 0, shadow: 0 }, region.id);
    for (const kind of ['door', 'bird', 'floof']) assert.deepEqual(moonObjectTint(region.x, region.y, phase, kind), [1, 1, 1]);
  }
  for (const [x, y] of [[-200, 7269], [-200, 9651], [-1641, 8460], [1241, 8460], [1e12, -1e12]]) {
    assert.deepEqual(moonClearingField(x, y, 1), { coverage: 0, light: 0, shadow: 0 });
  }
});

check('arrival field remains available while the accepted meadow keeps original sprite colours', () => {
  for (const actor of [{ x: door.x, y: door.y }, { x: -80, y: 8000 }, { x: -200, y: 8290 }]) {
    const covered = moonClearingField(actor.x, actor.y, 0), clear = moonClearingField(actor.x, actor.y, 1);
    assert.ok(covered.coverage > .95); assert.equal(covered.coverage, clear.coverage);
    assert.ok(covered.shadow > .95 && clear.shadow < .01);
    assert.ok(clear.light - covered.light > .9);
    for (const kind of ['door', 'bird', 'floof']) for (const phase of [0, .5, 1]) {
      assert.deepEqual(moonObjectTint(actor.x, actor.y, phase, kind), [1, 1, 1]);
    }
  }
});

check('field samples and sprite tints stay finite and bounded across the full clearing', () => {
  for (let y = 7100; y <= 9900; y += 140) for (let x = -1800; x <= 1400; x += 160) for (const phase of [-1, 0, .25, .5, .75, 1, 2]) {
    const field = moonClearingField(x, y, phase);
    assert.ok(Object.values(field).every(value => Number.isFinite(value) && value >= 0 && value <= 1));
    assert.ok(field.light <= field.coverage + 1e-9 && field.shadow <= field.coverage + 1e-9);
    for (const kind of ['door', 'bird', 'floof']) assert.ok(moonObjectTint(x, y, phase, kind).every(value => Number.isFinite(value) && value >= 0 && value <= 1));
  }
});

check('non-finite field inputs have a neutral finite fallback', () => {
  for (const [x, y] of [[NaN, 8500], [-200, NaN], [Infinity, 8500], [-200, -Infinity]]) {
    assert.deepEqual(moonClearingField(x, y, .5), { coverage: 0, light: 0, shadow: 0 });
    assert.deepEqual(moonObjectTint(x, y, .5, 'door'), [1, 1, 1]);
  }
  for (const phase of [NaN, Infinity, -Infinity]) assert.deepEqual(moonClearingField(door.x, door.y, phase), moonClearingField(door.x, door.y, 0));
});

console.log(`${checks - failures}/${checks} moon-clearing checks passed.`);
if (failures) process.exitCode = 1;
