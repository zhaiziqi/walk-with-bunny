import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';

registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/src/')
    ? `${specifier}.ts` : specifier, context);
} });

const { createPaperGuide, advancePaperGuide, resumePaperGuide, paperGuideBirdPose, paperGuidePerches, paperGuideVisibility } = await import('../src/scene/paperGuide.ts');
const { hillBirds } = await import('../src/scene/hillMoon.ts');
const { pathDistance, paths } = await import('../src/scene/gardenAtlas.ts');
const { terrainHeight } = await import('../src/scene/depthWorld.ts');
let checks = 0, failures = 0;
const check = (name, run) => {
  checks++;
  try { run(); console.log(`PASS: ${name}`); }
  catch (error) { failures++; console.error(`FAIL: ${name}\n${error.stack}`); }
};
const point = value => ({ x: value.x, y: value.y });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const bird = state => paperGuideBirdPose(state, state.leader, state.time);

function meet(index = 1, fps = 60) {
  const home = hillBirds[index];
  return advancePaperGuide(createPaperGuide({ x: home.x - 1, y: home.y }), point(home), 1 / fps, { speed: fps });
}

function hold(state, seconds, { fps = 60, actor = state.actor, observe, ...options } = {}) {
  const frames = Math.ceil(seconds * fps), dt = seconds / frames;
  for (let frame = 0; frame < frames; frame++) {
    state = advancePaperGuide(state, actor, dt, { speed: 0, ...options });
    observe?.(state, frame, dt);
  }
  return state;
}

function walk(state, destination, { speed = 220, fps = 60, observe } = {}) {
  const origin = point(state.actor), length = distance(origin, destination);
  if (!length) return state;
  const frames = Math.ceil(length / speed * fps), dt = length / speed / frames;
  for (let frame = 1; frame <= frames; frame++) {
    const amount = frame / frames;
    state = advancePaperGuide(state, {
      x: origin.x + (destination.x - origin.x) * amount,
      y: origin.y + (destination.y - origin.y) * amount,
    }, dt, { speed });
    observe?.(state, frame, dt);
  }
  return state;
}

// Follow the visible bird with real bounded steps. After it rests, walk towards
// the next painted-path stop; no actor teleport or forced guide state is used.
function follow(state, { fps = 60, maxSeconds = 70, until = current => current.finished, observe } = {}) {
  let frame = 0;
  for (; frame < Math.ceil(maxSeconds * fps) && !until(state); frame++) {
    const current = bird(state), next = paperGuidePerches[Math.min(state.perch, paperGuidePerches.length - 1)];
    const dx = next.x - current.x, dy = next.y - current.y, length = Math.hypot(dx, dy) || 1;
    // Keep one forward intention through takeoff. Switching instantly from an
    // ahead target to a behind target would manufacture a backwards gesture.
    const goal = state.target === state.perch && state.restTime <= .7
      ? state.actor : { x: current.x + dx / length * 90, y: current.y + dy / length * 90 };
    const gap = distance(goal, state.actor), step = Math.min(gap, 180 / fps);
    const actor = {
      x: state.actor.x + (goal.x - state.actor.x) / (gap || 1) * step,
      y: state.actor.y + (goal.y - state.actor.y) / (gap || 1) * step,
    };
    state = advancePaperGuide(state, actor, 1 / fps, { speed: step * fps });
    observe?.(state, frame, 1 / fps);
  }
  return { state, elapsed: frame / fps };
}

function invitation(index = 1, fps = 60) {
  return hold(meet(index, fps), 15, { fps });
}

check('a real step greets the nearest bird, and choosing one leaves the others at home', () => {
  for (let index = 0; index < hillBirds.length; index++) {
    let state = meet(index);
    assert.equal(state.leader, index);
    assert.ok(state.ready && !state.met);
    state = hold(state, .65);
    assert.ok(state.unfold > .4, 'the nearest wings should visibly open before departure');
    hillBirds.forEach((home, other) => {
      if (other === index) return;
      const pose = paperGuideBirdPose(state, other, state.time);
      assert.deepEqual(point(pose), point(home));
      assert.equal(pose.lift, 4);
    });
  }
});

