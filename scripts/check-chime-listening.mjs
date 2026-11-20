import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';
registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/src/') ? `${specifier}.ts` : specifier, context);
} });
const { advanceChimeListening: advance, createChimeListening: create, resumeChimeListening: resume,
  chimeListeningPose: pose, chimeFirstCrossing } = await import('../src/scene/chimeListening.ts');
const { archComposition: arch, chimeArtwork } = await import('../src/scene/hollowArch.ts');
const { atlasEncounterSites, chimeInteractionRadius } = await import('../src/scene/atlasInteraction.ts');
const point = (dx, dy = 0) => ({ x: arch.x + dx, y: arch.y + dy });
const wait = (state, seconds, fps = 60, options = {}) => {
  for (let i = 0; i < Math.round(seconds * fps); i++) state = advance(state, state.actor, 1 / fps, { speed: 0, ...options });
  return state;
};
function approach(side = -1, fps = 60, stop = 220) {
  let state = create(point(side * 500));
  for (let i = 1; i <= fps * 2; i++) state = advance(state, point(side * (500 - (500 - stop) * i / (fps * 2))), 1 / fps, { speed: (500 - stop) / 2 });
  return state;
}
let checks = 0;
function check(name, run) { run(); checks++; console.log(`PASS: ${name}`); }

