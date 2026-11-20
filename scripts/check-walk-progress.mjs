import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

// Exercise the actual production/development hook with separate browser locations,
// history stacks and stores. No real browser or personal save is read or modified.
const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('vite/package.json'))('esbuild');
const root = fileURLToPath(new URL('..', import.meta.url));
const bundles = await Promise.all([false, true].map(development => build({
  absWorkingDir: root,
  stdin: { resolveDir: root, contents: `
    export { useProgress } from './src/state/useProgress';
    export * from './src/lib/walkProgress';
    export { createInitialProgress, progressReducer, viewFromHash } from './src/state/experience';
    export { STORAGE_KEY, LEGACY_STORAGE_KEY } from './src/lib/storage';
  ` },
  bundle: true, write: false, format: 'cjs', platform: 'node', define: { 'import.meta.env.DEV': String(development) },
  plugins: [{ name: 'walk-hook-host', setup(builder) {
    builder.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: 'walk-host' }));
    builder.onLoad({ filter: /.*/, namespace: 'walk-host' }, () => ({ contents: `
      const host=globalThis.__walkHost;
      export const useState=(...a)=>host.useState(...a);
      export const useRef=(...a)=>host.useRef(...a);
      export const useCallback=(...a)=>host.useCallback(...a);
      export const useEffect=(...a)=>host.useEffect(...a);
    ` }));
  } }],
})));

function store() {
  const data = new Map(), reads = [], writes = [];
  return { data, reads, writes, failRead: false, failWrite: false,
    getItem(key) { reads.push(key); if (this.failRead) throw Error('blocked read'); return data.get(key) ?? null; },
    setItem(key, value) { writes.push({ key, value }); if (this.failWrite) throw Error('blocked write'); data.set(key, value); },
  };
}

