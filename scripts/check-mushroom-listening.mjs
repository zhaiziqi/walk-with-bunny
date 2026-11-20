import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';

registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/src/')
    ? `${specifier}.ts` : specifier, context);
} });

const { createMushroomListening, advanceMushroomListening, listeningMushroomPose, mushroomLightPose, mushroomVertex, resumeMushroomListening } = await import('../src/scene/mushroomListening.ts');
const { hollowMushrooms } = await import('../src/scene/hollowArch.ts');
const leftCap = { x: 1215, y: 4350 };
const rightCap = { x: 1625, y: 4435 };
let checks = 0, failures = 0;
const check = (name, run) => {
  checks++;
  try { run(); console.log(`PASS: ${name}`); }
  catch (error) { failures++; console.error(`FAIL: ${name}\n${error.stack}`); }
};
const peak = state => Math.max(...state.mushrooms.map(mushroom => mushroom.warmth));

function hold(state, seconds, { fps = 60, actor = state.actor, speed, observe, ...options } = {}) {
  const frames = Math.ceil(seconds * fps), dt = seconds / frames;
  for (let frame = 0; frame < frames; frame++) {
    const position = typeof actor === 'function' ? actor(frame, dt) : actor;
    state = advanceMushroomListening(state, position, dt, { speed, ...options });
    observe?.(state, frame, dt);
  }
  return state;
}

function walk(state, destination, { fps = 60, speed = 240, observe } = {}) {
  const origin = { ...state.actor }, distance = Math.hypot(destination.x - origin.x, destination.y - origin.y);
  const frames = Math.max(1, Math.ceil(distance / speed * fps)), dt = distance / speed / frames;
  for (let frame = 1; frame <= frames; frame++) {
    const amount = frame / frames;
    state = advanceMushroomListening(state, {
      x: origin.x + (destination.x - origin.x) * amount,
      y: origin.y + (destination.y - origin.y) * amount,
    }, dt, { speed });
    observe?.(state, frame, dt);
  }
  return state;
}

function approach(destination = leftCap, { fps = 60, discovered = false, side = -1 } = {}) {
  return walk(createMushroomListening({ x: destination.x + side * 420, y: destination.y }, discovered), destination, { fps });
}

function startSequence(state = approach(), fps = 60) {
  for (let frame = 0; state.sequenceTime < 0 && frame < fps * 4; frame++) {
    state = advanceMushroomListening(state, state.actor, 1 / fps, { speed: 0 });
  }
  assert.ok(state.sequenceTime >= 0, 'a close visitor should start a response after a short pause');
  return state;
}

check('a real approach greets the nearest cap on either side, rather than a fixed first index', () => {
  for (const [target, index, side] of [[leftCap, 0, -1], [rightCap, 4, 1]]) {
    const state = approach(target, { side });
    assert.equal(state.focus, index);
    assert.ok(state.engaged && state.discovered);
    assert.ok(state.mushrooms[index].warmth > .3);
    assert.ok(state.mushrooms.every((mushroom, i) => i === index || mushroom.warmth < .12));
  }
});

check('waiting at the distant edge cannot consume the first close-up response', () => {
  let state = createMushroomListening({ x: 1088, y: 4150 });
  state = advanceMushroomListening(state, { x: 1090, y: 4150 }, 1 / 60, { speed: 120 });
  state = hold(state, 8);
  assert.ok(state.engaged && !state.performed && state.sequenceTime === -1);
  state = hold(startSequence(walk(state, leftCap)), 2);
  assert.ok(state.performed && state.order.length === 3, 'the full first greeting must wait until it can be seen');
});

