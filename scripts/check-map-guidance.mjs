import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Execute the actual map component and its callbacks without creating player
// progress or browser storage. Browser layout is checked separately.
const projectRequire = createRequire(import.meta.url);
const viteRequire = createRequire(projectRequire.resolve('vite/package.json'));
const { build } = viteRequire('esbuild');
const bundled = await build({
  absWorkingDir: fileURLToPath(new URL('..', import.meta.url)),
  stdin: { contents: "export { GardenMap } from './src/scene/GardenMap'; export { regions, paths, playBounds } from './src/scene/gardenAtlas';", resolveDir: fileURLToPath(new URL('..', import.meta.url)) },
  bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', loader: { '.css': 'empty' },
  plugins: [{ name: 'map-component-host', setup(builder) {
    builder.onResolve({ filter: /^react\/jsx-runtime$/ }, args => ({ path: args.path, namespace: 'component-host' }));
    builder.onLoad({ filter: /.*/, namespace: 'component-host' }, () => ({ contents: "export const jsx=(type,props,key)=>({type,props:props||{},key}); export const jsxs=jsx;" }));
  } }],
});
const module = { exports: {} };
new Function('module', 'exports', bundled.outputFiles[0].text)(module, module.exports);
const { GardenMap, regions, paths, playBounds } = module.exports;
const entry = regions.find(region => region.id === 'entry');
const desk = regions.find(region => region.id === 'lantern');
const firstTrail = paths.find(path => path.from === 'entry' && path.to === 'lantern');
const nodes = tree => tree === null || tree === undefined || typeof tree !== 'object' ? []
  : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
const text = tree => tree === null || tree === undefined || typeof tree === 'boolean' ? ''
  : Array.isArray(tree) ? tree.map(text).join('') : typeof tree === 'object' ? text(tree.props?.children) : String(tree);
