import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/src/')) {
    return nextResolve(`${specifier}.ts`, context);
  }
  return nextResolve(specifier, context);
} });

const { content } = await import('../src/config/content.ts');
const { createInitialProgress, progressReducer, viewFromHash } = await import('../src/state/experience.ts');
const { acceptAnswer, activeQuestionIndex, isPuzzleComplete } = await import('../src/lib/puzzle.ts');
const { STORAGE_KEY, LEGACY_STORAGE_KEY, normalizeProgress, loadProgress, saveProgress } = await import('../src/lib/storage.ts');
let passed = 0;
function check(name, run) { run(); passed++; console.log(`PASS: ${name}`); }
const act = (state, type, index, value) => progressReducer(state, { type, index, value });
const solve = (state, index, answer = content.puzzle.questions[index].answer) =>
  act(act(state, 'set-answer', index, answer), 'submit-answer', index);
const complete = () => [0, 1, 2, 3].reduce((state, index) => solve(state, index), createInitialProgress());
const draw = { songId: 7, drawId: 'puzzle-test-draw', drawnAt: '2026-11-02T01:00:00.000Z' };
const storageWith = entries => {
  const data = new Map(entries); const writes = [];
  return { data, writes, getItem: key => data.get(key) ?? null,
    setItem: (key, value) => { writes.push(key); data.set(key, value); } };
};

check('four original topics independently yield 0, 3, 0, 5', () => {
  assert.equal(content.puzzle.kind, 'computer-knowledge-v1');
  assert.deepEqual(content.puzzle.questions.map(item => item.id), ['python', 'tcp', 'xor', 'binary']);
  assert.deepEqual(content.puzzle.questions.map((item, index) => acceptAnswer(index, item.answer)), ['0', '3', '0', '5']);
  assert.equal(content.puzzle.questions.map(item => item.answer).join(''), '0305');
});

check('fresh question inputs and slip digits are genuinely blank and independent', () => {
  const initial = createInitialProgress();
  assert.equal(initial.version, 2); assert.equal(initial.questions.length, 4);
  assert.deepEqual(initial.questions, Array.from({ length: 4 }, () => ({ input: '', digit: null })));
  assert.equal(activeQuestionIndex(initial), 0);
  assert.equal(initial.puzzleSolved, false); assert.equal(initial.envelopeStored, false);
  initial.questions[0].input = '8';
  assert.equal(initial.questions[1].input, ''); assert.equal(createInitialProgress().questions[0].input, '');
});

check('only a single ASCII answer digit is accepted; leading zeros cannot pad a wrong answer', () => {
  for (const [index, answer] of ['0', '3', '0', '5'].entries()) {
    assert.equal(acceptAnswer(index, ` ${answer} `), answer);
    for (const value of ['', '00', '03', '05', '0305', '1e0', '-0', '+0', '0.0', '０', null, 0]) {
      assert.equal(acceptAnswer(index, value), null, `${index}: ${value}`);
    }
  }
  for (const index of [-1, 4, 0.5, NaN]) assert.equal(acceptAnswer(index, '0'), null);
});

check('wrong answer remains editable and does not add a digit or advance', () => {
  const draft = act(createInitialProgress(), 'set-answer', 0, '7');
  assert.strictEqual(act(draft, 'submit-answer', 0), draft);
  assert.deepEqual(draft.questions[0], { input: '7', digit: null });
  assert.equal(activeQuestionIndex(draft), 0);
  assert.equal(draft.giftUnlocked, false); assert.equal(draft.lastDraw, null);
  const fixed = solve(draft, 0);
  assert.deepEqual(fixed.questions[0], { input: '0', digit: '0' });
});

check('future questions and envelope cannot be completed out of order', () => {
  const initial = createInitialProgress();
  for (const index of [1, 2, 3, -1, 4, 0.5, NaN]) {
    assert.strictEqual(act(initial, 'set-answer', index, '0'), initial);
    assert.strictEqual(act(initial, 'submit-answer', index), initial);
  }
  assert.strictEqual(progressReducer(initial, { type: 'store-envelope' }), initial);
  const first = solve(initial, 0);
  assert.strictEqual(act(first, 'submit-answer', 2), first);
  assert.strictEqual(act(first, 'set-answer', 2, '0'), first);
});

