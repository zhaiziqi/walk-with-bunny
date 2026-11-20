import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Execute the real hook with controlled React commits, timers and visibility.
// This verifies lifecycle ordering; it is not a browser animation or input test.
const projectRequire = createRequire(import.meta.url);
const viteRequire = createRequire(projectRequire.resolve('vite/package.json'));
const { build } = viteRequire('esbuild');
const bundled = await build({
  absWorkingDir: fileURLToPath(new URL('..', import.meta.url)),
  entryPoints: ['src/motion/useGiftUnlock.ts'], bundle: true, write: false, format: 'cjs', platform: 'node',
  plugins: [{ name: 'gift-unlock-hook-host', setup(builder) {
    builder.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: 'hook-host' }));
    builder.onLoad({ filter: /.*/, namespace: 'hook-host' }, () => ({ contents: `const host=globalThis.__giftUnlockHost; export const useState=(...a)=>host.useState(...a); export const useRef=(...a)=>host.useRef(...a); export const useCallback=(...a)=>host.useCallback(...a); export const useEffect=(...a)=>host.useEffect(...a);` }));
  } }],
});

let passed = 0, failed = 0;
function check(name, run) {
  try { run(); passed++; console.log(`PASS: ${name}`); }
  catch (error) { failed++; console.error(`FAIL: ${name}\n${error.stack}`); }
}