check('a short rest starts one lead response and two distinct replies, with the smallest last', () => {
  for (const [target, side] of [[leftCap, -1], [rightCap, 1]]) {
    const arrival = approach(target, { side }), firstResponse = Array(5).fill(Infinity);
    const shortPause = hold(arrival, .4);
    assert.equal(shortPause.sequenceTime, -1, 'passing or a momentary pause must not launch the full exchange');
    const completed = hold(startSequence(arrival), 6, { observe(state, frame, dt) {
      state.mushrooms.forEach((mushroom, index) => {
        if (mushroom.opening > .5 && !Number.isFinite(firstResponse[index])) firstResponse[index] = (frame + 1) * dt;
      });
    } });
    assert.equal(completed.order.length, 3, 'two caps remain quiet, leaving a clear lead');
    assert.equal(new Set(completed.order).size, 3);
    assert.equal(completed.order[0], arrival.focus, 'the one closest to the visitor responds first');
    const smallestNeighbour = hollowMushrooms.map((m, i) => ({ h: m.h, i })).filter(m => m.i !== arrival.focus).sort((a, b) => a.h - b.h)[0].i;
    assert.equal(completed.order.at(-1), smallestNeighbour);
    assert.equal(firstResponse.filter(Number.isFinite).length, 3);
    const onset = completed.order.map(index => firstResponse[index]);
    for (let rank = 1; rank < onset.length; rank++) assert.ok(onset[rank] - onset[rank - 1] > .45, 'individual replies must be distinguishable');
    assert.ok(onset[1] > 3 && onset[1] < 3.9, 'the first neighbour waits for the returning light');
    assert.ok(onset[2] > 4 && onset[2] < 5, 'the smallest cap answers on a separate final beat');
  }
});

check('the lead light visibly peeks out, pauses, and returns while its cap stays open', () => {
  const start = startSequence(), leader = start.order[0], samples = [];
  assert.ok(!start.performed, 'starting an unseen animation must not count as seeing it');
  hold(start, 3.6, { observe(state) {
    const light = mushroomLightPose(state, leader);
    samples.push({ time: state.sequenceTime, light, opening: state.mushrooms[leader].opening, performed: state.performed });
    if (light.travel > .25 && state.sequenceTime > 1) {
      assert.ok(state.mushrooms[leader].opening > .65, 'the cap remains open until the light is nearly home');
    }
    state.mushrooms.forEach((_m, index) => {
      const pose = mushroomLightPose(state, index);
      assert.ok(Object.values(pose).every(Number.isFinite));
      assert.ok(pose.opacity >= 0 && pose.opacity <= 1);
      assert.ok(pose.travel >= 0 && pose.travel <= 1);
      if (index !== leader) assert.equal(pose.opacity, 0, 'only the lead cap sends out a light');
    });
  } });
  const beforePeak = samples.find(sample => sample.time > .6);
  assert.ok(!beforePeak.performed, 'the early peek is not the visible greeting yet');
  const plateau = samples.filter(sample => sample.light.travel > .98 && sample.light.opacity > .6);
  assert.ok(plateau.length > 0, 'the light reaches a distinct visible position outside the cap');
  assert.ok(plateau.at(-1).time - plateau[0].time >= .55, 'the light pauses long enough to notice');
  assert.ok(plateau.every(sample => sample.opening > .65), 'the cap holds the doorway open while the light is outside');
  assert.ok(plateau.some(sample => sample.performed), 'the observed peak marks the moment as seen');
  const end = samples.at(-1);
  assert.ok(end.light.travel < .01 && end.light.opacity < .01, 'the light returns and disappears instead of orbiting');
  const firstVisible = samples.find(sample => sample.light.opacity > .05).light;
  const furthest = plateau[0].light;
  assert.ok(Math.hypot(furthest.x - firstVisible.x, furthest.y - firstVisible.y) > .25, 'the outing covers a readable fraction of the mushroom silhouette');
  assert.ok(furthest.radius > 0 && furthest.radius < hollowMushrooms[leader].h * .3, 'the light is smaller than its mushroom');
});

