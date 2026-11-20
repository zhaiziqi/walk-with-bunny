import assert from 'node:assert/strict';
import { createRequire, registerHooks } from 'node:module';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/src/')) return nextResolve(`${specifier}.ts`, context);
  return nextResolve(specifier, context);
} });
const { createInitialProgress, progressReducer, viewFromHash } = await import('../src/state/experience.ts');
const { STORAGE_KEY } = await import('../src/lib/storage.ts');
const { previewRun, createPreviewProgressStore } = await import('../src/lib/previewProgress.ts');
const require = createRequire(import.meta.url), viteRequire = createRequire(require.resolve('vite/package.json'));
const { build } = viteRequire('esbuild');
const bundles = await Promise.all([true, false].map(development => build({
  absWorkingDir: fileURLToPath(new URL('..', import.meta.url)), entryPoints: ['src/state/useProgress.ts'],
  bundle: true, write: false, format: 'cjs', platform: 'node', define: { 'import.meta.env.DEV': String(development) },
  plugins: [{ name: 'preview-hook-host', setup(builder) {
    builder.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: 'hook-host' }));
    builder.onLoad({ filter: /.*/, namespace: 'hook-host' }, () => ({ contents: `const host=globalThis.__previewHost; export const useState=(...a)=>host.useState(...a); export const useRef=(...a)=>host.useRef(...a); export const useCallback=(...a)=>host.useCallback(...a); export const useEffect=(...a)=>host.useEffect(...a);` }));
  } }],
})));

