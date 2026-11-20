import assert from 'node:assert/strict';
import { createRequire, registerHooks } from 'node:module';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/src/')) return nextResolve(`${specifier}.ts`, context);
  return nextResolve(specifier, context);
} });
const { content } = await import('../src/config/content.ts');
const { pickSongId, createSongDraw, formatSongRequest } = await import('../src/lib/draw.ts');
const { createInitialProgress, progressReducer, viewFromHash } = await import('../src/state/experience.ts');
const { STORAGE_KEY, normalizeProgress, loadProgress, saveProgress } = await import('../src/lib/storage.ts');

let passed = 0, failed = 0;
const check = (name, run) => {
  try { run(); passed++; console.log(`PASS: ${name}`); }
  catch (error) { failed++; console.error(`FAIL: ${name}\n${error.stack}`); }
};
const draw = (songId = 7, drawId = 'test-draw') => ({ songId, drawId, drawnAt: '2026-11-01T10:00:00.000Z' });
const record = (state, value = draw()) => progressReducer(state, { type: 'record-draw', draw: value });
const store = (initial = null) => {
  const entries = new Map(initial === null ? [] : [[STORAGE_KEY, JSON.stringify(initial)]]);
  return { entries, writes: [], getItem(key) { return entries.get(key) ?? null; }, setItem(key, value) { this.writes.push([key, value]); entries.set(key, value); } };
};