check('walking slowly after the peek begins does not shrink or cancel the response', () => {
  const start = startSequence(), leader = start.order[0];
  let stationary = start, moving = start;
  for (let frame = 1; frame <= 180; frame++) {
    const dt = 1 / 60;
    stationary = advanceMushroomListening(stationary, start.actor, dt, { speed: 0 });
    moving = advanceMushroomListening(moving, {
      x: start.actor.x + Math.sin(frame * dt * 1.3) * 55,
      y: start.actor.y + (1 - Math.cos(frame * dt * 1.3)) * 25,
    }, dt, { speed: 75 });
    assert.ok(moving.sequenceTime >= 0 && moving.engaged);
    const stillLight = mushroomLightPose(stationary, leader), movingLight = mushroomLightPose(moving, leader);
    assert.ok(Math.abs(stillLight.travel - movingLight.travel) < .02);
    assert.ok(Math.abs(stillLight.opacity - movingLight.opacity) < .04, 'moving light keeps its full visibility');
    assert.ok(Math.abs(stationary.mushrooms[leader].opening - moving.mushrooms[leader].opening) < .12, 'the lead cap must not collapse during a gentle turn');
  }
  assert.ok(moving.performed, 'a moving visitor can still see the completed peek');
});

check('the light keeps its chosen side when the visitor turns or crosses the cap', () => {
  const target = { x: leftCap.x - 45, y: leftCap.y };
  let state = startSequence(approach(target)), side = state.lightSide;
  assert.ok(Number.isFinite(side) && side !== 0);
  state = walk(state, { x: leftCap.x + 45, y: leftCap.y }, { speed: 80, observe(current) {
    assert.equal(current.lightSide, side, 'the light must not jump across the cap mid-flight');
    assert.ok(current.sequenceTime >= 0);
  } });
  assert.equal(state.lightSide, side);
});

check('leaving before the visible peak preserves the full greeting for another visit', () => {
  let state = hold(startSequence(), .1);
  state = walk(state, { x: leftCap.x - 620, y: leftCap.y }, { speed: 900 });
  assert.ok(!state.engaged && state.sequenceTime === -1);
  assert.ok(!state.performed, 'a hurried departure must not consume an unseen moment');
  state = startSequence(walk(state, leftCap));
  assert.equal(state.order.length, 3, 'the next visit should still receive the full greeting');
  state = hold(state, 2);
  assert.ok(state.performed);
});

check('teleporting away during an unseen peek cancels the light without recording a visit', () => {
  const start = hold(startSequence(), .6);
  assert.ok(!start.performed);
  const away = advanceMushroomListening(start, { x: 0, y: 0 }, 1 / 60, { speed: 0 });
  assert.ok(!away.engaged && away.sequenceTime === -1 && !away.performed);
  assert.ok(away.mushrooms.every((_m, index) => mushroomLightPose(away, index).opacity === 0));
});

check('tiny real-position corrections do not continually cancel stillness', () => {
  const arrival = approach(), calm = hold(arrival, 6);
  const jittered = hold(arrival, 6, {
    speed: undefined,
    actor: frame => ({ x: leftCap.x + Math.sin(frame * .8) * .05, y: leftCap.y + Math.cos(frame * .7) * .05 }),
  });
  assert.ok(jittered.resting && jittered.quiet > 4.5);
  assert.equal(jittered.focus, calm.focus);
  assert.ok(Math.abs(jittered.quiet - calm.quiet) < .15);
  jittered.mushrooms.forEach((mushroom, index) => assert.ok(Math.abs(mushroom.warmth - calm.mushrooms[index].warmth) < .06));
});

check('crossing a nearest-cap bisector by a few pixels does not flicker the focus', () => {
  let state = walk(approach(), { x: 1308, y: 4390 });
  const focus = state.focus;
  assert.equal(focus, 0);
  state = hold(state, 3, {
    actor: frame => ({ x: 1310 + Math.sin(frame * .3) * 2, y: 4390 }),
    observe(current) { assert.equal(current.focus, focus); },
  });
  assert.ok(state.engaged);
});

