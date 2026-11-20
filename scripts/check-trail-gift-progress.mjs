import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';

registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/src/') ? `${specifier}.ts` : specifier, context);
} });
const { createInitialProgress, progressReducer, viewFromHash } = await import('../src/state/experience.ts');
const { normalizeProgress, saveProgress, loadProgress, STORAGE_KEY, LEGACY_STORAGE_KEY } = await import('../src/lib/storage.ts');
const { sameProgress, mergeProgress } = await import('../src/state/mergeProgress.ts');
const { createPreviewProgressStore } = await import('../src/lib/previewProgress.ts');
const findMask = state => progressReducer(state, { type: 'FIND_SLEEP_MASK' });
const unlock = state => progressReducer(state, { type: 'unlock-gift', code: '0305' });
const store = () => {
  const data = new Map();
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
};
let passed = 0;
function check(name, run) { run(); passed++; console.log(`PASS: ${name}`); }

check('a midway discovery is independent, immutable and repeatable without extra progress', () => {
  const initial = createInitialProgress(), found = findMask(initial);
  assert.equal(found.sleepMaskFound, true);
  assert.deepEqual({ ...found, sleepMaskFound: false }, initial);
  assert.equal(initial.sleepMaskFound, false);
  assert.strictEqual(found.questions, initial.questions);
  assert.strictEqual(findMask(found), found);
  assert.equal(sameProgress(initial, found), false);
});
check('finding the mask neither opens the last gift nor supplies the password', () => {
  const found = findMask(createInitialProgress());
  assert.equal(viewFromHash('#gift', found.giftUnlocked), 'lock');
  assert.equal(found.giftUnlocked, false);
  assert.equal(found.puzzleSolved, false);
  assert.equal(found.envelopeStored, false);
  assert.equal(found.questions.map(q => q.digit ?? '').join(''), '');
  assert.strictEqual(progressReducer(found, { type: 'unlock-gift', code: '305' }), found);
  assert.equal(unlock(found).giftUnlocked, true);
  assert.equal(unlock(found).sleepMaskFound, true);
});
check('the optional rest view opens its parcel without granting any progress', () => {
  const initial = createInitialProgress();
  assert.equal(viewFromHash('#rest', false), 'rest');
  assert.equal(viewFromHash('#rest', true), 'rest');
  assert.deepEqual(initial, createInitialProgress());
  assert.equal(initial.sleepMaskFound, false);
  assert.equal(initial.giftUnlocked, false);
});
check('the last gift remains reachable when the optional rest stop was missed', () => {
  const opened = unlock(createInitialProgress());
  assert.equal(opened.giftUnlocked, true);
  assert.equal(opened.sleepMaskFound, false);
  assert.equal(viewFromHash('#gift', opened.giftUnlocked), 'gift');
  assert.equal(findMask(opened).giftUnlocked, true);
});
check('older saves restore final unlock without inventing a midway discovery', () => {
  const { sleepMaskFound, ...older } = unlock(createInitialProgress());
  for (const version of [1, 2]) {
    const restored = normalizeProgress({ ...older, version });
    assert.equal(restored.giftUnlocked, true);
    assert.equal(restored.sleepMaskFound, false);
  }
  const storage = store(); storage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ ...older, version: 1 }));
  assert.equal(loadProgress(storage).progress.sleepMaskFound, false);
  assert.equal(loadProgress(storage).progress.giftUnlocked, true);
  assert.equal(storage.data.has(STORAGE_KEY), false, 'loading must not overwrite the legacy entry');
});
check('only an explicit current-schema boolean is a saved discovery', () => {
  for (const value of [undefined, null, 1, 'true', [], {}, false]) {
    assert.equal(normalizeProgress({ ...createInitialProgress(), sleepMaskFound: value }).sleepMaskFound, false);
  }
  assert.equal(normalizeProgress({ ...createInitialProgress(), sleepMaskFound: true }).sleepMaskFound, true);
  assert.equal(normalizeProgress({ version: 1, sleepMaskFound: true }).sleepMaskFound, false);
  assert.equal(normalizeProgress({ version: 99, sleepMaskFound: true }).sleepMaskFound, false);
});
check('refresh preserves discovery while transient cover and route fields stay out of storage', () => {
  const storage = store(), found = findMask(createInitialProgress());
  storage.setItem('unrelated-key', 'preserve');
  assert.equal(saveProgress({ ...found, clothOpen: true, parcelPhase: 'opening', actorX: 500 }, storage), true);
  assert.deepEqual(loadProgress(storage).progress, found);
  assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)), found);
  assert.equal(storage.getItem('unrelated-key'), 'preserve');
});
check('cross-tab merging keeps either discovered gift and converges without relocking', () => {
  const blank = createInitialProgress(), mid = findMask(blank), end = unlock(blank);
  for (const [local, remote] of [[mid, end], [end, mid]]) {
    const merged = mergeProgress(local, remote, blank);
    assert.equal(merged.sleepMaskFound, true); assert.equal(merged.giftUnlocked, true);
    assert.equal(merged.puzzleSolved, false); assert.equal(merged.envelopeStored, false);
    assert.strictEqual(mergeProgress(merged, blank, blank), merged);
    assert.strictEqual(mergeProgress(merged, merged, merged), merged);
  }
});
check('a temporary playthrough saves the discovery only inside its own run', () => {
  const storage = store(), found = findMask(createInitialProgress());
  const a = createPreviewProgressStore('mask-a', storage), b = createPreviewProgressStore('mask-b', storage);
  assert.equal(a.save(found), true); assert.deepEqual(a.load().progress, found);
  assert.equal(b.load().progress.sleepMaskFound, false);
  assert.equal(storage.data.has(STORAGE_KEY), false);
  assert.equal(createPreviewProgressStore('mask-a', storage).load().progress.sleepMaskFound, true);
});
console.log(`${passed} trail gift progress checks passed.`);
