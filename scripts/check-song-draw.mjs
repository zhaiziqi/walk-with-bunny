import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Run the actual draw hook with deterministic commits, timers and visibility.
// This checks lifecycle contracts; it is not a browser or physical-input test.
const projectRequire = createRequire(import.meta.url);
const viteRequire = createRequire(projectRequire.resolve('vite/package.json'));
const { build } = viteRequire('esbuild');
const bundled = await build({
  absWorkingDir: fileURLToPath(new URL('..', import.meta.url)),
  entryPoints: ['src/motion/useSongDraw.ts'], bundle: true, write: false, format: 'cjs', platform: 'node',
  plugins: [{ name: 'song-draw-hook-host', setup(builder) {
    builder.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: 'hook-host' }));
    builder.onLoad({ filter: /.*/, namespace: 'hook-host' }, () => ({ contents: `const host=globalThis.__songDrawHost; export const useState=(...a)=>host.useState(...a); export const useRef=(...a)=>host.useRef(...a); export const useCallback=(...a)=>host.useCallback(...a); export const useEffect=(...a)=>host.useEffect(...a);` }));
  } }],
});

let passed = 0, failed = 0;
function check(name, run) {
  try { run(); passed++; console.log(`PASS: ${name}`); }
  catch (error) { failed++; console.error(`FAIL: ${name}\n${error.stack}`); }
}

