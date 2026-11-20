import assert from 'node:assert/strict';
import { advanceMeadow, advanceMeadowLook, emptyMeadowDynamics, followMeadowCamera, MEADOW_SPEED, MEADOW_TURN_RATE, steerMeadow } from '../src/scene/meadowMotion.ts';

import { POINTING_BRAKE_SECONDS } from '../src/scene/pointToWalk.ts';

// These are deterministic controller checks, not a physical trackpad assessment.
let failures = 0;
const check = (name, run) => {
  try { run(); console.log(`PASS: ${name}`); }
  catch (error) { failures++; console.error(`FAIL: ${name}: ${error.stack}`); }
};
const near = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const vector = (angle, speed = MEADOW_SPEED) => ({ x: Math.cos(angle) * speed, y: Math.sin(angle) * speed });
const initial = (speed = MEADOW_SPEED) => ({ heading: { x: 1, y: 0 }, speed, velocity: { x: speed, y: 0 }, ...emptyMeadowDynamics() });
const step = (state, target, dt, remaining) => steerMeadow(state.heading, state.speed, target, dt, state, remaining);
const finite = state => {
  for (const value of [state.heading.x, state.heading.y, state.speed, state.velocity.x, state.velocity.y, state.angularVelocity, state.acceleration]) assert.ok(Number.isFinite(value));
  near(Math.hypot(state.heading.x, state.heading.y), 1);
  assert.ok(state.speed >= 0 && state.speed <= MEADOW_SPEED);
  near(Math.hypot(state.velocity.x, state.velocity.y), state.speed);
};

check('90° and 180° turns enter gradually and finish without an angular-speed snap', () => {
  for (const angle of [Math.PI / 2, Math.PI]) {
    let state = initial(), previousAngle = 0;
    const samples = [];
    for (let frame = 0; frame < 120; frame++) {
      state = step(state, vector(angle), 1 / 60);
      finite(state);
      const currentAngle = Math.atan2(state.heading.y, state.heading.x);
      const travel = Math.atan2(Math.sin(currentAngle - previousAngle), Math.cos(currentAngle - previousAngle));
      samples.push({ speed: state.angularVelocity, turn: travel });
      assert.ok(travel >= -1e-6, 'steady steering must not wobble back across its destination');
      if (frame === 59) assert.ok(Math.abs(angle - currentAngle) < angle * .05, 'soft steering must still reach 95% of the turn within a second');
      previousAngle = currentAngle;
    }
    assert.ok(samples[0].speed < MEADOW_TURN_RATE * .85, 'first frame must ramp up rather than adopt cruising turn speed');
    assert.ok(samples[0].turn < .045, 'the initial turn must remain visibly small');
    assert.ok(samples.some(sample => sample.speed > samples[0].speed * 1.2), 'turning should build after its first frame');
    assert.ok(Math.abs(state.angularVelocity) < .01, 'the completed turn should settle');
    near(Math.atan2(Math.sin(angle - previousAngle), Math.cos(angle - previousAngle)), 0, .001);
  }
});

check('small pointer noise around a 180° reversal preserves the chosen turn arc', () => {
  let state = initial(), previousAngle = 0;
  let direction;
  for (let frame = 0; frame < 70; frame++) {
    const angle = Math.PI + (frame % 2 ? .015 : -.015);
    state = step(state, vector(angle), 1 / 120);
    const currentAngle = Math.atan2(state.heading.y, state.heading.x);
    const travel = Math.atan2(Math.sin(currentAngle - previousAngle), Math.cos(currentAngle - previousAngle));
    direction ??= Math.sign(travel);
    assert.ok(travel * direction >= -1e-6, 'near-opposite noise must not reverse the in-progress arc');
    previousAngle = currentAngle;
  }
  assert.ok(Math.abs(previousAngle) > 2, 'noise guard must still allow a deliberate reversal');
});

check('a changing route stays close at 30, 60 and 120 fps', () => {
  const results = [30, 60, 120].map(fps => {
    let state = initial(0), actor = { x: 0, y: 0, zoom: 1 };
    for (let frame = 0; frame < fps * 4; frame++) {
      const time = frame / fps;
      const angle = time < 1 ? 0 : time < 2 ? Math.PI / 2 : time < 3 ? -Math.PI / 2 : .4;
      state = step(state, vector(angle), 1 / fps);
      actor = advanceMeadow(actor, state.velocity, 1 / fps);
      finite(state);
    }
    return { fps, actor, state };
  });
  const reference = results[2];
  for (const result of results) {
    assert.ok(Math.hypot(result.actor.x - reference.actor.x, result.actor.y - reference.actor.y) < 12, `${result.fps} fps route diverged from 120 fps`);
    near(result.state.speed, reference.state.speed, 2);
    assert.ok(Math.hypot(result.state.heading.x - reference.state.heading.x, result.state.heading.y - reference.state.heading.y) < .015);
  }
  console.log(`  Route endpoints: ${results.map(r => `${r.fps} fps (${r.actor.x.toFixed(2)}, ${r.actor.y.toFixed(2)})`).join('; ')}.`);
});