check('walking to a clearly closer cap changes focus without restarting the active story', () => {
  let state = hold(approach(), 4), previous = state;
  const started = state;
  state = walk(state, rightCap, { observe(current) {
    current.mushrooms.forEach((mushroom, index) => {
      assert.ok(Math.abs(mushroom.warmth - previous.mushrooms[index].warmth) < .06);
      assert.ok(Math.abs(mushroom.lean - previous.mushrooms[index].lean) < .006);
    });
    previous = current;
  } });
  assert.equal(state.focus, 4);
  assert.deepEqual(state.order, started.order, 'the original lead and two replies keep their places');
  assert.ok(state.sequenceTime > started.sequenceTime, 'the light keeps its own timing while focus changes');
});

check('a fast pass creates only local greetings, not the full stationary response', () => {
  let largestGroup = 0, largestQuiet = 0;
  walk(createMushroomListening({ x: 900, y: 4350 }), { x: 1800, y: 4350 }, { observe(state) {
    largestGroup = Math.max(largestGroup, state.mushrooms.filter(mushroom => mushroom.warmth > .25).length);
    largestQuiet = Math.max(largestQuiet, state.quiet);
    assert.ok(peak(state) < .56, 'walking must not trigger the stronger stationary answer');
  } });
  assert.ok(largestGroup > 0 && largestGroup <= 2);
  assert.ok(largestQuiet < .25);
});

check('departing releases the response; a later visit receives only a brief nod', () => {
  let state = hold(startSequence(), 2);
  assert.ok(peak(state) > .6);
  state = walk(state, { x: 2200, y: 4350 });
  state = hold(state, 5);
  assert.ok(!state.engaged && peak(state) < .02);
  assert.ok(state.discovered && state.performed);
  state = walk(state, leftCap);
  state = hold(state, 2);
  assert.ok(state.engaged && state.order.length === 1);
  assert.equal(state.order[0], state.focus);
  state = hold(state, 8);
  assert.ok(peak(state) < .01, 'the brief revisit must settle completely');
});

check('the glow remains briefly after the cap closes, then settles without repetition', () => {
  let afterglow = false;
  const settled = hold(startSequence(), 12.5, { observe(state) {
    if (state.sequenceTime > 3.8 && state.mushrooms.some(m => m.opening < .06 && m.warmth > .15)) afterglow = true;
  } });
  assert.ok(afterglow, 'light has a distinct release after the cap movement');
  assert.ok(settled.mushrooms.every(m => m.opening < .001 && m.warmth < .001));
  const still = hold(settled, 30);
  assert.deepEqual(still.order, settled.order);
  assert.equal(still.sequenceTime, settled.sequenceTime);
  assert.ok(still.mushrooms.every(m => m.opening < .001 && m.warmth < .001));
});

check('a long rest settles, and movement afterwards still receives a fresh greeting', () => {
  let state = hold(approach(), 50);
  assert.ok(peak(state) < .11, 'an indefinitely parked character must not run repeated shows');
  assert.ok(state.quiet <= 12.001, 'idle time must not accumulate into a minutes-long recovery');
  state = walk(state, rightCap);
  assert.equal(state.focus, 4);
  assert.ok(state.mushrooms[4].warmth > .3, 'walking after a long rest must still greet the new nearest cap');
});

check('reading freezes everything and returning resumes from the same point', () => {
  const before = hold(startSequence(), 1.8), snapshot = structuredClone(before);
  assert.ok(mushroomLightPose(before, before.order[0]).opacity > .6);
  let paused = before;
  for (let frame = 0; frame < 240; frame++) {
    paused = advanceMushroomListening(paused, { x: 0, y: 0 }, 1 / 60, { paused: true, speed: 240, replaySerial: 99 });
    assert.equal(paused, before);
  }
  assert.deepEqual(paused, snapshot);
  const resumed = advanceMushroomListening(paused, before.actor, 1 / 60, { speed: 0 });
  const uninterrupted = advanceMushroomListening(before, before.actor, 1 / 60, { speed: 0 });
  assert.deepEqual(resumed, uninterrupted);
});

