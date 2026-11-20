import assert from 'node:assert/strict';
import { createRequire, registerHooks } from 'node:module';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/src/')) return nextResolve(`${specifier}.ts`, context);
  return nextResolve(specifier, context);
} });
const { createInitialProgress } = await import('../src/state/experience.ts');
const { STORAGE_KEY, loadProgress, loadSharedProgress } = await import('../src/lib/storage.ts');
const require = createRequire(import.meta.url), viteRequire = createRequire(require.resolve('vite/package.json'));
const { build } = viteRequire('esbuild');
const bundled = await build({
  absWorkingDir: fileURLToPath(new URL('..', import.meta.url)), entryPoints: ['src/state/useProgress.ts'],
  bundle: true, write: false, format: 'cjs', platform: 'node', define: { 'import.meta.env.DEV': 'false' },
  plugins: [{ name: 'cross-tab-hook-host', setup(builder) {
    builder.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: 'hook-host' }));
    builder.onLoad({ filter: /.*/, namespace: 'hook-host' }, () => ({ contents: `const host=globalThis.__crossTabHost; export const useState=(...a)=>host.useState(...a); export const useRef=(...a)=>host.useRef(...a); export const useCallback=(...a)=>host.useCallback(...a); export const useEffect=(...a)=>host.useEffect(...a);` }));
  } }],
});
const store = () => {
  const data = new Map(), writes = [];
  return { data, writes, failRead: false, failWrite: false,
    getItem(key) { if (this.failRead) throw new Error('read blocked'); return data.get(key) ?? null; },
    setItem(key, value) { if (this.failWrite) throw new Error('write blocked'); data.set(key, value); writes.push({ key, value }); },
  };
};
const draw = (id, serial, seconds = 0) => ({ songId: id, drawId: serial, drawnAt: `2026-11-02T01:00:${String(seconds).padStart(2, '0')}.000Z` });