function createTab(local, { href = 'http://localhost:4198/?walk=new#garden', development = false,
  session = store(), throwLocal = false, throwSession = false, throwHistory = false, deferred = false,
  historyState = { journey: { x: -200, y: 8500, zoom: 1 }, entered: true } } = {}) {
  const slots = [], listeners = new Map(), cleanups = [], replacementsMade = [];
  let cursor = 0, effects = [], result, url = new URL(href);
  const equal = (a, b) => a?.length === b?.length && a.every((value, i) => Object.is(value, b[i]));
  const host = {
    useState(initial) { const i = cursor++; slots[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [slots[i].value, value => { slots[i].value = typeof value === 'function' ? value(slots[i].value) : value; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useCallback(callback, dependencies) { const i = cursor++; if (!slots[i] || !equal(dependencies, slots[i].dependencies)) slots[i] = { callback, dependencies }; return slots[i].callback; },
    useEffect(callback, dependencies) { const i = cursor++; if (!slots[i] || !equal(dependencies, slots[i].dependencies)) { slots[i] = { dependencies }; effects.push(callback); } },
  };
  const location = {
    get href() { return url.href; }, get origin() { return url.origin; }, get pathname() { return url.pathname; },
    get search() { return url.search; }, get hash() { return url.hash; },
  };
  const history = {
    state: historyState,
    replaceState(state, title, nextUrl) {
      if (throwHistory) throw Error('history replacement denied');
      replacementsMade.push({ state, title, url: nextUrl });
      this.state = state;
      if (nextUrl !== undefined && nextUrl !== null) url = new URL(nextUrl, url);
    },
  };
  const window = { location, history, crypto: { randomUUID },
    get localStorage() { if (throwLocal) throw Error('local storage denied'); return local; },
    get sessionStorage() { if (throwSession) throw Error('session storage denied'); return session; },
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) { if (listeners.get(type) === listener) listeners.delete(type); },
  };
  const inside = run => {
    const replacements = { window, location, history, __walkHost: host };
    const previous = Object.fromEntries(Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    for (const [key, value] of Object.entries(replacements)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
    try { return run(); }
    finally { for (const [key, descriptor] of Object.entries(previous)) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } }
  };
  const module = { exports: {} };
  inside(() => new Function('module', 'exports', bundles[development ? 1 : 0].outputFiles[0].text)(module, module.exports));
  const api = module.exports;
  const render = () => inside(() => { cursor = 0; result = api.useProgress(); });
  const flush = () => inside(() => { const pending = effects; effects = []; pending.forEach(effect => { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); }); render(); });
  render(); if (!deferred) flush();
  return { api, session, history, replacementsMade, inside, render, flush,
    get result() { return result; }, get href() { return url.href; }, get key() { return result.walkId ? api.createWalkProgressStore(result.walkId, null).key : api.STORAGE_KEY; },
    get listening() { return listeners.has('storage'); },
    dispatch(action) { inside(() => result.dispatch(action)); render(); },
    event(key, overrides = {}) { inside(() => listeners.get('storage')?.({ key, newValue: local.data.get(key) ?? null, storageArea: local, ...overrides })); render(); },
    unmount() { inside(() => cleanups.forEach(cleanup => cleanup())); },
  };
}
const sample = createTab(store());
const { createInitialProgress, progressReducer, STORAGE_KEY, LEGACY_STORAGE_KEY } = sample.api;
sample.unmount();
function completed() {
  let state = createInitialProgress();
  for (const [index, value] of ['0', '3', '0', '5'].entries()) {
    state = progressReducer(state, { type: 'set-answer', index, value });
    state = progressReducer(state, { type: 'submit-answer', index });
  }
  state = progressReducer(state, { type: 'store-envelope' });
  state = progressReducer(state, { type: 'FIND_SLEEP_MASK' });
  state = progressReducer(state, { type: 'record-draw', draw: { songId: 6, drawId: 'existing-draw', drawnAt: '2026-11-10T04:00:00.000Z' } });
  return progressReducer(state, { type: 'unlock-gift', code: '0305' });
}
function seededStore() {
  const local = store(), normal = JSON.stringify(completed()), legacy = JSON.stringify({ version: 1, giftUnlocked: true, lastDraw: completed().lastDraw });
  local.data.set(STORAGE_KEY, normal); local.data.set(LEGACY_STORAGE_KEY, legacy);
  return { local, normal, legacy };
}
function assertNormalUntouched({ local, normal, legacy }) {
  assert.equal(local.data.get(STORAGE_KEY), normal); assert.equal(local.data.get(LEGACY_STORAGE_KEY), legacy);
  assert.ok(local.reads.every(key => key !== STORAGE_KEY && key !== LEGACY_STORAGE_KEY), 'walks must not read normal or legacy saves');
  assert.ok(local.writes.every(({ key }) => key !== STORAGE_KEY && key !== LEGACY_STORAGE_KEY), 'walks must not write normal or legacy saves');
}
const answer = (tab, index, value) => { tab.dispatch({ type: 'set-answer', index, value }); tab.dispatch({ type: 'submit-answer', index }); };
let passed = 0;
function check(name, run) { run(); passed++; console.log(`PASS: ${name}`); }

check('the reusable new-walk link drops every prior run, debug flag and reveal hash', () => {
  const original = 'http://localhost:4198/garden/?walk=old&preview=fresh&run=qa&qa=chunk-error&static=1#gift';
  const next = new URL(sample.api.newWalkHref(original));
  assert.equal(next.origin, 'http://localhost:4198'); assert.equal(next.pathname, '/garden/');
  assert.deepEqual([...next.searchParams], [['walk', 'new']]); assert.equal(next.hash, '#garden');
  assert.equal(sample.api.newWalkHref(next.href), next.href, 'the shared starting link stays reusable');
});
check('production walk=new creates a fully empty independent run and clears stale page/history', () => {
  const seeded = seededStore();
  const tab = createTab(seeded.local, { href: 'http://localhost:4198/?walk=new&preview=fresh&run=old&qa=chunk-error&static=1#gift' });
  assert.deepEqual(tab.result.progress, createInitialProgress()); assert.equal(tab.result.previewMode, false);
  assert.match(tab.result.walkId, /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i);
  const canonical = new URL(tab.href);
  assert.deepEqual([...canonical.searchParams], [['walk', tab.result.walkId]]); assert.equal(canonical.hash, '#garden');
  assert.equal(tab.history.state, null); assert.equal(tab.replacementsMade.length, 1);
  assert.notEqual(tab.key, STORAGE_KEY); assert.notEqual(tab.key, LEGACY_STORAGE_KEY);
  assertNormalUntouched(seeded);
});
check('repeated browser initialization after canonicalization reuses the same identity', () => {
  const seeded = seededStore(), tab = createTab(seeded.local);
  const again = tab.inside(() => tab.api.browserWalkProgress());
  const third = tab.inside(() => tab.api.browserWalkProgress());
  assert.equal(again.run, tab.result.walkId); assert.equal(third.key, tab.key);
  assert.equal(tab.replacementsMade.length, 1); assertNormalUntouched(seeded);
});
check('each separate walk=new load gets a different run without inheriting prior achievements', () => {
  const seeded = seededStore(), first = createTab(seeded.local);
  answer(first, 0, '0'); first.dispatch({ type: 'FIND_SLEEP_MASK' }); first.dispatch({ type: 'unlock-gift', code: '0305' });
  const next = createTab(seeded.local);
  assert.notEqual(next.result.walkId, first.result.walkId); assert.notEqual(next.key, first.key);
  assert.deepEqual(next.result.progress, createInitialProgress()); assertNormalUntouched(seeded);
});
check('a canonical same-ID refresh restores only that run, including all discoveries', () => {
  const seeded = seededStore(), first = createTab(seeded.local);
  for (const [index, value] of ['0', '3', '0', '5'].entries()) answer(first, index, value);
  first.dispatch({ type: 'store-envelope' }); first.dispatch({ type: 'FIND_SLEEP_MASK' });
  first.dispatch({ type: 'record-draw', draw: { songId: 3, drawId: 'walk-song', drawnAt: '2026-11-10T05:00:00.000Z' } });
  first.dispatch({ type: 'unlock-gift', code: '0305' });
  const saved = structuredClone(first.result.progress), href = first.href; first.unmount();
  const refreshed = createTab(seeded.local, { href });
  assert.equal(refreshed.result.walkId, first.result.walkId); assert.deepEqual(refreshed.result.progress, saved);
  assert.equal(refreshed.replacementsMade.length, 0, 'refresh must not create a different run');
  assertNormalUntouched(seeded);
});
check('different canonical runs ignore each other and normal-save storage events', () => {
  const seeded = seededStore(), a = createTab(seeded.local), b = createTab(seeded.local);
  const aKey = a.key, bKey = b.key;
  answer(a, 0, '0'); a.dispatch({ type: 'FIND_SLEEP_MASK' }); a.dispatch({ type: 'unlock-gift', code: '0305' });
  const beforeReads = seeded.local.reads.length, beforeWrites = seeded.local.writes.length;
  b.event(aKey); b.event(STORAGE_KEY); b.event(LEGACY_STORAGE_KEY);
  assert.deepEqual(b.result.progress, createInitialProgress());
  assert.equal(seeded.local.reads.length, beforeReads); assert.equal(seeded.local.writes.length, beforeWrites);
  answer(b, 0, '0'); assert.equal(JSON.parse(seeded.local.data.get(bKey)).giftUnlocked, false);
  assertNormalUntouched(seeded);
});
check('same-run tabs merge achievements on only their own key and do not echo writes', () => {
  const seeded = seededStore(), a = createTab(seeded.local), key = a.key;
  const b = createTab(seeded.local, { href: a.href });
  a.dispatch({ type: 'FIND_SLEEP_MASK' }); answer(a, 0, '0');
  const beforeWrites = seeded.local.writes.length;
  b.event(key); assert.equal(b.result.progress.sleepMaskFound, true); assert.equal(b.result.progress.questions[0].digit, '0');
  assert.equal(seeded.local.writes.length, beforeWrites);
  b.dispatch({ type: 'unlock-gift', code: '0305' }); a.event(key);
  assert.equal(a.result.progress.giftUnlocked, true); assert.equal(a.result.progress.sleepMaskFound, true);
  assertNormalUntouched(seeded);
});
check('other storage areas and deletion cannot inject progress into a walk', () => {
  const local = store(), tab = createTab(local), key = tab.key;
  local.data.set(key, JSON.stringify(completed())); const beforeReads = local.reads.length;
  tab.event(key, { storageArea: {} }); tab.event(key, { newValue: null });
  assert.deepEqual(tab.result.progress, createInitialProgress()); assert.equal(local.reads.length, beforeReads);
});
check('an older same-run tab rebases before a new command without erasing discoveries', () => {
  const seeded = seededStore(), a = createTab(seeded.local), b = createTab(seeded.local, { href: a.href });
  a.dispatch({ type: 'FIND_SLEEP_MASK' }); a.dispatch({ type: 'unlock-gift', code: '0305' });
  b.dispatch({ type: 'set-answer', index: 0, value: '0' });
  assert.equal(b.result.progress.sleepMaskFound, true); assert.equal(b.result.progress.giftUnlocked, true);
  a.event(a.key); assert.equal(a.result.progress.questions[0].input, '0'); assertNormalUntouched(seeded);
});
check('invalid explicit walk links remain isolated and never fall through to normal saves', () => {
  for (const query of ['?walk=', '?walk=../../saved', `?walk=${'x'.repeat(400)}`, '?walk=%00', '?walk=new&walk=other']) {
    const seeded = seededStore(), tab = createTab(seeded.local, { href: `http://localhost:4198/${query}#gift` });
    assert.ok(tab.result.walkId); assert.deepEqual(tab.result.progress, createInitialProgress());
    tab.dispatch({ type: 'FIND_SLEEP_MASK' }); assert.equal(tab.result.progress.giftUnlocked, false); assertNormalUntouched(seeded);
  }
});
check('a denied localStorage getter stays playable in memory without session/normal fallback', () => {
  const seeded = seededStore(), session = store(), tab = createTab(seeded.local, { session, throwLocal: true });
  assert.ok(tab.result.walkId); assert.equal(tab.result.storageStatus, 'memory');
  answer(tab, 0, '0'); tab.dispatch({ type: 'FIND_SLEEP_MASK' });
  assert.equal(tab.result.progress.questions[0].digit, '0'); assert.equal(tab.result.progress.sleepMaskFound, true);
  assert.equal(tab.result.progress.giftUnlocked, false); assert.deepEqual(session.reads, []); assert.deepEqual(session.writes, []);
  assertNormalUntouched(seeded);
});
check('a failed URL canonicalization stays in memory instead of writing a hidden new run', () => {
  const seeded = seededStore(), session = store(), tab = createTab(seeded.local, { session, throwHistory: true });
  assert.ok(tab.result.walkId); assert.equal(tab.result.storageStatus, 'memory');
  answer(tab, 0, '0'); tab.dispatch({ type: 'FIND_SLEEP_MASK' });
  assert.equal(tab.result.progress.questions[0].digit, '0'); assert.equal(tab.result.progress.giftUnlocked, false);
  assert.deepEqual(seeded.local.reads, []); assert.deepEqual(seeded.local.writes, []);
  assert.deepEqual(session.reads, []); assert.deepEqual(session.writes, []); assertNormalUntouched(seeded);
});
check('unreadable previous walk state is not overwritten by a blank memory fallback', () => {
  const local = store(), initial = createTab(local), href = initial.href, key = initial.key;
  const previous = JSON.stringify(completed()); local.data.set(key, previous); initial.unmount();
  local.reads.length = 0; local.writes.length = 0; local.failRead = true;
  const tab = createTab(local, { href }); answer(tab, 0, '0'); tab.dispatch({ type: 'FIND_SLEEP_MASK' });
  assert.equal(tab.result.storageStatus, 'memory'); assert.equal(tab.result.progress.questions[0].digit, '0');
  assert.equal(local.data.get(key), previous); assert.deepEqual(local.writes, []);
  assert.ok(local.reads.every(read => read === key));
});
check('write failure remains independent and can recover within the same walk', () => {
  const seeded = seededStore(), tab = createTab(seeded.local), key = tab.key;
  seeded.local.failWrite = true; tab.dispatch({ type: 'FIND_SLEEP_MASK' });
  assert.equal(tab.result.storageStatus, 'memory'); assert.equal(tab.result.progress.sleepMaskFound, true);
  seeded.local.failWrite = false; tab.dispatch({ type: 'FIND_SLEEP_MASK' });
  assert.equal(tab.result.storageStatus, 'saved'); assert.equal(JSON.parse(seeded.local.data.get(key)).sleepMaskFound, true);
  assertNormalUntouched(seeded);
});
check('a malformed walk record cannot import a legacy or foreign unlocked gift', () => {
  for (const raw of ['{bad', JSON.stringify({ version: 1, giftUnlocked: true }), JSON.stringify({ version: 99, giftUnlocked: true })]) {
    const local = store(), initial = createTab(local), key = initial.key, href = initial.href; initial.unmount();
    local.data.set(key, raw); const tab = createTab(local, { href });
    assert.deepEqual(tab.result.progress, createInitialProgress());
  }
});
check('a normal page retains its original saved progress and no walk identity', () => {
  const seeded = seededStore(), tab = createTab(seeded.local, { href: 'http://localhost:4198/#garden' });
  assert.equal(tab.result.walkId, null); assert.deepEqual(tab.result.progress, completed());
  assert.equal(tab.result.previewMode, false); assert.equal(tab.replacementsMade.length, 0);
});
check('DEV temporary previews retain tab storage and never become persistent walks', () => {
  const seeded = seededStore(), session = store();
  const tab = createTab(seeded.local, { development: true, session, href: 'http://localhost:5173/?preview=fresh&run=temporary#garden' });
  assert.equal(tab.result.previewMode, true); assert.equal(tab.result.walkId, null);
  answer(tab, 0, '0'); assert.equal(tab.result.progress.questions[0].digit, '0');
  assert.ok(session.writes.length > 0); assert.deepEqual(seeded.local.reads, []); assert.deepEqual(seeded.local.writes, []);
});
check('an explicit walk request wins over leftover DEV preview flags and drops them', () => {
  const seeded = seededStore(), session = store(), tab = createTab(seeded.local, {
    development: true, session, href: 'http://localhost:5173/?preview=fresh&run=temporary&walk=new#gift',
  });
  assert.ok(tab.result.walkId); assert.equal(tab.result.previewMode, false);
  assert.deepEqual(tab.result.progress, createInitialProgress());
  assert.equal(new URL(tab.href).searchParams.has('preview'), false); assert.equal(new URL(tab.href).hash, '#garden');
  assert.deepEqual(session.reads, []); assert.deepEqual(session.writes, []); assertNormalUntouched(seeded);
});
check('unmounting an independent walk removes its storage listener', () => {
  const tab = createTab(store()); assert.equal(tab.listening, true); tab.unmount(); assert.equal(tab.listening, false);
});
console.log(`${passed} isolated walk progress checks passed.`);