check('confirmed digits remain on the slip and cannot be edited by duplicate/stale submits', () => {
  let state = createInitialProgress();
  for (let index = 0; index < 4; index++) {
    state = solve(state, index);
    assert.equal(activeQuestionIndex(state), index + 1);
    assert.strictEqual(act(state, 'set-answer', index, '9'), state);
    assert.strictEqual(act(state, 'submit-answer', index), state);
    assert.equal(state.puzzleSolved, index === 3);
    assert.equal(state.envelopeStored, false);
  }
  assert.equal(state.questions.map(item => item.digit).join(''), '0305');
});

check('only an explicit envelope action packs completed paper; no gift or song side effects', () => {
  const finished = complete();
  assert.equal(isPuzzleComplete(finished.questions), true);
  assert.equal(finished.envelopeStored, false);
  const stored = progressReducer(finished, { type: 'store-envelope' });
  assert.equal(stored.envelopeStored, true); assert.equal(stored.puzzleSolved, true);
  assert.equal(stored.giftUnlocked, false); assert.equal(stored.lastDraw, null);
  assert.strictEqual(progressReducer(stored, { type: 'store-envelope' }), stored);
});

check('question updates are immutable and reject malformed or oversized draft commands', () => {
  const initial = createInitialProgress();
  const updated = act(initial, 'set-answer', 0, '0');
  assert.notStrictEqual(updated.questions, initial.questions);
  assert.notStrictEqual(updated.questions[0], initial.questions[0]);
  assert.equal(initial.questions[0].input, '');
  for (const value of [null, 3, {}, 'x'.repeat(65)]) assert.strictEqual(act(initial, 'set-answer', 0, value), initial);
  assert.strictEqual(act(updated, 'set-answer', 0, '0'), updated);
  assert.strictEqual(progressReducer(initial, { type: 'assist-card', card: 'A' }), initial);
});

check('valid partial input, completed slip, and stored envelope survive normalization', () => {
  const states = [createInitialProgress(), act(createInitialProgress(), 'set-answer', 0, '9'),
    solve(createInitialProgress(), 0), act(solve(createInitialProgress(), 0), 'set-answer', 1, '3'),
    complete(), progressReducer(complete(), { type: 'store-envelope' })];
  for (const state of states) assert.deepEqual(normalizeProgress(state), state);
});

check('forged completion flags do not award digits or an envelope', () => {
  const forged = { ...createInitialProgress(), puzzleSolved: true, envelopeStored: true };
  assert.deepEqual(normalizeProgress(forged), createInitialProgress());
  const unconfirmed = complete(); unconfirmed.questions[0].digit = null;
  const restored = normalizeProgress(unconfirmed);
  assert.equal(restored.questions[0].input, '0'); assert.equal(restored.questions[0].digit, null);
  assert.deepEqual(restored.questions.slice(1), createInitialProgress().questions.slice(1));
  assert.equal(restored.puzzleSolved, false);
});

check('damaged middle answer keeps the valid prefix but cannot restore later answers', () => {
  for (const mutation of [q => { q.input = '9'; }, q => { q.input = 3; }, q => { q.digit = '03'; }, q => { q.digit = null; }]) {
    const state = progressReducer(complete(), { type: 'store-envelope' });
    mutation(state.questions[1]);
    const restored = normalizeProgress(state);
    assert.equal(restored.questions[0].digit, '0'); assert.equal(restored.questions[1].digit, null);
    assert.deepEqual(restored.questions.slice(2), createInitialProgress().questions.slice(2));
    assert.equal(restored.puzzleSolved, false); assert.equal(restored.envelopeStored, false);
  }
});

check('malformed arrays and unknown schema versions remain conservative', () => {
  for (const value of [null, [], 'bad', {}, { version: 99, giftUnlocked: true, lastDraw: draw }]) {
    assert.deepEqual(normalizeProgress(value), createInitialProgress());
  }
  for (const questions of [null, {}, [], Array(5).fill({ input: '0', digit: '0' }), Array(4)]) {
    const raw = { ...createInitialProgress(), questions, puzzleSolved: true, envelopeStored: true, giftUnlocked: true, lastDraw: draw };
    const restored = normalizeProgress(raw);
    assert.deepEqual(restored.questions, createInitialProgress().questions);
    assert.equal(restored.puzzleSolved, false); assert.equal(restored.giftUnlocked, true);
    assert.deepEqual(restored.lastDraw, draw);
  }
});

