import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { Group, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import { advanceFloof, emptyFloof } from '../src/scene/floofMotion.ts';
import { mistGreetingLean } from '../src/scene/mistGreeting.ts';

let failures = 0;
const check = (name, run) => {
  try { run(); console.log(`PASS: ${name}`); }
  catch (error) { failures++; console.error(`FAIL: ${name}: ${error.stack}`); }
};
const near = (a, b, tolerance = 1e-7) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);
const input = (overrides = {}) => ({ travel: 4, dt: 1 / 60, moving: true, headingX: 1, intent: 1, speed: 240, ...overrides });

check('authoritative speed preserves gait with duplicated and batched position samples', () => {
  const outcomes = [1, 2, 3].map(cadence => {
    let state = emptyFloof();
    for (let frame = 0; frame < 240; frame++) {
      state = advanceFloof(state, input({ travel: frame % cadence === 0 ? 4 * cadence : 0 }));
      assert.equal(state.wasMoving, true);
      assert.equal(state.settleAge, 1, 'a duplicate position must not restart the landing spring');
    }
    return state;
  });
  outcomes.forEach(state => { near(state.speed, 240); assert.deepEqual(state, outcomes[0]); });
});

check('the same one-second speed and turn produce matching shapes at 30/60/120 fps', () => {
  const outcomes = [30, 60, 120].map(fps => {
    let state = emptyFloof();
    for (let frame = 0; frame < fps; frame++) state = advanceFloof(state, input({ dt: 1 / fps, travel: 240 / fps }));
    return state;
  });
  for (const state of outcomes) {
    near(state.speed, outcomes[1].speed);
    near(state.stretch, outcomes[1].stretch, .0001);
    near(state.bend, outcomes[1].bend, .004);
  }
});

check('rest gives one soft settling cycle and returns to a finite neutral shape', () => {
  let state = emptyFloof();
  for (let frame = 0; frame < 90; frame++) state = advanceFloof(state, input());
  let rebounds = 0, previousAge = state.settleAge;
  for (let frame = 0; frame < 180; frame++) {
    state = advanceFloof(state, input({ travel: 0, speed: 0, moving: false, intent: 0 }));
    if (state.settleAge < previousAge) rebounds++;
    previousAge = state.settleAge;
    Object.values(state).filter(value => typeof value === 'number').forEach(value => assert.ok(Number.isFinite(value)));
  }
  assert.equal(rebounds, 1);
  assert.equal(state.wasMoving, false);
  near(state.speed, 0, 1e-6); near(state.stretch, 0, 1e-6); near(state.bend, 0, 1e-6);
});

check('reported speed is bounded; invalid speed cannot poison the shape; teleports reset it', () => {
  for (const speed of [NaN, Infinity, -10, 10000]) {
    const state = advanceFloof(emptyFloof(), input({ speed }));
    assert.ok(state.speed >= 0 && state.speed <= 240);
    Object.values(state).filter(value => typeof value === 'number').forEach(value => assert.ok(Number.isFinite(value)));
  }
  assert.deepEqual(advanceFloof(emptyFloof(), input({ travel: 1000 })), emptyFloof());
  const fallback = advanceFloof(emptyFloof(), input({ speed: undefined }));
  assert.deepEqual(fallback, advanceFloof(emptyFloof(), input()));
});

// Exercise the actual component's registered useFrame against real Three objects.
// Only React/Fiber wiring and the drawing canvas are stubbed. This is a render-loop
// regression test, not a browser or physical trackpad benchmark.
const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('vite/package.json'))('esbuild');
const bundle = await build({
  absWorkingDir: fileURLToPath(new URL('..', import.meta.url)), entryPoints: ['src/scene/RabbitCompanion.tsx'],
  bundle: true, write: false, format: 'cjs', platform: 'node', external: ['three'],
  define: { 'import.meta.env.DEV': 'false' },
  plugins: [{ name: 'floof-frame-host', setup(builder) {
    builder.onResolve({ filter: /^(react|react\/jsx-runtime|@react-three\/fiber)$/ }, args => ({ path: args.path, namespace: 'frame-host' }));
    builder.onLoad({ filter: /.*/, namespace: 'frame-host' }, args => ({ contents: args.path === 'react'
      ? `const h=globalThis.__floofFrameHost; export const useRef=v=>({current:v}); export const useMemo=f=>f(); export const useState=v=>[typeof v==='function'?v():v,()=>{}]; export const useEffect=f=>{const c=f();if(c)h.cleanups.push(c)};`
      : args.path === '@react-three/fiber'
        ? `export const useFrame=f=>{globalThis.__floofFrameHost.frame=f};`
        : `export const jsx=(type,props)=>({type,props});export const jsxs=jsx;export const Fragment='fragment';` }));
  } }],
});

