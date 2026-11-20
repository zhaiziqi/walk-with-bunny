import assert from 'node:assert/strict';
import { createRequire, registerHooks } from 'node:module';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/src/')) return nextResolve(`${specifier}.ts`, context);
  return nextResolve(specifier, context);
} });
const { acceptGiftCode } = await import('../src/lib/gift.ts');
const { createInitialProgress, progressReducer, viewFromHash } = await import('../src/state/experience.ts');
const { STORAGE_KEY, normalizeProgress, loadProgress, saveProgress } = await import('../src/lib/storage.ts');

let passed = 0, failed = 0;
const check = (name, run) => {
  try { run(); passed++; console.log(`PASS: ${name}`); }
  catch (error) { failed++; console.error(`FAIL: ${name}\n${error.stack}`); }
};
const unlock = (state, code = '0305') => progressReducer(state, { type: 'unlock-gift', code });
const draw = { songId: 7, drawId: 'a-remembered-piece', drawnAt: '2026-11-02T00:00:00.000Z' };
const store = (initial = null) => {
  const entries = new Map(initial === null ? [] : [[STORAGE_KEY, JSON.stringify(initial)]]);
  return { entries, writes: [], getItem(key) { return entries.get(key) ?? null; }, setItem(key, value) { this.writes.push([key, value]); entries.set(key, value); } };
};

check('the four-character password preserves its leading zero and allows surrounding whitespace', () => {
  for (const input of ['0305', ' 0305 ', '\n0305\t']) assert.equal(acceptGiftCode(input), true);
  for (const input of ['305', '00305', '03050', '0304', '0000', '03 05', '03\n05', '０３０５', '03O5', '', ' ']) {
    assert.equal(acceptGiftCode(input), false, `must reject ${JSON.stringify(input)}`);
  }
});
check('non-string inputs cannot be coerced or padded into a password', () => {
  for (const input of [305, 0, null, undefined, true, ['0305'], { toString: () => '0305' }, new String('0305')]) {
    assert.equal(acceptGiftCode(input), false);
    const initial = createInitialProgress();
    assert.strictEqual(progressReducer(initial, { type: 'unlock-gift', code: input }), initial);
  }
});
check('wrong attempts remain retryable and never change business progress', () => {
  const initial = createInitialProgress();
  initial.questions[0].input = '0';
  initial.lastDraw = { ...draw };
  const before = structuredClone(initial);
  for (const code of ['305', '2222', '', '0304', '03050']) assert.strictEqual(unlock(initial, code), initial);
  assert.deepEqual(initial, before);
  assert.equal(unlock(initial).giftUnlocked, true);
});
check('knowing the password on a fresh device unlocks only the gift', () => {
  const initial = createInitialProgress(), result = unlock(initial);
  assert.equal(result.giftUnlocked, true);
  assert.equal(result.puzzleSolved, false); assert.equal(result.envelopeStored, false); assert.equal(result.lastDraw, null);
  assert.strictEqual(result.questions, initial.questions);
  assert.deepEqual(result.questions, Array.from({ length: 4 }, () => ({ input: '', digit: null })));
  assert.equal(initial.giftUnlocked, false, 'the prior state must remain immutable');
});
check('unlocking preserves partial and completed puzzles plus the last chosen song', () => {
  let completed = createInitialProgress();
  for (const [index, value] of ['0', '3', '0', '5'].entries()) {
    completed = progressReducer(completed, { type: 'set-answer', index, value });
    completed = progressReducer(completed, { type: 'submit-answer', index });
  }
  const stored = progressReducer(completed, { type: 'store-envelope' });
  const partial = progressReducer(createInitialProgress(), { type: 'set-answer', index: 0, value: '0' });
  for (const prior of [partial, completed, stored]) {
    const initial = progressReducer(prior, { type: 'record-draw', draw });
    const next = unlock(initial);
    assert.deepEqual({ ...next, giftUnlocked: false }, initial);
    assert.strictEqual(next.questions, initial.questions); assert.strictEqual(next.lastDraw, initial.lastDraw);
    assert.strictEqual(unlock(next), next, 'a repeated successful submission is a no-op');
    assert.strictEqual(unlock(next, '0000'), next, 'a later wrong value must not relock the gift');
  }
});
check('gift routes are guarded without creating progress or requiring a song', () => {
  const initial = createInitialProgress();
  assert.equal(viewFromHash('#gift', initial.giftUnlocked), 'lock');
  assert.equal(viewFromHash('#lock', initial.giftUnlocked), 'lock');
  assert.equal(viewFromHash('#music', initial.giftUnlocked), 'music');
  assert.equal(viewFromHash('#unknown', initial.giftUnlocked), 'overview');
  assert.deepEqual(initial, createInitialProgress());
  assert.equal(viewFromHash('#gift', unlock(initial).giftUnlocked), 'gift');
});
check('refresh restores unlock independently and stores no input or opening animation', () => {
  const result = unlock(progressReducer(createInitialProgress(), { type: 'record-draw', draw }));
  const storage = store(); storage.entries.set('another-app', 'keep');
  assert.equal(saveProgress({ ...result, codeInput: '0305', opening: true, phase: 'opening' }, storage), true);
  assert.deepEqual(loadProgress(storage).progress, result);
  assert.equal(storage.entries.get('another-app'), 'keep');
  assert.deepEqual(Object.keys(JSON.parse(storage.entries.get(STORAGE_KEY))).sort(), Object.keys(result).sort());
  assert.equal(loadProgress(storage).progress.puzzleSolved, false);
  assert.equal(viewFromHash('#gift', loadProgress(storage).progress.giftUnlocked), 'gift');
});
check('malformed or legacy fields cannot masquerade as the saved unlock flag', () => {
  for (const value of ['true', '0305', 1, {}, null, undefined]) {
    assert.equal(normalizeProgress({ ...createInitialProgress(), giftUnlocked: value, lastScene: 'gift', codeInput: '0305' }).giftUnlocked, false);
  }
  assert.equal(normalizeProgress({ ...createInitialProgress(), version: 0, giftUnlocked: true }).giftUnlocked, false);
});

