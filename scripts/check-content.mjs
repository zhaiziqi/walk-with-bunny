import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';

// Resolve the app's extensionless TypeScript imports before loading its modules.
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/src/')) {
    return nextResolve(`${specifier}.ts`, context);
  }
  return nextResolve(specifier, context);
} });

const { content, validateContent } = await import('../src/config/content.ts');
const { createInitialProgress, viewFromHash } = await import('../src/state/experience.ts');

validateContent(content);
// The entire content tree ships in the browser, including future puzzle/song/gift copy.
// Catch untranslated strings at their exact field instead of relying on the current screen.
function checkEnglishCopy(value, path = 'content') {
  if (typeof value === 'string') assert.doesNotMatch(value, /\p{Script=Han}/u, `Untranslated Chinese at ${path}`);
  else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) checkEnglishCopy(item, `${path}.${key}`);
  }
}
assert.equal(content.site.locale, 'en');
checkEnglishCopy(content);
const copy = () => structuredClone(content);
const duplicate = copy();
duplicate.music.songs[8].id = 1;
assert.throws(() => validateContent(duplicate), /song IDs/);
const changedCode = copy();
changedCode.puzzle.code = '305';
assert.throws(() => validateContent(changedCode), /fixed code/);
const wrongMode = copy();
wrongMode.music.mode = 'without-replacement';
assert.throws(() => validateContent(wrongMode), /music.mode/);
const wrongType = copy();
wrongType.people.senderName = 42;
assert.throws(() => validateContent(wrongType), /people/);
assert.equal(viewFromHash('#gift'), 'lock');
assert.equal(viewFromHash('#music'), 'music');
assert.equal(viewFromHash('#unknown'), 'overview');
const progress = createInitialProgress();
assert.equal(content.puzzle.kind, 'computer-knowledge-v1');
assert.deepEqual(content.puzzle.questions.map(question => question.id), ['python', 'tcp', 'xor', 'binary']);
assert.deepEqual(content.puzzle.questions.map(question => question.answer), ['0', '3', '0', '5']);
assert.equal(progress.version, 2);
assert.deepEqual(progress.questions, Array.from({ length: 4 }, () => ({ input: '', digit: null })));
assert.equal(progress.envelopeStored, false);
assert.equal(progress.puzzleSolved, false);
assert.equal(progress.giftUnlocked, false);
assert.equal(progress.lastDraw, null);
progress.questions[0].input = '0';
assert.equal(progress.questions[1].input, '');
assert.equal(createInitialProgress().questions[0].input, '');
console.log('PASS: English content tree, fixed rules, route guard, and independent empty progress.');
