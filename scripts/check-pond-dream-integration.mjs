import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';

registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/src/')
    ? `${specifier}.ts` : specifier, context);
} });
const { createPondListening, advancePondListening, resumePondListening, inspectPondListening, pondRipplePose } = await import('../src/scene/pondListening.ts');
const { createPondDream, advancePondDream, DREAM_TRAIL_LIMIT, DREAM_TRAIL_LIFETIME } = await import('../src/scene/pondDream.ts');
const { pondFootprint } = await import('../src/scene/orchardPond.ts');
const centre = { x: pondFootprint.x, y: pondFootprint.y };
const bank = angle => ({ x: centre.x + 420 * Math.cos(angle), y: centre.y + 290 * Math.sin(angle) });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
let checks = 0, failures = 0;
function check(name, run) {
  checks++;
  try { run(); console.log(`PASS: ${name}`); }
  catch (error) { failures++; console.error(`FAIL: ${name}\n${error.stack}`); }
}
function hold(state, seconds, options = {}) {
  const frames = Math.ceil(seconds * 60), dt = seconds / frames;
  for (let frame = 0; frame < frames; frame++) state = advancePondListening(state, state.actor, dt, options);
  return state;
}
function walk(state, destination, observe) {
  const start = { ...state.actor }, length = distance(start, destination), speed = 190;
  const frames = Math.max(1, Math.ceil(length / speed * 60)), dt = length / speed / frames || 1 / 60;
  for (let frame = 1; frame <= frames; frame++) {
    const p = frame / frames, actor = { x: start.x + (destination.x - start.x) * p, y: start.y + (destination.y - start.y) * p };
    state = advancePondListening(state, actor, dt, { speed });
    observe?.(state, actor, dt, { speed });
  }
  return state;
}
function approach(angle = -Math.PI / 2) {
  const end = bank(angle), start = { x: end.x + 380 * Math.cos(angle), y: end.y + 380 * Math.sin(angle) };
  return walk(createPondListening(start), end);
}
function shoreWalk(state, startAngle, endAngle, seconds = 4, observe) {
  const frames = Math.ceil(seconds * 60), dt = seconds / frames;
  for (let frame = 1; frame <= frames; frame++) {
    const actor = bank(startAngle + (endAngle - startAngle) * frame / frames);
    state = advancePondListening(state, actor, dt);
    observe?.(state, actor, dt);
  }
  return state;
}

check('a remembered visit or stationary mount never invents a new water encounter', () => {
  for (const discovered of [false, true]) {
    const state = hold(createPondListening(bank(0), discovered), 20, { speed: 200 });
    assert.equal(state.discovered, discovered);
    assert.equal(state.serial, 0);
    assert.equal(state.dream.engaged, false);
    assert.equal(state.dream.presence, 0);
    assert.equal(state.dream.trail.length, 0);
  }
});

check('real approach discovers the pond, starts its reflection, and retains waves and petals', () => {
  const state = approach();
  assert.ok(state.discovered && state.engaged && state.serial > 0);
  assert.ok(state.dream.engaged && state.dream.presence > .3);
  assert.equal(state.ripples.length, 4);
  assert.equal(state.petals.length, 3);
  assert.ok(state.ripples.some(ripple => pondRipplePose(ripple).opacity > 0));
  assert.deepEqual(state.dream.actor, state.actor);
  const stopped = hold(state, 3);
  assert.equal(stopped.serial, state.serial, 'reflection coasting must not launch more shoreline waves');
  assert.ok(distance(stopped.dream.reflection, state.dream.reflection) > 40, 'the independent response must be visible');
  assert.ok(stopped.dream.trail.length > 0, 'coasting paints the underwater reveal');
});

check('the outer pond forwards the actual approach, turn, reversal and stop to the dream model', () => {
  const start = { x: centre.x, y: centre.y - 670 };
  let direct = createPondDream(start), state = createPondListening(start);
  const observe = (current, actor, delta, options) => {
    direct = advancePondDream(direct, actor, delta, options);
    assert.deepEqual(current.dream, direct);
    assert.deepEqual(current.actor, actor, 'the pond response cannot move the player');
  };
  state = walk(state, bank(-Math.PI / 2), observe);
  state = shoreWalk(state, -Math.PI / 2, -.2, 4, observe);
  state = shoreWalk(state, -.2, -1.4, 4, observe);
  for (let frame = 0; frame < 180; frame++) {
    state = advancePondListening(state, state.actor, 1 / 60);
    observe(state, state.actor, 1 / 60);
  }
  assert.ok(state.dream.presence > .9 && state.dream.trail.length > 0);
});

check('reading freezes the full composite encounter without consuming incoming movement', () => {
  const state = shoreWalk(approach(), -Math.PI / 2, -.4), snapshot = structuredClone(state);
  for (let frame = 0; frame < 600; frame++) {
    assert.equal(advancePondListening(state, bank(2), 1 / 60, { paused: true, speed: 190 }), state);
  }
  assert.deepEqual(state, snapshot);
  assert.ok(state.dream.trail.length > 0, 'this test must freeze an active reveal, not an empty state');
});

