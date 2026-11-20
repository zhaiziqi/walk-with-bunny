import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

// Exercise the real JSX components with isolated hooks, timers and reducer state.
// Browser geometry, keyboard traversal and artwork appearance need separate QA.
const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('vite/package.json'))('esbuild');
const root = fileURLToPath(new URL('..', import.meta.url));
const bundled = await build({
  absWorkingDir: root,
  stdin: { resolveDir: root, contents: `
    export { RestGift, REST_GIFT_OPEN_MS } from './src/ui/RestGift';
    export { GiftReveal } from './src/ui/GiftDoor';
    export { GiftKeepsake } from './src/ui/GiftObjects';
    export { restGift, restGiftArtwork } from './src/scene/restGift';
    export { createInitialProgress, progressReducer, viewFromHash } from './src/state/experience';
  ` },
  bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', loader: { '.css': 'empty' },
  plugins: [{ name: 'split-gift-host', setup(builder) {
    builder.onResolve({ filter: /^react(?:\/jsx-runtime)?$/ }, args => ({ path: args.path, namespace: 'split-gift-host' }));
    builder.onLoad({ filter: /.*/, namespace: 'split-gift-host' }, args => ({ contents: args.path === 'react'
      ? `const host=globalThis.__splitGiftHost; export const useState=(...a)=>host.useState(...a); export const useRef=(...a)=>host.useRef(...a); export const useEffect=(...a)=>host.useEffect(...a); export const useId=()=>host.useId(); export const useCallback=(...a)=>host.useCallback(...a);`
      : `export const Fragment=Symbol.for('fragment'); export const jsx=(type,props,key)=>({type,props:props||{},key}); export const jsxs=jsx;` }));
  } }],
});

const nodes = value => value === null || value === undefined || typeof value !== 'object' ? []
  : Array.isArray(value) ? value.flatMap(nodes) : [value, ...nodes(value.props?.children)];
const text = value => value === null || value === undefined || typeof value === 'boolean' ? ''
  : Array.isArray(value) ? value.map(text).join('') : typeof value === 'object' ? text(value.props?.children) : String(value);
const descriptions = tree => nodes(tree).map(node => [node.props.alt, node.props['aria-label']].filter(Boolean).join(' ')).join(' ');
const noNames = tree => assert.doesNotMatch(`${text(tree)} ${descriptions(tree)}`, /passport holder|sleep mask|any guesses/i);
const images = tree => nodes(tree).filter(node => node.type === 'img').map(node => node.props.src);
// Inspect semantic availability, including the ancestor gate around a staged
// illustration. CSS appearance and the timing of each visual layer are browser QA.
const availableNodes = value => value === null || value === undefined || typeof value !== 'object' ? []
  : Array.isArray(value) ? value.flatMap(availableNodes)
    : value.props?.hidden || value.props?.inert || value.props?.['aria-hidden'] === true || value.props?.['aria-hidden'] === 'true' ? []
      : [value, ...availableNodes(value.props?.children)];
const availableTag = tree => availableNodes(tree).find(node => node.props.className?.split(' ').includes('gift-name-tag') && !node.props.disabled);
let checks = 0;
function check(name, run) { run(); checks++; console.log(`PASS: ${name}`); }