function withHook(run, initialReduced = false) {
  const listeners = new Map(), timers = new Map(), actions = [], timeline = [], slots = [];
  const fakeDocument = {
    hidden: false,
    addEventListener(type, callback) {
      const set = listeners.get(type) ?? new Set(); set.add(callback); listeners.set(type, set);
    },
    removeEventListener(type, callback) { listeners.get(type)?.delete(callback); },
  };
  let cursor = 0, effects = [], dirty = true, now = 0, nextTimer = 1, reduced = initialReduced;
  let unmounted = false, postUnmountSets = 0, dispatchError = null;
  const equal = (a, b) => a?.length === b?.length && a.every((value, i) => Object.is(value, b[i]));
  const host = {
    result: null,
    useState(initial) {
      const i = cursor++;
      slots[i] ??= { value: typeof initial === 'function' ? initial() : initial };
      return [slots[i].value, next => {
        if (unmounted) postUnmountSets++;
        const value = typeof next === 'function' ? next(slots[i].value) : next;
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
  const replacements = {
    document: fakeDocument,
    setTimeout(callback, delay = 0) {
      const id = nextTimer++;
      timeline.push({ type: 'timer', time: now, delay });
      timers.set(id, { callback, at: now + delay });
      return id;
    },
    clearTimeout(id) { timers.delete(id); },
    __songDrawHost: host,
  };
  const originals = Object.fromEntries(Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(replacements)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  const module = { exports: {} };
  new Function('module', 'exports', bundled.outputFiles[0].text)(module, module.exports);
  const { useSongDraw, SONG_REVEAL_MS } = module.exports;
  const dispatch = action => {
    timeline.push({ type: 'dispatch', time: now });
    if (dispatchError) throw dispatchError;
    actions.push(action);
  };
  function commit(force = false) {
    if (force) dirty = true;
    for (let attempt = 0; dirty && !unmounted; attempt++) {
      assert.ok(attempt < 20, 'hook commits should settle');
      cursor = 0; dirty = false; host.result = useSongDraw(dispatch, reduced);
      const pending = effects; effects = []; pending.forEach(effect => effect());
    }
  }
  const unmount = () => {
    if (unmounted) return;
    unmounted = true;
    slots.forEach(slot => slot?.cleanup?.());
  };
  commit();
  const api = {
    get result() { return host.result; }, get timerCount() { return timers.size; },
    get postUnmountSets() { return postUnmountSets; }, get listenerCount() { return [...listeners.values()].reduce((sum, set) => sum + set.size, 0); },
    actions, timeline, revealMs: SONG_REVEAL_MS, commit,
    setReduced(value) { reduced = value; commit(true); },
    setDispatchError(error) { dispatchError = error; },
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
      // StrictMode replays setup/cleanup, preserving state and refs.
      for (const slot of slots) if (slot?.cleanup || slot?.callback && slot?.dependencies) {
        if (!('cleanup' in slot)) continue;
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

check('same-tick rapid clicks commit exactly one result before scheduling visual feedback', () => withHook(hook => {
  const draw = hook.result.draw;
  assert.equal(draw(), true); assert.equal(draw(), false); assert.equal(draw(), false);
  assert.equal(hook.actions.length, 1);
  assert.equal(hook.actions[0].type, 'record-draw');
  assert.ok(hook.actions[0].draw.songId >= 1 && hook.actions[0].draw.songId <= 9);
  assert.deepEqual(hook.timeline.map(event => event.type), ['dispatch', 'timer']);
  assert.equal(hook.result.busy, false, 'React has not committed yet; the synchronous ref still guards the draw');
  hook.commit();
  assert.equal(hook.result.busy, true); assert.equal(hook.result.animating, true);
}));

check('the fallback timer unlocks exactly once without an animation-end event or a second draw', () => withHook(hook => {
  hook.result.draw(); hook.commit();
  const first = hook.actions[0].draw;
  hook.advance(hook.revealMs - 1);
  assert.equal(hook.result.busy, true); assert.equal(hook.result.draw(), false);
  hook.advance(1);
  assert.equal(hook.result.busy, false); assert.equal(hook.result.animating, false);
  assert.equal(hook.timerCount, 0); assert.equal(hook.actions.length, 1);
  assert.equal(hook.result.draw(), true);
  assert.notEqual(hook.actions[1].draw.drawId, first.drawId);
}));

check('reduced motion exposes the result immediately but retains a 180 ms click guard', () => withHook(hook => {
  assert.equal(hook.result.draw(), true); hook.commit();
  assert.equal(hook.actions.length, 1); assert.equal(hook.result.animating, false); assert.equal(hook.result.busy, true);
  assert.equal(hook.result.draw(), false);
  hook.advance(179); assert.equal(hook.result.draw(), false);
  hook.advance(1); assert.equal(hook.result.busy, false); assert.equal(hook.result.draw(), true);
  assert.equal(hook.actions.length, 2);
}, true));

check('unmount removes its timer and listener, and stale draw closures cannot dispatch', () => withHook(hook => {
  const staleDraw = hook.result.draw;
  staleDraw(); hook.commit();
  assert.equal(hook.timerCount, 1); assert.equal(hook.listenerCount, 1);
  hook.unmount();
  assert.equal(hook.timerCount, 0); assert.equal(hook.listenerCount, 0);
  hook.advance(hook.revealMs * 2);
  assert.equal(staleDraw(), false); assert.equal(hook.actions.length, 1); assert.equal(hook.postUnmountSets, 0);
}));

check('hiding the page finishes feedback, preserves the committed draw, and never redraws on return', () => withHook(hook => {
  hook.result.draw(); hook.commit(); hook.advance(200);
  const saved = structuredClone(hook.actions[0]);
  hook.visibility(true);
  assert.equal(hook.result.busy, false); assert.equal(hook.result.animating, false); assert.equal(hook.timerCount, 0);
  hook.visibility(false); hook.advance(hook.revealMs * 2);
  assert.deepEqual(hook.actions, [saved]);
  assert.equal(hook.result.draw(), true);
}));

check('enabling reduced motion interrupts feedback without changing or losing the result', () => withHook(hook => {
  hook.result.draw(); hook.commit(); hook.advance(350);
  const saved = structuredClone(hook.actions[0]);
  hook.setReduced(true);
  assert.equal(hook.result.busy, false); assert.equal(hook.result.animating, false); assert.equal(hook.timerCount, 0);
  hook.setReduced(false); hook.advance(hook.revealMs * 2);
  assert.deepEqual(hook.actions, [saved]);
  assert.equal(hook.result.draw(), true);
}));

check('mounts and rerenders never draw, and effect replay retains one functional listener', () => withHook(hook => {
  for (let i = 0; i < 4; i++) hook.commit(true);
  hook.replayMountEffects();
  assert.equal(hook.actions.length, 0); assert.equal(hook.timerCount, 0); assert.equal(hook.listenerCount, 1);
  assert.equal(hook.result.draw(), true); hook.commit();
  hook.visibility(true); assert.equal(hook.result.busy, false); assert.equal(hook.actions.length, 1);
}));

check('a rejected dispatch leaves no animation lock or timer and permits a later explicit retry', () => withHook(hook => {
  hook.setDispatchError(new Error('test dispatch failure'));
  assert.throws(() => hook.result.draw(), /test dispatch failure/); hook.commit();
  assert.equal(hook.result.busy, false); assert.equal(hook.timerCount, 0); assert.equal(hook.actions.length, 0);
  hook.setDispatchError(null); assert.equal(hook.result.draw(), true); hook.commit();
  assert.equal(hook.actions.length, 1); assert.equal(hook.result.busy, true);
}));

console.log(`\nSong draw lifecycle: ${passed} passed, ${failed} failed.`);
if (failed) process.exitCode = 1;