check('renderer handoff preserves the active picture and resumes without replaying discovery', () => {
  const state = hold(approach(), .8), snapshot = structuredClone(state);
  const resumed = resumePondListening(state, state.actor);
  assert.deepEqual(resumed.dream, state.dream);
  assert.deepEqual(resumed.ripples, state.ripples);
  assert.deepEqual(resumed.petals, state.petals);
  assert.equal(resumed.discovered, state.discovered);
  assert.equal(resumed.serial, state.serial);
  const later = hold(resumed, 2);
  assert.ok(later.dream.time > state.dream.time);
  assert.equal(later.serial, state.serial);
  assert.deepEqual(state, snapshot, 'continuing in another renderer must not mutate the saved snapshot');
});

check('map relocation resets only the dream engagement and cannot fabricate a wake on arrival', () => {
  const original = shoreWalk(approach(), -Math.PI / 2, -.4);
  for (const relocate of [
    state => advancePondListening(state, bank(Math.PI), 1 / 60, { speed: 190 }),
    state => resumePondListening(state, bank(Math.PI)),
  ]) {
    const jumped = relocate(original);
    assert.equal(jumped.discovered, true);
    assert.equal(jumped.serial, original.serial);
    assert.equal(jumped.dream.presence, 0);
    assert.equal(jumped.dream.trail.length, 0);
    assert.equal(jumped.dream.engaged, false);
    const still = hold(jumped, 12);
    assert.equal(still.serial, original.serial);
    assert.equal(still.dream.engaged, false);
    assert.equal(still.dream.trail.length, 0);
    const moved = walk(still, { x: still.actor.x + 20, y: still.actor.y });
    assert.ok(moved.dream.engaged && moved.serial > still.serial);
  }
});

check('a suspended browser frame rebases input without ageing or skipping the water response', () => {
  const state = hold(approach(), .5), actor = { x: state.actor.x + 4, y: state.actor.y };
  const stalled = advancePondListening(state, actor, 5);
  assert.equal(stalled.time, state.time);
  assert.deepEqual(stalled.dream, { ...state.dream, actor });
  assert.deepEqual(stalled.ripples, state.ripples);
  assert.deepEqual(stalled.petals, state.petals);
  assert.equal(stalled.serial, state.serial);
  const next = advancePondListening(stalled, actor, 1 / 60);
  assert.equal(next.serial, state.serial);
  assert.ok(distance(next.dream.reflection, stalled.dream.reflection) < 8);
});

check('departure clears the reveal and returning works again without altering discovery history', () => {
  let state = hold(approach(), 1), serial = state.serial;
  state = hold(walk(state, { x: centre.x, y: centre.y - 900 }), DREAM_TRAIL_LIFETIME + 2);
  assert.equal(state.discovered, true);
  assert.equal(state.dream.presence, 0);
  assert.equal(state.dream.trail.length, 0);
  assert.ok(state.ripples.every(ripple => pondRipplePose(ripple).opacity === 0));
  state = hold(walk(state, bank(-Math.PI / 2)), 2);
  assert.ok(state.dream.engaged && state.dream.presence > .9 && state.dream.trail.length > 0);
  assert.ok(state.serial > serial);
});

check('prolonged real shoreline play keeps finite bounded water state', () => {
  let state = approach();
  state = shoreWalk(state, -Math.PI / 2, Math.PI * 24 - Math.PI / 2, 240, current => {
    assert.ok(current.dream.history.length <= 36);
    assert.ok(current.dream.trail.length <= DREAM_TRAIL_LIMIT);
    assert.ok(current.dream.trail.every(point => point.age < DREAM_TRAIL_LIFETIME));
    assert.equal(current.ripples.length, 4);
    assert.equal(current.petals.length, 3);
    for (const point of [current.dream.reflection, current.dream.target, ...current.dream.trail]) {
      assert.ok(Object.values(point).every(Number.isFinite));
    }
    const normalized = Math.hypot((current.dream.reflection.x - centre.x) / 380, (current.dream.reflection.y - centre.y) / 250);
    assert.ok(normalized <= .620001, 'the independent reflection stays inside the painted water');
  });
  assert.ok(state.serial > 20 && state.dream.trail.length > 0);
});

check('inspection is read-only and cannot mutate the active dream or reveal trail', () => {
  const state = hold(approach(), 2), snapshot = structuredClone(state), inspected = inspectPondListening(state);
  assert.ok(inspected.dream.trail.length > 0);
  inspected.dream.reflection.x = 0;
  inspected.dream.trail[0].x = 0;
  inspected.dream.trail.length = 0;
  assert.deepEqual(state, snapshot);
});

console.log(`\n${checks - failures}/${checks} pond-dream integration checks passed.`);
process.exitCode = failures ? 1 : 0;
