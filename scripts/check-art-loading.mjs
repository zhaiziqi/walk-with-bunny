import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { loadLocalImage } from '../src/scene/loadLocalImage.ts';

// Exercise the actual loader with controlled image events and time. These are
// lifecycle checks; real 404/static/WebGL appearance is checked in the browser.
const require = createRequire(import.meta.url);
const viteRequire = createRequire(require.resolve('vite/package.json'));
const { build } = viteRequire('esbuild');
const root = fileURLToPath(new URL('..', import.meta.url));
let passed = 0, failed = 0;
async function check(name, run) {
  try { await run(); passed++; console.log(`PASS: ${name}`); }
  catch (error) { failed++; console.error(`FAIL: ${name}\n${error.stack}`); }
}
async function withImages(run, throwOnSource = false) {
  const images = [], timers = new Map();
  let id = 0;
  class FakeImage {
    onload = null; onerror = null; naturalWidth = 0; naturalHeight = 0; removed = false;
    constructor() { images.push(this); }
    set src(value) { if (throwOnSource) throw new Error('Image request unavailable'); this.url = value; }
    removeAttribute(name) { assert.equal(name, 'src'); this.removed = true; }
    succeed() { this.naturalWidth = 64; this.naturalHeight = 96; this.onload?.(); }
  }
  const canvas = () => ({ width: 0, height: 0, getContext: () => ({ drawImage() {}, fillRect() {} }) });
  const replacements = {
    Image: FakeImage, location: { search: '' }, document: { createElement: canvas },
    window: { setTimeout(callback, delay) { const key = ++id; timers.set(key, { callback, delay }); return key; }, clearTimeout(key) { timers.delete(key); } },
  };
  const originals = Object.fromEntries(Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  Object.entries(replacements).forEach(([key, value]) => Object.defineProperty(globalThis, key, { value, configurable: true, writable: true }));
  try { await run({ images, timers, expire() { const pending = [...timers.values()]; timers.clear(); pending.forEach(timer => timer.callback()); } }); }
  finally { Object.entries(originals).forEach(([key, descriptor]) => { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }); }
}
const evaluate = code => {
  const module = { exports: {} };
  new Function('module', 'exports', code)(module, module.exports);
  return module.exports;
};
async function bundle(entry, dev, plugins = []) {
  const result = await build({ absWorkingDir: root, entryPoints: [entry], bundle: true, write: false, format: 'cjs', platform: 'node',
    define: { 'import.meta.env.DEV': String(dev) }, plugins });
  return result.outputFiles[0].text;
}

await check('successful artwork resolves once and removes its timeout and listeners', () => withImages(async host => {
  const request = loadLocalImage('/art/ground.png'); const image = host.images[0];
  assert.equal(image.url, '/art/ground.png'); assert.equal([...host.timers.values()][0].delay, 15000);
  image.succeed(); assert.equal(await request.promise, image);
  assert.equal(host.timers.size, 0); assert.equal(image.onload, null); assert.equal(image.onerror, null);
  request.cancel(); assert.equal(image.removed, false);
}));
await check('an image error promptly keeps fallback available and releases the request', () => withImages(async host => {
  const request = loadLocalImage('/art/missing.png'); const image = host.images[0]; image.onerror();
  assert.equal(await request.promise, null); assert.equal(host.timers.size, 0);
  assert.equal(image.removed, true); assert.equal(image.onload, null); assert.equal(image.onerror, null);
}));
await check('an empty or undecoded image is rejected rather than used as a texture', () => withImages(async host => {
  const request = loadLocalImage('/art/empty.png'); host.images[0].onload();
  assert.equal(await request.promise, null); assert.equal(host.timers.size, 0);
}));
await check('a stalled request settles at the deadline and a late load cannot replace fallback', () => withImages(async host => {
  const request = loadLocalImage('/art/slow.png'); const image = host.images[0]; const lateLoad = image.onload;
  host.expire(); assert.equal(await request.promise, null);
  image.naturalWidth = 64; image.naturalHeight = 64; lateLoad();
  assert.equal(await request.promise, null); assert.equal(host.timers.size, 0); assert.equal(image.onload, null);
}));
await check('unmount cancellation is idempotent and cannot later report a successful image', () => withImages(async host => {
  const request = loadLocalImage('/art/cancelled.png'); const image = host.images[0]; const lateLoad = image.onload;
  request.cancel(); request.cancel(); assert.equal(await request.promise, null);
  image.naturalWidth = 64; image.naturalHeight = 64; lateLoad();
  assert.equal(await request.promise, null); assert.equal(host.timers.size, 0); assert.equal(image.removed, true);
}));
await check('a refused source assignment resolves fallback without a rejected promise or live timer', () => withImages(async host => {
  const request = loadLocalImage('/art/denied.png'); assert.equal(await request.promise, null); assert.equal(host.timers.size, 0);
}, true));

const devQA = await bundle('src/diagnostics/assetQA.ts', true);
const productionQA = await bundle('src/diagnostics/assetQA.ts', false);
await check('development fault injection covers all current painting URLs and ordinary mode keeps them unchanged', () => withImages(async () => {
  const { sceneAssetUrl } = evaluate(devQA);
  const urls = ['/art/floof/painted-ground-material-v1.png', '/art/floof/painted-leaf-bank-v1.png', '/art/floof/pond-painting-v1.png', '/art/floof/mushroom-painting-v1.png', '/art/floof/arch-painting-v1.png', '/art/floof/gift-door-painting-v1.png', '/assets/garden/ground-contact.svg', '/assets/garden/dream-glow.svg'];
  for (const url of urls) assert.equal(sceneAssetUrl(url), url);
  location.search = '?qa=asset-error';
  for (const url of urls) assert.equal(sceneAssetUrl(url), `${url}.intentional-failure`);
}));
await check('production ignores the development fault query', () => withImages(async () => {
  location.search = '?qa=asset-error';
  assert.equal(evaluate(productionQA).sceneAssetUrl('/art/floof/painted-ground-material-v1.png'), '/art/floof/painted-ground-material-v1.png');
}));

const leafBundle = await bundle('src/scene/floofPaintedLeaves.ts', true, [{ name: 'unused-react-hook', setup(builder) {
  builder.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: 'unused-react' }));
  builder.onLoad({ filter: /.*/, namespace: 'unused-react' }, () => ({ contents: 'export const useEffect=()=>{}; export const useState=()=>{};' }));
} }]);
await check('WebGL and static leaf consumers share one successful image request', () => withImages(async host => {
  const { loadFloofPaintedLeaves } = evaluate(leafBundle);
  const a = loadFloofPaintedLeaves(), b = loadFloofPaintedLeaves();
  assert.strictEqual(a, b); assert.equal(host.images.length, 1);
  host.images[0].succeed(); const leaves = await a;
  assert.equal(leaves.blue.width, 64); assert.equal(leaves.sage.height, 96);
  assert.strictEqual(await b, leaves); assert.equal(host.timers.size, 0);
}));
await check('shared leaf failure resolves for every consumer without an automatic retry loop', () => withImages(async host => {
  location.search = '?qa=asset-error';
  const { loadFloofPaintedLeaves } = evaluate(leafBundle);
  const a = loadFloofPaintedLeaves(), b = loadFloofPaintedLeaves();
  assert.ok(host.images[0].url.endsWith('.intentional-failure'));
  host.images[0].onerror();
  assert.equal(await a, null); assert.equal(await b, null); assert.equal(await loadFloofPaintedLeaves(), null);
  assert.equal(host.images.length, 1); assert.equal(host.timers.size, 0);
}));

console.log(`\nArtwork loading: ${passed} passed, ${failed} failed.`);
if (failed) process.exitCode = 1;
