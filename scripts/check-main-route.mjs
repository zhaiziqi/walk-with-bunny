import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/src/')) return nextResolve(`${specifier}.ts`, context);
  return nextResolve(specifier, context);
} });
const { mainRouteGoal, mainRouteFrom, mainRouteText } = await import('../src/scene/mainRouteGuide.ts');
const { regions, paths, playBounds } = await import('../src/scene/gardenAtlas.ts');
const { LARGE_POND_BANK: bank } = await import('../src/scene/walkableGround.ts');
const base = { puzzleSolved: false, envelopeStored: false, hasSong: false, giftUnlocked: false };
const goal = overrides => mainRouteGoal({ ...base, ...overrides });
let passed = 0;
function check(name, run) { run(); passed++; console.log(`PASS: ${name}`); }
const radius = p => Math.hypot((p.x - bank.x) / bank.radiusX, (p.y - bank.y) / bank.radiusY);

check('progress chooses desk, packing, music, gift, then quiet without granting any progress', () => {
  assert.equal(goal({}).id, 'desk');
  assert.equal(goal({ hasSong: true }).id, 'desk');
  assert.equal(goal({ puzzleSolved: true }).id, 'desk');
  assert.equal(goal({ puzzleSolved: true, envelopeStored: true }).id, 'music');
  assert.equal(goal({ puzzleSolved: true, envelopeStored: true, hasSong: true }).id, 'gift');
  assert.equal(goal({ giftUnlocked: true }), null);
  assert.deepEqual(base, { puzzleSolved: false, envelopeStored: false, hasSong: false, giftUnlocked: false });
});
check('closing a music panel at the desk routes from the desk rather than assuming arrival at music', () => {
  const desk = regions.find(r => r.id === 'lantern');
  const route = mainRouteFrom(desk, goal({ puzzleSolved: true, envelopeStored: true, hasSong: true }));
  assert.ok(Math.hypot(route.points[0].x - desk.x, route.points[0].y - desk.y) <= 110);
  assert.equal(route.goal.id, 'gift');
  assert.ok(route.waypoint.y < 2100);
  assert.deepEqual(route.points.at(-1), { x: -200, y: 8500 });
});
check('music directions work in both directions and end at the existing flower landmark', () => {
  const target = goal({ puzzleSolved: true, envelopeStored: true });
  const before = mainRouteFrom({ x: -650, y: 750 }, target);
  const after = mainRouteFrom({ x: 1400, y: 4300 }, target);
  assert.ok(before.waypoint.y > 750); assert.ok(after.waypoint.y < 4300);
  assert.deepEqual(before.points.at(-1), { x: 900, y: 2100 });
  assert.deepEqual(after.points.at(-1), { x: 900, y: 2100 });
});
check('side-path approaches join their nearby trail instead of teleporting or forcing the main centreline', () => {
  const target = goal({ puzzleSolved: true, envelopeStored: true, hasSong: true });
  const point = paths.find(p => p.id === 'firefly-sidepath').points[22];
  const route = mainRouteFrom(point, target);
  assert.equal(route.pathIds[0], 'firefly-sidepath');
  assert.ok(Math.hypot(route.points[0].x - point.x, route.points[0].y - point.y) <= 110);
});
check('the gift journey from music keeps the pond, hollow, arch and hill in order', () => {
  const target = goal({ puzzleSolved: true, envelopeStored: true, hasSong: true });
  const route = mainRouteFrom(regions.find(r => r.id === 'orchard'), target);
  assert.deepEqual(route.pathIds, ['orchard-pond', 'pond-hollow', 'hollow-arch', 'arch-hill', 'hill-moon']);
  assert.ok(route.waypoint.x < 900 && route.waypoint.y > 2100);
  const fromDesk = mainRouteFrom(regions.find(r => r.id === 'lantern'), target);
  assert.equal(fromDesk.pathIds[0], 'lantern-orchard', 'a panel link must not replace the actual route with the willow shortcut');
});
check('early steps on main trails continue forward rather than turning back to a shortcut', () => {
  const target = goal({ puzzleSolved: true, envelopeStored: true, hasSong: true });
  for (const id of ['orchard-pond', 'hollow-arch', 'arch-hill']) {
    const path = paths.find(p => p.id === id), index = Math.floor((path.points.length - 1) * .1);
    const actor = path.points[index], next = path.points[index + 1];
    const route = mainRouteFrom(actor, target);
    assert.equal(route.pathIds[0], id);
    assert.ok((route.waypoint.x - actor.x) * (next.x - actor.x) + (route.waypoint.y - actor.y) * (next.y - actor.y) > 0, `${id} turns back`);
    assert.ok(route.pathIds.every(pathId => !pathId.endsWith('-sidepath')));
  }
});
check('the pond bank and stone arch keep the onward main trail instead of skipping the hill', () => {
  const target = goal({ puzzleSolved: true, envelopeStored: true, hasSong: true });
  const shore = mainRouteFrom({ x: bank.x - bank.radiusX * 1.1 - 3, y: bank.y }, target);
  assert.deepEqual(shore.pathIds, ['pond-hollow', 'hollow-arch', 'arch-hill', 'hill-moon']);
  const arch = mainRouteFrom(regions.find(r => r.id === 'arch'), target);
  assert.deepEqual(arch.pathIds, ['arch-hill', 'hill-moon']);
  assert.ok(arch.waypoint.x > -1100 && arch.waypoint.y > 5400);
});
check('a walker deep in a chosen side path continues to its forward end then rejoins the main trail', () => {
  const target = goal({ puzzleSolved: true, envelopeStored: true, hasSong: true });
  for (const id of ['petal-sidepath', 'fern-sidepath', 'firefly-sidepath', 'moon-sidepath']) {
    const path = paths.find(p => p.id === id), index = Math.floor((path.points.length - 1) * .5);
    const actor = path.points[index], next = path.points[index + 1];
    const route = mainRouteFrom(actor, target);
    assert.equal(route.pathIds[0], id);
    assert.ok((route.waypoint.x - actor.x) * (next.x - actor.x) + (route.waypoint.y - actor.y) * (next.y - actor.y) > 0, `${id} calls the walker back`);
    assert.ok(route.pathIds.slice(1).every(pathId => !pathId.endsWith('-sidepath')), 'advice must not automatically add another shortcut');
    assert.deepEqual(route.points.at(-1), { x: -200, y: 8500 });
  }
});
check('advised trail segments never cut through the pond, even though its graph node is the water centre', () => {
  const targets = [goal({}), goal({ puzzleSolved: true, envelopeStored: true }), goal({ puzzleSolved: true, envelopeStored: true, hasSong: true })];
  const actors = [{ x: -1200, y: 2880 }, { x: -1650, y: 3200 }, { x: -1200, y: 3530 }, { x: -750, y: 3200 }, ...regions];
  for (const target of targets) for (const actor of actors) {
    const route = mainRouteFrom(actor, target);
    for (let i = 1; i < route.points.length; i++) {
      const a = route.points[i - 1], b = route.points[i];
      for (let t = 0; t <= 1; t += .1) assert.ok(radius({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }) >= 1, 'route enters water');
    }
    assert.ok(radius(route.waypoint) >= 1);
  }
});
check('advice remains finite at all map corners and reachable hints do not precede arrival', () => {
  const target = goal({ puzzleSolved: true, envelopeStored: true, hasSong: true });
  for (const x of [playBounds.minX, playBounds.maxX]) for (const y of [playBounds.minY, playBounds.maxY]) {
    const route = mainRouteFrom({ x, y }, target);
    assert.ok(Number.isFinite(route.waypoint.x) && Number.isFinite(route.waypoint.y));
    assert.equal(route.nearby, false);
  }
  const atDoor = mainRouteFrom({ x: -200, y: 8320 }, target);
  assert.equal(atDoor.nearby, true);
  assert.match(mainRouteText(target, true), /envelope/);
  assert.doesNotMatch(mainRouteText(target, false), /0305|Open the little door/);
});
check('a shore arrow itself points along dry ground rather than cutting across the curved route', () => {
  const target = goal({ puzzleSolved: true, envelopeStored: true, hasSong: true });
  for (let angle = 0; angle < Math.PI * 2; angle += .1) {
    const actor = { x: bank.x + bank.radiusX * 1.001 * Math.cos(angle), y: bank.y + bank.radiusY * 1.001 * Math.sin(angle) };
    const { waypoint } = mainRouteFrom(actor, target);
    for (let t = 0; t <= 1; t += .05) assert.ok(radius({ x: actor.x + (waypoint.x - actor.x) * t, y: actor.y + (waypoint.y - actor.y) * t }) >= 1);
  }
});
console.log(`\nMain route: ${passed} passed.`);