check('natural braking begins and ends softly, reaches exact zero, and never resumes by itself', () => {
  for (const fps of [30, 60, 120]) {
    let state = initial(), actor = { x: 0, y: 0, zoom: 1 };
    const drops = [];
    for (let frame = 0; frame < Math.ceil(.3 * fps) + 2; frame++) {
      const previous = state.speed;
      state = step(state, { x: 0, y: 0 }, 1 / fps);
      finite(state);
      assert.ok(state.speed <= previous + 1e-8, 'braking must not accelerate');
      if (previous > 0) drops.push(previous - state.speed);
      actor = advanceMeadow(actor, state.velocity, 1 / fps);
    }
    assert.equal(state.speed, 0);
    assert.equal(state.angularVelocity, 0);
    assert.equal(state.acceleration, 0);
    assert.ok(drops[0] < Math.max(...drops) * .5, 'braking must ease into deceleration');
    assert.ok(drops.at(-1) < Math.max(...drops) * .5, 'the last moving frame must not be a hard cut');
    assert.ok(actor.x < MEADOW_SPEED * .3 * .55, 'braking may not turn into a long glide');
    const stopped = { ...actor };
    for (let frame = 0; frame < fps; frame++) {
      state = step(state, { x: 0, y: 0 }, 1 / fps);
      actor = advanceMeadow(actor, state.velocity, 1 / fps);
      assert.deepEqual(actor, stopped);
    }
  }
});

check('an explicit neutral target brakes within 420ms at every tested frame rate', () => {
  for (const fps of [30, 60, 120]) {
    let state = initial(), actor = { x: 0, y: 0, zoom: 1 }, stopped;
    for (let frame = 1; frame <= fps * 2; frame++) {
      const age = frame * 1000 / fps;
      state = step(state, { x: 0, y: 0 }, 1 / fps, POINTING_BRAKE_SECONDS);
      actor = advanceMeadow(actor, state.velocity, 1 / fps);
      if (age >= 420) {
        assert.equal(state.speed, 0, `${fps} fps must settle after an explicit stop`);
        stopped ??= { ...actor };
        assert.deepEqual(actor, stopped);
      }
    }
  }
});

check('braking also eases angular motion instead of freezing a mid-turn heading instantly', () => {
  let state = initial();
  for (let frame = 0; frame < 9; frame++) state = step(state, vector(Math.PI / 2), 1 / 60);
  const prior = state.angularVelocity;
  assert.ok(prior > 1);
  state = step(state, { x: 0, y: 0 }, 1 / 60);
  assert.ok(state.angularVelocity > prior * .9 && state.angularVelocity < prior);
  let priorAngular = state.angularVelocity;
  for (let frame = 0; frame < 30; frame++) {
    state = step(state, { x: 0, y: 0 }, 1 / 60);
    assert.ok(state.angularVelocity <= priorAngular + 1e-8 && state.angularVelocity >= 0);
    priorAngular = state.angularVelocity;
  }
  assert.equal(state.speed, 0); assert.equal(state.angularVelocity, 0);
});

check('camera settles softly after returning the pointer to neutral and stays still', () => {
  const endSpeeds = [];
  for (const fps of [30, 60, 120]) {
    let state = initial(), actor = { x: 0, y: 0, zoom: 1 }, camera = { x: 0, y: 220, zoom: 1 }, look = { x: 0, y: 0 };
    let lastMovingSpeed = 0, stopped;
    for (let frame = 1; frame <= fps * 5; frame++) {
      const age = (frame / fps - 3) * 1000;
      const neutral = age >= 0;
      state = step(state, neutral ? { x: 0, y: 0 } : vector(0), 1 / fps, neutral ? POINTING_BRAKE_SECONDS : undefined);
      actor = advanceMeadow(actor, state.velocity, 1 / fps);
      look = advanceMeadowLook(look, state.heading, state.speed, 1 / fps);
      const nextCamera = followMeadowCamera(camera, actor, 1 / fps, state.speed > 0, { ...state, lead: look });
      const cameraSpeed = Math.hypot(nextCamera.x - camera.x, nextCamera.y - camera.y) * fps;
      if (cameraSpeed > 1e-8) lastMovingSpeed = cameraSpeed;
      camera = nextCamera;
      if (age >= 420) {
        stopped ??= { ...camera };
        assert.deepEqual(camera, stopped, 'the camera must not coast after rest');
      }
    }
    assert.ok(lastMovingSpeed < 3, `${fps} fps camera still travelled ${lastMovingSpeed} units/s on the final moving frame`);
    endSpeeds.push(`${fps} fps ${lastMovingSpeed.toFixed(3)}`);
  }
  console.log(`  Camera final moving-frame speed (world units/s): ${endSpeeds.join('; ')}.`);
});

check('fresh guidance cancels a partial brake without resetting velocity or snapping to full pace', () => {
  let state = initial();
  for (let frame = 0; frame < 9; frame++) state = step(state, { x: 0, y: 0 }, 1 / 60);
  const before = state;
  state = step(state, vector(.5), 1 / 60);
  assert.equal(state.brake, null);
  assert.ok(state.speed > 0 && state.speed < MEADOW_SPEED);
  assert.ok(Math.abs(state.speed - before.speed) < 25, 'resuming must inherit the current pace');
  for (let frame = 0; frame < 60; frame++) state = step(state, vector(.5), 1 / 60);
  assert.ok(state.speed > MEADOW_SPEED * .98);
});

check('invalid values and a stalled render frame cannot create an unbounded step', () => {
  for (const dt of [NaN, Infinity, -.1, 10]) for (const target of [vector(Math.PI), { x: NaN, y: 0 }]) {
    const state = step(initial(), target, dt);
    finite(state);
    const actor = advanceMeadow({ x: 0, y: 0, zoom: 1 }, state.velocity, dt);
    assert.ok(Math.hypot(actor.x, actor.y) <= MEADOW_SPEED * .05 + 1e-7);
  }
});

if (failures) process.exitCode = 1;