function withCompanion(run, reading = false, overrides = {}) {
  const host = { frame: null, cleanups: [] };
  const context = new Proxy({}, { get: (_target, key) => key === 'createLinearGradient' || key === 'createRadialGradient'
    ? () => ({ addColorStop() {} }) : () => {} });
  const replacements = {
    __floofFrameHost: host,
    document: { createElement: () => ({ width: 0, height: 0, getContext: () => context }) },
  };
  const saved = Object.fromEntries(Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(replacements)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  const module = { exports: {} };
  try {
    new Function('module', 'exports', 'require', bundle.outputFiles[0].text)(module, module.exports, require);
    const props = { actor: { x: 0, y: -1800 }, heading: { x: 0, y: 1 }, moving: false,
      guidance: { active: false, heading: { x: 0, y: 1 }, strength: 0 }, reading, textures: {}, ...overrides };
    const motion = { current: { actor: { ...props.actor }, heading: { x: 1, y: 0 }, moving: true, speed: 240,
      guidance: { active: true, heading: { x: 1, y: 0 }, strength: 1 }, pose: { x: 0, y: -1580, zoom: 1 } } };
    const root = new Group();
    const tree = module.exports.RabbitCompanion({ ...props, motion });
    const attach = (element, parent) => {
      if (!element) return;
      if (Array.isArray(element)) { element.forEach(item => attach(item, parent)); return; }
      const { type, props: p } = element;
      if (type === 'fragment') { attach(p.children, parent); return; }
      if (type === 'planeGeometry') { parent.geometry = new PlaneGeometry(...p.args); return; }
      if (type === 'meshBasicMaterial') { parent.material = new MeshBasicMaterial(p); return; }
      const node = type === 'mesh' ? new Mesh(p.geometry) : new Group();
      if (p.name) node.name = p.name;
      if (p.position) node.position.fromArray(p.position);
      if (p.rotation) node.rotation.set(...p.rotation);
      if (p.visible !== undefined) node.visible = p.visible;
      parent.add(node);
      if (typeof p.ref === 'function') p.ref(node); else if (p.ref) p.ref.current = node;
      attach(p.children, node);
    };
    attach(tree, root);
    const gl = { domElement: { dataset: {} } };
    run({ props, motion, root, gl, anchor: root.getObjectByName('little-floof'), frame: dt => host.frame({ gl }, dt) });
  } finally {
    host.cleanups.forEach(cleanup => cleanup());
    for (const [key, descriptor] of Object.entries(saved)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    }
  }
}

check('the real anchor follows every live controller frame without React prop commits', () => withCompanion(({ props, motion, anchor, frame }) => {
  for (let i = 1; i <= 30; i++) {
    motion.current.actor = { x: i * 4, y: -1800 + i * 2 };
    frame(1 / 60);
    near(anchor.position.x, i * 4); near(anchor.position.y, -1800 + i * 2);
  }
  assert.deepEqual(props.actor, { x: 0, y: -1800 }, 'the React snapshot deliberately stays stale throughout the test');
  const stopped = anchor.position.clone();
  motion.current.moving = false; motion.current.speed = 0; motion.current.guidance.active = false;
  for (let i = 0; i < 90; i++) { frame(1 / 60); assert.deepEqual(anchor.position, stopped); }
}));

check('reading uses the saved scene position, ignores live motion, and freezes body geometry', () => withCompanion(({ props, motion, anchor, frame }) => {
  frame(1 / 60);
  const body = anchor.children[1].children[1];
  const vertices = [...body.geometry.attributes.position.array];
  for (let i = 0; i < 20; i++) {
    motion.current.actor = { x: 900 + i * 4, y: 1000 };
    frame(1 / 60);
    near(anchor.position.x, props.actor.x); near(anchor.position.y, props.actor.y);
    assert.deepEqual([...body.geometry.attributes.position.array], vertices);
  }
}, true));

check('the mist greeting waits, reaches toward either opening, and settles only once', () => {
  for (const side of [-1, 1]) {
    const response = age => mistGreetingLean({ startedAt: 1800, side }, 1800 + age);
    assert.equal(response(-500), 0); assert.equal(response(160), 0);
    assert.ok(response(370) * side > 0 && response(370) * side < 14);
    near(response(700), side * 14); near(response(910), side * 14);
    assert.ok(response(1300) * side > 0 && response(1300) * side < 14);
    assert.equal(response(1620), 0); assert.equal(response(9000), 0);
  }
  assert.equal(mistGreetingLean(null, 700), 0);
});

check('a wipe leans the actual upper mesh while the planted edge, anchor and shadow stay put', () => {
  const pose = (side, walking = false, reading = false) => {
    let result;
    withCompanion(({ motion, anchor, frame }) => {
      motion.current.moving = walking;
      motion.current.speed = walking ? 240 : 0;
      motion.current.guidance.active = walking;
      frame(1 / 60);
      result = { vertices: [...anchor.children[1].children[1].geometry.attributes.position.array],
        anchor: anchor.position.toArray(), shadow: anchor.children[0].geometry.attributes.position.array.slice() };
    }, reading, { mistGreeting: { current: side && { startedAt: performance.now() - 720, side } } });
    return result;
  };
  const neutral = pose(null);
  for (const side of [-1, 1]) {
    const reply = pose(side);
    assert.deepEqual(reply.anchor, neutral.anchor); assert.deepEqual(reply.shadow, neutral.shadow);
    let crown = 0;
    for (let i = 0; i < neutral.vertices.length; i += 3) {
      const dx = reply.vertices[i] - neutral.vertices[i];
      near(reply.vertices[i + 1], neutral.vertices[i + 1]);
      if (neutral.vertices[i + 1] <= -120 * 1.45 * .359) near(dx, 0);
      crown = Math.max(crown, dx * side);
    }
    near(crown, 14, .0001);
    assert.deepEqual(pose(side, true), pose(null, true));
    assert.deepEqual(pose(side, false, true), pose(null, false, true));
  }
});

check('teleporting the real component clears trailing flecks rather than drawing a long trail', () => withCompanion(({ motion, root, anchor, frame }) => {
  for (let i = 0; i < 30; i++) { motion.current.actor = { x: i * 4, y: -1800 }; frame(1 / 60); }
  assert.ok(root.children.some(node => node !== anchor && node.visible));
  motion.current.actor = { x: 1600, y: 1200 }; frame(1 / 60);
  assert.ok(root.children.filter(node => node !== anchor).every(node => !node.visible));
  near(anchor.position.x, 1600); near(anchor.position.y, 1200);
}));


check('the real reply deforms the body toward the light while its world anchor and planted edge stay fixed', () => {
  const point = { x: 1197, y: 4104 };
  const capture = replying => {
    let result;
    const mushroomListening = { current: { engaged: true, order: [1, 0, 2], sequenceTime: 0, lightSide: -1 } };
    const floofAttention = { current: null };
    withCompanion(({ motion, anchor, gl, frame }) => {
      motion.current.moving = false; motion.current.speed = 0; motion.current.guidance.active = false;
      const planted = anchor.position.clone();
      for (let i = 1; i <= 120; i++) {
        mushroomListening.current.sequenceTime = i / 60;
        frame(1 / 60);
        assert.deepEqual(anchor.position, planted, 'environmental interest cannot move the world anchor');
      }
      result = { vertices: [...anchor.children[1].children[1].geometry.attributes.position.array],
        anchor: anchor.position.clone(), attention: JSON.parse(gl.domElement.dataset.floofAttention) };
    }, false, { actor: point, floofAttention, mushroomListening: replying ? mushroomListening : undefined });
    return result;
  };
  const neutral = capture(false), replying = capture(true);
  assert.deepEqual(replying.anchor, neutral.anchor);
  assert.equal(neutral.attention.amount, 0); assert.ok(replying.attention.amount > .9);
  let displacement = 0;
  for (let i = 0; i < neutral.vertices.length; i += 3) {
    const delta = Math.hypot(replying.vertices[i] - neutral.vertices[i], replying.vertices[i + 1] - neutral.vertices[i + 1]);
    if (neutral.vertices[i + 1] < -120 * 1.45 * .359) near(delta, 0, 1e-5);
    displacement = Math.max(displacement, delta);
  }
  assert.ok(displacement > 8 && displacement < 30, 'a readable soft silhouette response must reach the actual render mesh');
});

check('reading preserves a shared unfinished reply and freezes its actual rendered body', () => {
  const point = { x: 1197, y: 4104 };
  const floofAttention = { current: { actor: point, amount: .82, directionX: .25, directionY: .96, source: 1 } };
  withCompanion(({ motion, anchor, frame }) => {
    frame(1 / 60);
    const state = JSON.stringify(floofAttention.current);
    const body = anchor.children[1].children[1];
    const vertices = [...body.geometry.attributes.position.array];
    for (let i = 0; i < 30; i++) {
      motion.current.actor = { x: 900 + i * 4, y: 1000 };
      frame(1 / 60);
      assert.equal(JSON.stringify(floofAttention.current), state);
      assert.deepEqual([...body.geometry.attributes.position.array], vertices);
      near(anchor.position.x, point.x); near(anchor.position.y, point.y);
    }
  }, true, { actor: point, floofAttention });
});

if (failures) process.exitCode = 1;