check('rendering or teleporting into the patch cannot accidentally start a full response', () => {
  let restored = hold(createMushroomListening(leftCap, true, 7), 10, { replaySerial: 7 });
  assert.ok(!restored.engaged && peak(restored) === 0);
  restored = advanceMushroomListening(restored, { x: leftCap.x + 2, y: leftCap.y }, 1 / 60, { speed: 120 });
  assert.ok(restored.engaged);
  let teleported = advanceMushroomListening(createMushroomListening({ x: -1200, y: 3200 }), leftCap, 1 / 60, { speed: 0 });
  teleported = hold(teleported, 8);
  assert.ok(!teleported.engaged && peak(teleported) === 0);
});

check('a replay pulse tells the full exchange once, even after a brief revisit', () => {
  let state = hold(approach(), 12);
  state = advanceMushroomListening(state, leftCap, 1 / 60, { replaySerial: 4, speed: 0 });
  assert.ok(state.engaged);
  assert.equal(state.order.length, 3);
  let opening = 0;
  state = hold(state, 5, { replaySerial: 4, observe(current) { opening = Math.max(opening, ...current.mushrooms.map(m => m.opening)); } });
  assert.ok(opening > .7);
  assert.ok(state.sequenceTime > 4.9);
  state = hold(state, 20, { replaySerial: 4 });
  assert.ok(peak(state) < .001, 'a consumed serial must not continually replay');
  const distant = advanceMushroomListening(createMushroomListening({ x: 0, y: 0 }), { x: 0, y: 0 }, 1 / 60, { replaySerial: 9 });
  assert.ok(!distant.engaged && peak(distant) === 0);
});

check('requesting a replay during the visible outing does not rewind or duplicate the light', () => {
  const before = hold(startSequence(), 1.8), leader = before.order[0];
  let state = advanceMushroomListening(before, before.actor, 1 / 60, { replaySerial: 5, speed: 0 });
  assert.ok(state.sequenceTime > before.sequenceTime);
  assert.deepEqual(state.order, before.order);
  assert.ok(mushroomLightPose(state, leader).travel > .98);
  state = hold(state, 12, { replaySerial: 5 });
  assert.ok(state.mushrooms.every((_m, index) => mushroomLightPose(state, index).opacity === 0));
  assert.ok(peak(state) < .001);
});

check('the encounter has comparable pacing at 30, 60, and 120 FPS', () => {
  for (const elapsed of [.95, 1.9, 2.8, 5.5]) {
    const samples = [30, 60, 120].map(fps => hold(startSequence(approach(leftCap, { fps }), fps), elapsed, { fps }));
    const reference = samples[1], referenceLight = mushroomLightPose(reference, reference.order[0]);
    for (const state of samples) {
      assert.equal(state.focus, reference.focus);
      assert.ok(Math.abs(state.quiet - reference.quiet) < .11);
      const light = mushroomLightPose(state, state.order[0]);
      assert.ok(Math.abs(light.travel - referenceLight.travel) < .04);
      assert.ok(Math.abs(light.opacity - referenceLight.opacity) < .04);
      state.mushrooms.forEach((mushroom, index) => {
        assert.ok(Math.abs(mushroom.warmth - reference.mushrooms[index].warmth) < .07);
        assert.ok(Math.abs(mushroom.lean - reference.mushrooms[index].lean) < .006);
      });
    }
  }
});

check('a suspended or invalid frame cannot skip the quiet period or corrupt state', () => {
  const state = hold(approach(), 2);
  for (const delta of [0, -1, NaN, Infinity]) assert.equal(advanceMushroomListening(state, leftCap, delta), state);
  for (const actor of [{ x: NaN, y: 0 }, { x: 0, y: Infinity }]) assert.equal(advanceMushroomListening(state, actor, 1 / 60), state);
  const resumed = advanceMushroomListening(state, leftCap, 30, { speed: 0 });
  assert.ok(resumed.quiet <= state.quiet, 'elapsed background time must not count as active stillness');
  assert.ok(resumed.engaged, 'a stalled frame must not end an ongoing response');
  assert.ok(hold(resumed, 2).quiet > state.quiet + 1.8, 'standing still after a stall must continue the response');
  resumed.mushrooms.forEach((mushroom, index) => assert.ok(Math.abs(mushroom.warmth - state.mushrooms[index].warmth) < .08));
});