check('initial rendering, motionless arrival, and a map teleport cannot fake a real greeting', () => {
  const home = point(hillBirds[1]);
  const still = hold(createPaperGuide(home), 30);
  assert.equal(still.leader, -1);
  assert.ok(!still.met && !still.finished);
  let teleported = advancePaperGuide(createPaperGuide({ x: -1200, y: 3200 }), home, 1 / 60, { speed: 0 });
  teleported = hold(teleported, 30);
  assert.equal(teleported.leader, -1);
  teleported = advancePaperGuide(teleported, { x: home.x + 2, y: home.y }, 1 / 60, { speed: 120 });
  assert.equal(teleported.leader, 1);
});

check('continuous forward approach meets the guide and keeps it ahead without a mandatory pause', () => {
  for (const fps of [30, 60, 120]) {
    let state = createPaperGuide({ x: 1080, y: 6300 }), metAt = null;
    state = walk(state, { x: 1080, y: 7100 }, { speed: 200, fps, observe(current) {
      if (current.met && !metAt) metAt = point(current.actor);
    } });
    assert.ok(state.met && metAt && metAt.y < 6800, `${fps} FPS: the guide must answer during the approach`);
    assert.equal(state.quiet, 0); assert.equal(state.invitation, false);
    assert.ok(bird(state).y > state.actor.y + 25, `${fps} FPS: continuous walking should retain a visible lead`);
    assert.ok(distance(bird(state), state.actor) < 430);
    const rested = hold(state, 8, { fps });
    assert.equal(rested.speed, 0); assert.equal(rested.lift, 4);
    assert.ok(rested.s - state.s < 70, 'stopping still brakes locally');
    assert.ok(!rested.finished);
  }
});

check('backward passage and distant forward travel do not masquerade as a first approach', () => {
  let backwards = createPaperGuide({ x: 1080, y: 7100 });
  backwards = walk(backwards, { x: 1080, y: 6500 }, { speed: 200 });
  assert.ok(!backwards.met); assert.equal(backwards.approachTime, 0);
  let distant = createPaperGuide({ x: 1650, y: 6300 });
  distant = walk(distant, { x: 1650, y: 7100 }, { speed: 200 });
  assert.equal(distant.leader, -1); assert.ok(!distant.met);
});

check('a brief approach cannot survive a map jump, reversal or renderer input rebase', () => {
  let short = createPaperGuide({ x: 1080, y: 6500 });
  short = walk(short, { x: 1080, y: 6530 }, { speed: 200 });
  assert.ok(short.approachTime > 0 && short.approachTime < .28 && !short.met);
  const reversed = walk(short, { x: 1080, y: 6500 }, { speed: 200 });
  assert.equal(reversed.approachTime, 0); assert.ok(!reversed.met);
  const restored = resumePaperGuide(short, short.actor);
  assert.equal(restored.approachTime, 0); assert.ok(!hold(restored, 5).met);
  const jumped = advancePaperGuide(short, { x: 1080, y: 6720 }, 1 / 60, { speed: 0 });
  assert.equal(jumped.approachTime, 0); assert.ok(!hold(jumped, 5).met);
});

check('the first quiet invitation completes just one short hop for every possible leader', () => {
  for (let index = 0; index < hillBirds.length; index++) {
    const state = invitation(index);
    assert.ok(state.met && !state.finished);
    assert.equal(state.perch, 1);
    assert.equal(state.target, 1);
    assert.ok(distance(bird(state), paperGuidePerches[0]) < .01);
    assert.equal(state.lift, 4);
    assert.equal(state.speed, 0);
  }
});

check('waiting alone cannot carry the guide or the visitor to the door', () => {
  const first = invitation(), waited = hold(first, 90);
  assert.deepEqual(point(waited.actor), point(first.actor));
  assert.equal(waited.perch, 1);
  assert.equal(waited.target, 1);
  assert.equal(waited.s, first.s);
  assert.ok(!waited.finished);
  assert.equal(waited.lift, 4);
});