const byClass = (tree, name) => nodes(tree).find(node => node.props.className?.split(' ').includes(name));
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} differs from ${b}`);
const pointList = node => node.props.points.split(' ').map(point => point.split(',').map(Number));
const markerPosition = marker => marker.props.transform.match(/translate\(([^)]+)\)/)[1].split(' ').map(Number);
function render(overrides = {}) {
  const travels = [], closes = [];
  const props = { actor: entry, visited: ['entry'], travel: region => travels.push(region), onClose: () => closes.push(true), ...overrides };
  const tree = GardenMap(props);
  return { tree, travels, closes, props };
}
const returnButtons = tree => nodes(byClass(tree, 'map-places')).filter(node => node.type === 'button');
let passed = 0, failed = 0;
function check(name, run) {
  try { run(); passed++; console.log(`PASS: ${name}`); }
  catch (error) { failed++; console.error(`FAIL: ${name}\n${error.stack}`); }
}

check('the next puzzle desk is a clue, not an unvisited return destination', () => {
  const { tree, travels } = render();
  const marker = nodes(tree).find(node => node.props['data-map-clue'] === 'lantern');
  assert.ok(marker);
  assert.equal(nodes(marker).some(node => node.type === 'button' || node.type === 'a' || node.props.onClick || node.props.tabIndex !== undefined), false);
  assert.ok(byClass(tree, 'map-next-clue'));
  assert.equal(returnButtons(tree).length, 1);
  returnButtons(tree)[0].props.onClick();
  assert.deepEqual(travels.map(region => region.id), ['entry']);
  for (const region of regions.filter(region => !['entry', 'lantern'].includes(region.id))) {
    assert.equal(text(tree).includes(region.name), false, `${region.id} must remain unnamed`);
  }
});

check('the current route reaches the clue, while future destinations remain hidden', () => {
  const { tree } = render();
  const line = nodes(tree).find(node => node.props['data-map-route'] === 'lantern');
  assert.ok(line?.props.strokeDasharray);
  const endpoint = pointList(line).at(-1);
  const marker = markerPosition(nodes(tree).find(node => node.props['data-map-clue']));
  near(endpoint[0], marker[0]); near(endpoint[1], marker[1]);
  assert.equal(nodes(tree).filter(node => node.props['data-map-known']).length, 1);
});

check('the first route, lantern marker and label stay inside the map when the player wanders', () => {
  const actors = [...firstTrail.points, ...regions];
  for (const x of [playBounds.minX, playBounds.maxX]) for (const y of [playBounds.minY, playBounds.maxY]) actors.push({ x, y });
  for (const actor of actors) for (const visited of [[], ['entry'], ['entry', 'moon']]) {
    const { tree } = render({ actor, visited });
    const marker = nodes(tree).find(node => node.props['data-map-clue']);
    const [x, y] = markerPosition(marker);
    assert.ok(Number.isFinite(x) && Number.isFinite(y));
    // Reserve 50 SVG units on either side for the label, plus its baseline below.
    assert.ok(x >= 50 && x <= 470 && y >= 11 && y + 32 <= 190, `clue would clip at ${x},${y}`);
    const trail = nodes(tree).find(node => node.props['data-map-route'] === 'lantern');
    assert.ok(pointList(trail).every(([px, py]) => px >= 0 && px <= 520 && py >= 0 && py <= 190), 'the first trail must remain in frame');
  }
});

check('visiting the desk replaces its clue marker with a genuine return button', () => {
  const { tree, travels } = render({ actor: desk, visited: ['entry', 'lantern'] });
  assert.equal(nodes(tree).find(node => node.props['data-map-clue']), undefined);
  assert.ok(nodes(tree).find(node => node.props['data-map-known'] === 'lantern'));
  const button = returnButtons(tree).find(node => text(node).includes('The puzzle desk'));
  assert.ok(button); button.props.onClick();
  assert.deepEqual(travels, [desk]);
  assert.ok(text(byClass(tree, 'map-next-clue')).includes('Click the desk'));
  for (const line of nodes(tree).filter(node => node.type === 'polyline' && node.props['data-map-path'] && node.props['data-map-path'] !== firstTrail.id)) {
    const path = paths.find(path => path.id === line.props['data-map-path']);
    assert.ok(pointList(line).length < path.points.length, 'unvisited trails must remain short stubs');
  }
});

check('the desk remains current until packed, then music becomes the clue without unseen returns', () => {
  const started = render({ visited: ['entry', 'lantern'], puzzleStarted: true });
  assert.ok(byClass(started.tree, 'map-next-clue'));
  assert.ok(text(byClass(started.tree, 'map-next-clue')).includes('waiting'));
  const unpacked = render({ puzzleStarted: true, puzzleSolved: true });
  assert.equal(byClass(unpacked.tree, 'map-next-clue').props['data-next-goal'], 'desk');
  const solved = render({ puzzleStarted: true, puzzleSolved: true, envelopeStored: true });
  assert.equal(byClass(solved.tree, 'map-next-clue').props['data-next-goal'], 'music');
  assert.equal(nodes(solved.tree).find(node => node.props['data-map-clue']).props['data-map-clue'], 'orchard');
  assert.equal(returnButtons(solved.tree).length, 1);
  returnButtons(solved.tree)[0].props.onClick();
  assert.deepEqual(solved.travels.map(region => region.id), ['entry']);
  const trail = nodes(solved.tree).find(node => node.props['data-map-path'] === firstTrail.id);
  assert.ok(pointList(trail).length < firstTrail.points.length);
});

check('a drawn song points to the gift from the actual position; opened gifts end the main-line clue', () => {
  const props = { actor: desk, visited: ['entry', 'lantern'], puzzleSolved: true, envelopeStored: true, hasSong: true };
  const { tree, travels } = render(props);
  assert.equal(byClass(tree, 'map-next-clue').props['data-next-goal'], 'gift');
  assert.ok(nodes(tree).find(node => node.props['data-map-route'] === 'moon'));
  assert.equal(returnButtons(tree).some(node => text(node).includes('moonlight')), false);
  assert.equal(travels.length, 0);
  assert.equal(byClass(render({ ...props, giftUnlocked: true }).tree, 'map-next-clue'), undefined);
});

check('all return actions correspond exactly to visited areas and never change supplied progress', () => {
  const visits = [[], ['entry'], ['entry', 'lantern'], ['entry', 'orchard', 'pond'], regions.map(region => region.id)];
  for (const visited of visits) for (const puzzleSolved of [false, true]) {
    const frozenVisits = Object.freeze([...visited]);
    const { tree, travels } = render({ visited: frozenVisits, puzzleSolved, puzzleStarted: true });
    for (const button of returnButtons(tree)) button.props.onClick();
    assert.deepEqual(travels.map(region => region.id).sort(), [...visited].sort());
    assert.deepEqual(frozenVisits, visited);
    assert.equal(text(tree).includes('0305'), false, 'map must not expose the password');
  }
});

check('closing the map only closes it and never moves the player', () => {
  const { tree, travels, closes } = render();
  const button = nodes(tree).find(node => node.type === 'button' && node.props['aria-label'] === 'Close map');
  assert.ok(button); button.props.onClick();
  assert.equal(closes.length, 1); assert.equal(travels.length, 0);
});
console.log(`\nMap guidance component: ${passed} passed, ${failed} failed.`);
if (failed) process.exitCode = 1;
