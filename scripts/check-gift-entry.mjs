import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Run GiftDoor and its real unlock hook/reducer against a small JSX host.
// Persistence uses the real normalizer and an isolated in-memory Storage.
// The App entry test executes its actual callback extracted with the TS parser;
// it does not claim a browser navigation, animation or focus test.
const root = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('vite/package.json'))('esbuild');
const ts = require('typescript');
const bundled = await build({
  absWorkingDir: root,
  stdin: { resolveDir: root, contents: `
    export { GiftDoor } from './src/ui/GiftDoor';
    export { createInitialProgress, progressReducer, viewFromHash } from './src/state/experience';
    export { STORAGE_KEY, loadProgress, saveProgress } from './src/lib/storage';
    export { GIFT_OPEN_MS } from './src/motion/useGiftUnlock';
  ` },
  bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', loader: { '.css': 'empty' },
  plugins: [{ name: 'gift-entry-component-host', setup(builder) {
    builder.onResolve({ filter: /^react(?:\/jsx-runtime)?$/ }, args => ({ path: args.path, namespace: 'component-host' }));
    builder.onLoad({ filter: /.*/, namespace: 'component-host' }, args => ({ contents: args.path === 'react'
      ? `const host=globalThis.__giftEntryHost; export const useId=(...a)=>host.useId(...a); export const useState=(...a)=>host.useState(...a); export const useRef=(...a)=>host.useRef(...a); export const useCallback=(...a)=>host.useCallback(...a); export const useEffect=(...a)=>host.useEffect(...a);`
      : `export const Fragment=Symbol.for('fragment'); export const jsx=(type,props,key)=>({type,props:props||{},key}); export const jsxs=jsx;` }));
  } }],
});
const appSource = ts.createSourceFile('App.tsx', readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let entryCallback;
function findEntry(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(appSource) === 'openPlace') {
    assert.ok(ts.isCallExpression(node.initializer), 'openPlace must remain a callback');
    entryCallback = node.initializer.arguments[0].getText(appSource);
  }
  ts.forEachChild(node, findEntry);
}
findEntry(appSource);
assert.ok(entryCallback, 'find the actual App entry callback');
const entryCode = ts.transpileModule(`exports.enter = ${entryCallback};`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;

const nodes = tree => tree === null || tree === undefined || typeof tree !== 'object' ? []
  : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
const text = tree => tree === null || tree === undefined || typeof tree === 'boolean' ? ''
  : Array.isArray(tree) ? tree.map(text).join('') : typeof tree === 'object' ? text(tree.props?.children) : String(tree);
let passed = 0, failed = 0;
function check(name, run) {
  try { run(); passed++; console.log(`PASS: ${name}`); }
  catch (error) { failed++; console.error(`FAIL: ${name}\n${error.stack}`); }
}

function withDoor({ unlocked = false, completed = false, reduced = false } = {}, run) {
  const slots = [], timers = new Map(), listeners = new Map(), actions = [], reveals = [], focus = [], returns = [];
  let cursor = 0, tree, dirty = true, effects = [], unmounted = false, now = 0, nextId = 1;
  const equal = (a, b) => a?.length === b?.length && a.every((value, i) => Object.is(value, b[i]));
  const host = {
    useState(initial) {
      const i = cursor++; slots[i] ??= { value: typeof initial === 'function' ? initial() : initial };
      return [slots[i].value, next => {
        assert.equal(unmounted, false, 'no state updates after closing the parcel');
        const value = typeof next === 'function' ? next(slots[i].value) : next;
        if (!Object.is(value, slots[i].value)) { slots[i].value = value; dirty = true; }
      }];
    },
    useId() { const i = cursor++; return slots[i] ??= `gift-entry-${i}`; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useCallback(callback, dependencies) {
      const i = cursor++;
      if (!slots[i] || !equal(dependencies, slots[i].dependencies)) slots[i] = { callback, dependencies };
      return slots[i].callback;
    },
    useEffect(callback, dependencies) {
      const i = cursor++;
      if (!slots[i] || !equal(dependencies, slots[i].dependencies)) {
        const previous = slots[i]; slots[i] = { dependencies, cleanup: previous?.cleanup };
        effects.push(() => { previous?.cleanup?.(); slots[i].cleanup = callback(); });
      }
    },
  };
  const replacements = {
    __giftEntryHost: host,
    document: {
      hidden: false,
      addEventListener(type, fn) { const group = listeners.get(type) ?? new Set(); group.add(fn); listeners.set(type, group); },
      removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    },
    setTimeout(fn, delay = 0) { const id = nextId++; timers.set(id, { fn, at: now + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
  };
  const originals = Object.fromEntries(Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(replacements)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  const module = { exports: {} }; new Function('module', 'exports', bundled.outputFiles[0].text)(module, module.exports);
  const api = module.exports;
  let progress = api.createInitialProgress();
  if (completed) {
    for (const [index, value] of ['0', '3', '0', '5'].entries()) {
      progress = api.progressReducer(progress, { type: 'set-answer', index, value });
      progress = api.progressReducer(progress, { type: 'submit-answer', index });
    }
    progress = api.progressReducer(progress, { type: 'store-envelope' });
    progress = api.progressReducer(progress, { type: 'record-draw', draw: { songId: 2, drawId: 'preserved-choice', drawnAt: '2026-11-02T00:00:00.000Z' } });
  }
  if (unlocked) progress = api.progressReducer(progress, { type: 'unlock-gift', code: '0305' });
  const entries = new Map(), writes = [];
  const storage = { getItem(key) { return entries.get(key) ?? null; }, setItem(key, value) { writes.push({ key, value }); entries.set(key, value); } };
  api.saveProgress(progress, storage);
  const initial = structuredClone(progress), initialSerialized = entries.get(api.STORAGE_KEY);
  const props = {
    progress, reduced, storageStatus: 'saved',
    dispatch(action) {
      actions.push(action);
      props.progress = api.progressReducer(props.progress, action);
      assert.equal(api.saveProgress(props.progress, storage), true); dirty = true;
    },
    onReveal() { reveals.push({ time: now, persisted: api.loadProgress(storage).progress }); },
    onReturn() { returns.push(true); }, onClue() {},
  };
  function commit(force = false) {
    if (force) dirty = true;
    for (let attempt = 0; dirty && !unmounted; attempt++) {
      assert.ok(attempt < 20, 'component effects must settle');
      cursor = 0; dirty = false; tree = api.GiftDoor(props);
      for (const node of nodes(tree)) if (node.props.ref && typeof node.props.ref === 'object') {
        node.props.ref.current = { focus() { focus.push(node.props.id); } };
      }
      const pending = effects; effects = []; pending.forEach(effect => effect());
    }
  }
  const byClass = name => nodes(tree).find(node => node.props.className?.split(' ').includes(name));
  const button = label => nodes(tree).find(node => node.type === 'button' && text(node).replace(/[↗→]/g, '').trim() === label);
  const input = () => nodes(tree).find(node => node.type === 'input' && node.props.id === 'gift-code');
  const unmount = () => { if (unmounted) return; unmounted = true; slots.forEach(slot => slot?.cleanup?.()); };
  commit();
  const test = {
    api, initial, initialSerialized, actions, reveals, focus, returns, writes, byClass, button, input, commit, unmount,
    get tree() { return tree; }, get progress() { return props.progress; },
    get stored() { return api.loadProgress(storage).progress; }, get serialized() { return entries.get(api.STORAGE_KEY); },
    get timerCount() { return timers.size; },
    click(label) { const target = button(label); assert.ok(target, `missing ${label}`); target.props.onClick(); commit(); },
    submit(value) {
      assert.ok(input(), 'a password form must be present');
      input().props.onChange({ target: { value } }); commit();
      byClass('gift-code-form').props.onSubmit({ preventDefault() {} }); commit();
    },
    advance(duration) {
      const end = now + duration;
      for (let i = 0; ; i++) {
        assert.ok(i < 100, 'timers must settle');
        const due = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        const [id, timer] = due; now = timer.at; timers.delete(id); timer.fn(); commit();
      }
      now = end; commit();
    },
  };
  try { run(test); }
  finally {
    unmount();
    for (const [key, descriptor] of Object.entries(originals)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    }
  }
}

check('fresh gift routes and the real parcel component require the correct code before revealing', () => withDoor({}, door => {
  assert.equal(door.api.viewFromHash('#gift', false), 'lock');
  assert.equal(door.api.viewFromHash('#lock', false), 'lock');
  assert.equal(door.tree.props['data-gift-phase'], 'locked');
  assert.ok(door.input()); assert.equal(door.button('Open again'), undefined);
  assert.equal(door.button('Try the code again'), undefined);
  for (const wrong of ['', '305', '9999']) {
    door.submit(wrong); door.advance(1000);
    assert.equal(door.reveals.length, 0); assert.equal(door.actions.length, 0);
    assert.equal(door.stored.giftUnlocked, false); assert.ok(door.byClass('gift-error'));
  }
  door.submit('0305');
  assert.equal(door.stored.giftUnlocked, true); assert.equal(door.reveals.length, 0);
  door.advance(door.api.GIFT_OPEN_MS);
  assert.equal(door.reveals.length, 1);
  assert.deepEqual({ ...door.stored, giftUnlocked: false }, door.initial);
}));

check('a saved unlock is explicitly a revisit and never reveals automatically on mounting', () => withDoor({ unlocked: true, completed: true }, door => {
  assert.ok(text(door.tree).includes('You opened this gift earlier.'));
  assert.equal(door.tree.props['data-gift-phase'], 'unlocked');
  assert.equal(door.input(), undefined); assert.ok(door.button('Try the code again'));
  door.advance(5000); assert.equal(door.reveals.length, 0); assert.equal(door.timerCount, 0);
  assert.equal(door.api.viewFromHash('#gift', door.stored.giftUnlocked), 'gift', 'an explicit saved reveal link remains a revisit');
  door.click('Open again');
  assert.equal(door.reveals.length, 1); assert.equal(door.actions.length, 0);
  assert.equal(door.serialized, door.initialSerialized);
}));

check('replaying a saved lock focuses a blank form and wrong codes cannot use the permanent unlock to reveal', () => withDoor({ unlocked: true, completed: true }, door => {
  door.click('Try the code again');
  assert.equal(door.input().props.value, ''); assert.ok(door.focus.includes('gift-code'));
  assert.equal(door.button('Open again'), undefined); assert.equal(door.tree.props['data-gift-phase'], 'locked');
  for (const wrong of ['305', '0000', '03 05', '']) {
    door.submit(wrong); door.advance(1500);
    assert.equal(door.reveals.length, 0); assert.equal(door.actions.length, 0);
    assert.equal(door.timerCount, 0); assert.equal(door.input().props['aria-invalid'], true);
    assert.equal(door.serialized, door.initialSerialized, 'replay cannot clear or rewrite saved achievements');
  }
}));

check('a correct replay uses the real unlock hook while preserving all questions, envelope and chosen song', () => withDoor({ unlocked: true, completed: true }, door => {
  door.click('Try the code again'); door.submit('0305');
  assert.deepEqual(door.actions, [{ type: 'unlock-gift', code: '0305' }]);
  assert.equal(door.serialized, door.initialSerialized); assert.deepEqual(door.progress, door.initial);
  assert.equal(door.reveals.length, 0); assert.equal(door.input().props.readOnly, true);
  door.advance(door.api.GIFT_OPEN_MS - 1); assert.equal(door.reveals.length, 0);
  door.advance(1); assert.equal(door.reveals.length, 1);
  assert.deepEqual(door.reveals[0].persisted, door.initial);
  door.advance(3000); assert.equal(door.reveals.length, 1);
}));

check('closing a replay does not reset saved progress or leave a delayed reveal behind', () => withDoor({ unlocked: true, completed: true }, door => {
  door.click('Try the code again'); door.submit('0305');
  door.click('Return to the garden'); door.unmount(); door.advance(2000);
  assert.equal(door.returns.length, 1); assert.equal(door.reveals.length, 0); assert.equal(door.timerCount, 0);
  assert.equal(door.serialized, door.initialSerialized);
}));

check('reduced-motion replay still validates the code and reveals only after the accepted submission', () => withDoor({ unlocked: true, completed: true, reduced: true }, door => {
  door.click('Try the code again'); door.submit('9999'); door.advance(0);
  assert.equal(door.reveals.length, 0);
  door.submit('0305'); assert.equal(door.reveals.length, 0);
  door.advance(0); assert.equal(door.reveals.length, 1);
  assert.equal(door.serialized, door.initialSerialized);
}));

check('actual App world and welcome shortcuts always visit the parcel before any saved reveal', () => {
  for (const unlocked of [false, true]) for (const close of [false, true]) for (const entered of [false, true]) for (const place of ['lock', 'gift', 'puzzle', 'music', 'rest']) {
    const calls = [], origin = { x: 17, y: 29, zoom: 1 }, actor = { x: 19, y: 9 }, heading = { x: .6, y: .8 };
    const env = {
      history: { state: { existing: true }, replaceState(...args) { calls.push(['replace', ...args]); } },
      location: { href: 'http://localhost:5173/#garden' }, close, entered,
      progressRef: { current: { giftUnlocked: unlocked } },
      returnFocus: { current: 'prior-focus' }, panelOrigin: { current: { x: -1, y: -2, zoom: 1 } },
      panelActor: { current: { x: -3, y: -4 } }, panelHeading: { current: { x: 0, y: 1 } },
      poseRef: { current: origin }, actorRef: { current: actor }, walkingHeading: heading,
      size: { width: 1280, height: 720 },
      panelPose(destination, ...args) { calls.push(['focus', destination, ...args]); return { ...origin, target: destination }; },
      jumpTo(...args) { calls.push(['jump', ...args]); }, goTo(...args) { calls.push(['go', ...args]); },
      setEntered(value) { calls.push(['entered', value]); }, setMenuOpen(value) { calls.push(['menu', value]); },
      setView(value) { calls.push(['view', value]); }, writeHistory(...args) { calls.push(['history', ...args]); },
    };
    const exports = {};
    new Function(...Object.keys(env), 'exports', entryCode)(...Object.values(env), exports);
    exports.enter(place, 'clicked-world-object');
    const expected = place === 'gift' || place === 'lock' ? 'lock' : place;
    assert.deepEqual(calls.find(call => call[0] === 'view'), ['view', expected]);
    assert.equal(calls.find(call => call[0] === 'history')[1], expected);
    assert.deepEqual(calls.find(call => call[0] === 'entered'), ['entered', true], 'an explicit reading shortcut enters the journey');
    assert.ok(calls.some(call => call[0] === (close || !entered ? 'jump' : 'go')), 'welcome shortcuts must bypass the disabled walking tween');
    assert.equal(calls.some(call => call[0] === (close || !entered ? 'go' : 'jump')), false);
    if (place === 'rest') {
      assert.equal(calls.find(call => call[0] === 'focus'), undefined, 'the midway parcel does not move the reading camera');
      assert.deepEqual(calls.find(call => call[0] === (close || !entered ? 'jump' : 'go'))[1], origin);
    } else assert.equal(calls.find(call => call[0] === 'focus')[1], expected);
    assert.equal(env.progressRef.current.giftUnlocked, unlocked, 'navigation never resets or grants the saved unlock');
    if (!close) {
      assert.deepEqual(env.panelOrigin.current, origin); assert.deepEqual(env.panelActor.current, actor); assert.deepEqual(env.panelHeading.current, heading);
      assert.equal(env.returnFocus.current, 'clicked-world-object');
    } else assert.deepEqual(env.panelOrigin.current, { x: -1, y: -2, zoom: 1 }, 'reading-to-reading keeps the original garden return point');
  }
});

console.log(`\nGift entry and replay: ${passed} passed, ${failed} failed.`);
if (failed) process.exitCode = 1;