// Two independent mounted hooks share one fake Storage. Events are explicitly
// delayed/reordered, exercising the real hook without any browser or disk state.
function createTab(storage, { deferred = false } = {}) {
  const slots = [], listeners = new Map(), cleanups = []; let cursor = 0, effects = [], result;
  const equal = (a, b) => a?.length === b?.length && a.every((value, i) => Object.is(value, b[i]));
  const host = {
    useState(initial) { const i = cursor++; slots[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [slots[i].value, value => { slots[i].value = typeof value === 'function' ? value(slots[i].value) : value; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useCallback(callback, dependencies) { const i = cursor++; if (!slots[i] || !equal(dependencies, slots[i].dependencies)) slots[i] = { callback, dependencies }; return slots[i].callback; },
    useEffect(callback, dependencies) { const i = cursor++; if (!slots[i] || !equal(dependencies, slots[i].dependencies)) { slots[i] = { dependencies }; effects.push(callback); } },
  };
  const window = { localStorage: storage,
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) { if (listeners.get(type) === listener) listeners.delete(type); },
  };
  const inside = run => {
    const replacements = { window, __crossTabHost: host };
    const previous = Object.fromEntries(Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    for (const [key, value] of Object.entries(replacements)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
    try { return run(); } finally {
      for (const [key, descriptor] of Object.entries(previous)) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
      }
    }
  };
  const module = { exports: {} };
  inside(() => new Function('module', 'exports', bundled.outputFiles[0].text)(module, module.exports));
  const render = () => inside(() => { cursor = 0; result = module.exports.useProgress(); });
  const flush = () => inside(() => { const pending = effects; effects = []; pending.forEach(effect => { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); }); render(); });
  render(); if (!deferred) flush();
  return {
    get result() { return result; }, render, flush,
    dispatch(action) { inside(() => result.dispatch(action)); render(); },
    event(overrides = {}) { inside(() => listeners.get('storage')?.({ key: STORAGE_KEY, newValue: storage.data.get(STORAGE_KEY) ?? null, storageArea: storage, ...overrides })); render(); },
    unmount() { inside(() => cleanups.forEach(cleanup => cleanup())); },
    get listening() { return listeners.has('storage'); },
  };
}
function solve(tab) {
  for (const [index, value] of ['0', '3', '0', '5'].entries()) {
    tab.dispatch({ type: 'set-answer', index, value }); tab.dispatch({ type: 'submit-answer', index });
  }
  tab.dispatch({ type: 'store-envelope' });
}
let passed = 0;
function check(name, run) { run(); passed++; console.log(`PASS: ${name}`); }

check('an old tab drawing before storage events cannot erase completed questions, envelope or unlock', () => {
  const storage = store(), a = createTab(storage), b = createTab(storage);
  solve(a); a.dispatch({ type: 'unlock-gift', code: '0305' });
  b.dispatch({ type: 'record-draw', draw: draw(2, 'new-draw') });
  const saved = loadProgress(storage).progress;
  assert.equal(saved.questions.map(q => q.digit).join(''), '0305');
  assert.equal(saved.envelopeStored, true); assert.equal(saved.giftUnlocked, true);
  assert.equal(saved.lastDraw.drawId, 'new-draw'); assert.deepEqual(b.result.progress, saved);
});
check('a storage event updates the other mounted tab without an echo write', () => {
  const storage = store(), a = createTab(storage), b = createTab(storage);
  a.dispatch({ type: 'unlock-gift', code: '0305' }); a.dispatch({ type: 'record-draw', draw: draw(4, 'remote') });
  const writes = storage.writes.length; b.event(); a.event(); b.event();
  assert.equal(b.result.progress.giftUnlocked, true); assert.equal(b.result.progress.lastDraw.drawId, 'remote');
  assert.equal(storage.writes.length, writes);
});
check('newer pending draft, including a clear, survives an unrelated old-tab draw', () => {
  const storage = store(), a = createTab(storage), b = createTab(storage);
  a.dispatch({ type: 'set-answer', index: 0, value: '8' });
  b.dispatch({ type: 'record-draw', draw: draw(1, 'draft-preserved') });
  assert.equal(b.result.progress.questions[0].input, '8');
  a.dispatch({ type: 'set-answer', index: 0, value: '' });
  b.dispatch({ type: 'record-draw', draw: draw(2, 'clear-preserved') });
  assert.equal(loadProgress(storage).progress.questions[0].input, '');
});
check('a deliberate new local draft wins after rebasing, without changing a confirmed digit', () => {
  const storage = store(), a = createTab(storage), b = createTab(storage);
  a.dispatch({ type: 'set-answer', index: 0, value: '8' });
  b.dispatch({ type: 'set-answer', index: 0, value: '0' }); b.dispatch({ type: 'submit-answer', index: 0 });
  a.dispatch({ type: 'set-answer', index: 0, value: '9' });
  assert.deepEqual(loadProgress(storage).progress.questions[0], { input: '0', digit: '0' });
});
check('a queued stale event reads current storage instead of restoring its older song', () => {
  const storage = store(), a = createTab(storage), b = createTab(storage);
  a.dispatch({ type: 'record-draw', draw: draw(1, 'older', 1) }); const oldRaw = storage.data.get(STORAGE_KEY);
  b.dispatch({ type: 'record-draw', draw: draw(9, 'newer', 2) });
  a.event({ newValue: oldRaw }); assert.equal(a.result.progress.lastDraw.drawId, 'newer');
});
check('current draw wins intentionally even when its clock is earlier than the saved draw', () => {
  const storage = store(), a = createTab(storage), b = createTab(storage);
  a.dispatch({ type: 'record-draw', draw: draw(1, 'old-clock-ahead', 9) });
  b.dispatch({ type: 'record-draw', draw: draw(1, 'new-clock-behind', 2) });
  a.event(); assert.equal(a.result.progress.lastDraw.drawId, 'new-clock-behind');
});
check('a delayed mount rebases instead of replacing another tab progress with its initial snapshot', () => {
  const storage = store(), a = createTab(storage), b = createTab(storage, { deferred: true });
  solve(a); a.dispatch({ type: 'record-draw', draw: draw(5, 'before-effect') });
  b.flush(); assert.deepEqual(b.result.progress, a.result.progress); assert.deepEqual(loadProgress(storage).progress, a.result.progress);
});
check('an old-client overwrite is repaired once, and repeated events converge', () => {
  const storage = store(), a = createTab(storage); solve(a); a.dispatch({ type: 'unlock-gift', code: '0305' });
  const stale = { ...createInitialProgress(), lastDraw: draw(3, 'legacy-tab-new-song', 3) };
  storage.setItem(STORAGE_KEY, JSON.stringify(stale)); const writes = storage.writes.length;
  a.event(); assert.equal(storage.writes.length, writes + 1);
  assert.equal(loadProgress(storage).progress.envelopeStored, true); assert.equal(loadProgress(storage).progress.giftUnlocked, true);
  assert.equal(loadProgress(storage).progress.lastDraw.drawId, 'legacy-tab-new-song');
  a.event(); a.event(); assert.equal(storage.writes.length, writes + 1);
});
check('equivalent confirmed answers with different whitespace never cause a write loop', () => {
  const storage = store(), a = createTab(storage), b = createTab(storage);
  a.dispatch({ type: 'set-answer', index: 0, value: ' 0 ' }); a.dispatch({ type: 'submit-answer', index: 0 });
  const remote = { ...loadProgress(storage).progress, questions: [{ input: '0', digit: '0' }, ...createInitialProgress().questions.slice(1)] };
  storage.setItem(STORAGE_KEY, JSON.stringify(remote)); const writes = storage.writes.length;
  a.event(); b.event(); a.event(); b.event();
  assert.equal(storage.writes.length, writes); assert.equal(a.result.progress.questions[0].input, '0');
});
check('unrelated keys, other storage areas, deletion and unknown schema cannot inject progress', () => {
  const storage = store(), a = createTab(storage), writes = storage.writes.length;
  const forged = JSON.stringify({ version: 99, giftUnlocked: true });
  storage.data.set(STORAGE_KEY, forged);
  assert.equal(loadSharedProgress(storage).progress, null);
  for (const overrides of [{}, { key: 'another-app' }, { storageArea: {} }, { newValue: null }]) a.event(overrides);
  assert.deepEqual(a.result.progress, createInitialProgress()); assert.equal(storage.writes.length, writes);
});
check('failed-write draft survives reading an older stored record and is saved on recovery', () => {
  const storage = store(), a = createTab(storage); storage.failWrite = true;
  a.dispatch({ type: 'set-answer', index: 0, value: '0' }); assert.equal(a.result.storageStatus, 'memory');
  storage.failWrite = false;
  a.dispatch({ type: 'record-draw', draw: draw(8, 'after-recovery') });
  assert.equal(loadProgress(storage).progress.questions[0].input, '0'); assert.equal(a.result.storageStatus, 'saved');
});
check('a failed-write draw survives an older remote result, while a newer remote draw takes over', () => {
  const storage = store(), a = createTab(storage), b = createTab(storage);
  b.dispatch({ type: 'record-draw', draw: draw(1, 'old', 1) }); a.event();
  storage.failWrite = true; a.dispatch({ type: 'record-draw', draw: draw(7, 'unsaved', 3) });
  storage.failWrite = false; a.event(); assert.equal(loadProgress(storage).progress.lastDraw.drawId, 'unsaved');
  storage.failWrite = true; a.dispatch({ type: 'record-draw', draw: draw(8, 'unsaved-older', 4) });
  storage.failWrite = false; b.dispatch({ type: 'record-draw', draw: draw(9, 'remote-newer', 5) });
  a.event(); assert.equal(a.result.progress.lastDraw.drawId, 'remote-newer');
});
check('blocked read and write keep commands usable in memory', () => {
  const storage = store(); storage.failRead = storage.failWrite = true; const a = createTab(storage);
  solve(a); a.dispatch({ type: 'unlock-gift', code: '0305' }); a.dispatch({ type: 'record-draw', draw: draw(6, 'memory') });
  assert.equal(a.result.progress.envelopeStored, true); assert.equal(a.result.progress.giftUnlocked, true);
  assert.equal(a.result.progress.lastDraw.drawId, 'memory'); assert.equal(a.result.storageStatus, 'memory');
});
check('unmount removes the storage listener', () => {
  const a = createTab(store()); assert.equal(a.listening, true); a.unmount(); assert.equal(a.listening, false);
});
check('a midway gift discovery survives another tab unlocking the final gift before sync', () => {
  const storage = store(), a = createTab(storage), b = createTab(storage);
  a.dispatch({ type: 'FIND_SLEEP_MASK' });
  assert.equal(loadProgress(storage).progress.sleepMaskFound, true);
  b.dispatch({ type: 'unlock-gift', code: '0305' });
  assert.equal(loadProgress(storage).progress.sleepMaskFound, true);
  assert.equal(loadProgress(storage).progress.giftUnlocked, true);
  const writes = storage.writes.length; a.event(); b.event(); a.event();
  assert.equal(a.result.progress.giftUnlocked, true); assert.equal(b.result.progress.sleepMaskFound, true);
  assert.equal(storage.writes.length, writes, 'equivalent discoveries must not echo writes');
});
check('an old schema overwrite cannot erase a mask discovery in an updated tab', () => {
  const storage = store(), a = createTab(storage); a.dispatch({ type: 'FIND_SLEEP_MASK' });
  const { sleepMaskFound, ...oldSchema } = createInitialProgress();
  storage.setItem(STORAGE_KEY, JSON.stringify(oldSchema)); const writes = storage.writes.length;
  a.event(); assert.equal(loadProgress(storage).progress.sleepMaskFound, true);
  assert.equal(storage.writes.length, writes + 1);
  a.event(); assert.equal(storage.writes.length, writes + 1);
});
check('a failed-write midway discovery stays usable and persists after storage recovers', () => {
  const storage = store(), a = createTab(storage); storage.failWrite = true;
  a.dispatch({ type: 'FIND_SLEEP_MASK' });
  assert.equal(a.result.progress.sleepMaskFound, true); assert.equal(a.result.storageStatus, 'memory');
  assert.equal(a.result.progress.giftUnlocked, false);
  storage.failWrite = false; a.dispatch({ type: 'FIND_SLEEP_MASK' });
  assert.equal(loadProgress(storage).progress.sleepMaskFound, true);
  assert.equal(a.result.storageStatus, 'saved');
});
console.log(`\nCross-tab progress: ${passed} passed.`);
