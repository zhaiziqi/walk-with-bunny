import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';
import { advanceAtlasInteraction, atlasEncounterSites, emptyAtlasInteraction } from '../src/scene/atlasInteraction.ts';
import { hillBirds, hillReveal, moonGround, moonLightResponse, moonMotes, moonMotePose, moonOrb, moonReveal, restoreHillMoonMemory } from '../src/scene/hillMoon.ts';

registerHooks({ resolve(specifier, context, next) {
  return next(specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/src/') ? `${specifier}.ts` : specifier, context);
} });
const { moonClearingTrail, moonClearingTint, moonTrailBounds } = await import('../src/scene/hillMoonAtmosphere.ts');
const { moonClearingField } = await import('../src/scene/moonClearing.ts');
const { paths, regions } = await import('../src/scene/gardenAtlas.ts');

let checks = 0;
const check = (name, run) => { run(); checks++; console.log(`PASS: ${name}`); };

check('four paper birds occupy different grounded perches and preserve the painted aspect ratio', () => {
  assert.equal(hillBirds.length, 4);
  assert.equal(new Set(hillBirds.map(p => `${p.x},${p.y}`)).size, 4);
  for (const bird of hillBirds) {
    assert.ok([bird.x,bird.y,bird.w,bird.h,bird.foot,bird.phase].every(Number.isFinite));
    assert.ok(Math.hypot(bird.x - 1000, bird.y - 6800) < 270);
    assert.ok(Math.abs(bird.w / bird.h - 256 / 224) < 1e-12);
    assert.equal(bird.foot, .72);
    assert.ok(bird.w >= 88 && bird.w <= 110);
  }
});
check('both destinations fade gradually from every direction, including when walking back', () => {
  for (const [fade, center] of [[hillReveal,{x:1000,y:6800}],[moonReveal,{x:-200,y:8500}]]) {
    assert.equal(fade(center), 1);
    assert.equal(fade({x:center.x + 1550,y:center.y}), 0);
    let previous = 0;
    for (let radius = 1600; radius >= 0; radius -= 2) {
      const alpha = fade({x:center.x + radius,y:center.y});
      assert.ok(alpha >= previous && alpha - previous < .0038);
      assert.equal(alpha, fade({x:center.x - radius,y:center.y}));
      assert.equal(alpha, fade({x:center.x,y:center.y - radius}));
      previous = alpha;
    }
  }
  assert.equal(hillReveal({x:-1100,y:5400}), 0);
  assert.equal(moonReveal({x:1000,y:6800}), 0);
});
check('moonlight remains a narrow approach to the gift door, with the moon beside and behind it', () => {
  const door = {x:-200,y:8500,w:340};
  assert.equal(moonGround.x, door.x);
  assert.ok(moonGround.y < door.y);
  assert.ok(moonGround.y + moonGround.h / 2 >= door.y);
  assert.ok(moonGround.w <= 450 && moonGround.h <= 550);
  assert.ok(moonOrb.y > door.y + 250 && moonOrb.x - moonOrb.w / 2 > door.x + door.w / 2 + 100);
  assert.ok(moonOrb.w <= 110 && moonOrb.lift <= 270);
  for (let age = 0; age <= 12; age += .01) {
    const light = moonLightResponse(age, true);
    assert.ok(light >= .17 && light <= .331);
    assert.ok(Math.abs(light - moonLightResponse(age + .001, true)) < .0001);
  }
  assert.equal(moonLightResponse(0, true), moonLightResponse(100, true));
});
check('six fixed motes drift locally instead of forming an orbit or an expanding ring', () => {
  assert.equal(moonMotes.length, 6);
  for (let i = 0; i < moonMotes.length; i++) {
    const rest = moonMotes[i];
    assert.ok(rest.size >= 3.5 && rest.size <= 5);
    for (const time of [0,1,7,24,83,1000]) for (const age of [0,2.5,6,100]) {
      const pose = moonMotePose(time, i, age);
      assert.ok(Math.abs(pose.x - rest.x) <= 14 && Math.abs(pose.y - rest.y) <= 9);
      assert.ok(Math.abs(pose.z - rest.z) <= 23);
      assert.ok(pose.opacity >= .28 && pose.opacity <= .601);
      assert.ok([pose.x,pose.y,pose.z,pose.opacity].every(Number.isFinite));
    }
  }
});
check('restoring either encounter consumes the old pulse without replaying, but a new visit or click still works', () => {
  for (const id of ['hill','moon']) {
    const site = atlasEncounterSites.find(s => s.id === id), actor = {x:site.x,y:site.y}, pulse = {id,serial:4};
    let state = restoreHillMoonMemory(emptyAtlasInteraction(), site, actor, [site.event], pulse);
    assert.equal(state.age, 100);
    assert.ok(state.inside && state.fired);
    assert.equal(advanceAtlasInteraction(state, site, 0, .05, false, true, {id,serial:5}), state);
    for (let i = 0; i < 100; i++) state = advanceAtlasInteraction(state, site, 0, .05, false, false, pulse);
    assert.equal(state.activations, 0);
    state = advanceAtlasInteraction(state, site, 0, .05, false, false, {id,serial:5});
    assert.equal(state.activations, 1);
    state = advanceAtlasInteraction(state, site, site.radius + 150, .05, true, false, {id,serial:5});
    for (let i = 0; i < 50; i++) state = advanceAtlasInteraction(state, site, 0, .05, false, false, {id,serial:5});
    assert.equal(state.activations, 2);
  }
});
check('unvisited hill keeps its existing dwell rule and other encounters keep their original state', () => {
  const hill = atlasEncounterSites.find(s => s.id === 'hill');
  assert.equal(hill.dwell, 1.1);
  let state = emptyAtlasInteraction();
  for (let i = 0; i < 20; i++) state = advanceAtlasInteraction(state, hill, 0, .05, false, false);
  assert.equal(state.activations, 0);
  for (let i = 0; i < 3; i++) state = advanceAtlasInteraction(state, hill, 0, .05, false, false);
  assert.equal(state.activations, 1);
  for (const site of atlasEncounterSites) {
    const original = emptyAtlasInteraction(), actor = {x:site.x,y:site.y};
    assert.equal(restoreHillMoonMemory(original, site, actor, []), original);
    if (site.id !== 'hill' && site.id !== 'moon') assert.equal(restoreHillMoonMemory(original, site, actor, [site.event]), original);
    else {
      const distant = restoreHillMoonMemory(original, site, {x:site.x + 2000,y:site.y}, [site.event]);
      assert.ok(!distant.inside && !distant.fired);
    }
  }
});
check('the painted approach survives outside moonlight, stays local and reaches the door sill without a gap', () => {
  // Regression: the static renderer used to return before painting this part of
  // the route, while WebGL painted it from the same trail mask.
  const base = [.4, .5, .45], bend = { x: 880, y: 7590 };
  assert.equal(moonClearingField(bend.x, bend.y).coverage, 0);
  assert.ok(moonClearingTrail(bend.x, bend.y) > .95);
  for (const phase of [0, 1]) {
    const painted = moonClearingTint(base, bend.x, bend.y, phase);
    assert.ok(painted.every((value, i) => value > base[i] + .08), 'the still view must keep the pale trail before the moon field begins');
  }
  const route = paths.find(path => path.id === 'hill-moon');
  for (let i = 1; i < route.points.length; i++) {
    const a = route.points[i - 1], b = route.points[i];
    for (const t of [0, .25, .5, .75, 1]) {
      const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
      if (y >= 7490 && y <= 8500) assert.ok(moonClearingTrail(x, y) > .95, `gap in the guide's path at ${x}, ${y}`);
    }
  }
  assert.ok(moonClearingTrail(-200, 8490) > .95);
  assert.ok(moonClearingTrail(-200, 8500) > .95, 'the path must meet the threshold');
  let previous = moonClearingTrail(-200, 8500);
  for (let y = 8501; y <= 8581; y++) {
    const value = moonClearingTrail(-200, y);
    assert.ok(Number.isFinite(value) && value >= 0 && value <= 1);
    assert.ok(Math.abs(value - previous) < .08, 'the end of the painted path must fade rather than cut off');
    previous = value;
  }
  assert.equal(previous, 0);
  const { minX, minY, width, height } = moonTrailBounds;
  for (let y = minY - 100; y <= minY + height + 100; y += 50) for (let x = minX - 100; x <= minX + width + 100; x += 50) {
    const value = moonClearingTrail(x, y);
    assert.ok(Number.isFinite(value) && value >= 0 && value <= 1);
    if (x <= minX || x >= minX + width || y <= minY || y >= minY + height) assert.equal(value, 0, 'paint must not spill outside its local texture bounds');
  }
  for (const region of regions.filter(region => region.id !== 'moon')) {
    assert.equal(moonClearingTrail(region.x, region.y), 0, region.id);
    assert.deepEqual(moonClearingTint(base, region.x, region.y, 1), base, region.id);
  }
  for (const [x, y] of [[NaN, 7590], [880, Infinity], [-Infinity, 8500]]) assert.equal(moonClearingTrail(x, y), 0);
});
console.log(`${checks} hill-to-moon checks passed.`);