check('legacy two-card completion migrates only gift and valid song, never new question completion', () => {
  const old = { version: 1, cards: { A: { stage: 'solved', output: [0, 0, 1, 1], decimalInput: '3', segment: '03' },
    B: { stage: 'solved', output: [0, 1, 0, 1], decimalInput: '5', segment: '05' } },
    puzzleSolved: true, bridgeSeen: true, giftUnlocked: true, lastDraw: draw };
  const restored = normalizeProgress(old);
  assert.deepEqual(restored, { ...createInitialProgress(), giftUnlocked: true, lastDraw: draw });
  assert.equal(normalizeProgress({ ...old, giftUnlocked: 'true', lastDraw: { ...draw, songId: 0 } }).giftUnlocked, false);
  assert.equal(normalizeProgress({ ...old, lastDraw: { ...draw, songId: 0 } }).lastDraw, null);
});

check('missing v2 reads v1 once while saving leaves the complete original record untouched', () => {
  const oldRaw = JSON.stringify({ version: 1, puzzleSolved: true, giftUnlocked: true, lastDraw: draw, originalNote: 'preserve' });
  const storage = storageWith([[LEGACY_STORAGE_KEY, oldRaw]]);
  const loaded = loadProgress(storage);
  assert.equal(loaded.storageStatus, 'saved'); assert.equal(loaded.progress.giftUnlocked, true);
  assert.deepEqual(loaded.progress.lastDraw, draw); assert.equal(loaded.progress.puzzleSolved, false);
  assert.deepEqual(storage.writes, []);
  assert.equal(saveProgress(loaded.progress, storage), true);
  assert.deepEqual(storage.writes, [STORAGE_KEY]); assert.equal(storage.data.get(LEGACY_STORAGE_KEY), oldRaw);
  assert.equal(JSON.parse(storage.data.get(STORAGE_KEY)).version, 2);
});

check('existing v2 always wins and a corrupted v2 never silently imports older state', () => {
  const legacy = JSON.stringify({ version: 1, giftUnlocked: true, lastDraw: draw });
  const current = solve(createInitialProgress(), 0);
  const storage = storageWith([[LEGACY_STORAGE_KEY, legacy], [STORAGE_KEY, JSON.stringify(current)]]);
  assert.deepEqual(loadProgress(storage).progress, current);
  for (const bad of ['', 'not json', 'null', '{"version":99}']) {
    storage.data.set(STORAGE_KEY, bad);
    assert.deepEqual(loadProgress(storage).progress, createInitialProgress());
  }
});

check('blocked storage preserves the current in-memory journey and reports failure', () => {
  const denied = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  assert.equal(loadProgress(denied).storageStatus, 'memory');
  assert.equal(loadProgress(null).storageStatus, 'memory');
  const state = complete();
  assert.equal(saveProgress(state, denied), false); assert.equal(saveProgress(state, null), false);
  assert.equal(state.puzzleSolved, true); assert.equal(state.questions.map(q => q.digit).join(''), '0305');
});

check('saving strips transient or foreign fields and normalizes before writing', () => {
  const storage = storageWith([]);
  const state = { ...complete(), camera: { x: 9 }, scene: 'gift', opening: true };
  assert.equal(saveProgress(state, storage), true);
  const raw = JSON.parse(storage.data.get(STORAGE_KEY));
  assert.deepEqual(Object.keys(raw).sort(), ['version', 'questions', 'puzzleSolved', 'envelopeStored', 'giftUnlocked', 'sleepMaskFound', 'lastDraw'].sort());
  assert.deepEqual(loadProgress(storage).progress, complete());
});

check('music and gift stay independent of four-question completion and the envelope', () => {
  const initial = createInitialProgress();
  const unlocked = progressReducer(initial, { type: 'unlock-gift', code: '0305' });
  assert.deepEqual(unlocked.questions, initial.questions); assert.equal(unlocked.puzzleSolved, false);
  assert.equal(unlocked.envelopeStored, false); assert.equal(unlocked.giftUnlocked, true);
  const withSong = progressReducer(unlocked, { type: 'record-draw', draw });
  const solved = [0, 1, 2, 3].reduce((state, index) => solve(state, index), withSong);
  const packed = progressReducer(solved, { type: 'store-envelope' });
  assert.equal(packed.giftUnlocked, true); assert.deepEqual(packed.lastDraw, draw);
  assert.equal(viewFromHash('#gift'), 'lock'); assert.equal(viewFromHash('#gift', true), 'gift');
});

console.log(`${passed} four-question progress and storage checks passed.`);
