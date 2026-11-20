import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';
registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/src/')
    ? `${specifier}.ts` : specifier, context);
} });
const { createPondListening, advancePondListening, resumePondListening, pondPetalPose, pondRipplePose, pondShoreContact } = await import('../src/scene/pondListening.ts');
const { pondFootprint, pondDriftPetals } = await import('../src/scene/orchardPond.ts');
const centre = { x: pondFootprint.x, y: pondFootprint.y };
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const waterNorm = p => ((p.x - centre.x) / 380) ** 2 + ((p.y - centre.y) / 250) ** 2;
const bank = angle => ({ x: centre.x + Math.cos(angle) * 420, y: centre.y + Math.sin(angle) * 290 });
let checks = 0, failures = 0;
const check = (name, run) => {
  checks++;
  try { run(); console.log(`PASS: ${name}`); }
  catch (error) { failures++; console.error(`FAIL: ${name}\n${error.stack}`); }
};
function hold(state, seconds, { fps = 60, actor = state.actor, observe, ...options } = {}) {
  const frames = Math.ceil(seconds * fps), dt = seconds / frames;
  for (let frame = 0; frame < frames; frame++) {
    const current = typeof actor === 'function' ? actor(frame, dt) : actor;
    state = advancePondListening(state, current, dt, options);
    observe?.(state, frame, dt);
  }
  return state;
}
function walk(state, destination, { fps = 60, speed = 190, observe } = {}) {
  const origin = { ...state.actor }, length = distance(origin, destination);
  if (!length) return state;
  const frames = Math.ceil(length / speed * fps), dt = length / speed / frames;
  for (let frame = 1; frame <= frames; frame++) {
    const t = frame / frames;
    state = advancePondListening(state, { x: origin.x + (destination.x - origin.x) * t, y: origin.y + (destination.y - origin.y) * t }, dt, { speed });
    observe?.(state, frame, dt);
  }
  return state;
}
function approach(angle = -Math.PI / 2, fps = 60) {
  const destination = bank(angle);
  return walk(createPondListening({ x: destination.x + Math.cos(angle) * 380, y: destination.y + Math.sin(angle) * 380 }), destination, { fps });
}
function shoreWalk(state, from, to, seconds = 6, { fps = 60, observe } = {}) {
  const frames = Math.ceil(seconds * fps), dt = seconds / frames;
  for (let frame = 1; frame <= frames; frame++) {
    const angle = from + (to - from) * frame / frames;
    state = advancePondListening(state, bank(angle), dt);
    observe?.(state, frame, dt);
  }
  return state;
}

check('all four banks respond at the local shore instead of the centre or a fixed corner', () => {
  for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const state = approach(angle), local = pondShoreContact(bank(angle));
    assert.ok(state.engaged && state.discovered && state.serial > 0);
    const active = state.ripples.filter(ripple => ripple.strength > 0);
    assert.ok(active.every(ripple => distance(ripple, local) < .01));
    assert.ok(distance(local, centre) >= 200);
    assert.ok(waterNorm(local) < .68 && waterNorm(local) > .67);
    assert.ok(Math.abs(local.distance - 40) < .001);
  }
});

check('oblique shore contacts are nearest ellipse points rather than radial shortcuts', () => {
  for (const actor of [{ x: -700, y: 3550 }, { x: -1800, y: 2800 }, { x: 100000, y: 100000 }]) {
    const contact = pondShoreContact(actor), point = { x: contact.bankX, y: contact.bankY };
    assert.ok(Math.abs(waterNorm(point) - 1) < 1e-6);
    const nx = (point.x - centre.x) / (380 * 380), ny = (point.y - centre.y) / (250 * 250);
    const dx = actor.x - point.x, dy = actor.y - point.y;
    assert.ok(Math.abs(dx * ny - dy * nx) / Math.max(1, Math.hypot(dx, dy)) < 1e-7, 'shore normal must point toward the visitor');
  }
  assert.ok(Object.values(pondShoreContact(centre)).every(Number.isFinite));
});

check('a stationary mount or map jump cannot create discovery or a ripple', () => {
  const still = hold(createPondListening(bank(0)), 30);
  assert.ok(!still.engaged && !still.discovered);
  assert.equal(still.serial, 0);
  let jumped = advancePondListening(createPondListening({ x: 900, y: 2100 }), bank(0), 1 / 60, { speed: 200 });
  jumped = hold(jumped, 30);
  assert.ok(!jumped.engaged && !jumped.discovered);
  assert.equal(jumped.serial, 0);
  const moved = advancePondListening(jumped, { x: jumped.actor.x + 2, y: jumped.actor.y }, 1 / 60, { speed: 120 });
  assert.ok(moved.engaged && moved.discovered && moved.serial === 1);
});