check('following with continuous steps reaches each resting place in order', () => {
  const landings = [1], { state, elapsed } = follow(invitation(), { observe(current) {
    if (current.perch !== landings.at(-1)) landings.push(current.perch);
    assert.ok(current.target - current.perch <= 1, 'there must never be a queued chain of several flights');
  } });
  assert.ok(state.finished, `the route should remain followable; last stop ${state.perch}`);
  assert.deepEqual(landings, Array.from({ length: paperGuidePerches.length }, (_, index) => index + 1));
  assert.ok(elapsed < 70);
  assert.ok(distance(bird(state), paperGuidePerches.at(-1)) < .01);
});

check('ordinary uninterrupted 200-unit walking along the actual path does not strand the guide', () => {
  const route = paths.find(path => path.id === 'hill-moon').points.filter(point => point.y >= 6900);
  for (const fps of [30, 60, 120]) {
    let state = invitation(1, fps);
    for (const destination of route) state = walk(state, destination, { speed: 200, fps });
    assert.ok(state.finished,
      `${fps} FPS: the visitor reached the door but the guide stopped at perch ${state.perch}, target ${state.target}, gap ${distance(state.actor, bird(state)).toFixed(1)}`);
    assert.ok(distance(bird(state), paperGuidePerches.at(-1)) < .01);
  }
});

check('stopping during a later hop gently lands and waits instead of continuing by time', () => {
  const { state: flying } = follow(invitation(), { until: current => current.target >= 3 && current.speed > 90 });
  assert.ok(flying.speed > 90 && flying.target > flying.perch);
  const shortRest = hold(flying, 4), longerRest = hold(shortRest, 25);
  assert.equal(longerRest.leader, flying.leader);
  assert.equal(longerRest.target, flying.target);
  assert.equal(longerRest.perch, flying.perch);
  assert.ok(shortRest.s >= flying.s, 'braking may coast forward, never snap backwards');
  assert.ok(shortRest.s - flying.s < 70, 'the bird must brake locally rather than finish the whole leg');
  assert.ok(Math.abs(longerRest.s - shortRest.s) < .01);
  assert.equal(longerRest.speed, 0);
  assert.equal(longerRest.lift, 4);
  assert.ok(!longerRest.finished);
});

check('leaving keeps the same bird waiting, and returning continues its pending hop', () => {
  const { state: flying } = follow(invitation(), { until: current => current.target >= 3 && current.speed > 90 });
  let state = walk(flying, { x: -800, y: 6600 });
  state = hold(state, 12);
  const waiting = state, waitingPosition = bird(waiting);
  assert.equal(waiting.leader, flying.leader);
  assert.equal(waiting.lift, 4);
  assert.ok(!waiting.finished);
  state = hold(waiting, 30);
  assert.deepEqual(point(bird(state)), point(waitingPosition));
  const next = paperGuidePerches[Math.min(waiting.perch, paperGuidePerches.length - 1)];
  const dx = next.x - waitingPosition.x, dy = next.y - waitingPosition.y, length = Math.hypot(dx, dy) || 1;
  state = walk(state, { x: waitingPosition.x - dx / length * 140, y: waitingPosition.y - dy / length * 140 });
  state = follow(state).state;
  assert.equal(state.leader, waiting.leader);
  assert.ok(state.finished, 'coming back must resume without needing a new first greeting');
  assert.ok(state.s >= waiting.s);
});

check('reading freezes the complete flight state and resumes without replaying', () => {
  const state = hold(meet(), 1.7), snapshot = structuredClone(state);
  let paused = state;
  for (let frame = 0; frame < 600; frame++) {
    paused = advancePaperGuide(paused, { x: 0, y: 0 }, 1 / 60, { paused: true, speed: 240 });
    assert.equal(paused, state);
  }
  assert.deepEqual(paused, snapshot);
  assert.deepEqual(advancePaperGuide(paused, state.actor, 1 / 60, { speed: 0 }), advancePaperGuide(state, state.actor, 1 / 60, { speed: 0 }));
});