function withComponent(which, extra, run) {
  const contexts = new Map(), timers = new Map(), actions = [], focus = [], returns = [];
  const { autoLoad = true, ...componentProps } = extra ?? {};
  const loadedSources = new Set();
  let active, tree, dirty = true, effects = [], unmounted = false, now = 0, timerId = 1, id = 1;
  const equal = (a, b) => a?.length === b?.length && a.every((v, i) => Object.is(v, b[i]));
  const host = {
    useState(initial) {
      const context = active, i = context.cursor++;
      context.slots[i] ??= { value: typeof initial === 'function' ? initial() : initial };
      return [context.slots[i].value, next => {
        assert.equal(unmounted, false, 'no delayed state update after the parcel closes');
        const value = typeof next === 'function' ? next(context.slots[i].value) : next;
        if (!Object.is(value, context.slots[i].value)) { context.slots[i].value = value; dirty = true; }
      }];
    },
    useId() { const i = active.cursor++; return active.slots[i] ??= `split-gift-${id++}`; },
    useRef(initial) { const i = active.cursor++; return active.slots[i] ??= { current: initial }; },
    useCallback(callback, deps) {
      const i = active.cursor++, old = active.slots[i];
      if (!old || !equal(deps, old.deps)) active.slots[i] = { callback, deps };
      return active.slots[i].callback;
    },
    useEffect(callback, deps) {
      const context = active, i = context.cursor++, old = context.slots[i];
      if (!old || !equal(deps, old.deps)) {
        context.slots[i] = { deps, cleanup: old?.cleanup };
        effects.push(() => { old?.cleanup?.(); context.slots[i].cleanup = callback(); });
      }
    },
  };
  const replacements = {
    __splitGiftHost: host,
    setTimeout(fn, delay = 0) { const key = timerId++; timers.set(key, { fn, at: now + delay }); return key; },
    clearTimeout(key) { timers.delete(key); },
    requestAnimationFrame(fn) { const key = timerId++; timers.set(key, { fn, at: now + 16 }); return key; },
  };
  const originals = Object.fromEntries(Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(replacements)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  const module = { exports: {} }; new Function('module', 'exports', bundled.outputFiles[0].text)(module, module.exports);
  const api = module.exports;
  let progress = api.createInitialProgress();
  if (componentProps.found) progress = api.progressReducer(progress, { type: 'FIND_SLEEP_MASK' });
  const props = { found: progress.sleepMaskFound, reduced: false, storageStatus: 'saved', onReturn() { returns.push(true); }, onMusic() {},
    onDiscover() { actions.push('FIND_SLEEP_MASK'); progress = api.progressReducer(progress, { type: 'FIND_SLEEP_MASK' }); props.found = progress.sleepMaskFound; dirty = true; }, ...componentProps };
  function resolve(element, path = 'root') {
    if (Array.isArray(element)) return element.map((child, i) => resolve(child, `${path}.${i}`));
    if (!element || typeof element !== 'object') return element;
    if (typeof element.type === 'function') {
      const key = `${path}:${element.type.name}`;
      if (!contexts.has(key)) contexts.set(key, { cursor: 0, slots: [] });
      const previous = active; active = contexts.get(key); active.cursor = 0;
      const child = element.type(element.props); active = previous;
      return resolve(child, `${key}.child`);
    }
    return { ...element, props: { ...element.props, children: resolve(element.props.children, `${path}.children`) } };
  }
  function commit() {
    for (let i = 0; dirty && !unmounted; i++) {
      assert.ok(i < 20, 'component effects settle'); dirty = false;
      tree = resolve({ type: api[which], props });
      for (const node of nodes(tree)) if (node.props.ref && typeof node.props.ref === 'object') {
        node.props.ref.current = {
          focus() { focus.push(node.props.className ?? node.type); },
          querySelector(selector) { const child = nodes(node).find(n => selector === '.gift-name-tag' && n.props.className?.split(' ').includes('gift-name-tag')); return child ? { focus() { focus.push('gift-name-tag'); } } : null; },
        };
      }
      const pending = effects; effects = []; pending.forEach(fn => fn());
      // Most lifecycle checks begin after successful image loads. Tests can
      // disable this host behavior to control the real onLoad callbacks.
      if (autoLoad) for (const node of nodes(tree)) if (node.type === 'img' && typeof node.props.onLoad === 'function' && !loadedSources.has(node.props.src)) {
        loadedSources.add(node.props.src); node.props.onLoad();
      }
    }
  }
  const byClass = name => nodes(tree).find(n => n.props.className?.split(' ').includes(name));
  const byLabel = label => nodes(tree).find(n => n.type === 'button' && n.props['aria-label'] === label);
  const unmount = () => { if (unmounted) return; unmounted = true; contexts.forEach(context => context.slots.forEach(slot => slot?.cleanup?.())); };
  commit();
  try {
    run({ api, props, actions, focus, returns, commit, unmount, byClass, byLabel,
      get tree() { return tree; }, get progress() { return progress; }, get timerCount() { return timers.size; },
      setProps(patch) { Object.assign(props, patch); dirty = true; commit(); },
      seed(action) { progress = api.progressReducer(progress, action); props.found = progress.sleepMaskFound; dirty = true; commit(); },
      clickLabel(label) { const node = byLabel(label); assert.ok(node, `missing button: ${label}`); assert.ok(!node.props.disabled); node.props.onClick(); commit(); },
      clickClass(name) { const node = byClass(name); assert.ok(node, `missing ${name}`); node.props.onClick(); commit(); },
      loadImage(source) { const image = nodes(tree).find(n => n.type === 'img' && n.props.src === source && typeof n.props.onLoad === 'function'); assert.ok(image, `missing image load handler: ${source}`); image.props.onLoad(); commit(); },
      failImage(source) { const image = nodes(tree).find(n => n.type === 'img' && (!source || n.props.src === source)); assert.ok(image, `missing image: ${source ?? 'any'}`); image.props.onError(); commit(); },
      advance(duration) {
        const end = now + duration;
        for (let i = 0; ; i++) {
          assert.ok(i < 100, 'timers settle');
          const due = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
          if (!due) break;
          const [key, timer] = due; timers.delete(key); now = timer.at; timer.fn(); commit();
        }
        now = end; commit();
      },
    });
  } finally {
    unmount();
    for (const [key, descriptor] of Object.entries(originals)) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  }
}

const openBox = ui => ui.clickLabel('Open the little gift box');
const phase = ui => ui.tree.props['data-rest-gift-phase'];
const assertWrapped = ui => {
  assert.equal(phase(ui), 'wrapped'); noNames(ui.tree);
  const opener = ui.byLabel('Open the little gift box');
  assert.ok(opener);
  assert.ok(availableNodes(ui.tree).includes(opener), 'the closed box is available to assistive technology');
  assert.equal(opener.props.type, 'button', 'a native button supports Enter and Space without a pointer');
  assert.ok(!opener.props.hidden && !opener.props.disabled);
  assert.ok(ui.byClass('is-art-ready'), 'the complete painted box is ready before interaction');
  assert.equal(ui.byClass('rest-gift-stage').props['aria-busy'], false);
  assert.notEqual(opener.props.tabIndex, -1, 'the opener stays in normal keyboard navigation');
  assert.equal(ui.byClass('gift-name-tag'), undefined);
  assert.equal(ui.byClass('gift-keepsake-single'), undefined);
  const paintedBox = images(ui.tree);
  assert.ok(paintedBox.includes(ui.api.restGift.dreamBaseArt));
  assert.ok(paintedBox.includes(ui.api.restGift.dreamLidArt));
  assert.ok(paintedBox.every(source => [ui.api.restGift.dreamBaseArt, ui.api.restGift.dreamLidArt].includes(source)), 'only closed-box layers are loaded before opening');
  assert.ok(!paintedBox.includes(ui.api.restGift.revealArt), 'contents are not mounted before the explicit opening');
};

check('fresh and previously found visits both begin with a closed gift box', () => {
  for (const found of [false, true]) withComponent('RestGift', { found }, ui => {
    assertWrapped(ui); ui.advance(5000); assertWrapped(ui);
    assert.equal(ui.actions.length, 0); assert.equal(ui.progress.sleepMaskFound, found);
  });
});
const finishOpening = ui => ui.advance(ui.api.REST_GIFT_OPEN_MS);
const assertOpening = ui => {
  assert.equal(phase(ui), 'opening'); noNames(ui.tree);
  assert.equal(ui.byClass('rest-gift-stage').props['aria-busy'], true);
  assert.equal(availableTag(ui.tree), undefined, 'the staged name tag must not be exposed or operable while opening');
  assert.equal(availableNodes(ui.tree).includes(ui.byClass('rest-gift-result')), false, 'a staged reveal cannot receive keyboard or screen-reader interaction');
  assert.equal(ui.focus.length, 0, 'focus waits for the entire reveal to finish');
};
const assertReveal = ui => {
  assert.equal(phase(ui), 'revealed'); noNames(ui.tree);
  const tag = availableTag(ui.tree);
  assert.ok(tag, 'the completed reveal makes the paper tag available');
  assert.equal(tag.type, 'button');
  assert.equal(tag.props.type, 'button');
  assert.notEqual(tag.props.tabIndex, -1, 'the tag supports native keyboard interaction after the reveal');
  assert.ok(availableNodes(ui.tree).includes(ui.byClass('rest-gift-result')));
  assert.equal(ui.byClass('rest-gift-result').props.tabIndex, -1, 'completion focus is programmatic, without adding an extra Tab stop');
  assert.equal(ui.byClass('rest-gift-stage').props['aria-busy'], false);
  assert.equal(ui.byLabel('Open the little gift box').props.hidden, true, 'the finished opener is removed from keyboard navigation');
  assert.equal(ui.byClass('gift-keepsake-single').props['data-keepsake'], 'sleep-mask');
  assert.ok(images(ui.tree).includes(ui.api.restGift.revealArt));
  assert.doesNotMatch(images(ui.tree).join(' '), /passport|still-life/i, 'the midway reveal must contain only its own keepsake');
};
check('delayed box layers gate opening until both are loaded, while an error enables the fallback', () => {
  const assertWaiting = ui => {
    assert.equal(phase(ui), 'wrapped'); noNames(ui.tree);
    assert.equal(ui.byLabel('Open the little gift box').props.disabled, true);
    assert.equal(ui.byClass('is-art-ready'), undefined);
    assert.equal(ui.byClass('rest-gift-stage').props['aria-busy'], true);
    assert.equal(ui.byClass('gift-keepsake-single'), undefined);
    // Even a retained/programmatic callback cannot bypass the disabled control.
    ui.byLabel('Open the little gift box').props.onClick(); ui.commit();
    ui.advance(ui.api.REST_GIFT_OPEN_MS * 2);
    assert.equal(phase(ui), 'wrapped'); assert.equal(ui.progress.sleepMaskFound, false);
    assert.equal(ui.actions.length, 0); assert.equal(ui.focus.length, 0); assert.equal(ui.timerCount, 0);
  };
  for (const reduced of [false, true]) for (const layers of [['dreamBaseArt', 'dreamLidArt'], ['dreamLidArt', 'dreamBaseArt']]) {
    withComponent('RestGift', { autoLoad: false, reduced }, ui => {
      assertWaiting(ui);
      ui.loadImage(ui.api.restGift[layers[0]]); assertWaiting(ui);
      ui.loadImage(ui.api.restGift[layers[0]]); assertWaiting(ui); // Duplicate load is not the missing layer.
      ui.loadImage(ui.api.restGift[layers[1]]); assertWrapped(ui);
      assert.equal(ui.actions.length, 0, 'ready artwork does not open the box automatically');
      openBox(ui); if (!reduced) { assertOpening(ui); finishOpening(ui); }
      assertReveal(ui); assert.deepEqual(ui.actions, ['FIND_SLEEP_MASK']);
      assert.equal(ui.progress.giftUnlocked, false); assert.equal(ui.timerCount, 0);
    });
  }
  for (const layer of ['dreamBaseArt', 'dreamLidArt']) withComponent('RestGift', { autoLoad: false }, ui => {
    assertWaiting(ui); ui.failImage(ui.api.restGift[layer]);
    assert.ok(ui.byClass('gift-parcel')); assert.ok(ui.byClass('is-art-ready'));
    assert.equal(ui.byLabel('Open the little gift box').props.disabled, false);
    assert.equal(ui.byClass('rest-gift-stage').props['aria-busy'], false);
    openBox(ui); assertOpening(ui); finishOpening(ui); assertReveal(ui);
    assert.deepEqual(ui.actions, ['FIND_SLEEP_MASK']); assert.equal(ui.timerCount, 0);
  });
});
check('one opening completes before recording the eye mask and never bypasses the final password', () => withComponent('RestGift', {}, ui => {
  assert.ok(ui.api.REST_GIFT_OPEN_MS >= 3000, 'the layered opening needs time to be read');
  openBox(ui); assertOpening(ui);
  assert.equal(ui.byLabel('Open the little gift box').props.disabled, true);
  assert.equal(ui.progress.sleepMaskFound, false); assert.equal(ui.actions.length, 0);
  ui.advance(ui.api.REST_GIFT_OPEN_MS - 1); assertOpening(ui);
  assert.equal(ui.actions.length, 0); assert.equal(ui.progress.sleepMaskFound, false);
  ui.advance(1); assertReveal(ui);
  assert.equal(ui.progress.sleepMaskFound, true); assert.deepEqual(ui.actions, ['FIND_SLEEP_MASK']);
  assert.equal(ui.progress.giftUnlocked, false); assert.equal(ui.progress.puzzleSolved, false); assert.equal(ui.progress.lastDraw, null);
  assert.equal(ui.api.viewFromHash('#gift', ui.progress.giftUnlocked), 'lock');
  assert.deepEqual(ui.focus, ['rest-gift-result'], 'the reveal receives focus without automatically selecting its paper tag');
  ui.advance(5000); assert.equal(ui.actions.length, 1); assert.equal(ui.focus.length, 1); assert.equal(ui.timerCount, 0);
}));
check('rapid repeated activation cannot restart the sequence or record discovery twice', () => withComponent('RestGift', {}, ui => {
  const activate = ui.byLabel('Open the little gift box').props.onClick;
  activate(); activate(); ui.commit(); assertOpening(ui);
  ui.advance(ui.api.REST_GIFT_OPEN_MS / 2);
  activate(); ui.commit(); assertOpening(ui);
  assert.equal(ui.actions.length, 0);
  ui.advance(ui.api.REST_GIFT_OPEN_MS / 2); assertReveal(ui);
  assert.deepEqual(ui.actions, ['FIND_SLEEP_MASK']); assert.equal(ui.timerCount, 0);
  ui.advance(ui.api.REST_GIFT_OPEN_MS * 2); assert.equal(ui.actions.length, 1); assert.equal(ui.focus.length, 1);
}));
check('reopening a found gift plays the full reveal without recording another discovery', () => withComponent('RestGift', { found: true }, ui => {
  assertWrapped(ui); openBox(ui); assertOpening(ui);
  ui.advance(ui.api.REST_GIFT_OPEN_MS - 1); assertOpening(ui);
  ui.advance(1); assertReveal(ui);
  assert.equal(ui.actions.length, 0); assert.equal(ui.progress.sleepMaskFound, true); assert.equal(ui.progress.giftUnlocked, false);
}));
check('remounting after discovery starts closed and the name is hidden again on the next reveal', () => {
  let found = false;
  withComponent('RestGift', {}, ui => { openBox(ui); finishOpening(ui); ui.clickClass('gift-name-tag'); found = ui.progress.sleepMaskFound; assert.equal(found, true); });
  withComponent('RestGift', { found }, ui => {
    assertWrapped(ui); ui.advance(5000); assertWrapped(ui);
    openBox(ui); finishOpening(ui); assertReveal(ui);
  });
});
check('an incoming found flag cannot unwrap the current visit without a click', () => withComponent('RestGift', {}, ui => {
  ui.setProps({ found: true }); ui.advance(5000); assertWrapped(ui); assert.equal(ui.actions.length, 0);
}));
check('a discovery arriving from another tab during opening prevents a duplicate write', () => withComponent('RestGift', {}, ui => {
  openBox(ui); ui.advance(ui.api.REST_GIFT_OPEN_MS / 2); assertOpening(ui);
  ui.setProps({ found: true }); finishOpening(ui); assertReveal(ui);
  assert.equal(ui.actions.length, 0, 'completion uses the latest found flag');
}));
check('the midway rabbit tag reveals only Sleep mask and can hide its name again', () => withComponent('RestGift', { found: true }, ui => {
  openBox(ui); finishOpening(ui); noNames(ui.tree); ui.clickClass('gift-name-tag');
  assert.match(text(ui.tree), /Sleep mask/); assert.doesNotMatch(`${text(ui.tree)} ${descriptions(ui.tree)}`, /passport/i);
  assert.equal(ui.byClass('gift-name-tag').props['aria-expanded'], true);
  ui.clickClass('gift-name-tag'); noNames(ui.tree); assert.equal(ui.actions.length, 0);
}));
check('the finale loads only the passport illustration and reveals only its own name', () => withComponent('GiftReveal', {}, ui => {
  assert.deepEqual(images(ui.tree), ['/art/gifts/passport-bunny-v2.png']); noNames(ui.tree);
  assert.equal(ui.byClass('gift-keepsake-single').props['data-keepsake'], 'passport-holder');
  ui.clickClass('gift-name-tag'); assert.match(text(ui.tree), /Passport holder/);
  assert.doesNotMatch(`${text(ui.tree)} ${descriptions(ui.tree)}`, /sleep mask|two small gifts|any guesses/i);
  assert.equal(ui.actions.length, 0);
}));
check('failed revealed images retain one neutral keepsake until its name tag is flipped', () => {
  for (const [which, extra, kind] of [['RestGift', { found: true }, 'sleep-mask'], ['GiftReveal', {}, 'passport-holder']]) withComponent(which, extra, ui => {
    if (which === 'RestGift') { openBox(ui); finishOpening(ui); }
    const keepsake = () => ui.byClass('gift-keepsake-single');
    for (let attempt = 0; images(keepsake()).length; attempt++) {
      assert.ok(attempt < 3, 'broken artwork must settle on the inline fallback');
      ui.failImage(images(keepsake())[0]);
    }
    noNames(ui.tree); assert.ok(ui.byClass(`gift-object-${kind}`));
    assert.equal(nodes(ui.tree).filter(n => n.props.className?.split(' ').includes('gift-object-illustration')).length, 1);
    ui.clickClass('gift-name-tag'); assert.match(text(ui.tree), kind === 'sleep-mask' ? /Sleep mask/ : /Passport holder/);
  });
});
check('either failed box layer retains an accessible closed box and still completes the opening', () => {
  for (const layer of ['dreamBaseArt', 'dreamLidArt']) withComponent('RestGift', {}, ui => {
    ui.failImage(ui.api.restGift[layer]); noNames(ui.tree);
    const opener = ui.byLabel('Open the little gift box');
    assert.ok(availableNodes(ui.tree).includes(opener)); assert.equal(opener.props.type, 'button');
    assert.ok(!opener.props.hidden && !opener.props.disabled);
    assert.ok(ui.byClass('gift-parcel'), 'the painted layers fall back to a closed inline parcel');
    assert.equal(ui.byClass('gift-keepsake-single'), undefined);
    openBox(ui); assertOpening(ui); finishOpening(ui); assertReveal(ui);
    assert.deepEqual(ui.actions, ['FIND_SLEEP_MASK']);
  });
});
check('a reveal-image failure during opening does not leak names or complete early', () => withComponent('RestGift', {}, ui => {
  openBox(ui); assertOpening(ui);
  ui.failImage(ui.api.restGift.revealArt); assertOpening(ui);
  assert.equal(ui.actions.length, 0);
  finishOpening(ui); assert.equal(phase(ui), 'revealed'); noNames(ui.tree);
  assert.ok(availableTag(ui.tree)); assert.deepEqual(ui.actions, ['FIND_SLEEP_MASK']);
}));
check('reduced motion remains closed until a click and then reveals with no delayed work', () => {
  for (const found of [false, true]) withComponent('RestGift', { found, reduced: true }, ui => {
    assertWrapped(ui); assert.ok(ui.byClass('rest-gift-quiet'), 'reduced motion is passed to the visual stage');
    openBox(ui); assertReveal(ui);
    assert.equal(ui.progress.sleepMaskFound, true); assert.equal(ui.progress.giftUnlocked, false);
    assert.deepEqual(ui.focus, ['rest-gift-result']); assert.equal(ui.timerCount, 0);
    assert.equal(ui.actions.length, found ? 0 : 1);
  });
});
check('switching to reduced motion during any part of opening finishes once and cancels its timer', () => {
  for (const found of [false, true]) for (const ratio of [0, .4, .99]) withComponent('RestGift', { found }, ui => {
    openBox(ui); ui.advance(ui.api.REST_GIFT_OPEN_MS * ratio); assertOpening(ui);
    ui.setProps({ reduced: true }); assertReveal(ui);
    assert.equal(ui.timerCount, 0); assert.equal(ui.actions.length, found ? 0 : 1);
    assert.deepEqual(ui.focus, ['rest-gift-result']);
    ui.setProps({ reduced: false }); ui.advance(ui.api.REST_GIFT_OPEN_MS * 2);
    assert.equal(phase(ui), 'revealed'); assert.equal(ui.actions.length, found ? 0 : 1); assert.equal(ui.focus.length, 1);
  });
});
check('leaving during any part of opening cancels reveal, focus and new discovery', () => {
  for (const found of [false, true]) for (const ratio of [0, .4, .99]) withComponent('RestGift', { found }, ui => {
    openBox(ui); ui.advance(ui.api.REST_GIFT_OPEN_MS * ratio); assertOpening(ui);
    ui.byClass('rest-gift-footer').props.children.props.onClick();
    assert.equal(ui.returns.length, 1); ui.unmount(); ui.advance(ui.api.REST_GIFT_OPEN_MS * 2);
    assert.equal(ui.timerCount, 0); assert.equal(ui.focus.length, 0); assert.equal(ui.actions.length, 0);
    assert.equal(ui.progress.sleepMaskFound, found); assert.equal(ui.progress.giftUnlocked, false);
  });
});
check('returning without opening does not award a keepsake', () => withComponent('RestGift', {}, ui => {
  ui.byClass('rest-gift-footer').props.children.props.onClick();
  assert.equal(ui.returns.length, 1); assert.equal(ui.progress.sleepMaskFound, false); assert.equal(ui.actions.length, 0);
}));
check('the midway discovery preserves an existing envelope, song and final unlock exactly', () => withComponent('RestGift', {}, ui => {
  for (const [index, value] of ['0', '3', '0', '5'].entries()) {
    ui.seed({ type: 'set-answer', index, value }); ui.seed({ type: 'submit-answer', index });
  }
  ui.seed({ type: 'store-envelope' });
  ui.seed({ type: 'record-draw', draw: { songId: 2, drawId: 'before-rest', drawnAt: '2026-11-10T00:00:00.000Z' } });
  ui.seed({ type: 'unlock-gift', code: '0305' });
  const before = structuredClone(ui.progress);
  assert.equal(before.envelopeStored, true); assert.equal(before.giftUnlocked, true); assert.ok(before.lastDraw);
  openBox(ui); finishOpening(ui);
  assert.deepEqual(ui.progress, { ...before, sleepMaskFound: true });
}));
check('world renderers cannot select the revealed gift artwork or change box size with discovery', () => {
  for (const name of ['restGiftArt.ts', 'OrangeRestScene.tsx', 'FloofStatic.tsx']) {
    const source = readFileSync(new URL(`../src/scene/${name}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /\bopenedArt\b/, `${name} must render the closed box, not the panel reveal asset`);
  }
  withComponent('RestGift', {}, ui => { assert.deepEqual(ui.api.restGiftArtwork(false), ui.api.restGiftArtwork(true)); });
});
console.log(`${checks} split-gift UI checks passed.`);
