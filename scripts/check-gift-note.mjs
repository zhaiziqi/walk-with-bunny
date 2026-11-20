import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/src/')) return nextResolve(`${specifier}.ts`, context);
  return nextResolve(specifier, context);
} });

const { getGiftNote } = await import('../src/lib/giftNote.ts');
const { createInitialProgress, progressReducer } = await import('../src/state/experience.ts');

let passed = 0, failed = 0;
const check = (name, run) => {
  try { run(); passed++; console.log(`PASS: ${name}`); }
  catch (error) { failed++; console.error(`FAIL: ${name}\n${error.stack}`); }
};
const digit = (progress, index, value) => progressReducer(
  progressReducer(progress, { type: 'set-answer', index, value }), { type: 'submit-answer', index });
const completed = () => ['0', '3', '0', '5'].reduce((progress, value, index) => digit(progress, index, value), createInitialProgress());

check('a fresh or partially answered visit exposes no complete password note', () => {
  let progress = createInitialProgress();
  assert.equal(getGiftNote(progress), null);
  for (const [index, value] of ['0', '3', '0'].entries()) {
    progress = digit(progress, index, value);
    assert.equal(getGiftNote(progress), null);
  }
  progress = progressReducer(progress, { type: 'set-answer', index: 3, value: '5' });
  assert.equal(getGiftNote(progress), null, 'a correct draft is not a submitted answer');
});

check('solved or packed flags alone cannot reveal answers', () => {
  for (const flags of [
    { puzzleSolved: true }, { envelopeStored: true },
    { puzzleSolved: true, envelopeStored: true, giftUnlocked: true },
  ]) assert.equal(getGiftNote({ ...createInitialProgress(), ...flags }), null);
});

check('all four earned digits remain ordered strings, with both zeroes intact', () => {
  assert.deepEqual(getGiftNote(completed()), { digits: ['0', '3', '0', '5'], packed: false });
});

check('packing changes presentation only; it never changes the earned digits', () => {
  const progress = progressReducer(completed(), { type: 'store-envelope' });
  assert.deepEqual(getGiftNote(progress), { digits: ['0', '3', '0', '5'], packed: true });
});

check('a mismatched input, wrong digit or missing submitted digit is not a complete note', () => {
  for (const question of [
    { input: '2', digit: '0' }, { input: '0', digit: '2' },
    { input: '0', digit: null }, { input: 0, digit: '0' },
  ]) {
    const progress = completed();
    progress.questions[0] = question;
    assert.equal(getGiftNote(progress), null);
  }
});

check('the note needs exactly four valid questions and rejects malformed records safely', () => {
  for (const questions of [
    [], completed().questions.slice(0, 3), [...completed().questions, { input: '0', digit: '0' }],
    [null, ...completed().questions.slice(1)], [undefined, ...completed().questions.slice(1)],
    [{}, ...completed().questions.slice(1)], null, undefined,
  ]) assert.equal(getGiftNote({ ...completed(), questions }), null);
});

check('independent gift access and song draws cannot award a note', () => {
  let progress = progressReducer(createInitialProgress(), { type: 'unlock-gift', code: '0305' });
  progress = progressReducer(progress, { type: 'record-draw', draw: {
    songId: 4, drawId: 'gift-note-independent-song', drawnAt: '2026-11-02T00:00:00.000Z',
  } });
  assert.equal(getGiftNote(progress), null);
  assert.equal(progress.giftUnlocked, true);
  assert.equal(progress.lastDraw.songId, 4);
});

check('reading a note neither mutates progress nor returns a writable reference into it', () => {
  const progress = progressReducer(completed(), { type: 'store-envelope' });
  progress.lastDraw = { songId: 7, drawId: 'keep-existing-draw', drawnAt: '2026-11-02T00:00:00.000Z' };
  const before = structuredClone(progress);
  const note = getGiftNote(progress);
  note.digits[0] = '9';
  assert.deepEqual(progress, before);
  assert.deepEqual(getGiftNote(progress), { digits: ['0', '3', '0', '5'], packed: true });
});

console.log(`\nGift note lookup: ${passed} passed, ${failed} failed.`);
if (failed) process.exitCode = 1;