check('a stationary mount, tiny jitter, or map jump does not ring', () => {
  let state = wait(create(point(100)), 20);
  assert.equal(state.responseAge, -1); assert.equal(state.noteSerial, 0);
  for (let i = 0; i < 10; i++) state = advance(state, point(100 + i * .04), 1 / 60);
  state = wait(state, 4); assert.equal(state.responseAge, -1);
  state = advance(create(point(1800)), point(100), 1 / 60);
  state = wait(state, 20); assert.equal(state.responseAge, -1); assert.equal(state.noteSerial, 0);
});
check('an actual approach and brief rest start one finite greeting', () => {
  let state = approach(); assert.equal(state.responseAge, -1);
  state = wait(state, 1.2); assert.ok(state.responseAge >= 0 && state.responseAge < 1);
  assert.ok(state.discovered && state.playedVisit);
  state = wait(state, 30); assert.equal(state.responseAge, 8.5); assert.equal(state.noteSerial, 1);
  state = wait(state, 30); assert.equal(state.noteSerial, 1);
});
check('walking through answers without forcing a pause', () => {
  const state = approach(-1, 60, 80);
  assert.ok(state.responseAge >= 0 && state.discovered);
});
check('the E prompt and manual response share the expanded range in every direction, even while walking', () => {
  assert.equal(atlasEncounterSites.find(site => site.id === 'arch').radius, chimeInteractionRadius);
  assert.ok(chimeInteractionRadius > 600);
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    const actor = point(Math.cos(angle) * (chimeInteractionRadius - 1), Math.sin(angle) * (chimeInteractionRadius - 1));
    let state = advance(create(actor), actor, 1 / 60, { speed: 200, replaySerial: 1 });
    assert.equal(state.responseAge, 0, `E at angle ${angle} must work outside the natural approach circle`);
    assert.equal(state.responseSide, actor.x < arch.x ? -1 : 1);
    state = wait(state, 2); assert.equal(state.noteSerial, 1);
  }
});
check('an out-of-range E is not queued for later; a fresh E works once nearby', () => {
  const outside = point(chimeInteractionRadius + 1), inside = point(chimeInteractionRadius - 20);
  let state = advance(create(outside), outside, 1 / 60, { replaySerial: 1 });
  assert.equal(state.responseAge, -1);
  state = advance(state, inside, 1 / 60, { replaySerial: 1 });
  assert.equal(state.responseAge, -1);
  state = advance(state, inside, 1 / 60, { replaySerial: 2 });
  assert.equal(state.responseAge, 0);
});
check('the larger manual range does not create distant automatic greetings or bypass reading', () => {
  let state = create(point(chimeInteractionRadius - 20));
  for (let i = 1; i <= 60; i++) state = advance(state, point(chimeInteractionRadius - 20 - i), 1 / 60, { speed: 60 });
  state = wait(state, 5); assert.equal(state.responseAge, -1);
  assert.equal(advance(state, state.actor, 1 / 60, { paused: true, replaySerial: 1 }), state);
});
check('paper leads the bell and approach direction is preserved', () => {
  const base = { ...create(point(-220)), responseAge: .16, responseStrength: 1, responseSide: -1 };
  const rest = pose({ ...base, responseAge: -1 });
  const early = pose(base);
  assert.equal(early.bellAngle, rest.bellAngle);
  assert.ok(Math.abs(early.paperAngle - rest.paperAngle) > .25);
  for (const age of [.4, .7, 1.1, 2.3]) {
    const left = pose({ ...base, responseAge: age, responseSide: -1 });
    const right = pose({ ...base, responseAge: age, responseSide: 1 });
    assert.ok(Math.abs(left.bellAngle + right.bellAngle - 2 * rest.bellAngle) < 1e-12);
    assert.ok(Math.abs(left.paperAngle + right.paperAngle - 2 * rest.paperAngle) < 1e-12);
  }
});
check('sound is emitted once at the bell crossing, never during the paper lift', () => {
  let state = { ...create(point(-200)), responseAge: 0, notePlayed: false, discovered: true, playedVisit: true };
  for (let i = 0; i < 180; i++) {
    state = advance(state, state.actor, 1 / 120);
    assert.equal(state.noteSerial, state.responseAge >= chimeFirstCrossing ? 1 : 0);
  }
  const before = pose({ ...state, time: 0, responseSide: 1, responseAge: chimeFirstCrossing - .001 });
  const after = pose({ ...state, time: 0, responseSide: 1, responseAge: chimeFirstCrossing + .001 });
  assert.ok(before.bellAngle > 0 && after.bellAngle < 0);
  state = wait(state, 10); assert.equal(state.noteSerial, 1);
});
check('reading, background suspension, and same-place remount preserve the snapshot', () => {
  const state = { ...wait(approach(), 1.2), responseAge: .7 };
  assert.equal(advance(state, point(250), .04, { paused: true }), state);
  assert.deepEqual(advance(state, state.actor, 5), state);
  assert.deepEqual(resume(state, state.actor), state);
  assert.deepEqual(pose(resume(state, state.actor), .3), pose(state, .3));
  const windy = advance(state, state.actor, .02, { windLean: .6 });
  assert.deepEqual(pose(windy), pose(windy, .6));
  const relocated = resume(state, point(1500));
  assert.equal(relocated.responseAge, -1); assert.equal(relocated.noteSerial, state.noteSerial);
  assert.equal(wait(relocated, 5).noteSerial, state.noteSerial);
  const jumped = advance(state, point(1500), .02);
  assert.equal(jumped.responseAge, -1); assert.equal(wait(jumped, 5).noteSerial, state.noteSerial);
});
check('returning from the other side cannot reverse a response already in flight', () => {
  let state = { ...create(point(450)), responseAge: .6, responseSide: -1, discovered: true, notePlayed: false };
  for (let i = 1; i <= 20; i++) state = advance(state, point(450 - i * 5), 1 / 60, { speed: 300 });
  assert.equal(state.approachSide, 1); assert.equal(state.responseSide, -1);
});
check('natural revisits are softer; a deliberate replay responds during the old settling period', () => {
  let state = wait(approach(), 15);
  for (let i = 1; i <= 60; i++) state = advance(state, point(-220 - 300 * i / 60), 1 / 60, { speed: 300 });
  for (let i = 1; i <= 60; i++) state = advance(state, point(-520 + 300 * i / 60), 1 / 60, { speed: 300 });
  state = wait(state, 1.6); assert.equal(state.responseStrength, .64); assert.ok(state.responseAge >= .4);
  state = advance(state, state.actor, 1 / 60, { replaySerial: 2 });
  assert.equal(state.responseAge, 0, 'a visible replay button must accept the new push');
  assert.equal(state.responseStrength, 1, 'an explicit push must remain visible on revisits');
  state = wait(state, 15); assert.equal(state.noteSerial, 2);
  state = advance(state, state.actor, 1 / 60, { replaySerial: 3 });
  assert.equal(state.responseAge, 0); assert.equal(wait(state, 2).noteSerial, 3);
});
check('clicking during any active phase carries angle and velocity into a fresh visible response', () => {
  for (const age of [.5, 1.3, 4, 8.4]) {
    let state = wait(advance(create(point(-160)), point(-160), 1 / 60, { replaySerial: 1 }), age);
    const before = pose(state), next = pose({ ...state, responseAge: state.responseAge + .0001 });
    state = advance(state, state.actor, 1 / 60, { replaySerial: 2 });
    const after = pose({ ...state, time: state.time - 1 / 60 });
    assert.equal(state.responseAge, 0);
    for (const key of ['bellAngle','paperAngle']) {
      assert.ok(Math.abs(before[key] - after[key]) < 1e-9, `${key} must not jump at age ${age}`);
      const afterNext = pose({ ...state, time: state.time - 1 / 60, responseAge: .0001 });
      assert.ok(Math.abs((next[key]-before[key])/.0001 - (afterNext[key]-after[key])/.0001) < .01, `${key} keeps its velocity`);
    }
    const notes=state.noteSerial;
    state=wait(state,.6);
    assert.ok(Math.abs(pose(state).paperAngle)>.2, 'a new push is visible before one second');
    state=wait(state,10);
    assert.equal(state.noteSerial,notes+1, 'one optional note after the new push');
    assert.equal(state.responseAge,8.5);
  }
});
check('a double-click during the first visible lift does not stall the swing',()=>{
  let state=advance(create(point(-160)),point(-160),1/60,{replaySerial:1});
  state=wait(state,.1);
  const age=state.responseAge;
  state=advance(state,state.actor,1/60,{replaySerial:2});
  assert.ok(state.responseAge>age);
  state=wait(state,.5);assert.ok(Math.abs(pose(state).paperAngle)>.2);
});
check('repeated explicit pushes stay bounded and stop after the last push without queued replays', () => {
  let state=create(point(140));
  for(let serial=1;serial<=40;serial++) {
    state=advance(state,state.actor,1/60,{replaySerial:serial});
    state=wait(state,.1);
    assert.ok(Math.abs(pose(state).paperAngle)<1.2);
    assert.ok(Math.abs(pose(state).bellAngle)<.4);
  }
  state=wait(state,12);
  const ended=pose(state),baseline=pose({...state,responseAge:-1});
  assert.equal(ended.paperAngle,baseline.paperAngle);
  assert.equal(ended.bellAngle,baseline.bellAngle);
  const notes=state.noteSerial;
  state=wait(state,12);assert.equal(state.noteSerial,notes);
});
check('finite poses remain continuous and return exactly to baseline wind', () => {
  const state = create(point(0));
  for (let age = 0; age <= 9; age += .002) {
    const a = pose({ ...state, responseAge: age }, .4), b = pose({ ...state, responseAge: age + .001 }, .4);
    assert.ok(Number.isFinite(a.bellAngle) && Number.isFinite(a.paperAngle));
    assert.ok(Math.abs(a.bellAngle) < .2 && Math.abs(a.paperAngle) < .6);
    assert.ok(Math.abs(a.bellAngle - b.bellAngle) < .003 && Math.abs(a.paperAngle - b.paperAngle) < .009);
  }
  const end = pose({ ...state, responseAge: 8.5 }, .4), rest = pose(state, .4);
  assert.equal(end.bellAngle, rest.bellAngle); assert.equal(end.paperAngle, rest.paperAngle);
});
check('frame rates agree on trigger timing and all note crossings', () => {
  const states = [30, 60, 120].map(fps => wait(approach(-1, fps), 2, fps));
  assert.ok(Math.max(...states.map(s => s.responseAge)) - Math.min(...states.map(s => s.responseAge)) < .08);
  assert.ok(states.every(s => s.noteSerial === 1 && s.discovered));
});
check('separate full-sheet artwork shares the original axis and exact hanging pivot', () => {
  assert.equal(chimeArtwork.top / chimeArtwork.height, arch.chimeTop);
  const hinge = arch.chimeH * (arch.chimeTop - chimeArtwork.paperPivot / chimeArtwork.height);
  const center = arch.chimeH * (chimeArtwork.paperPivot / chimeArtwork.height - .5);
  assert.ok(Math.abs(hinge + center - arch.chimeH * (arch.chimeTop - .5)) < 1e-12);
  const pixelAtHinge = center + arch.chimeH * (.5 - chimeArtwork.paperPivot / chimeArtwork.height);
  assert.ok(Math.abs(pixelAtHinge) < 1e-12);
});
check('invalid updates are inert and optional note memory is bounded', () => {
  const state = create(point(0));
  assert.equal(advance(state, point(0), NaN), state);
  assert.equal(advance(state, { x: NaN, y: 0 }, .01), state);
  const capped = advance({ ...state, noteSerial: 64, notePlayed: false, responseAge: chimeFirstCrossing - .001 }, state.actor, .02);
  assert.equal(capped.noteSerial, 64); assert.ok(capped.notePlayed);
});
console.log(`${checks} chime-listening checks passed.`);