check('following the shore moves new ripple origins while old waves remain anchored', () => {
  let state = approach(-Math.PI / 2), previous = state, emitted = [];
  state = shoreWalk(state, -Math.PI / 2, Math.PI / 2, 9, { observe(current) {
    current.ripples.forEach((ripple, index) => {
      if (ripple.age < previous.ripples[index].age) {
        emitted.push({ ...ripple });
        assert.ok(distance(ripple, pondShoreContact(current.actor)) < .001);
      } else {
        assert.equal(ripple.x, previous.ripples[index].x);
        assert.equal(ripple.y, previous.ripples[index].y);
      }
    }); previous = current;
  } });
  assert.ok(emitted.length >= 5);
  assert.ok(Math.min(...emitted.map(p => p.y)) < 3050);
  assert.ok(Math.max(...emitted.map(p => p.y)) > 3330);
  assert.ok(emitted.every(p => waterNorm(p) < .68));
});

check('rings stay sparse and finite even during quick repeated shoreline travel', () => {
  let state = approach(0), previous = state, emissions = [];
  state = shoreWalk(state, 0, Math.PI * 6, 18, { observe(current) {
    assert.equal(current.ripples.length, 4);
    current.ripples.forEach((ripple, index) => {
      if (ripple.age < previous.ripples[index].age) {
        assert.ok(pondRipplePose(previous.ripples[index]).opacity < 1e-6, 'visible wave cannot be overwritten');
        emissions.push(current.time);
      }
      const pose = pondRipplePose(ripple);
      assert.ok(pose.opacity >= 0 && pose.opacity <= .4);
    }); previous = current;
  } });
  assert.ok(emissions.length >= 8);
  for (let i = 1; i < emissions.length; i++) assert.ok(emissions[i] - emissions[i - 1] >= .69);
  const settled = hold(state, 7);
  assert.ok(settled.ripples.every(ripple => pondRipplePose(ripple).opacity === 0));
});

check('a quiet pause settles water and petals without repeatedly launching ripples', () => {
  const arrival = approach(), serial = arrival.serial;
  assert.ok(arrival.calm < .4);
  const short = hold(arrival, 1.5), settled = hold(short, 8);
  assert.equal(short.serial, serial); assert.equal(settled.serial, serial);
  assert.ok(short.calm < .7, 'reflection must clarify gradually');
  assert.ok(settled.calm > .99 && settled.quiet > 7);
  assert.ok(settled.ripples.every(ripple => pondRipplePose(ripple).opacity === 0));
  assert.ok(settled.petals.every(petal => Math.hypot(petal.x, petal.y) < .02));
  const long = hold(settled, 50);
  assert.equal(long.serial, serial);
});

check('small stopped-position corrections retain stillness rather than turning into a cursor trail', () => {
  const state = hold(approach(), 6), origin = { ...state.actor };
  const jittered = hold(state, 45, { actor: frame => ({ x: origin.x + Math.sin(frame * .4) * .05, y: origin.y + Math.cos(frame * .3) * .05 }) });
  assert.equal(jittered.serial, state.serial);
  assert.ok(jittered.quiet > 10 && jittered.calm > .99);
});

check('reflection presence fades continuously and is independent of the business state', () => {
  const arrival = approach();
  assert.ok(arrival.presence > .25 && arrival.presence < 1);
  let state = hold(arrival, 5), previousPresence = state.presence;
  assert.ok(state.presence > .99);
  state = walk(state, { x: 900, y: 2100 }, { observe(current, _frame, dt) {
    assert.ok(Math.abs(current.presence - previousPresence) / dt < 2.1);
    assert.ok(current.presence >= 0 && current.presence <= 1);
    previousPresence = current.presence;
  } });
  assert.ok(hold(state, 8).presence < .001);
});

