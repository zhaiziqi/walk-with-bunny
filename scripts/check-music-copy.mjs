import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Execute MusicGarden's real handlers and effects against a lightweight JSX
// tree. Clipboard refusal is simulated; this is not a browser-permission test.
const projectRequire = createRequire(import.meta.url);
const viteRequire = createRequire(projectRequire.resolve('vite/package.json'));
const { build } = viteRequire('esbuild');
const config = JSON.parse(readFileSync(new URL('../src/config/content.json', import.meta.url), 'utf8'));
const expectedText = id => config.music.copyTextTemplate.replace(/\{\{id\}\}/g, String(id).padStart(2, '0'))
  .replace(/\{\{title\}\}/g, () => config.music.songs.find(song => song.id === id).title);
const bundled = await build({
  absWorkingDir: fileURLToPath(new URL('..', import.meta.url)),
  entryPoints: ['src/ui/MusicGarden.tsx'], bundle: true, write: false, format: 'cjs', platform: 'node',
  jsx: 'automatic', loader: { '.css': 'empty' },
  plugins: [{ name: 'music-component-host', setup(builder) {
    builder.onResolve({ filter: /^react(?:\/jsx-runtime)?$/ }, args => ({ path: args.path, namespace: 'component-host' }));
    builder.onLoad({ filter: /.*/, namespace: 'component-host' }, args => ({ contents: args.path === 'react'
      ? `const host=globalThis.__musicCopyHost; export const useState=(...a)=>host.useState(...a); export const useRef=(...a)=>host.useRef(...a); export const useCallback=(...a)=>host.useCallback(...a); export const useEffect=(...a)=>host.useEffect(...a);`
      : `export const Fragment=Symbol.for('fragment'); export const jsx=(type,props,key)=>({type,props:props||{},key}); export const jsxs=jsx;` }));
  } }],
});

let passed = 0, failed = 0;
async function check(name, run) {
  try { await run(); passed++; console.log(`PASS: ${name}`); }
  catch (error) { failed++; console.error(`FAIL: ${name}\n${error.stack}`); }
}
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const nodes = tree => {
  if (tree === null || tree === undefined || typeof tree === 'boolean') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.props?.children)];
};
const text = tree => tree === null || tree === undefined || typeof tree === 'boolean' ? ''
  : Array.isArray(tree) ? tree.map(text).join('') : typeof tree === 'object' ? text(tree.props?.children) : String(tree);

