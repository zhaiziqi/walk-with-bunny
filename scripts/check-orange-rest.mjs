import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';
registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/src/') ? `${specifier}.ts` : specifier, context);
} });
const { orangeRest, createOrangeRest, requestOrangeSip, advanceOrangeRest, orangeRestPose,
  orangeRestVertex, orangeSipAvailable, inspectOrangeRest } = await import('../src/scene/orangeRest.ts');
const spot = { ...orangeRest.drinkSpot };
let checks = 0, failures = 0;
function check(name, fn) { checks++; try { fn(); console.log(`PASS: ${name}`); } catch (error) { failures++; console.error(`FAIL: ${name}\n${error.stack}`); } }
function frames(state, seconds, { actor = spot, fps = 60, ...options } = {}) {
  const count = Math.ceil(seconds * fps), dt = seconds / count;
  for (let i = 0; i < count; i++) state = advanceOrangeRest(state, actor, dt, options);
  return state;
}

check('walking past and waiting cannot drink automatically', () => {
  const initial = createOrangeRest(), state = frames(initial, 30);
  assert.equal(state.liquid, .82); assert.equal(state.phase, 'idle'); assert.equal(state.requestCount, 0);
});
check('remote, invalid and duplicate requests cannot start extra gestures', () => {
  const initial = createOrangeRest();
  for (const actor of [{ x: 0, y: -1800 }, { x: NaN, y: 0 }]) {
    assert.equal(orangeSipAvailable(actor), false); assert.equal(requestOrangeSip(initial, actor), initial);
  }
  const active = requestOrangeSip(initial, spot);
  assert.equal(requestOrangeSip(active, spot), active); assert.equal(active.requestCount, 1);
});
check('the glass stays full through the approach then visibly lowers during the sip', () => {
  const start = requestOrangeSip(createOrangeRest(), spot);
  const approach = frames(start, .4), sipping = frames(approach, .65);
  assert.equal(approach.liquid, .82); assert.equal(approach.phase, 'lean');
  assert.equal(sipping.phase, 'sip'); assert.ok(sipping.liquid < .72 && sipping.liquid > .56);
  const settled = frames(sipping, 2);
  assert.equal(settled.phase, 'idle'); assert.equal(settled.liquid, .56); assert.equal(settled.completed, true);
  assert.equal(orangeRestPose(settled).amount, 0); assert.equal(settled.origin, null);
});
check('a sip neither moves its actor nor its planted body foot', () => {
  let state = requestOrangeSip(createOrangeRest(), spot);
  for (let i = 0; i < 160; i++) {
    state = advanceOrangeRest(state, spot, 1 / 60);
    assert.deepEqual(state.actor, spot);
    const pose = orangeRestPose(state);
    assert.ok(Math.hypot(pose.leanX, pose.leanY) <= 28.00001);
    assert.deepEqual(orangeRestVertex(0, 0, pose), { x: 0, y: 0 });
    assert.equal(orangeRestVertex(.4, 0, pose).x, .4);
  }
});
check('reading and renderer switches preserve the exact partial sip', () => {
  const active = frames(requestOrangeSip(createOrangeRest(), spot), 1);
  assert.equal(advanceOrangeRest(active, { x: 10000, y: 10000 }, 10, { paused: true }), active);
  const saved = structuredClone(active);
  assert.deepEqual(inspectOrangeRest(saved), inspectOrangeRest(active));
  assert.deepEqual(inspectOrangeRest(frames(saved, 2)), inspectOrangeRest(frames(active, 2)));
});
check('walking away eases the pose back and preserves the amount already drunk', () => {
  const active = frames(requestOrangeSip(createOrangeRest(), spot), 1);
  const moved = { x: spot.x - 30, y: spot.y };
  const cancel = advanceOrangeRest(active, moved, 1 / 60, { speed: 180 });
  assert.equal(cancel.phase, 'cancel'); assert.equal(cancel.amount, active.amount);
  const halfway = frames(cancel, .15, { actor: moved });
  assert.ok(halfway.amount > 0 && halfway.amount < cancel.amount);
  const ended = frames(halfway, .4, { actor: moved });
  assert.equal(ended.phase, 'idle'); assert.equal(ended.amount, 0); assert.equal(ended.liquid, active.liquid);
  assert.equal(ended.completed, false);
  assert.equal(frames(requestOrangeSip(ended, spot), 3).liquid, .56);
});
check('a map relocation does not teleport back or create an extra sip', () => {
  const active = frames(requestOrangeSip(createOrangeRest(), spot), .8);
  const destination = { x: -200, y: 8500 };
  const relocated = frames(active, 1, { actor: destination });
  assert.equal(relocated.phase, 'idle'); assert.deepEqual(relocated.actor, destination);
  assert.equal(relocated.requestCount, 1); assert.equal(relocated.liquid, active.liquid);
});
check('repeat interaction replays the gesture without draining or refilling', () => {
  const completed = frames(requestOrangeSip(createOrangeRest(), spot), 3);
  let replay = requestOrangeSip(completed, spot);
  for (let i = 0; i < 180; i++) {
    replay = advanceOrangeRest(replay, spot, 1 / 60); assert.equal(replay.liquid, .56);
  }
  assert.equal(replay.requestCount, 2); assert.equal(replay.phase, 'idle');
});
check('reduced motion gives the same completed glass with no body animation', () => {
  const reduced = requestOrangeSip(createOrangeRest(), spot, true);
  assert.equal(reduced.phase, 'idle'); assert.equal(reduced.completed, true); assert.equal(reduced.liquid, .56);
  assert.equal(reduced.amount, 0); assert.equal(reduced.origin, null);
});
check('background and invalid frames cannot fast-forward a sip', () => {
  const active = frames(requestOrangeSip(createOrangeRest(), spot), .7);
  for (const dt of [0, -1, NaN, Infinity, 5]) assert.equal(advanceOrangeRest(active, spot, dt), active);
  assert.equal(advanceOrangeRest(active, { x: NaN, y: 0 }, .016), active);
});
check('30, 60 and 120 Hz have identical sip timing and final glass', () => {
  const results = [30, 60, 120].map(fps => frames(requestOrangeSip(createOrangeRest(), spot), 1.1, { fps }));
  for (const state of results) {
    assert.ok(Math.abs(state.liquid - results[1].liquid) < .000001);
    assert.ok(Math.abs(state.amount - results[1].amount) < .000001);
  }
  for (const fps of [30, 60, 120]) {
    const end = frames(requestOrangeSip(createOrangeRest(), spot), 3, { fps });
    assert.equal(end.liquid, .56); assert.equal(end.phase, 'idle'); assert.equal(end.completed, true);
  }
});
console.log(`\n${checks - failures}/${checks} orange rest checks passed.`);
if (failures) process.exitCode = 1;
