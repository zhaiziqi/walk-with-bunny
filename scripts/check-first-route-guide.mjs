import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/src/')) return nextResolve(`${specifier}.ts`, context);
  return nextResolve(specifier, context);
} });
const { firstRouteGuide } = await import('../src/scene/firstRouteGuide.ts');
const { trailSites, createTrailState, advanceTrail } = await import('../src/scene/trailState.ts');
const { objects } = await import('../src/scene/world.ts');
const { landmarkReveal, depthVisibility } = await import('../src/scene/depthWorld.ts');
const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const clickRadiusMatch = app.match(/Math\.hypot\(actor\.x-object\.x,actor\.y-object\.y\)<(\d+(?:\.\d+)?)/);
assert.ok(clickRadiusMatch, 'Locate the live App click-radius predicate; update this probe if it is refactored.');
const clickRadius = Number(clickRadiusMatch[1]);
const lantern = objects.find(object => object.id === 'puzzle');
const guide = (actor, overrides = {}) => firstRouteGuide({ actor, events: [], started: false, solved: false, packed: false, reduced: false, ...overrides });
const around = (point, radius, angle) => ({ x: point.x + Math.cos(angle) * radius, y: point.y + Math.sin(angle) * radius });
let failures = 0;
const check = (name, run) => {
  try { run(); console.log(`PASS: ${name}`); }
  catch (error) { failures++; console.error(`FAIL: ${name}: ${error.message}`); }
};

check('resting wherever the flower hint appears actually opens the flower', () => {
  let prompted = 0;
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
    for (const radius of [0, trailSites.flower.radius - .1, trailSites.flower.radius + .1, 189.9]) {
      const actor = around(trailSites.flower, radius, angle);
      let state = createTrailState(actor);
      // The real interaction requires 1.35 seconds of stillness; give it 1.6 seconds.
      for (let frame = 0; frame < 96; frame++) state = advanceTrail(state, actor, false, 1 / 60, false).state;
      const hint = guide(actor);
      if (hint?.stage === 'flower') {
        prompted++;
        assert.equal(state.flowerOpen, true, `rest hint cannot open flower at radius ${radius}`);
      } else if (radius > trailSites.flower.radius) {
        assert.equal(state.flowerOpen, false, 'outside the flower interaction boundary');
      }
    }
  }
  assert.ok(prompted > 0, 'the first flower still needs a discoverable rest hint');
});

check('paper and keep-note prompts only appear while the landmark can be clicked', () => {
  let prompts = 0;
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
    for (const radius of [0, 155, 349.9, 350.1, clickRadius - .1, clickRadius + .1]) {
      const actor = around(lantern, radius, angle);
      for (const progress of [{}, { started: true }, { started: true, solved: true }]) {
        const hint = guide(actor, progress);
        if (!['desk', 'keep-note'].includes(hint?.stage)) continue;
        prompts++;
        assert.ok(Math.hypot(actor.x - lantern.x, actor.y - lantern.y) < clickRadius, `paper prompt outside ${clickRadius}-unit click radius`);
        assert.ok(landmarkReveal(lantern, actor) > .5, 'paper prompt must not precede landmark reveal');
        for (const [width, height] of [[1280, 720], [1440, 900], [2560, 1080]]) {
          const pose = { x: actor.x, y: actor.y + 220, zoom: 1 };
          assert.ok(depthVisibility(lantern, pose, width, height) > .35, `${width}×${height}: click target is not visible`);
        }
      }
    }
  }
  assert.ok(prompts > 0, 'the paper must still be advertised when it is reachable');
});

check('static scenes and the returning butterfly use a path hint, not impossible animation instructions', () => {
  const actor = { x: 100, y: -500 };
  assert.match(guide(actor, { events: ['trail-flower-open'] }).text, /butterfly/i, 'outbound butterfly guidance remains available');
  for (const point of [actor, trailSites.flower]) {
    for (const events of [[], ['trail-flower-open'], ['trail-flower-open', 'trail-guide-homeward']]) {
      const hint = guide(point, { reduced: true, events });
      assert.notEqual(hint?.stage, 'flower', 'static view must not request an animated bloom');
      assert.doesNotMatch(hint?.text ?? '', /butterfly/i, 'static view cannot advance a butterfly');
    }
    const homeward = guide(point, { events: ['trail-flower-open', 'trail-guide-homeward'] });
    assert.doesNotMatch(homeward?.text ?? '', /butterfly/i, 'homeward flight leads away from the desk');
  }
});

check('solved questions and a stored envelope never restart the first task', () => {
  const points = [{ x: 0, y: -1890 }, trailSites.flower, { x: 0, y: -500 }, lantern, { x: 0, y: 1300 }, { x: 900, y: 2100 }];
  for (const actor of points) {
    for (const events of [[], ['trail-flower-open']]) {
      for (const packed of [false, true]) {
        const hint = guide(actor, { events, started: true, solved: true, packed });
        assert.ok(hint === null || hint.stage === (packed ? 'onward' : 'keep-note'), `completed task restarted as ${hint?.stage}`);
        assert.doesNotMatch(hint?.text ?? '', /questions|first flower|butterfly/i);
      }
    }
  }
  assert.equal(guide(lantern, { started: true, solved: true }).stage, 'keep-note');
  assert.equal(guide(lantern, { started: true, solved: true, packed: true }).stage, 'onward');
});
if (failures) process.exitCode = 1;