// Run the real useProgress hook with delayed React commits, so the assertions
// observe persistence before the UI can begin an opening animation.
const projectRequire = createRequire(import.meta.url), viteRequire = createRequire(projectRequire.resolve('vite/package.json'));
const { build } = viteRequire('esbuild');
const bundled = await build({
  absWorkingDir: fileURLToPath(new URL('..', import.meta.url)), entryPoints: ['src/state/useProgress.ts'],
  bundle: true, write: false, format: 'cjs', platform: 'node',
  plugins: [{ name: 'gift-progress-hook-host', setup(builder) {
    builder.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: 'hook-host' }));
    builder.onLoad({ filter: /.*/, namespace: 'hook-host' }, () => ({ contents: `const host=globalThis.__giftProgressHost; export const useState=(...a)=>host.useState(...a); export const useRef=(...a)=>host.useRef(...a); export const useCallback=(...a)=>host.useCallback(...a); export const useEffect=(...a)=>host.useEffect(...a);` }));
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
  const replacements = { window: { localStorage: storage }, __giftProgressHost: host };
  const previous = Object.fromEntries(Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(replacements)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  const module = { exports: {} }; new Function('module', 'exports', bundled.outputFiles[0].text)(module, module.exports);
  const render = () => { cursor = 0; result = module.exports.useProgress(); };
  const flush = () => { const pending = effects; effects = []; pending.forEach(effect => effect()); render(); };
  render(); if (!deferMountEffect) flush();
  try { run({ get result() { return result; }, render, flush }); }
  finally { for (const [key, descriptor] of Object.entries(previous)) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } }
}
check('the real hook saves unlock before dispatch returns and before React commits', () => {
  const storage = store();
  withHook(storage, hook => {
    const initial = hook.result.progress, writes = storage.writes.length;
    hook.result.dispatch({ type: 'unlock-gift', code: '305' });
    assert.equal(storage.writes.length, writes, 'wrong input must not write progress');
    hook.result.dispatch({ type: 'unlock-gift', code: '0305' });
    assert.strictEqual(hook.result.progress, initial, 'the UI has not committed yet');
    assert.equal(loadProgress(storage).progress.giftUnlocked, true, 'the result is already durable');
    const savedWrites = storage.writes.length;
    hook.result.dispatch({ type: 'unlock-gift', code: '0305' });
    assert.equal(storage.writes.length, savedWrites, 'same-tick duplicate submit must be a no-op');
    hook.render();
    assert.equal(hook.result.progress.giftUnlocked, true); assert.equal(hook.result.progress.puzzleSolved, false);
    assert.equal(hook.result.storageStatus, 'saved');
  });
});
check('batched puzzle, unlock and song commands preserve each other before a UI commit', () => {
  const storage = store();
  withHook(storage, hook => {
    const { dispatch } = hook.result;
    dispatch({ type: 'set-answer', index: 0, value: '0' });
    dispatch({ type: 'unlock-gift', code: '0305' });
    dispatch({ type: 'record-draw', draw });
    hook.render();
    assert.deepEqual(hook.result.progress.questions[0], { input: '0', digit: null });
    assert.deepEqual(hook.result.progress.questions.slice(1), Array.from({ length: 3 }, () => ({ input: '', digit: null })));
    assert.equal(hook.result.progress.giftUnlocked, true); assert.equal(hook.result.progress.puzzleSolved, false);
    assert.deepEqual(hook.result.progress.lastDraw, draw);
    assert.deepEqual(loadProgress(storage).progress, hook.result.progress);
  });
});
check('a delayed mount effect cannot overwrite an unlock with initial locked state', () => {
  const storage = store();
  withHook(storage, hook => {
    hook.result.dispatch({ type: 'unlock-gift', code: '0305' });
    hook.flush();
    assert.equal(loadProgress(storage).progress.giftUnlocked, true);
    assert.equal(hook.result.progress.giftUnlocked, true);
  }, true);
});
check('storage refusal still unlocks the real hook in memory without solving the puzzle', () => {
  const storage = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('QuotaExceededError'); } };
  withHook(storage, hook => {
    assert.equal(hook.result.storageStatus, 'memory');
    hook.result.dispatch({ type: 'unlock-gift', code: '0305' }); hook.render();
    assert.equal(hook.result.progress.giftUnlocked, true); assert.equal(hook.result.progress.puzzleSolved, false);
    assert.equal(hook.result.storageStatus, 'memory');
    hook.result.dispatch({ type: 'record-draw', draw }); hook.render();
    assert.equal(hook.result.progress.giftUnlocked, true); assert.deepEqual(hook.result.progress.lastDraw, draw);
  });
});
check('restoring and rerendering an unlocked gift never invents a puzzle card or song', () => {
  const saved = unlock(createInitialProgress()), storage = store(saved);
  withHook(storage, hook => {
    const writes = storage.writes.length;
    hook.render(); hook.render();
    assert.equal(storage.writes.length, writes);
    assert.deepEqual(hook.result.progress, saved);
    assert.equal(hook.result.progress.lastDraw, null); assert.equal(hook.result.progress.puzzleSolved, false);
  });
});

console.log(`\nGift progress: ${passed} passed, ${failed} failed.`);
if (failed) process.exitCode = 1;