async function withComponent(clipboard, run) {
  const slots = [], timers = new Map(), rafs = new Map(), listeners = new Map(), writes = [], actions = [];
  const domActions = [];
  let tree, cursor = 0, dirty = true, effects = [], nextId = 1, now = 0, unmounted = false, postUnmountSets = 0;
  const refs = new Set();
  const equal = (a, b) => a?.length === b?.length && a.every((value, i) => Object.is(value, b[i]));
  const host = {
    useState(initial) {
      const i = cursor++; slots[i] ??= { value: typeof initial === 'function' ? initial() : initial };
      return [slots[i].value, next => {
        if (unmounted) postUnmountSets++;
        const value = typeof next === 'function' ? next(slots[i].value) : next;
        if (!Object.is(value, slots[i].value)) { slots[i].value = value; dirty = true; }
      }];
    },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useCallback(callback, dependencies) {
      const i = cursor++; if (!slots[i] || !equal(dependencies, slots[i].dependencies)) slots[i] = { callback, dependencies };
      return slots[i].callback;
    },
    useEffect(callback, dependencies) {
      const i = cursor++;
      if (!slots[i] || !equal(dependencies, slots[i].dependencies)) {
        const previous = slots[i]; slots[i] = { dependencies, cleanup: previous?.cleanup };
        effects.push(() => { previous?.cleanup?.(); slots[i].cleanup = callback(); });
      }
    },
  };
  const replacements = {
    document: {
      hidden: false,
      addEventListener(type, callback) { const set = listeners.get(type) ?? new Set(); set.add(callback); listeners.set(type, set); },
      removeEventListener(type, callback) { listeners.get(type)?.delete(callback); },
    },
    navigator: clipboard === null ? {} : { clipboard: { writeText(value) { writes.push(value); return clipboard(value); } } },
    setTimeout(callback, delay) { const id = nextId++; timers.set(id, { callback, at: now + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    requestAnimationFrame(callback) { const id = nextId++; rafs.set(id, callback); return id; },
    cancelAnimationFrame(id) { rafs.delete(id); },
    __musicCopyHost: host,
  };
  const originals = Object.fromEntries(Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const originalRandom = Math.random;
  for (const [key, value] of Object.entries(replacements)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  Math.random = () => .999; // The next explicit draw is deterministic No. 09, distinct from initial No. 07.
  const module = { exports: {} };
  new Function('module', 'exports', bundled.outputFiles[0].text)(module, module.exports);
  let props = {
    progress: {
      version: 2,
      questions: Array.from({ length: 4 }, () => ({ input: '', digit: null })),
      puzzleSolved: false, envelopeStored: false, giftUnlocked: false,
      lastDraw: { songId: 7, drawId: 'initial-07', drawnAt: '2026-11-02T00:00:00.000Z' },
    },
    dispatch(action) { actions.push(action); props = { ...props, progress: { ...props.progress, lastDraw: action.draw } }; dirty = true; },
    reduced: true, storageStatus: 'saved', onReturn() {}, onGift() {},
  };
  function attachRefs() {
    refs.forEach(ref => { ref.current = null; }); refs.clear();
    for (const node of nodes(tree)) {
      const ref = node.props.ref;
      if (!ref || typeof ref !== 'object') continue;
      refs.add(ref);
      ref.current = {
        focus() { domActions.push({ type: 'focus', tag: node.type, id: node.props.id }); },
        select() { domActions.push({ type: 'select', tag: node.type, id: node.props.id }); },
      };
    }
  }
  function commit(force = false) {
    if (force) dirty = true;
    for (let attempt = 0; dirty && !unmounted; attempt++) {
      assert.ok(attempt < 20, 'component commits must settle');
      cursor = 0; dirty = false; tree = module.exports.MusicGarden(props); attachRefs();
      const pending = effects; effects = []; pending.forEach(effect => effect());
    }
  }
  const byClass = className => nodes(tree).find(node => node.props.className?.split(' ').includes(className));
  const unmount = () => {
    if (unmounted) return;
    unmounted = true; slots.forEach(slot => slot?.cleanup?.()); refs.forEach(ref => { ref.current = null; });
  };
  commit();
  const api = {
    writes, actions, domActions, byClass, commit, unmount,
    receiveDraw(draw) { props = { ...props, progress: { ...props.progress, lastDraw: draw } }; commit(true); },
    get tree() { return tree; }, get progress() { return props.progress; }, get postUnmountSets() { return postUnmountSets; },
    click(className) { const node = byClass(className); assert.ok(node, `missing ${className}`); assert.ok(!node.props.disabled, `${className} must be enabled`); return node.props.onClick(); },
    manualButton() { return nodes(tree).find(node => node.type === 'button' && text(node) === 'Select text instead'); },
    textarea() { return nodes(tree).find(node => node.type === 'textarea'); },
    feedback() { return text(byClass('music-copy-feedback')); },
    flushRaf() { const pending = [...rafs.values()]; rafs.clear(); pending.forEach(callback => callback(now)); commit(); },
    advance(duration) {
      const end = now + duration;
      for (let attempt = 0; ; attempt++) {
        assert.ok(attempt < 100, 'timer processing must settle');
        const due = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        const [id, timer] = due; now = timer.at; timers.delete(id); timer.callback(); commit();
      }
      now = end; commit();
    },
  };
  try { await run(api); }
  finally {
    unmount(); Math.random = originalRandom;
    for (const [key, descriptor] of Object.entries(originals)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    }
  }
}

await check('copy uses the current two-digit number and configured title, and only confirms after success', async () => {
  const completion = deferred();
  await withComponent(() => completion.promise, async component => {
    const pending = component.click('music-copy-button'); component.commit();
    assert.deepEqual(component.writes, [expectedText(7)]);
    assert.equal(text(component.byClass('music-copy-button')), 'Copying…');
    assert.equal(component.byClass('music-copy-button').props.disabled, true);
    assert.equal(component.feedback().includes('Copied'), false);
    completion.resolve(); await pending; component.commit();
    assert.equal(text(component.byClass('music-copy-button')), 'Copied ✓');
    assert.equal(component.feedback(), 'Copied. Ready for you to send.');
    assert.equal(component.textarea(), undefined); assert.equal(component.actions.length, 0);
  });
});

await check('clipboard rejection reveals selectable text identical to the attempted request', async () => {
  const completion = deferred();
  await withComponent(() => completion.promise, async component => {
    const pending = component.click('music-copy-button'); component.commit();
    completion.reject(new Error('NotAllowedError')); await pending; component.commit(); component.flushRaf();
    assert.ok(component.feedback().includes('Copying was unavailable'));
    assert.equal(component.textarea().props.value, component.writes[0]);
    assert.equal(component.textarea().props.value, expectedText(7));
    assert.equal(component.textarea().props.readOnly, true);
    assert.ok(component.domActions.some(action => action.type === 'focus' && action.id === 'song-request'));
    assert.ok(component.domActions.some(action => action.type === 'select' && action.id === 'song-request'));
    assert.equal(text(component.tree).includes('Copied ✓'), false); assert.equal(component.actions.length, 0);
  });
});

await check('an unavailable clipboard API still provides the current song request without claiming success', async () => {
  await withComponent(null, async component => {
    await component.click('music-copy-button'); component.commit(); component.flushRaf();
    assert.equal(component.writes.length, 0);
    assert.equal(component.textarea().props.value, expectedText(7));
    assert.ok(component.feedback().includes('Copying was unavailable'));
    assert.equal(text(component.tree).includes('Copied ✓'), false);
  });
});

await check('manual selection works independently of clipboard permission and never draws a song', async () => {
  await withComponent(null, async component => {
    const button = component.manualButton(); assert.ok(button);
    button.props.onClick(); component.commit(); component.flushRaf();
    assert.equal(component.textarea().props.value, expectedText(7));
    assert.equal(component.manualButton(), undefined);
    assert.equal(component.writes.length, 0); assert.equal(component.actions.length, 0);
  });
});

for (const outcome of ['resolve', 'reject']) {
  await check(`an old clipboard ${outcome} cannot change a newly drawn card`, async () => {
    const completion = deferred();
    await withComponent(() => completion.promise, async component => {
      const pending = component.click('music-copy-button'); component.commit();
      component.click('music-draw-button'); component.commit(); component.advance(180);
      assert.equal(component.progress.lastDraw.songId, 9);
      assert.notEqual(component.progress.lastDraw.drawId, 'initial-07');
      if (outcome === 'resolve') completion.resolve(); else completion.reject(new Error('Denied late'));
      await pending; component.commit(); component.flushRaf();
      assert.equal(text(component.byClass('music-copy-button')), config.music.copyLabel);
      assert.equal(component.feedback(), ''); assert.equal(component.textarea(), undefined);
      component.manualButton().props.onClick(); component.commit();
      assert.equal(component.textarea().props.value, expectedText(9));
      assert.equal(component.actions.length, 1);
    });
  });
}

for (const outcome of ['resolve', 'reject']) {
  await check(`an old clipboard ${outcome} cannot mark a piece received from another tab as copied`, async () => {
    const completion = deferred();
    await withComponent(() => completion.promise, async component => {
      const pending = component.click('music-copy-button'); component.commit();
      component.receiveDraw({ songId: 2, drawId: 'other-tab-02', drawnAt: '2026-11-02T01:00:00.000Z' });
      if (outcome === 'resolve') completion.resolve(); else completion.reject(new Error('Denied late'));
      await pending; component.commit(); component.flushRaf();
      assert.equal(text(component.byClass('music-copy-button')), config.music.copyLabel);
      assert.equal(component.feedback(), ''); assert.equal(component.textarea(), undefined);
      component.manualButton().props.onClick(); component.commit();
      assert.equal(component.textarea().props.value, expectedText(2));
      assert.equal(component.actions.length, 0);
    });
  });
}

await check('another tab choosing the same piece clears copied feedback for the new draw', async () => {
  await withComponent(() => Promise.resolve(), async component => {
    await component.click('music-copy-button'); component.commit();
    component.manualButton().props.onClick(); component.commit();
    component.receiveDraw({ songId: 7, drawId: 'other-tab-07', drawnAt: '2026-11-02T01:00:00.000Z' });
    assert.equal(text(component.byClass('music-copy-button')), config.music.copyLabel);
    assert.equal(component.feedback(), ''); assert.equal(component.textarea(), undefined);
    assert.equal(component.actions.length, 0);
  });
});

for (const outcome of ['resolve', 'reject']) {
  await check(`an old clipboard ${outcome} after unmount cannot update UI state`, async () => {
    const completion = deferred();
    await withComponent(() => completion.promise, async component => {
      const pending = component.click('music-copy-button'); component.commit(); component.unmount();
      if (outcome === 'resolve') completion.resolve(); else completion.reject(new Error('Denied late'));
      await pending; component.flushRaf();
      assert.equal(component.postUnmountSets, 0); assert.equal(component.actions.length, 0);
    });
  });
}

console.log(`\nMusic copy component: ${passed} passed, ${failed} failed.`);
if (failed) process.exitCode = 1;