function store() {
  const data = new Map(), reads = [], writes = [];
  return { data, reads, writes, failRead: false, failWrite: false,
    getItem(key) { reads.push(key); if (this.failRead) throw Error('blocked read'); return data.get(key) ?? null; },
    setItem(key, value) { writes.push(key); if (this.failWrite) throw Error('blocked write'); data.set(key, value); },
  };
}
function completed() {
  let progress = createInitialProgress();
  for (const [index, value] of ['0', '3', '0', '5'].entries()) {
    progress = progressReducer(progress, { type: 'set-answer', index, value });
    progress = progressReducer(progress, { type: 'submit-answer', index });
  }
  progress = progressReducer(progress, { type: 'store-envelope' });
  return progressReducer(progress, { type: 'unlock-gift', code: '0305' });
}
function createTab(local, session, { search = '?preview=fresh&run=test-a', development = true, throwSession = false } = {}) {
  const slots = [], listeners = new Map(), cleanups = []; let cursor = 0, effects = [], result;
  const equal = (a, b) => a?.length === b?.length && a.every((value, i) => Object.is(value, b[i]));
  const host = {
    useState(initial) { const i = cursor++; slots[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [slots[i].value, value => { slots[i].value = typeof value === 'function' ? value(slots[i].value) : value; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useCallback(callback, dependencies) { const i = cursor++; if (!slots[i] || !equal(dependencies, slots[i].dependencies)) slots[i] = { callback, dependencies }; return slots[i].callback; },
    useEffect(callback, dependencies) { const i = cursor++; if (!slots[i] || !equal(dependencies, slots[i].dependencies)) { slots[i] = { dependencies }; effects.push(callback); } },
  };
  const window = { location: { search }, localStorage: local,
    get sessionStorage() { if (throwSession) throw Error('session storage denied'); return session; },
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) { if (listeners.get(type) === listener) listeners.delete(type); },
  };
  const inside = run => {
    const replacements = { window, __previewHost: host };
    const previous = Object.fromEntries(Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    for (const [key, value] of Object.entries(replacements)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
    try { return run(); } finally {
      for (const [key, descriptor] of Object.entries(previous)) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
      }
    }
  };
  const module = { exports: {} };
  inside(() => new Function('module', 'exports', bundles[development ? 0 : 1].outputFiles[0].text)(module, module.exports));
  const render = () => inside(() => { cursor = 0; result = module.exports.useProgress(); });
  render(); inside(() => { effects.forEach(effect => { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); }); effects = []; }); render();
  return {
    get result() { return result; },
    dispatch(action) { inside(() => result.dispatch(action)); render(); },
    event() { inside(() => listeners.get('storage')?.({ key: STORAGE_KEY, newValue: local.data.get(STORAGE_KEY), storageArea: local })); render(); },
    unmount() { inside(() => cleanups.forEach(cleanup => cleanup())); },
    get listening() { return listeners.has('storage'); },
  };
}
const answer = (tab, index, value) => { tab.dispatch({ type: 'set-answer', index, value }); tab.dispatch({ type: 'submit-answer', index }); };
let passed = 0;
function check(name, run) { run(); passed++; console.log(`PASS: ${name}`); }

check('only explicit development preview links select temporary progress', () => {
  assert.equal(previewRun('?preview=fresh&run=A_2-3', true), 'A_2-3');
  for (const search of ['', '?run=A', '?preview=true', '?preview=saved']) assert.equal(previewRun(search, true), null);
  assert.equal(previewRun('?preview=fresh&run=A', false), null);
  for (const search of ['?preview=fresh', '?preview=fresh&run=', '?preview=fresh&run=../../saved', `?preview=fresh&run=${'x'.repeat(81)}`]) assert.equal(previewRun(search, true), 'default');
});
check('fresh hook never reads or writes a completed normal save', () => {
  const local = store(), session = store(), saved = JSON.stringify(completed()); local.data.set(STORAGE_KEY, saved);
  const tab = createTab(local, session);
  assert.equal(tab.result.previewMode, true); assert.deepEqual(tab.result.progress, createInitialProgress());
  assert.equal(tab.listening, false); assert.deepEqual(local.reads, []); assert.deepEqual(local.writes, []);
  answer(tab, 0, '0'); assert.equal(tab.result.progress.questions[0].digit, '0');
  assert.equal(local.data.get(STORAGE_KEY), saved); assert.deepEqual(local.reads, []); assert.deepEqual(local.writes, []);
});
check('refresh resumes temporary partial answers and the completed envelope', () => {
  const local = store(), session = store(); let tab = createTab(local, session);
  answer(tab, 0, '0'); tab.dispatch({ type: 'set-answer', index: 1, value: '9' }); tab.unmount();
  tab = createTab(local, session);
  assert.deepEqual(tab.result.progress.questions.slice(0, 2), [{ input: '0', digit: '0' }, { input: '9', digit: null }]);
  tab.dispatch({ type: 'store-envelope' }); assert.equal(tab.result.progress.envelopeStored, false);
  for (const [index, value] of [[1, '3'], [2, '0'], [3, '5']]) answer(tab, index, value);
  tab.dispatch({ type: 'store-envelope' }); tab.unmount(); tab = createTab(local, session);
  assert.equal(tab.result.progress.envelopeStored, true); assert.equal(tab.result.progress.questions.map(q => q.digit).join(''), '0305');
  assert.equal(tab.result.progress.giftUnlocked, false); assert.deepEqual(local.writes, []);
});
check('preview still requires the original code and preserves unlock only in its run', () => {
  const local = store(), session = store(); let tab = createTab(local, session);
  assert.equal(viewFromHash('#gift', tab.result.progress.giftUnlocked), 'lock');
  tab.dispatch({ type: 'unlock-gift', code: '0000' }); assert.equal(tab.result.progress.giftUnlocked, false);
  tab.dispatch({ type: 'unlock-gift', code: '0305' }); assert.equal(tab.result.progress.giftUnlocked, true);
  tab.unmount(); tab = createTab(local, session); assert.equal(tab.result.progress.giftUnlocked, true);
  assert.equal(createTab(local, session, { search: '?preview=fresh&run=another' }).result.progress.giftUnlocked, false);
  assert.deepEqual(local.reads, []); assert.deepEqual(local.writes, []);
});
check('different runs and different tab stores do not inherit a prior playthrough', () => {
  const local = store(), session = store(), first = createTab(local, session); answer(first, 0, '0');
  const second = createTab(local, session, { search: '?preview=fresh&run=test-b' });
  assert.deepEqual(second.result.progress, createInitialProgress());
  assert.deepEqual(createTab(local, store()).result.progress, createInitialProgress());
  assert.equal(createTab(local, session).result.progress.questions[0].digit, '0');
});
check('normal storage events cannot grant answers or unlock a mounted preview', () => {
  const local = store(), session = store(), tab = createTab(local, session);
  const writes = session.writes.length; local.data.set(STORAGE_KEY, JSON.stringify(completed())); tab.event();
  assert.deepEqual(tab.result.progress, createInitialProgress()); assert.equal(session.writes.length, writes);
  assert.equal(tab.listening, false); assert.deepEqual(local.reads, []);
});
check('session storage getter failures remain isolated and playable in memory', () => {
  const local = store(), tab = createTab(local, store(), { throwSession: true });
  assert.equal(tab.result.previewMode, true); assert.equal(tab.result.storageStatus, 'memory');
  answer(tab, 0, '0'); assert.equal(tab.result.progress.questions[0].digit, '0');
  assert.deepEqual(local.reads, []); assert.deepEqual(local.writes, []);
});
check('session read or quota errors do not fall back to the saved game', () => {
  const local = store(), session = store(); local.data.set(STORAGE_KEY, JSON.stringify(completed()));
  session.failRead = true; session.failWrite = true;
  const tab = createTab(local, session); answer(tab, 0, '0');
  assert.equal(tab.result.storageStatus, 'memory'); assert.equal(tab.result.progress.questions[0].digit, '0');
  assert.equal(tab.result.progress.giftUnlocked, false); assert.deepEqual(local.reads, []); assert.deepEqual(local.writes, []);
});
check('a failed session read cannot overwrite an unreadable previous temporary save', () => {
  const local = store(), session = store(), previous = JSON.stringify(completed());
  const key = createPreviewProgressStore('test-a', session).key;
  session.data.set(key, previous); session.failRead = true;
  const tab = createTab(local, session); answer(tab, 0, '0');
  assert.equal(tab.result.storageStatus, 'memory'); assert.equal(tab.result.progress.questions[0].digit, '0');
  assert.equal(session.data.get(key), previous); assert.deepEqual(session.writes, []);
  assert.deepEqual(local.reads, []); assert.deepEqual(local.writes, []);
});
check('malformed run URLs remain temporary and corrupted data restores blank', () => {
  const local = store(), session = store(), preview = createPreviewProgressStore('default', session);
  session.data.set(preview.key, '{bad json');
  const tab = createTab(local, session, { search: '?preview=fresh&run=../../anything' });
  assert.equal(tab.result.previewMode, true); assert.deepEqual(tab.result.progress, createInitialProgress());
  answer(tab, 0, '0'); assert.equal(createTab(local, session, { search: '?preview=fresh' }).result.progress.questions[0].digit, '0');
  session.data.set(preview.key, JSON.stringify({ version: 1, giftUnlocked: true }));
  assert.deepEqual(preview.load().progress, createInitialProgress()); assert.deepEqual(local.reads, []);
});
check('normal development pages retain the saved game and cross-tab updates', () => {
  const local = store(), session = store(), tab = createTab(local, session, { search: '' });
  assert.equal(tab.result.previewMode, false); assert.equal(tab.listening, true);
  local.data.set(STORAGE_KEY, JSON.stringify(completed())); tab.event();
  assert.equal(tab.result.progress.envelopeStored, true); assert.equal(tab.result.progress.giftUnlocked, true);
  assert.deepEqual(session.reads, []); assert.deepEqual(session.writes, []);
});
check('production builds ignore preview URL flags and never access session storage', () => {
  const local = store(); local.data.set(STORAGE_KEY, JSON.stringify(completed()));
  const tab = createTab(local, store(), { development: false, throwSession: true });
  assert.equal(tab.result.previewMode, false); assert.equal(tab.result.progress.envelopeStored, true);
  assert.equal(tab.result.progress.giftUnlocked, true); assert.equal(tab.listening, true);
});
console.log(`\n${passed} preview progress checks passed.`);
