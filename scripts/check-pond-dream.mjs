import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';
registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/src/') ? `${specifier}.ts` : specifier, context);
} });
const { createPondDream, advancePondDream, resumePondDream, inspectPondDream, DREAM_TRAIL_LIMIT, DREAM_TRAIL_LIFETIME } = await import('../src/scene/pondDream.ts');
const centre = { x: -1200, y: 3200 };
const bank = angle => ({ x: centre.x + Math.cos(angle) * 420, y: centre.y + Math.sin(angle) * 300 });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
let checks = 0, failures = 0;
function check(name, fn) { checks++; try { fn(); console.log(`PASS: ${name}`); } catch (error) { failures++; console.error(`FAIL: ${name}\n${error.stack}`); } }
function frames(state, seconds, { fps = 60, actor = state.actor, observe, ...options } = {}) {
  const n = Math.ceil(seconds * fps), dt = seconds / n;
  for (let i = 1; i <= n; i++) { state = advancePondDream(state, typeof actor === 'function' ? actor(i / n) : actor, dt, options); observe?.(state, i / n); }
  return state;
}
function walk(state, target, { fps = 60, speed = 180, observe } = {}) {
  const start = state.actor, length = distance(start, target);
  return frames(state, length / speed, { fps, speed, observe, actor: p => ({ x: start.x + (target.x - start.x) * p, y: start.y + (target.y - start.y) * p }) });
}
function approach(angle = -Math.PI / 2, fps = 60) {
  const end = bank(angle), start = { x: end.x + Math.cos(angle) * 310, y: end.y + Math.sin(angle) * 310 };
  return walk(createPondDream(start), end, { fps });
}
function along(state, a, b, seconds = 3, fps = 60, observe) {
  return frames(state, seconds, { fps, observe, actor: p => bank(a + (b - a) * p) });
}