function withHook(run, initialReduced = false) {
  const slots = [], listeners = new Map(), timers = new Map(), actions = [], timeline = [], reveals = [];
  let cursor = 0, effects = [], dirty = true, now = 0, nextTimer = 1, reduced = initialReduced;
  let unmounted = false, postUnmountSets = 0, dispatchError = null, revealLabel = 'first';
  let onReveal = () => { reveals.push({ label: 'first', time: now }); };
  const equal = (a, b) => a?.length === b?.length && a.every((value, i) => Object.is(value, b[i]));
  const host = {
    result: null,
    useState(initial) {
      const i = cursor++;
      slots[i] ??= { value: typeof initial === 'function' ? initial() : initial };
      return [slots[i].value, next => {
        if (unmounted) postUnmountSets++;
        const value = typeof next === 'function' ? next(slots[i].value) : next;
        timeline.push({ type: 'set-state', value, time: now });
        if (!Object.is(value, slots[i].value)) { slots[i].value = value; dirty = true; }
      }];
    },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useCallback(callback, dependencies) {
      const i = cursor++;
      if (!slots[i] || !equal(dependencies, slots[i].dependencies)) slots[i] = { callback, dependencies };
      return slots[i].callback;
    },
    useEffect(callback, dependencies) {
      const i = cursor++;
      if (!slots[i] || !equal(dependencies, slots[i].dependencies)) {
        const previous = slots[i]; slots[i] = { callback, dependencies, cleanup: previous?.cleanup };
        effects.push(() => { previous?.cleanup?.(); slots[i].cleanup = callback(); });
      }
    },
  };
  const fakeDocument = {
    hidden: false,
    addEventListener(type, callback) {
      const set = listeners.get(type) ?? new Set(); set.add(callback); listeners.set(type, set);
    },
    removeEventListener(type, callback) { listeners.get(type)?.delete(callback); },
  };
  const replacements = {
    document: fakeDocument,
    setTimeout(callback, delay = 0) {
      const id = nextTimer++;
      timeline.push({ type: 'timer', time: now, delay });
      timers.set(id, { callback, at: now + delay });
      return id;
    },
    clearTimeout(id) { timers.delete(id); },
    __giftUnlockHost: host,
  };
  const originals = Object.fromEntries(Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(replacements)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  const module = { exports: {} };
  new Function('module', 'exports', bundled.outputFiles[0].text)(module, module.exports);
  const { useGiftUnlock, GIFT_OPEN_MS } = module.exports;
  const dispatch = action => {
    timeline.push({ type: 'dispatch', time: now });
    if (dispatchError) throw dispatchError;
    actions.push(action);
  };
  function commit(force = false) {
    if (force) dirty = true;
    for (let attempt = 0; dirty && !unmounted; attempt++) {
      assert.ok(attempt < 20, 'hook commits should settle');
      cursor = 0; dirty = false; host.result = useGiftUnlock(dispatch, reduced, onReveal);
      const pending = effects; effects = []; pending.forEach(effect => effect());
    }
  }
  const unmount = () => {
    if (unmounted) return;
    unmounted = true; slots.forEach(slot => slot?.cleanup?.());
  };
  commit();
  const api = {
    get result() { return host.result; }, get timerCount() { return timers.size; },
    get postUnmountSets() { return postUnmountSets; }, get listenerCount() { return [...listeners.values()].reduce((sum, set) => sum + set.size, 0); },
    actions, timeline, reveals, revealMs: GIFT_OPEN_MS, commit,
    setReduced(value) { reduced = value; commit(true); },
    setDispatchError(error) { dispatchError = error; },
    updateReveal(label) { revealLabel = label; onReveal = () => { reveals.push({ label: revealLabel, time: now }); }; commit(true); },
    advance(duration) {
      const end = now + duration;
      for (let attempts = 0; ; attempts++) {
        assert.ok(attempts < 100, 'timers must not loop forever');
        const due = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        const [id, timer] = due; now = timer.at; timers.delete(id); timer.callback(); commit();
      }
      now = end; commit();
    },
    visibility(hidden) { fakeDocument.hidden = hidden; for (const callback of [...(listeners.get('visibilitychange') ?? [])]) callback(); commit(); },
    replayMountEffects() {
      for (const slot of slots) if (slot && 'cleanup' in slot) {
        slot.cleanup?.(); slot.cleanup = slot.callback();
      }
      commit();
    },
    unmount,
  };
  try { run(api); }
  finally {
    unmount();
    for (const [key, descriptor] of Object.entries(originals)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    }
  }
}

check('wrong or incomplete input has no action, timer, permission or opening feedback', () => withHook(hook => {
  for (const code of ['', '305', '0000', '03050', '03 05', 305, null]) assert.equal(hook.result.unlock(code), 'invalid');
  hook.commit();
  assert.equal(hook.result.opening, false); assert.equal(hook.actions.length, 0);
  assert.equal(hook.timerCount, 0); assert.equal(hook.reveals.length, 0);
  assert.equal(hook.result.unlock('0305'), 'accepted', 'wrong attempts must never lock out later valid input');
}));

check('same-tick rapid submissions dispatch once before opening state or a reveal timer', () => withHook(hook => {
  const unlock = hook.result.unlock;
  assert.equal(unlock('0305'), 'accepted'); assert.equal(unlock('0305'), 'busy'); assert.equal(unlock('0305'), 'busy');
  assert.deepEqual(hook.actions, [{ type: 'unlock-gift', code: '0305' }]);
  assert.deepEqual(hook.timeline.map(event => event.type), ['dispatch', 'set-state', 'timer']);
  assert.equal(hook.result.opening, false, 'React has not committed yet; the synchronous ref is the submission guard');
  assert.equal(hook.reveals.length, 0); hook.commit(); assert.equal(hook.result.opening, true);
}));

check('opening ends once at its fallback timeout without needing an animation-end event', () => withHook(hook => {
  hook.result.unlock('0305'); hook.commit(); hook.advance(hook.revealMs - 1);
  assert.equal(hook.result.opening, true); assert.equal(hook.reveals.length, 0);
  assert.equal(hook.result.unlock('0305'), 'busy'); hook.advance(1);
  assert.equal(hook.result.opening, false); assert.equal(hook.timerCount, 0);
  assert.deepEqual(hook.reveals, [{ label: 'first', time: hook.revealMs }]);
  hook.advance(hook.revealMs * 2); hook.visibility(true); hook.visibility(false);
  assert.equal(hook.reveals.length, 1); assert.equal(hook.actions.length, 1);
}));

check('reduced motion yields one task after dispatch, then reveals without the opening duration', () => withHook(hook => {
  hook.result.unlock('0305');
  assert.equal(hook.actions.length, 1); assert.equal(hook.reveals.length, 0);
  assert.equal(hook.timeline.find(event => event.type === 'timer').delay, 0);
  assert.equal(hook.result.unlock('0305'), 'busy'); hook.commit(); hook.advance(0);
  assert.equal(hook.result.opening, false); assert.equal(hook.timerCount, 0);
  assert.deepEqual(hook.reveals, [{ label: 'first', time: 0 }]); assert.equal(hook.actions.length, 1);
}, true));

check('unmount during opening cancels navigation and blocks stale submit closures', () => withHook(hook => {
  const staleUnlock = hook.result.unlock;
  staleUnlock('0305'); hook.commit(); hook.advance(300);
  assert.equal(hook.timerCount, 1); assert.equal(hook.listenerCount, 1);
  hook.unmount(); assert.equal(hook.timerCount, 0); assert.equal(hook.listenerCount, 0);
  hook.advance(hook.revealMs * 2); assert.equal(staleUnlock('0305'), 'busy');
  assert.equal(hook.actions.length, 1); assert.equal(hook.reveals.length, 0); assert.equal(hook.postUnmountSets, 0);
}));

check('page hiding finishes a committed opening once and returning does not unlock or reveal again', () => withHook(hook => {
  hook.result.unlock('0305'); hook.commit(); hook.advance(250); hook.visibility(true);
  assert.equal(hook.result.opening, false); assert.equal(hook.timerCount, 0);
  assert.deepEqual(hook.reveals, [{ label: 'first', time: 250 }]);
  hook.visibility(false); hook.advance(hook.revealMs * 2);
  assert.equal(hook.reveals.length, 1); assert.equal(hook.actions.length, 1);
}));

check('switching to reduced motion completes a pending opening without another unlock', () => withHook(hook => {
  hook.result.unlock('0305'); hook.commit(); hook.advance(350); hook.setReduced(true);
  assert.equal(hook.result.opening, false); assert.equal(hook.timerCount, 0);
  assert.deepEqual(hook.reveals, [{ label: 'first', time: 350 }]);
  hook.setReduced(false); hook.advance(hook.revealMs * 2);
  assert.equal(hook.reveals.length, 1); assert.equal(hook.actions.length, 1);
}));

check('mount, rerender, visibility and effect replay cannot unlock or navigate on their own', () => withHook(hook => {
  for (let i = 0; i < 4; i++) hook.commit(true);
  hook.replayMountEffects(); hook.visibility(true); hook.visibility(false); hook.setReduced(true); hook.setReduced(false);
  assert.equal(hook.actions.length, 0); assert.equal(hook.reveals.length, 0); assert.equal(hook.timerCount, 0); assert.equal(hook.listenerCount, 1);
  assert.equal(hook.result.unlock('0305'), 'accepted'); hook.commit(); hook.advance(hook.revealMs);
  assert.equal(hook.actions.length, 1); assert.equal(hook.reveals.length, 1);
}));

check('a changed reveal callback is used by the already-running timer', () => withHook(hook => {
  hook.result.unlock('0305'); hook.commit(); hook.advance(300);
  hook.updateReveal('latest'); hook.advance(hook.revealMs - 300);
  assert.deepEqual(hook.reveals, [{ label: 'latest', time: hook.revealMs }]);
  assert.equal(hook.actions.length, 1);
}));

check('a failed dispatch leaves no timer, no opening and no reveal, and a later retry works', () => withHook(hook => {
  hook.setDispatchError(new Error('test unlock dispatch failure'));
  assert.throws(() => hook.result.unlock('0305'), /test unlock dispatch failure/); hook.commit();
  assert.equal(hook.result.opening, false); assert.equal(hook.timerCount, 0); assert.equal(hook.reveals.length, 0); assert.equal(hook.actions.length, 0);
  hook.setDispatchError(null); assert.equal(hook.result.unlock('0305'), 'accepted'); hook.commit(); hook.advance(hook.revealMs);
  assert.equal(hook.actions.length, 1); assert.equal(hook.reveals.length, 1);
}));

console.log(`\nGift opening lifecycle: ${passed} passed, ${failed} failed.`);
if (failed) process.exitCode = 1;
