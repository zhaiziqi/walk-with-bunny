import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

// Mount the real fallback painter with a Canvas host that rejects empty image
// sources as browsers do. Artwork appearance remains a separate browser check.
const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('vite/package.json'))('esbuild');
const root = fileURLToPath(new URL('..', import.meta.url));
const bundle = await build({
  absWorkingDir: root, entryPoints: ['src/scene/FloofStatic.tsx'],
  bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic',
  define: { 'import.meta.env.DEV': 'false' },
  plugins: [{ name: 'static-viewport-host', setup(builder) {
    // Optional source override allows verifying that an earlier revision fails.
    if (process.env.FLOOF_STATIC_SOURCE) builder.onLoad({ filter: /\/FloofStatic\.tsx$/ }, args => ({
      contents: readFileSync(process.env.FLOOF_STATIC_SOURCE, 'utf8'), loader: 'tsx',
      resolveDir: fileURLToPath(new URL('../src/scene/', import.meta.url)),
    }));
    builder.onResolve({ filter: /^react(?:\/jsx-runtime)?$/ }, args => ({ path: args.path, namespace: 'viewport-hooks' }));
    builder.onLoad({ filter: /.*/, namespace: 'viewport-hooks' }, args => ({ contents: args.path === 'react'
      ? `const host=globalThis.__staticViewportHost;
         export const useState=(...a)=>host.useState(...a);
         export const useRef=(...a)=>host.useRef(...a);
         export const useMemo=(...a)=>host.useMemo(...a);
         export const useEffect=(...a)=>host.useEffect(...a);`
      : `export const jsx=(type,props)=>({type,props}); export const jsxs=jsx;` }));
    builder.onResolve({ filter: /\/loadLocalImage$/ }, () => ({ path: 'pending-art', namespace: 'pending-art' }));
    builder.onLoad({ filter: /.*/, namespace: 'pending-art' }, () => ({
      contents: 'export const loadLocalImage=()=>({promise:new Promise(()=>{}),cancel(){}});',
    }));
  } }],
});

function canvas() {
  const node = { width: 300, height: 150, dataset: {}, draws: [] };
  const context = new Proxy({
    canvas: node,
    drawImage(source, ...args) {
      const width = source.naturalWidth ?? source.width, height = source.naturalHeight ?? source.height;
      if (!width || !height) throw new DOMException('The source canvas has zero width or height.', 'InvalidStateError');
      node.draws.push({ source, args, width, height });
    },
    createPattern(source) {
      assert.ok(source.width > 0 && source.height > 0, 'pattern source is drawable');
      return { setTransform() {} };
    },
    createLinearGradient() { return { addColorStop() {} }; },
    createRadialGradient() { return { addColorStop() {} }; },
    getImageData(x, y, width, height) { return { data: new Uint8ClampedArray(width * height * 4) }; },
  }, { get(target, key) { return key in target ? target[key] : () => {}; } });
  node.getContext = () => context;
  return node;
}

function withPainter(initial, run) {
  const slots = [], cleanups = [];
  let cursor = 0, effects = [];
  const equal = (a, b) => a?.length === b?.length && a.every((value, i) => Object.is(value, b[i]));
  const host = {
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useState(initial) {
      const i = cursor++;
      slots[i] ??= { value: typeof initial === 'function' ? initial() : initial };
      return [slots[i].value, value => { slots[i].value = typeof value === 'function' ? value(slots[i].value) : value; }];
    },
    useMemo(create, deps) {
      const i = cursor++;
      if (!slots[i] || !equal(deps, slots[i].deps)) slots[i] = { value: create(), deps };
      return slots[i].value;
    },
    useEffect(effect, deps) {
      const i = cursor++;
      if (!slots[i] || !equal(deps, slots[i].deps)) {
        slots[i] = { deps }; effects.push(effect);
      }
    },
  };
  const replacements = {
    __staticViewportHost: host, document: { createElement: canvas },
    window: { devicePixelRatio: 2 }, HTMLImageElement: class {},
    DOMMatrix: class { translate() { return this; } scale() { return this; } },
  };
  const originals = Object.fromEntries(Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(replacements)) Object.defineProperty(globalThis, key, { value, writable: true, configurable: true });
  try {
    const module = { exports: {} };
    new Function('module', 'exports', bundle.outputFiles[0].text)(module, module.exports);
    const node = canvas();
    const props = {
      pose: { x: 0, y: -1700, zoom: 1 }, actor: { x: 0, y: -1700 },
      heading: { x: 0, y: 1 }, images: {}, trailEvents: [], discovered: [],
      entered: false, bloom: 0, lampOn: false, width: 1280, height: 720, ...initial,
    };
    const render = patch => {
      Object.assign(props, patch); cursor = 0;
      const tree = module.exports.FloofStatic(props);
      tree.props.ref.current = node;
      const pending = effects; effects = [];
      for (const effect of pending) { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); }
    };
    render(); run({ node, render });
  } finally {
    cleanups.forEach(cleanup => cleanup());
    for (const [key, descriptor] of Object.entries(originals)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    }
  }
}

let passed = 0, failed = 0;
function check(name, run) {
  try { run(); passed++; console.log(`PASS: ${name}`); }
  catch (error) { failed++; console.error(`FAIL: ${name}\n${error.stack}`); }
}
function drawn(node, width, height) {
  assert.equal(node.width, Math.round(width * 1.5));
  assert.equal(node.height, Math.round(height * 1.5));
  assert.ok(node.draws.length > 2, 'ground, pigment and scenery are painted');
  assert.ok(node.draws.some(draw => draw.width === node.width && draw.height === node.height
    && draw.args.length === 4 && draw.args[2] === width && draw.args[3] === height), 'full-size pigment layer is composited');
}

check('zero initial width waits, then paints when the viewport opens', () => withPainter({ width: 0 }, ({ node, render }) => {
  assert.equal(node.draws.length, 0);
  render({ width: 1280 }); drawn(node, 1280, 720);
}));
check('zero initial height waits, then paints when the viewport opens', () => withPainter({ height: 0 }, ({ node, render }) => {
  assert.equal(node.draws.length, 0);
  render({ height: 720 }); drawn(node, 1280, 720);
}));
check('a visible viewport can close and reopen without an empty source or lost painting', () => withPainter({}, ({ node, render }) => {
  drawn(node, 1280, 720);
  const count = node.draws.length;
  render({ width: 0, height: 0 }); assert.equal(node.draws.length, count);
  assert.equal(node.width, 1920); assert.equal(node.height, 1080);
  render({ width: 960, height: 540 }); drawn(node, 960, 540); assert.ok(node.draws.length > count);
}));
check('non-finite and subpixel viewports wait and can recover', () => withPainter({ width: NaN }, ({ node, render }) => {
  for (const size of [{ width: Infinity }, { width: -1 }, { width: .1 }, { width: 1280, height: Infinity }, { height: .1 }]) {
    render(size); assert.equal(node.draws.length, 0);
  }
  render({ width: 1280, height: 720 }); drawn(node, 1280, 720);
}));
check('an ordinary initial viewport retains full-resolution pigment and scenery drawing', () => withPainter({}, ({ node }) => {
  drawn(node, 1280, 720);
  assert.ok(node.draws.every(draw => draw.width > 0 && draw.height > 0));
}));

console.log(`\nStatic viewport: ${passed} passed, ${failed} failed.`);
if (failed) process.exitCode = 1;