check('nearby petals yield locally, remain inside the water, and move continuously', () => {
  let state = approach(-Math.PI / 2), previous = pondDriftPetals.map((_, index) => pondPetalPose(state, index, state.time, .5));
  let maximumOffset = 0;
  state = shoreWalk(state, -Math.PI / 2, Math.PI * 1.5, 14, { observe(current, _frame, dt) {
    const poses = pondDriftPetals.map((_, index) => pondPetalPose(current, index, current.time, .5));
    poses.forEach((pose, index) => {
      assert.ok(waterNorm(pose) < .85);
      assert.ok(distance(pose, previous[index]) / dt < 70);
      assert.ok(distance(pose, pondDriftPetals[index]) < 34);
      maximumOffset = Math.max(maximumOffset, distance(pose, pondDriftPetals[index]));
    }); previous = poses;
  } });
  assert.ok(maximumOffset > 7 && maximumOffset < 34);
  assert.equal(state.petals.length, 3);
});

check('leaving settles off screen and a real return responds at the new bank', () => {
  let state = approach(0);
  state = walk(state, { x: 900, y: 2100 });
  state = hold(state, 10);
  const previousSerial = state.serial;
  assert.ok(!state.engaged && state.calm > .99);
  assert.ok(state.ripples.every(ripple => pondRipplePose(ripple).opacity === 0));
  state = walk(state, { x: -1800, y: 2800 });
  state = walk(state, bank(Math.PI));
  assert.ok(state.engaged && state.serial > previousSerial);
  const newest = [...state.ripples].sort((a, b) => a.age - b.age)[0];
  assert.ok(newest.x < centre.x - 270);
});

check('reading freezes every field and does not consume incoming movement', () => {
  const state = approach(), snapshot = structuredClone(state);
  for (let i = 0; i < 600; i++) assert.equal(advancePondListening(state, { x: 800, y: 500 }, 1 / 60, { paused: true, speed: 200 }), state);
  assert.deepEqual(state, snapshot);
});

check('long frames preserve an ongoing response without skipping its lifetime', () => {
  const state = approach(), actor = { x: state.actor.x + 4, y: state.actor.y };
  const stalled = advancePondListening(state, actor, 2);
  assert.deepEqual(stalled.ripples, state.ripples);
  assert.deepEqual(stalled.petals, state.petals);
  assert.equal(stalled.time, state.time);
  assert.equal(stalled.engaged, state.engaged);
  assert.deepEqual(stalled.actor, actor);
  assert.equal(stalled.serial, state.serial);
});

check('renderer switching preserves the snapshot and cannot replay a greeting while stationary', () => {
  const state = hold(approach(), 2), before = structuredClone(state);
  const resumed = resumePondListening(state, state.actor);
  assert.deepEqual(resumed.ripples, state.ripples); assert.deepEqual(resumed.petals, state.petals);
  assert.deepEqual(resumed.source, state.source); assert.equal(resumed.calm, state.calm);
  assert.equal(resumed.presence, state.presence);
  assert.equal(resumed.quiet, state.quiet); assert.equal(resumed.engaged, state.engaged);
  assert.equal(resumed.discovered, state.discovered); assert.equal(resumed.serial, state.serial);
  const later = hold(resumed, 20);
  assert.equal(later.serial, state.serial);
  assert.ok(later.engaged && later.discovered && later.calm > .99 && later.presence > .99);
  const relocated = resumePondListening(state, { x: 900, y: 2100 });
  assert.ok(!relocated.engaged && relocated.quiet === 0 && relocated.travel === 0);
  assert.equal(hold(relocated, 10).serial, state.serial);
  pondDriftPetals.forEach((_, index) => assert.deepEqual(pondPetalPose(state, index, 0, 0), pondPetalPose(resumed, index, 0, 0)));
  assert.deepEqual(state, before);
});

check('30, 60 and 120 FPS produce the same spatial encounter and comparable timing', () => {
  const states = [30, 60, 120].map(fps => {
    const arrival = approach(-Math.PI / 2, fps);
    return hold(shoreWalk(arrival, -Math.PI / 2, 0, 5, { fps }), 2.5, { fps });
  });
  const reference = states[1];
  for (const state of states) {
    assert.equal(state.discovered, reference.discovered);
    assert.ok(Math.abs(state.serial - reference.serial) <= 1);
    assert.ok(distance(state.source, reference.source) < 1);
    assert.ok(Math.abs(state.calm - reference.calm) < .025);
    state.petals.forEach((petal, index) => assert.ok(distance(petal, reference.petals[index]) < .4));
  }
});