check('invalid optional speed measurements cannot poison the animation', () => {
  const state = approach();
  for (const speed of [NaN, Infinity, -Infinity]) {
    const result = advanceMushroomListening(state, state.actor, 1 / 60, { speed });
    assert.ok(Number.isFinite(result.speed), 'the next valid frame must be able to recover');
    assert.ok(Number.isFinite(result.quiet));
    assert.ok(result.mushrooms.every(mushroom => Number.isFinite(mushroom.warmth) && Number.isFinite(mushroom.lean)));
  }
});

check('all phases keep planted feet and bounded upper-body deformation', () => {
  hold(approach(), 16, { observe(state) {
    state.mushrooms.forEach((_mushroom, index) => {
      for (const wind of [-1, 0, 1]) {
        const pose = listeningMushroomPose(state, index, wind);
        assert.equal(pose.footOffset, 0);
        assert.equal(pose.stretch, 1);
        assert.ok(Object.values(pose).every(Number.isFinite));
        assert.ok(pose.warmth >= 0 && pose.warmth <= 1);
        assert.ok(pose.glow >= 0 && pose.glow < .33);
        assert.ok(Math.abs(pose.lean) < .08);
        assert.ok(pose.capLift >= 0 && pose.capLift <= .151);
        assert.ok(Math.abs(pose.capTilt) <= .241);
        for (const x of [-.5, -.2, 0, .2, .5]) {
          const foot = mushroomVertex(x, 0, pose);
          assert.ok(Math.abs(foot.x - x) < 1e-12 && Math.abs(foot.y) < 1e-12, 'roots never lift or slide');
          const lower = mushroomVertex(x, -.05, pose);
          assert.ok(Math.abs(lower.x - x) < 1e-12 && Math.abs(lower.y + .05) < 1e-12);
        }
      }
    });
  } });
});

check('the upper cap keeps its shape while the stalk bends below it', () => {
  const pose = { lean: .02, stretch: 1, footOffset: 0, capTilt: .11, capLift: .06, glow: .2, warmth: .8 };
  const a = mushroomVertex(-.35, .5, pose), b = mushroomVertex(.35, .5, pose);
  assert.ok(Math.abs(Math.hypot(b.x - a.x, b.y - a.y) - .7) < 1e-12, 'the cap must not stretch sideways');
  const base = mushroomVertex(0, 0, pose), neck = mushroomVertex(0, .4, pose);
  assert.ok(Math.abs(base.y) < 1e-12 && neck.y > .44, 'the neck lifts but the root stays planted');
});

check('static-mode return keeps the exact remembered cap pose without replaying', () => {
  const before = hold(startSequence(), 2), snapshot = structuredClone(before);
  const resumed = resumeMushroomListening(before, before.actor);
  assert.deepEqual(before, snapshot, 'resuming may not mutate the saved snapshot');
  assert.deepEqual(resumed.mushrooms, before.mushrooms);
  assert.deepEqual(resumed.order, before.order);
  assert.equal(resumed.sequenceTime, before.sequenceTime);
  assert.equal(resumed.playedVisit, before.playedVisit);
  assert.equal(resumed.performed, before.performed);
  before.mushrooms.forEach((_m, index) => assert.deepEqual(mushroomLightPose(resumed, index), mushroomLightPose(before, index)));
  const away = resumeMushroomListening(before, { x: 0, y: 0 });
  assert.ok(!away.engaged && away.sequenceTime === -1);
  assert.ok(away.performed, 'moving away does not erase the fact that the encounter was seen');
});

console.log(`${checks - failures}/${checks} mushroom listening checks passed.`);
if (failures) process.exitCode = 1;