check('a long frame preserves a half-finished greeting rather than skipping or cancelling it', () => {
  const state = hold(meet(), 1.7);
  assert.ok(state.met && state.invitation && state.speed > 0);
  const after = advancePaperGuide(state, state.actor, 3, { speed: 0 });
  assert.deepEqual(after, state);
  const continued = hold(after, 14);
  assert.equal(continued.perch, 1);
  assert.equal(continued.target, 1);
  assert.ok(!continued.finished);
  for (const delta of [0, -1, NaN, Infinity]) assert.equal(advancePaperGuide(state, state.actor, delta), state);
  for (const actor of [{ x: NaN, y: 0 }, { x: 0, y: Infinity }]) assert.equal(advancePaperGuide(state, actor, 1 / 60), state);
});

check('switching back from static mode retains the exact bird position and pending destination', () => {
  const { state: flying } = follow(invitation(), { until: current => current.target >= 3 && current.speed > 90 });
  const before = bird(flying), restored = resumePaperGuide(flying, { x: flying.actor.x - 20, y: flying.actor.y - 20 });
  assert.equal(restored.leader, flying.leader);
  assert.equal(restored.perch, flying.perch);
  assert.equal(restored.target, flying.target);
  assert.equal(restored.s, flying.s);
  assert.deepEqual(point(bird(restored)), point(before));
  const waiting = hold(restored, 15);
  assert.equal(waiting.s, restored.s);
  assert.equal(waiting.perch, restored.perch);
  assert.ok(!waiting.invitation && !waiting.ready);
  assert.equal(waiting.lift, 4);
});

check('a map jump during flight does not move the bird to the visitor or restart its route', () => {
  const { state: flying } = follow(invitation(), { until: current => current.target >= 3 && current.speed > 90 });
  const before = bird(flying);
  const jumped = advancePaperGuide(flying, { x: -200, y: 8500 }, 1 / 60, { speed: 0 });
  assert.equal(jumped.leader, flying.leader);
  assert.equal(jumped.target, flying.target);
  assert.deepEqual(point(bird(jumped)), point(before));
  const waited = hold(jumped, 20);
  assert.equal(waited.lift, 4);
  assert.equal(waited.perch, flying.perch);
  assert.ok(!waited.finished && !waited.ready);
  assert.ok(distance(bird(waited), waited.actor) > 500);
});

check('the final landing stays before the door and produces no puzzle or gift state', () => {
  let state = follow(invitation()).state;
  state = hold(state, 20);
  assert.ok(state.finished);
  assert.equal(state.perch, paperGuidePerches.length);
  assert.equal(state.target, state.perch);
  assert.equal(state.speed, 0);
  assert.equal(state.lift, 4);
  const endpoint = bird(state);
  assert.ok(endpoint.y < 8500 && distance(endpoint, { x: -200, y: 8500 }) > 150);
  for (const key of ['puzzleSolved', 'questions', 'envelopeStored', 'lastDraw', 'giftUnlocked', 'password']) assert.ok(!(key in state));
  const replay = hold(state, 30);
  assert.equal(replay.s, state.s);
  assert.equal(replay.perch, state.perch);
});

check('every landing follows the painted route and remains visible near the door', () => {
  for (const perch of paperGuidePerches) {
    const route = pathDistance(perch.x, perch.y);
    assert.equal(route.pathId, 'hill-moon');
    assert.ok(route.distance < 1);
    assert.ok(Number.isFinite(terrainHeight(perch.x, perch.y)));
    assert.equal(paperGuideVisibility(perch, perch), 1);
    assert.ok(paperGuideVisibility({ x: perch.x, y: perch.y - 250 }, perch) > .95);
    assert.equal(paperGuideVisibility({ x: perch.x + 1500, y: perch.y }, perch), 0);
  }
  assert.equal(paperGuideVisibility({ x: -200, y: 8500 }, paperGuidePerches.at(-1)), 1);
});