check('a stopped visitor waits for the visible wave to reach a petal before it moves', () => {
  const actor = bank(0);
  let state = advancePondListening(createPondListening(actor), { x: actor.x - 2, y: actor.y }, 1 / 60, { speed: 120 });
  const serial = state.serial, origin = { ...state.ripples[0] }, target = pondDriftPetals[1];
  let hitAt = null, peakOffset = 0, peakTurn = 0, peakLift = 0, before = state;
  state = hold(state, 6, { speed: 0, observe(current) {
    const wave = pondRipplePose(current.ripples[0]);
    const reached = Math.hypot((target.x - origin.x) / wave.radiusX, (target.y - origin.y) / wave.radiusY) <= 1;
    const petal = current.petals[1];
    if (!reached) {
      assert.equal(petal.x, 0); assert.equal(petal.y, 0);
      assert.equal(petal.rotation, 0); assert.equal(petal.lift, 0);
    }
    if (hitAt === null && (current.ripples[0].touched & 2)) {
      hitAt = current.time;
      assert.ok(reached, 'the visual wave must arrive before the push');
      assert.ok(before.petals[1].vx === 0 && before.petals[1].vy === 0);
    }
    peakOffset = Math.max(peakOffset, Math.hypot(petal.x, petal.y));
    peakTurn = Math.max(peakTurn, Math.abs(petal.rotation));
    peakLift = Math.max(peakLift, petal.lift);
    assert.equal(current.serial, serial, 'holding still must not launch a replacement wave');
    before = current;
  } });
  assert.ok(hitAt > 1 && hitAt < 3, `delayed arrival was ${hitAt}`);
  assert.ok(peakOffset > 2 && peakTurn > .03 && peakLift > .2, 'arrival should produce drift, turn and a small bob');
  assert.ok(state.ripples[0].touched & 2);
});

check('water carries on after departure and the same wave cannot push a petal twice', () => {
  let state = approach(0);
  state = hold(state, 1.2);
  const snapshot = structuredClone(state), serial = state.serial;
  const departed = resumePondListening(state, { x: 900, y: 2100 });
  const continued = hold(departed, .45);
  assert.equal(continued.serial, serial);
  assert.ok(continued.petals.some((petal, i) => distance(petal, snapshot.petals[i]) > .1), 'leaving must not freeze water immediately');
  const quiet = hold(continued, 30);
  assert.equal(quiet.serial, serial);
  assert.ok(quiet.petals.every(p => Math.hypot(p.x, p.y, p.vx, p.vy, p.rotation, p.spin, p.lift, p.rise) < .0001));
  const later = hold(quiet, 30);
  assert.ok(later.petals.every(p => Math.hypot(p.x, p.y, p.rotation, p.lift) < .0001));
  assert.equal(later.serial, serial);
  assert.deepEqual(state, snapshot, 'later water frames cannot mutate a frozen snapshot');
});

check('one identical wave transfers and settles consistently across frame rates', () => {
  const actor = bank(0);
  const initial = advancePondListening(createPondListening(actor), { x: actor.x - 2, y: actor.y }, 1 / 60, { speed: 120 });
  const samples = [30, 60, 120].map(fps => hold(initial, 2.5, { fps, speed: 0 }));
  const reference = samples[1];
  for (const sample of samples) {
    assert.equal(sample.ripples[0].touched, reference.ripples[0].touched);
    sample.petals.forEach((p, i) => {
      assert.ok(distance(p, reference.petals[i]) < .03);
      assert.ok(Math.abs(p.rotation - reference.petals[i].rotation) < .002);
      assert.ok(Math.abs(p.lift - reference.petals[i].lift) < .01);
    });
  }
});

check('invalid input cannot poison the model or mutate earlier snapshots', () => {
  const state = approach(), before = structuredClone(state);
  for (const delta of [0, -1, NaN, Infinity]) assert.equal(advancePondListening(state, state.actor, delta), state);
  for (const actor of [{ x: NaN, y: 3 }, { x: 3, y: Infinity }]) assert.equal(advancePondListening(state, actor, 1 / 60), state);
  for (const speed of [NaN, Infinity, -Infinity, -10]) {
    const next = advancePondListening(state, state.actor, 1 / 60, { speed });
    assert.ok([next.speed, next.calm, next.source.x, next.source.y].every(Number.isFinite));
  }
  assert.deepEqual(state, before);
  for (const key of ['password', 'questions', 'puzzleSolved', 'envelopeStored', 'giftUnlocked', 'lastDraw']) assert.ok(!(key in state));
});

console.log(`${checks - failures}/${checks} pond listening checks passed.`);
if (failures) process.exitCode = 1;