check('all nine fixed IDs have equally sized selection intervals, including 1 and 9', () => {
  assert.deepEqual(content.music.songs.map(song => song.id).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  for (let i = 0; i < 9; i++) {
    for (const fraction of [.00001, .5, .99999]) assert.equal(pickSongId(() => (i + fraction) / 9), i + 1);
  }
  assert.equal(pickSongId(() => 0), 1);
  assert.equal(pickSongId(() => 1 - Number.EPSILON), 9);
});
check('one active draw takes one song sample and accepts consecutive identical songs', () => {
  let calls = 0;
  const random = () => { calls++; return .7; };
  const before = structuredClone(content.music.songs);
  const first = createSongDraw(random), second = createSongDraw(random);
  assert.equal(calls, 2);
  assert.equal(first.songId, 7); assert.equal(second.songId, 7);
  assert.notEqual(first.drawId, second.drawId);
  assert.equal(new Date(first.drawnAt).toISOString(), first.drawnAt);
  assert.deepEqual(content.music.songs, before, 'drawing must never reorder or remove a song');
});
check('invalid injected randomness is rejected rather than biased or silently redrawn', () => {
  for (const sample of [NaN, Infinity, -1, -.0001, 1, 1.01, '0.5', undefined]) {
    let calls = 0;
    assert.throws(() => pickSongId(() => { calls++; return sample; }), RangeError);
    assert.equal(calls, 1);
  }
});
check('recording a song leaves puzzle drafts, completion, envelope and gift state independent', () => {
  for (const unlocked of [false, true]) {
    const initial = { ...createInitialProgress(), giftUnlocked: unlocked };
    initial.questions[0].input = '0';
    const result = record(initial);
    assert.strictEqual(result.questions, initial.questions);
    assert.equal(result.puzzleSolved, false); assert.equal(result.envelopeStored, false);
    assert.equal(result.giftUnlocked, unlocked);
    assert.deepEqual(initial.lastDraw, null);
    assert.equal(viewFromHash('#music'), 'music');
    assert.equal(viewFromHash('#gift', result.giftUnlocked), unlocked ? 'gift' : 'lock');
  }
});
check('a repeated song creates a fresh result, while replaying the same event is a no-op', () => {
  const first = record(createInitialProgress(), draw(7, 'first'));
  const second = record(first, draw(7, 'second'));
  assert.notStrictEqual(first, second);
  assert.equal(second.lastDraw.songId, 7);
  assert.equal(second.lastDraw.drawId, 'second');
  assert.strictEqual(record(second, draw(7, 'second')), second);
});
check('malformed draw commands cannot replace a valid result', () => {
  const initial = record(createInitialProgress());
  for (const invalid of [null, undefined, [], {}, ...[0, 10, 1.1, '7', NaN].map(songId => ({ ...draw(), songId })),
    { ...draw(), drawId: '' }, { ...draw(), drawId: ' ' }, { ...draw(), drawId: 7 }, { ...draw(), drawId: 'x'.repeat(257) },
    { ...draw(), drawnAt: '' }, { ...draw(), drawnAt: 'yesterday' }, { ...draw(), drawnAt: 0 }]) {
    assert.strictEqual(record(initial, invalid), initial);
  }
});
check('accepted event data is copied, and extra fields cannot become persisted draw data', () => {
  const event = { ...draw(), isDrawing: true, puzzleSolved: true };
  const result = record(createInitialProgress(), event);
  event.songId = 3;
  assert.equal(result.lastDraw.songId, 7);
  assert.deepEqual(Object.keys(result.lastDraw).sort(), ['drawId', 'drawnAt', 'songId']);
});
check('refresh restores the last result without saving drawing phases or changing progress', () => {
  const saved = record(createInitialProgress(), draw(9));
  const storage = store(); storage.entries.set('another-app', 'keep');
  assert.equal(saveProgress({ ...saved, isDrawing: true, phase: 'blooming', history: [draw(1)] }, storage), true);
  assert.deepEqual(loadProgress(storage).progress, saved);
  const stored = JSON.parse(storage.entries.get(STORAGE_KEY));
  assert.deepEqual(Object.keys(stored).sort(), Object.keys(createInitialProgress()).sort());
  assert.equal(storage.entries.get('another-app'), 'keep');
  assert.equal(normalizeProgress({ ...saved, lastDraw: { ...draw(), songId: 42 } }).lastDraw, null);
});
check('completed puzzle and stored envelope survive independent music draws and restoration', () => {
  let solved = createInitialProgress();
  for (const [index, value] of ['0', '3', '0', '5'].entries()) {
    solved = progressReducer(solved, { type: 'set-answer', index, value });
    solved = progressReducer(solved, { type: 'submit-answer', index });
  }
  solved = progressReducer(solved, { type: 'store-envelope' });
  const next = record(solved);
  assert.strictEqual(next.questions, solved.questions);
  assert.equal(next.puzzleSolved, true); assert.equal(next.envelopeStored, true); assert.equal(next.giftUnlocked, false);
  assert.deepEqual(loadProgress(store(next)).progress, next);
});
check('request text uses the current ID and title without interpreting replacement metacharacters', () => {
  const selected = content.music.songs.find(song => song.id === 7);
  const text = formatSongRequest(selected);
  assert.ok(text.includes('07')); assert.ok(text.includes(selected.title));
  assert.equal(text.includes('{{'), false);
  assert.equal(formatSongRequest({ id: 1, title: '$& {{id}}' }, '{{title}} / {{id}} / {{title}}'), '$& {{id}} / 01 / $& {{id}}');
});

// Exercise the actual hook with deferred React commits. The important contract
// is synchronous persistence before UI animation and no stale batched update.
const projectRequire = createRequire(import.meta.url), viteRequire = createRequire(projectRequire.resolve('vite/package.json'));
const { build } = viteRequire('esbuild');
const bundled = await build({
  absWorkingDir: fileURLToPath(new URL('..', import.meta.url)), entryPoints: ['src/state/useProgress.ts'],
  bundle: true, write: false, format: 'cjs', platform: 'node',
  plugins: [{ name: 'progress-hook-host', setup(builder) {
    builder.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: 'hook-host' }));
    builder.onLoad({ filter: /.*/, namespace: 'hook-host' }, () => ({ contents: `const host=globalThis.__musicProgressHost; export const useState=(...a)=>host.useState(...a); export const useRef=(...a)=>host.useRef(...a); export const useCallback=(...a)=>host.useCallback(...a); export const useEffect=(...a)=>host.useEffect(...a);` }));
  } }],
});
function withHook(storage, run, deferMountEffect = false) {
  const slots = []; let cursor = 0, effects = [], result;
  const equal = (a, b) => a?.length === b?.length && a.every((value, i) => Object.is(value, b[i]));
  const host = {
    useState(initial) { const i = cursor++; slots[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [slots[i].value, value => { slots[i].value = typeof value === 'function' ? value(slots[i].value) : value; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useCallback(callback, dependencies) { const i = cursor++; if (!slots[i] || !equal(dependencies, slots[i].dependencies)) slots[i] = { callback, dependencies }; return slots[i].callback; },
    useEffect(callback, dependencies) { const i = cursor++; if (!slots[i] || !equal(dependencies, slots[i].dependencies)) { slots[i] = { dependencies }; effects.push(callback); } },
  };
  const replacements = { window: { localStorage: storage }, __musicProgressHost: host };
  const previous = Object.fromEntries(Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(replacements)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  const module = { exports: {} }; new Function('module', 'exports', bundled.outputFiles[0].text)(module, module.exports);
  const render = () => { cursor = 0; result = module.exports.useProgress(); };
  const flush = () => { const pending = effects; effects = []; pending.forEach(effect => effect()); render(); };
  render(); if (!deferMountEffect) flush();
  try { run({ get result() { return result; }, render, flush }); }
  finally { for (const [key, descriptor] of Object.entries(previous)) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } }
}
check('the real hook saves a draw before dispatch returns, before any React commit or animation', () => {
  const storage = store();
  withHook(storage, hook => {
    const event = createSongDraw(() => .8), initial = hook.result.progress;
    hook.result.dispatch({ type: 'record-draw', draw: event });
    assert.strictEqual(hook.result.progress, initial, 'React has not committed yet');
    assert.deepEqual(loadProgress(storage).progress.lastDraw, event, 'the result must already be saved');
    hook.render();
    assert.deepEqual(hook.result.progress.lastDraw, event); assert.equal(hook.result.storageStatus, 'saved');
  });
});
check('batched puzzle and draw commands preserve one another before a UI commit', () => {
  const storage = store();
  withHook(storage, hook => {
    const { dispatch } = hook.result;
    dispatch({ type: 'set-answer', index: 0, value: '0' });
    dispatch({ type: 'record-draw', draw: draw(7, 'first') });
    dispatch({ type: 'record-draw', draw: draw(7, 'second') });
    hook.render();
    assert.deepEqual(hook.result.progress.questions[0], { input: '0', digit: null });
    assert.deepEqual(hook.result.progress.questions.slice(1), Array.from({ length: 3 }, () => ({ input: '', digit: null })));
    assert.equal(hook.result.progress.lastDraw.drawId, 'second');
    assert.deepEqual(loadProgress(storage).progress, hook.result.progress);
    assert.strictEqual(hook.result.dispatch, dispatch);
  });
});
check('a delayed mount effect cannot overwrite an already saved draw with the initial state', () => {
  const storage = store();
  withHook(storage, hook => {
    hook.result.dispatch({ type: 'record-draw', draw: draw() });
    hook.flush();
    assert.deepEqual(loadProgress(storage).progress.lastDraw, draw());
    assert.deepEqual(hook.result.progress.lastDraw, draw());
  }, true);
});
check('storage refusal preserves the actual hook result in memory and permits the next draw', () => {
  const storage = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('QuotaExceededError'); } };
  withHook(storage, hook => {
    assert.equal(hook.result.storageStatus, 'memory');
    hook.result.dispatch({ type: 'record-draw', draw: draw(7, 'first') }); hook.render();
    assert.equal(hook.result.progress.lastDraw.drawId, 'first');
    hook.result.dispatch({ type: 'record-draw', draw: draw(7, 'second') }); hook.render();
    assert.equal(hook.result.progress.lastDraw.drawId, 'second');
    assert.equal(hook.result.storageStatus, 'memory'); assert.equal(hook.result.progress.puzzleSolved, false);
  });
});
check('restore, rerender and repeated event dispatch do not create or overwrite a draw', () => {
  const initial = record(createInitialProgress()), storage = store(initial);
  withHook(storage, hook => {
    const writes = storage.writes.length;
    for (let i = 0; i < 4; i++) { hook.render(); hook.result.dispatch({ type: 'record-draw', draw: draw() }); }
    assert.equal(storage.writes.length, writes);
    assert.deepEqual(hook.result.progress, initial);
  });
});

console.log(`\nMusic progress: ${passed} passed, ${failed} failed.`);
if (failed) process.exitCode = 1;