check('flight timing and complete followability agree at 30, 60, and 120 FPS', () => {
  const samples = [30, 60, 120].map(fps => hold(meet(1, fps), 1.8, { fps }));
  const reference = samples[1];
  for (const state of samples) {
    assert.equal(state.leader, reference.leader);
    assert.equal(state.target, reference.target);
    assert.ok(distance(bird(state), bird(reference)) < 14);
    assert.ok(Math.abs(state.lift - reference.lift) < 6);
  }
  const journeys = [30, 60, 120].map(fps => follow(invitation(1, fps), { fps }));
  assert.ok(journeys.every(journey => journey.state.finished));
  assert.ok(Math.max(...journeys.map(journey => journey.elapsed)) - Math.min(...journeys.map(journey => journey.elapsed)) < 2);
});

check('world position, terrain height, and landing motion remain continuous and finite', () => {
  let state = meet(), previous = bird(state);
  const inspect = current => {
    const pose = bird(current);
    assert.ok(Object.values(current).filter(value => typeof value === 'number').every(Number.isFinite));
    assert.ok(Object.values(pose).filter(value => typeof value === 'number').every(Number.isFinite));
    assert.ok(distance(pose, previous) < 4.4, 'a bird cannot jump between perches in one frame');
    const altitude = terrainHeight(pose.x, pose.y) + pose.lift;
    const oldAltitude = terrainHeight(previous.x, previous.y) + previous.lift;
    assert.ok(Math.abs(altitude - oldAltitude) < 7);
    assert.ok(pose.lift >= 4 && pose.lift <= 76.001);
    assert.ok(Math.abs(pose.bank) < .17);
    assert.ok(pose.wingAngle >= 0 && pose.wingAngle <= .91);
    previous = pose;
  };
  state = hold(state, 15, { observe: inspect });
  state = follow(state, { observe: inspect }).state;
  hold(state, 6, { observe: inspect });
});

check('the invitation and final arrival brake before landing instead of stopping abruptly in mid-air', () => {
  for (const fps of [30, 60, 120]) {
    let state = meet(1, fps), previous = state;
    const arrivals = [];
    const inspect = (current, _frame, dt) => {
      assert.ok(Math.abs(current.speed - previous.speed) / dt < 700,
        `${fps} FPS: horizontal speed changed too abruptly`);
      const firstLanding = previous.perch === 0 && current.perch === 1;
      const finalLanding = !previous.finished && current.finished;
      if (firstLanding || finalLanding) {
        arrivals.push(firstLanding ? 'invitation' : 'door');
        assert.ok(previous.speed < 3, `${fps} FPS: ${arrivals.at(-1)} arrived at ${previous.speed.toFixed(2)} units/second`);
        assert.equal(current.speed, 0);
        assert.ok(distance(bird(previous), bird(current)) < .75, 'the final adjustment must stay below one world unit');
        assert.ok(current.lift < 7, 'horizontal travel must not stop while the bird is still high in the air');
      }
      previous = current;
    };
    state = hold(state, 15, { fps, observe: inspect });
    for (const destination of paths.find(path => path.id === 'hill-moon').points.filter(point => point.y >= 6900)) {
      state = walk(state, destination, { speed: 200, fps, observe: inspect });
    }
    assert.deepEqual(arrivals, ['invitation', 'door']);
    state = hold(state, 2, { fps, observe: inspect });
    assert.ok(state.lift <= 4.05 && state.speed === 0);
  }
});

check('invalid optional speed samples cannot poison the next animation frame', () => {
  const state = meet();
  for (const speed of [NaN, Infinity, -Infinity, -5]) {
    const next = advancePaperGuide(state, state.actor, 1 / 60, { speed });
    assert.ok(Object.values(next).filter(value => typeof value === 'number').every(Number.isFinite));
    assert.ok(next.playerSpeed >= 0);
  }
});

console.log(`${checks - failures}/${checks} paper guide checks passed.`);
if (failures) process.exitCode = 1;