check('stationary mount has no reflection, encounter or night trail', () => {
  const state = frames(createPondDream(bank(-Math.PI / 2)), 40);
  assert.equal(state.engaged, false); assert.equal(state.presence, 0); assert.equal(state.phase, 'dormant'); assert.deepEqual(state.trail, []);
});
check('actual approach starts a visible mirror and gradually frees it', () => {
  let sawMirror = false, state = createPondDream({ x: -1200, y: 2500 });
  state = walk(state, bank(-Math.PI / 2), { observe: next => { if (next.phase === 'mirror' && next.presence > .2) sawMirror = true; } });
  state = frames(state, 1.8);
  assert.ok(sawMirror); assert.ok(state.presence > .95 && state.playfulness > .9 && state.coastStarted);
});
check('shore travel leaves a delayed reflection instead of pinning it under the visitor', () => {
  let state = frames(approach(), .3);
  state = along(state, -Math.PI / 2, -.15, 3);
  const fresh = createPondDream(state.actor).reflection;
  assert.ok(distance(state.reflection, fresh) > 45);
  assert.ok(state.trail.length >= 5 && state.trail.every(p => p.strength > .5));
});
check('when the player stops the reflection swims visibly onward and then rests', () => {
  const moving = along(approach(), -Math.PI / 2, -.7, 2.6);
  const stoppedAt = { ...moving.reflection }, after = frames(moving, 2.8);
  assert.ok(distance(stoppedAt, after.reflection) > 65, `post-stop travel ${distance(stoppedAt, after.reflection)}`);
  const settled = frames(after, 12), later = frames(settled, 30);
  assert.equal(later.phase, 'rest'); assert.ok(distance(settled.reflection, later.reflection) < .1);
  assert.ok(Math.hypot(later.reflection.vx, later.reflection.vy) < .03);
  assert.equal(later.trail.length, 0, 'idle must not repaint the same star trail');
});
check('a turn retains velocity before the reflected swimmer follows the new direction', () => {
  const moving = along(approach(), -Math.PI / 2, -.4, 3);
  const velocity = { x: moving.reflection.vx, y: moving.reflection.vy };
  let peakStep = 0, previous = moving.reflection;
  const first = along(moving, -.4, -.43, .08, 60, state => { peakStep = Math.max(peakStep, distance(state.reflection, previous)); previous = state.reflection; });
  assert.ok(first.reflection.vx * velocity.x + first.reflection.vy * velocity.y > 0, 'turn must retain its previous momentum briefly');
  const reversed = along(first, -.43, -1.4, 3);
  assert.ok(reversed.reflection.x < first.reflection.x - 40); assert.ok(peakStep < 8);
});
check('different shoreline gestures produce visibly different night trails', () => {
  const straight = along(approach(), -Math.PI / 2, -.1, 5);
  let folded = along(approach(), -Math.PI / 2, -.5, 2.5); folded = along(folded, -.5, -2.3, 2.5);
  assert.ok(distance(straight.reflection, folded.reflection) > 110);
  const xs = trace => Math.max(...trace.map(p => p.x)) - Math.min(...trace.map(p => p.x));
  assert.ok(xs(folded.trail) > 100); assert.notDeepEqual(straight.trail, folded.trail);
});
check('leaving the bank remasks the night and a later real approach can play again', () => {
  let state = along(approach(), -Math.PI / 2, -.4, 3);
  state = walk(state, { x: -300, y: 3500 }); state = frames(state, 4);
  assert.equal(state.engaged, false); assert.ok(state.presence < .005 && state.playfulness < .005); assert.deepEqual(state.trail, []);
  state = walk(state, bank(-.4)); state = frames(state, 1.7);
  assert.ok(state.engaged && state.presence > .9 && state.playfulness > .8);
});
check('reading freezes all motion and trail age exactly', () => {
  const state = along(approach(), -Math.PI / 2, -.6, 2);
  assert.equal(advancePondDream(state, { x: 10000, y: 10000 }, 6, { paused: true }), state);
  assert.deepEqual(inspectPondDream(resumePondDream(state, state.actor)), inspectPondDream(state));
});
check('map relocation clears the swimmer and history without painting a cross-map line', () => {
  const active = along(approach(), -Math.PI / 2, -.4, 3);
  for (const relocated of [resumePondDream(active, bank(Math.PI / 2)), advancePondDream(active, bank(Math.PI / 2), 1 / 60)]) {
    assert.equal(relocated.presence, 0); assert.equal(relocated.engaged, false); assert.equal(relocated.history.length, 1); assert.equal(relocated.trail.length, 0);
    const waiting = frames(relocated, 20); assert.equal(waiting.presence, 0); assert.equal(waiting.trail.length, 0);
  }
});
check('background or invalid timing cannot advance the toy', () => {
  const state = along(approach(), -Math.PI / 2, -.4, 3);
  const background = advancePondDream(state, state.actor, 5);
  assert.deepEqual(inspectPondDream(background), inspectPondDream(state));
  assert.equal(advancePondDream(state, state.actor, NaN), state);
  assert.equal(advancePondDream(state, { x: NaN, y: 0 }, .016), state);
});
check('body and rabbit ears stay inside the painted water on every bank', () => {
  // Cover the enlarged rendered silhouette, including the outer soft edge,
  // ear rotation, horizontal water distortion and the irregular shore mask.
  // The separate faint halo is intentionally allowed to dissolve at the shore.
  const silhouette = [];
  for (let i = 0; i < 64; i++) {
    const a = i / 64 * Math.PI * 2;
    const fluff = .90 + Math.sin(a * 17 + .4) * .025 + Math.sin(a * 29) * .018 + .16;
    silhouette.push([Math.cos(a) * 46 * fluff, Math.sin(a) * 39 * fluff]);
    for (const [cx, cy, turn] of [[-16, 43, -.17], [16, 45, .20]]) {
      const x = Math.cos(a) * 13 * 1.06, y = Math.sin(a) * 28 * 1.06;
      silhouette.push([cx + x * Math.cos(turn) - y * Math.sin(turn), cy + x * Math.sin(turn) + y * Math.cos(turn)]);
    }
  }
  const inside = p => {
    for (const [dx, dy] of silhouette) for (const distortion of [-2.2, 2.2]) {
      const norm = Math.hypot((p.x + dx + distortion + 1200) / 380, (p.y + dy - 3200) / 250);
      assert.ok(norm + .0085 < .95, `enlarged silhouette exits shoreline at ${norm}`);
    }
  };
  // Include every extremal legal centre, not just the path chosen by this run.
  for (let i = 0; i < 96; i++) {
    const angle = i / 96 * Math.PI * 2;
    inside({ x: -1200 + Math.cos(angle) * 380 * .62, y: 3200 + Math.sin(angle) * 250 * .62 });
  }
  let state = approach();
  state = along(state, -Math.PI / 2, Math.PI * 3.5, 40, 60, state => {
    const p = state.reflection;
    assert.ok(Math.hypot((p.x + 1200) / 380, (p.y - 3200) / 250) <= .620001);
    inside(p);
  });
  assert.ok(state.engaged);
});
check('long play keeps target history and painted traces bounded', () => {
  let state = approach();
  state = frames(state, 180, { actor: t => bank(-Math.PI / 2 + Math.sin(t * 90) * 1.2), observe: state => {
    assert.ok(state.history.length <= 36); assert.ok(state.trail.length <= DREAM_TRAIL_LIMIT);
    assert.ok(state.trail.every(p => p.age < DREAM_TRAIL_LIFETIME));
  } });
  assert.ok(state.trail.length > 0);
});
check('30, 60 and 120 Hz keep the same delay, coast and final position', () => {
  const results = [30, 60, 120].map(fps => {
    let state = approach(-Math.PI / 2, fps);
    state = along(state, -Math.PI / 2, -.4, 3, fps); state = along(state, -.4, -1.8, 3, fps); state = frames(state, 4, { fps });
    return state;
  });
  for (const state of results) {
    assert.ok(distance(state.reflection, results[1].reflection) < 9);
    assert.equal(state.phase, 'rest'); assert.ok(state.playfulness > .99);
  }
});
check('moving again after a long rest starts another playful response', () => {
  let state = frames(approach(), 25); const rest = { ...state.reflection };
  state = along(state, -Math.PI / 2, -.5, 3); const moving = { ...state.reflection };
  assert.equal(state.phase, 'play'); assert.ok(distance(rest, moving) > 45);
  state = frames(state, 3); assert.ok(distance(moving, state.reflection) > 60);
});
console.log(`\n${checks - failures}/${checks} pond dream checks passed.`);
if (failures) process.exitCode = 1;
