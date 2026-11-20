import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { advancePointerTarget, emptyPointerGuide, movePointerGuide, pointerGuideStrength } from '../src/scene/pointerGuidance.ts';
import { advanceMeadow, steerMeadow, followMeadowCamera, groundVelocity, MEADOW_SPEED } from '../src/scene/meadowMotion.ts';

let failures = 0;
const check = (name, run) => { try { run(); console.log(`PASS: ${name}`); } catch (error) { failures++; console.error(`FAIL: ${name}: ${error.message}`); } };
const input = (point, extra = {}) => ({ point, movementX: 4, movementY: 0, pointerType: 'mouse', buttons: 0, enabled: true, entered: true, blocked: false, ...extra });
// A first coordinate only establishes a baseline (including after an overlay).
const armedGuide = (point, now = 100) => {
  const baseline = movePointerGuide(emptyPointerGuide(), input({ x: point.x - 2, y: point.y }), now - 16);
  return movePointerGuide(baseline, input(point), now);
};

check('a panel, UI target, pressed mouse or touch cannot arm hover guidance', () => {
  for (const extra of [{ enabled: false }, { blocked: true }, { buttons: 1 }, { buttons: 2 }, { pointerType: 'touch' }]) {
    const state = movePointerGuide(emptyPointerGuide(), input({ x: 500, y: 250 }, extra), 100);
    assert.equal(state.target, null);
    assert.equal(pointerGuideStrength(state, 110), 0);
  }
});
check('zero movementX/Y still guides from changing client coordinates', () => {
  const extra = { movementX: 0, movementY: 0 };
  let state = movePointerGuide(emptyPointerGuide(), input({ x: 500, y: 250 }, extra), 100);
  assert.equal(state.target, null);
  assert.deepEqual(state.sample, { x: 500, y: 250 });
  state = movePointerGuide(state, input({ x: 504, y: 253 }, extra), 116);
  assert.deepEqual(state.target, { x: 504, y: 253 });
  assert.equal(pointerGuideStrength(state, 116), 1);
});
check('welcome pointer travel cannot arm guidance even when enabled is mistakenly true', () => {
  for (const enabled of [false, true]) {
    let state = armedGuide({ x: 500, y: 250 });
    for (let index = 0; index < 20; index++) {
      state = movePointerGuide(state, input({ x: 100 + index * 60, y: 300 + index * 10 }, { entered: false, enabled }), 200 + index * 16);
      assert.equal(state.target, null);
      assert.equal(pointerGuideStrength(state, 200 + index * 16), 0);
    }
  }
});
check('fresh coordinate travel guides immediately after the baseline, without pressing', () => {
  const state = armedGuide({ x: 500, y: 250 });
  assert.deepEqual(state.target, { x: 500, y: 250 });
  assert.equal(pointerGuideStrength(state, 100), 1);
});
check('entering or restoring the surface without motion does not start a walk', () => {
  const state = movePointerGuide(emptyPointerGuide(), input({ x: 500, y: 250 }, { movementX: 0, movementY: 0 }), 100);
  assert.equal(state.target, null);
});
check('same-position events and tiny noise cannot change the chosen direction', () => {
  const state = armedGuide({ x: 500, y: 250 });
  const same = movePointerGuide(state, input({ x: 500, y: 250 }), 290);
  const noise = movePointerGuide(same, input({ x: 500.2, y: 250.1 }), 300);
  assert.equal(same, state); assert.equal(noise, state);
  assert.equal(pointerGuideStrength(noise, 10000), 1);
});

check('a deliberately placed pointer remains active without repeated motion events', () => {
  const state = armedGuide({ x: 500, y: 250 });
  for (const now of [100, 840, 10000, 60000]) assert.equal(pointerGuideStrength(state, now), 1);
  assert.equal(pointerGuideStrength(emptyPointerGuide(), 10000), 0);
});

check('finger lifts of any duration preserve the chosen direction until explicitly cancelled', () => {
  let state = armedGuide({ x: 500, y: 250 });
  for (const now of [300, 900, 2400, 8000]) {
    assert.equal(pointerGuideStrength(state, now), 1);
    state = movePointerGuide(state, input({ x: state.target.x + 2, y: 250 }), now);
  }
  assert.equal(pointerGuideStrength(state, 16000), 1);
});

check('target smoothing reduces small alternating noise without delaying a deliberate reversal', () => {
  let target = { x: 500, y: 250 };
  const offsets = [];
  for (let frame = 0; frame < 120; frame++) {
    target = advancePointerTarget(target, { x: 500 + (frame % 2 ? 3 : -3), y: 250 }, 1 / 120);
    offsets.push(target.x - 500);
  }
  assert.ok(Math.max(...offsets) - Math.min(...offsets) < 1);
  target = { x: 800, y: 250 };
  for (let frame = 0; frame < 3; frame++) target = advancePointerTarget(target, { x: 200, y: 250 }, 1 / 60);
  assert.ok(target.x < 245, `three-frame reversal target was ${target.x}`);
  assert.deepEqual(advancePointerTarget(null, { x: 50, y: 60 }, 1 / 60), { x: 50, y: 60 });
});
check('smoothed target catches up consistently at ordinary desktop frame rates', () => {
  const positions = [30, 60, 120].map(fps => {
    let target = { x: 800, y: 250 };
    for (let frame = 0; frame < fps / 10; frame++) target = advancePointerTarget(target, { x: 200, y: 250 }, 1 / fps);
    return target.x;
  });
  assert.ok(Math.max(...positions) - Math.min(...positions) < 12);
  assert.ok(Math.max(...positions) < 220);
});
check('sparse strokes and a fixed pointer keep steady intent across desktop frame rates', () => {
  for (const fps of [30, 60, 120]) {
    let guide = emptyPointerGuide(), motion = { heading: { x: 1, y: 0 }, speed: 0 };
    let minimumCruiseSpeed = Infinity;
    for (let frame = 0; frame < fps * 8; frame++) {
      const now = frame * 1000 / fps;
      if (frame < 2) guide = movePointerGuide(guide, input({ x: 740 + frame * 2, y: 400 }), now);
      const desired = groundVelocity(guide.target, { x: 500, y: 400 }, { x: 501, y: 400 }, { x: 500, y: 399 });
      const strength = pointerGuideStrength(guide, now);
      motion = steerMeadow(motion.heading, motion.speed, { x: desired.x * strength, y: desired.y * strength }, 1 / fps, motion);
      if (now >= 800) minimumCruiseSpeed = Math.min(minimumCruiseSpeed, motion.speed);
    }
    assert.ok(minimumCruiseSpeed > MEADOW_SPEED * .99, `${fps} fps stationary-pointer speed fell to ${minimumCruiseSpeed}`);
  }
});

check('a new diagonal or reverse gesture replaces the chosen pointer direction', () => {
  let state = movePointerGuide(emptyPointerGuide(), input({ x: 500, y: 250 }), 100);
  state = movePointerGuide(state, input({ x: 700, y: 400 }), 250);
  assert.deepEqual(state.target, { x: 700, y: 400 }); assert.equal(pointerGuideStrength(state, 250), 1);
  state = movePointerGuide(state, input({ x: 250, y: 550 }), 280);
  assert.deepEqual(state.target, { x: 250, y: 550 }); assert.equal(pointerGuideStrength(state, 280), 1);
});
check('moving into a control cancels the chosen direction and stale events cannot restart it', () => {
  let state = movePointerGuide(emptyPointerGuide(), input({ x: 500, y: 250 }), 100);
  state = movePointerGuide(state, input({ x: 500, y: 250 }, { blocked: true }), 120);
  assert.equal(pointerGuideStrength(state, 125), 0);
  state = movePointerGuide(state, input({ x: 500, y: 250 }, { movementX: 0, movementY: 0 }), 140);
  assert.equal(pointerGuideStrength(state, 150), 0);
  state = movePointerGuide(state, input({ x: 505, y: 250 }), 160);
  assert.equal(pointerGuideStrength(state, 160), 1);
});
check('a one-frame timestamp skew stays fresh; invalid input and large clock errors are rejected', () => {
  const good = armedGuide({ x: 500, y: 250 });
  assert.equal(pointerGuideStrength(good, 90), 1);
  assert.equal(pointerGuideStrength(good, 0), 0);
  assert.equal(pointerGuideStrength(good, NaN), 0);
  assert.equal(movePointerGuide(good, input({ x: NaN, y: 1 }), 120).target, null);
  assert.equal(movePointerGuide(good, input({ x: 1, y: 1 }), Infinity).target, null);
});
check('zero-button direction persists, then an explicit neutral target brings actor and camera to rest', () => {
  const outcomes = [];
  for (const fps of [30, 60, 120]) {
    let actor = { x: 0, y: 0, zoom: 1 }, camera = { x: 0, y: 220, zoom: 1 };
    let motion = { heading: { x: .7071, y: .7071 }, speed: 0 }, stopped;
    for (let frame = 0; frame < fps * 4; frame++) {
      const now = frame * 1000 / fps;
      const desired = groundVelocity(now < 2000 ? { x: 800, y: 100 } : { x: 500, y: 400 }, { x: 500, y: 400 }, { x: 501, y: 400 }, { x: 500, y: 399 });
      motion = steerMeadow(motion.heading, motion.speed, desired, 1 / fps, motion);
      actor = advanceMeadow(actor, motion.velocity, 1 / fps);
      camera = followMeadowCamera(camera, actor, 1 / fps, motion.speed > 0, motion);
      if (now >= 2500 && !stopped) stopped = { actor: { ...actor }, camera: { ...camera } };
      if (stopped) { assert.deepEqual(actor, stopped.actor); assert.deepEqual(camera, stopped.camera); }
    }
    assert.ok(actor.x > 180 && actor.y > 180);
    outcomes.push(Math.hypot(actor.x, actor.y));
  }
  assert.ok(Math.max(...outcomes) - Math.min(...outcomes) < 15);
});

// Run the actual hook, its DOM listeners, effects, ground projection and RAF loop.
// This deterministic hook host models state/ref/effect commits; it is not a browser
// or a claim about physical trackpad hardware. In particular, RAF timestamps may
// precede an input event delivered earlier in the same rendering frame.
const projectRequire = createRequire(import.meta.url);
const viteRequire = createRequire(projectRequire.resolve('vite/package.json'));
const { build } = viteRequire('esbuild');
const ts = projectRequire('typescript');
// Execute the real App's gate expressions and Begin callback, so a correct hook
// fixture cannot conceal an accidentally enabled welcome screen in the app.
const appSource = ts.createSourceFile('App.tsx', readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const app = {};
const callbackBodies = new Map();
function inspectApp(node) {
  if (ts.isVariableDeclaration(node) && node.initializer && ts.isCallExpression(node.initializer)
    && node.initializer.expression.getText(appSource) === 'useCallback') {
    callbackBodies.set(node.name.getText(appSource), node.initializer.arguments[0].getText(appSource));
  }
  if (ts.isVariableDeclaration(node) && node.name.getText(appSource) === 'activateSite') {
    app.activateSite = node.initializer.arguments[0].getText(appSource);
  }
  if (ts.isCallExpression(node) && node.expression.getText(appSource) === 'useEffect'
    && node.arguments[0]?.getText(appSource).includes('KeyE')
    && node.arguments[0]?.getText(appSource).includes('activateSite')) {
    app.encounterKeys = node.arguments[0].getText(appSource);
  }
  if (ts.isCallExpression(node) && node.expression.getText(appSource) === 'useMeadowJourney') {
    const enabled = node.arguments[0].properties.find(property => property.name?.getText(appSource) === 'enabled');
    app.enabled = enabled.initializer.getText(appSource);
  }
  if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
    const attributes = node.attributes.properties;
    const attribute = name => attributes.find(item => ts.isJsxAttribute(item) && item.name.getText(appSource) === name);
    const value = name => attribute(name)?.initializer;
    if (value('id')?.text === 'journey-surface') {
      for (const name of ['inert', 'aria-hidden', 'tabIndex']) app[name] = value(name).expression.getText(appSource);
    }
    if (value('id')?.text === 'enter-garden') app.begin = value('onClick').expression.getText(appSource);
    if (value('className')?.text === 'welcome') app.welcomeBlocksGuidance = !!attribute('data-no-journey');
    if (value('className')?.expression?.getText(appSource).includes('encounter-action')) {
      app.encounterClick = value('onClick').expression.getText(appSource);
    }
  }
  ts.forEachChild(node, inspectApp);
}
inspectApp(appSource);
app.begin = callbackBodies.get(app.begin) ?? app.begin;
const evaluateApp = (name, values) => {
  assert.ok(app[name], `actual App must expose ${name}`);
  const exports = {};
  const code = ts.transpileModule(`exports.value = (${app[name]});`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  new Function(...Object.keys(values), 'exports', code)(...Object.values(values), exports);
  return exports.value;
};
check('actual App requires explicit entry before enabling or exposing the walking surface', () => {
  for (const entered of [false, true]) for (const close of [false, true]) for (const menuOpen of [false, true]) {
    const values = { entered, close, menuOpen }, blocked = !entered || close || menuOpen;
    assert.equal(evaluateApp('enabled', values), entered && !close);
    assert.equal(!!evaluateApp('inert', values), blocked);
    assert.equal(!!evaluateApp('aria-hidden', values), blocked);
    assert.equal(evaluateApp('tabIndex', values), blocked ? -1 : 0);
  }
  assert.equal(app.welcomeBlocksGuidance, true);
  const calls = [], frames = [];
  const begin = evaluateApp('begin', {
    startExploring: () => calls.push('entered'),
    requestAnimationFrame: callback => frames.push(callback),
    surfaceRef: { current: { focus: options => calls.push(options) } },
  });
  assert.deepEqual(calls, [], 'rendering the invitation must not start the journey');
  begin();
  assert.deepEqual(calls, ['entered'], 'explicit Begin enters before its deferred focus');
  assert.equal(frames.length, 1);
  frames[0]();
  assert.deepEqual(calls, ['entered', { preventScroll: true }]);
});

// Execute the actual App callbacks and window listener, without pretending that
// this small event host verifies browser Tab order, native clicks, or rendering.
function withAppEncounter(run, overrides = {}) {
  class Element {
    constructor(tag = 'div', classes = [], parent = null) { this.tag = tag; this.classes = classes; this.parent = parent; }
    matches(selector) {
      return selector.split(',').some(part => {
        const [tag, ...classes] = part.trim().split('.');
        return (!tag || tag === this.tag) && classes.every(name => this.classes.includes(name));
      });
    }
    closest(selector) { return this.matches(selector) ? this : this.parent?.closest(selector) ?? null; }
  }
  class HTMLInputElement extends Element { constructor() { super('input'); } }
  class HTMLTextAreaElement extends Element { constructor() { super('textarea'); } }
  const listeners = new Set(), focus = [], surface = new Element(), encounter = new Element('button', ['encounter-action']);
  let pulse = null;
  const values = {
    Element, HTMLInputElement, HTMLTextAreaElement,
    window: {
      addEventListener(type, listener) { assert.equal(type, 'keydown'); listeners.add(listener); },
      removeEventListener(type, listener) { assert.equal(type, 'keydown'); listeners.delete(listener); },
    },
    nearbySite: { id: 'arch' }, canvasActive: true, close: false, menuOpen: false, moving: false, entered: true,
    surfaceRef: { current: { focus: options => focus.push(options) } },
    setAtlasPulse(update) { pulse = update(pulse); }, ...overrides,
  };
  values.activateSite = evaluateApp('activateSite', values);
  const click = evaluateApp('encounterClick', values), cleanup = evaluateApp('encounterKeys', values)();
  const api = {
    encounter, child: new Element('kbd', [], encounter), surface, focus, click,
    controls: [new Element('button'), new Element('a'), new HTMLInputElement(), new HTMLTextAreaElement()],
    get pulse() { return pulse; },
    key(code, target = surface, extra = {}) {
      let prevented = false;
      const event = { code, target, repeat: false, preventDefault() { prevented = true; }, ...extra };
      for (const listener of listeners) listener(event);
      return prevented;
    },
  };
  try { run(api); } finally { cleanup(); assert.equal(listeners.size, 0, 'App removes its keyboard listener'); }
}
check('actual encounter click and meadow E each dispatch one pulse and return focus to walking', () => withAppEncounter(ui => {
  ui.click(); assert.deepEqual(ui.pulse, { id: 'arch', serial: 1 });
  assert.equal(ui.key('KeyE'), true); assert.deepEqual(ui.pulse, { id: 'arch', serial: 2 });
  assert.deepEqual(ui.focus, [{ preventScroll: true }, { preventScroll: true }]);
}));
check('E works when the visible encounter button or its key label has keyboard focus', () => withAppEncounter(ui => {
  assert.equal(ui.key('KeyE', ui.encounter), true, 'the displayed E shortcut must work on its own button');
  assert.deepEqual(ui.pulse, { id: 'arch', serial: 1 });
  assert.equal(ui.key('KeyE', ui.child), true);
  assert.deepEqual(ui.pulse, { id: 'arch', serial: 2 });
}));
check('encounter keyboard handling preserves unrelated controls and native button Space/Enter', () => withAppEncounter(ui => {
  for (const target of ui.controls) for (const code of ['KeyE', 'Space', 'Enter']) assert.equal(ui.key(code, target), false);
  for (const code of ['Space', 'Enter']) assert.equal(ui.key(code, ui.encounter), false, 'native button activation must not dispatch twice');
  assert.equal(ui.pulse, null); assert.deepEqual(ui.focus, []);
}));
check('encounter E rejects repeats and blocked scenes while allowing a moving chime visitor', () => {
  for (const state of [{ entered: false }, { close: true }, { menuOpen: true }, { canvasActive: false }, { nearbySite: null }]) {
    withAppEncounter(ui => { ui.key('KeyE'); assert.equal(ui.pulse, null); assert.deepEqual(ui.focus, []); }, state);
  }
  withAppEncounter(ui => {
    ui.key('KeyE', ui.encounter, { repeat: true }); assert.equal(ui.pulse, null);
    ui.key('KeyE'); assert.deepEqual(ui.pulse, { id: 'arch', serial: 1 });
  }, { moving: true });
});
const bundled = await build({
  absWorkingDir: fileURLToPath(new URL('..', import.meta.url)),
  stdin: { contents: `export { useMeadowJourney } from './src/motion/useMeadowJourney'; export { depthProject } from './src/scene/depthWorld'; export { pointingNeutral } from './src/scene/pointToWalk';`, resolveDir: fileURLToPath(new URL('..', import.meta.url)), loader: 'ts' },
  bundle: true, write: false, format: 'cjs', platform: 'node',
  define: { 'import.meta.env.DEV': 'true' },
  plugins: [{ name: 'deterministic-hook-host', setup(builder) {
    builder.onResolve({ filter: /^(react|gsap)$/ }, args => ({ path: args.path, namespace: 'hook-host' }));
    builder.onLoad({ filter: /.*/, namespace: 'hook-host' }, args => ({ contents: args.path === 'react'
      ? `const host=globalThis.__pointerHookHost; export const useState=(...a)=>host.useState(...a); export const useRef=(...a)=>host.useRef(...a); export const useCallback=(...a)=>host.useCallback(...a); export const useEffect=(...a)=>host.useEffect(...a);`
      : `export default {to(){throw new Error('Unexpected approach tween in pointer-only test')}};` }));
  } }],
});
function withHook(run, initialOptions = {}) {
  class Target {
    listeners = new Map();
    addEventListener(type, listener) { const group = this.listeners.get(type) ?? new Set(); group.add(listener); this.listeners.set(type, group); }
    removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
    dispatch(type, extra = {}) { const event = { type, target: this, preventDefault() {}, stopPropagation() {}, ...extra }; for (const listener of [...(this.listeners.get(type) ?? [])]) listener(event); }
  }
  class Element extends Target {
    style = {}; dataset = {}; inert = false; control = false; controlKind = 'button'; worldObject = false; journeyShortcut = false; outsideSurface = false; focusOptions = [];
    closest(selector) {
      const selectors = selector.split(',').map(part => part.trim());
      return (this.worldObject && selectors.includes('[data-world-object]')) || (this.journeyShortcut && this.controlKind === 'button' && selectors.includes('button[data-journey-shortcut]')) || (this.control && selectors.includes(this.controlKind)) ? this : null;
    }
    getBoundingClientRect() { return { left: 0, top: 0, width: 1280, height: 800 }; }
    hasPointerCapture() { return false; }
    setPointerCapture() {} releasePointerCapture() {}
    focus(options) { this.focusOptions.push(options); document.activeElement = this; document.dispatch('focusin', { target: this }); }
    remove() { if (document.activeElement === this) document.activeElement = document.body; }
  }
  const surface = new Element(), fakeWindow = new Target(), fakeDocument = new Target();
  fakeDocument.hidden = false;
  fakeDocument.body = new Target(); fakeDocument.activeElement = surface;
  let now = 0, nextId = 1, cursor = 0, dirty = true, effects = [], options;
  const scheduled = new Map(), slots = [];
  const equal = (a, b) => a?.length === b?.length && a.every((value, i) => Object.is(value, b[i]));
  const host = {
    result: null,
    useState(initial) {
      const i = cursor++;
      if (!slots[i]) slots[i] = { value: typeof initial === 'function' ? initial() : initial };
      return [slots[i].value, next => { const value = typeof next === 'function' ? next(slots[i].value) : next; if (!Object.is(value, slots[i].value)) { slots[i].value = value; dirty = true; } }];
    },
    useRef(initial) { const i = cursor++; return slots[i] ?? (slots[i] = { current: initial }); },
    useCallback(callback, dependencies) { const i = cursor++; if (!slots[i] || !equal(slots[i].dependencies, dependencies)) slots[i] = { callback, dependencies }; return slots[i].callback; },
    useEffect(callback, dependencies) { const i = cursor++; if (!slots[i] || !equal(slots[i].dependencies, dependencies)) { const previous = slots[i]; slots[i] = { dependencies, cleanup: previous?.cleanup }; effects.push(() => { previous?.cleanup?.(); slots[i].cleanup = callback(); }); } },
  };
  const replacements = { Element, window: fakeWindow, document: fakeDocument, performance: { now: () => now },
    requestAnimationFrame: callback => { const id = nextId++; scheduled.set(id, callback); return id; },
    cancelAnimationFrame: id => scheduled.delete(id), __pointerHookHost: host };
  const saved = Object.fromEntries(Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(replacements)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  const module = { exports: {} };
  new Function('module', 'exports', bundled.outputFiles[0].text)(module, module.exports);
  const { useMeadowJourney, depthProject, pointingNeutral } = module.exports;
  let enteredCount = 0;
  options = { initialPose: { x: 0, y: -1580, zoom: 1 }, reduced: false, enabled: true, entered: true, width: 1280, height: 800,
    onExplore: () => { enteredCount++; options = { ...options, entered: true }; dirty = true; }, ...initialOptions };
  const commit = () => {
    for (let attempts = 0; dirty; attempts++) {
      assert.ok(attempts < 25, 'hook commit must settle');
      dirty = false; cursor = 0; host.result = useMeadowJourney(options); host.result.surfaceRef.current = surface;
      const pending = effects; effects = []; for (const effect of pending) effect();
    }
  };
  commit();
  const api = {
    surface, window: fakeWindow, document: fakeDocument,
    neutral() { const state = host.result.motion.current; return pointingNeutral(depthProject(state.actor.x, state.actor.y, state.pose, options.width, options.height)); },
    get result() { return host.result; }, get enteredCount() { return enteredCount; }, get frames() { return scheduled.size; },
    control: (kind = 'button') => { const element = new Element(); element.control = true; element.controlKind = kind; return element; },
    worldObject: () => { const element = new Element(); element.control = true; element.worldObject = true; return element; },
    shortcut: () => { const element = new Element(); element.control = true; element.journeyShortcut = true; element.outsideSurface = true; return element; },
    setOptions(next) { options = { ...options, ...next }; dirty = true; commit(); },
    move(time, x, y, type = 'pointermove', extra = {}) { now = time; surface.dispatch(type, { clientX: x, clientY: y, movementX: 0, movementY: 0, pointerType: 'mouse', buttons: 0, ...extra }); commit(); },
    wheel(time, deltaX, deltaY, extra = {}) {
      now = time; let prevented = false;
      surface.dispatch('wheel', { deltaX, deltaY, deltaMode: 0, ctrlKey: false, metaKey: false,
        preventDefault() { prevented = true; }, ...extra });
      commit(); return prevented;
    },
    key(time, type, code, extra = {}) {
      now = time; let prevented = false;
      const target = extra.target ?? fakeDocument.activeElement;
      // A focused scene descendant bubbles to the surface; body does not.
      const receiver = type === 'keyup' || target.outsideSurface ? fakeWindow : target === fakeDocument.body ? fakeDocument.body : surface;
      receiver.dispatch(type, { code, repeat: false, target,
        preventDefault() { prevented = true; }, ...extra });
      commit(); return prevented;
    },
    frame(time, timestamp = time) { now = time; const pending = [...scheduled.values()]; scheduled.clear(); for (const callback of pending) callback(timestamp); commit(); },
    renderFrame(time, commitAfter = true) { now = time; host.result.stepRenderFrame(); if (commitAfter) commit(); },
    commit,
  };
  try { run(api); }
  finally {
    for (const slot of slots) slot?.cleanup?.();
    for (const [key, descriptor] of Object.entries(saved)) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  }
}
check('welcome ignores pointer, mouse, wheel, keyboard and touch input without entering or moving', () => {
  for (const renderDriven of [false, true]) for (const enabled of [false, true]) withHook(hook => {
    // Test the option guards without relying on the browser's inert suppression.
    // enabled=true deliberately probes the hook's additional entered safeguard.
    const initial = structuredClone(hook.result.motion.current);
    for (const type of ['pointermove', 'mousemove']) {
      for (let i = 0; i < 15; i++) hook.move(100 + i * 16, 60 + i * 80, 160 + i * 30, type);
    }
    assert.equal(hook.wheel(500, 0, -300), false);
    for (const code of ['ArrowUp', 'ArrowRight', 'KeyW', 'PageDown', 'Home']) {
      assert.equal(hook.key(600, 'keydown', code), false);
      hook.key(700, 'keyup', code);
    }
    hook.surface.dispatch('pointerdown', { pointerType: 'touch', pointerId: 1, isPrimary: true, button: 0, clientX: 800, clientY: 300 });
    hook.move(800, 1000, 200, 'pointermove', { pointerType: 'touch', pointerId: 1, buttons: 1 });
    for (let time = 816; time <= 2000; time += 16) {
      if (renderDriven) hook.renderFrame(time); else hook.frame(time);
    }
    assert.equal(hook.enteredCount, 0, 'no raw input may dismiss the invitation');
    assert.equal(hook.frames, 0);
    assert.deepEqual(hook.result.motion.current, initial, 'welcome actor, camera and motion must stay still');
  }, { enabled, entered: false, renderDriven });
});
check('after explicit Begin a zero-button pointer keeps walking in both event and frame paths', () => {
  for (const renderDriven of [false, true]) for (const type of ['pointermove', 'mousemove']) withHook(hook => {
    hook.move(100, 900, 200, type); hook.move(116, 1000, 200, type);
    const before = structuredClone(hook.result.motion.current);
    const begin = evaluateApp('begin', {
      startExploring: () => hook.setOptions({ entered: true, enabled: evaluateApp('enabled', { entered: true, close: false }) }),
      requestAnimationFrame: callback => callback(), surfaceRef: hook.result.surfaceRef,
    });
    begin();
    if (renderDriven) hook.renderFrame(200); else hook.frame(200);
    assert.deepEqual(hook.result.motion.current, before, 'Begin itself must not inherit pre-entry pointer travel');
    hook.move(216, 1100, 180, type); hook.move(232, 1130, 180, type);
    for (let time = 248; time <= 5000; time += 16) {
      if (renderDriven) hook.renderFrame(time); else hook.frame(time);
    }
    assert.ok(Math.hypot(hook.result.actor.x - before.actor.x, hook.result.actor.y - before.actor.y) > 800);
    assert.ok(hook.result.motion.current.speed > MEADOW_SPEED * .9, 'a fixed pointer keeps its chosen direction');
    assert.equal(hook.enteredCount, 0, 'hover must no longer invoke entry');
  }, { enabled: false, entered: false, renderDriven });
});
check('returning to the invitation clears all motion and a new Begin never revives old input', () => {
  for (const renderDriven of [false, true]) for (const inputKind of ['hover', 'key', 'wheel']) withHook(hook => {
    const home = { ...hook.result.pose };
    if (inputKind === 'hover') { hook.move(100, 1080, 200); hook.move(116, 1100, 200); }
    if (inputKind === 'key') hook.key(100, 'keydown', 'ArrowRight');
    if (inputKind === 'wheel') hook.wheel(100, 200, -120);
    for (let time = 132; time <= 260; time += 16) {
      if (renderDriven) hook.renderFrame(time); else hook.frame(time);
    }
    assert.ok(hook.result.motion.current.speed > 0, `${inputKind} must be active before returning`);
    hook.result.jumpTo(home);
    hook.setOptions({ enabled: false, entered: false });
    const stopped = structuredClone(hook.result.motion.current);
    assert.equal(stopped.speed, 0); assert.equal(stopped.moving, false); assert.equal(stopped.guidance.active, false);
    assert.equal(hook.frames, 0);
    const calls = hook.enteredCount;
    hook.move(300, 1200, 100); hook.move(316, 1279, 100, 'mousemove');
    hook.wheel(340, 100, -200); hook.key(360, 'keydown', 'ArrowUp');
    hook.setOptions({ enabled: true, entered: true });
    for (let time = 400; time <= 3000; time += 16) {
      if (renderDriven) hook.renderFrame(time); else hook.frame(time);
    }
    assert.deepEqual(hook.result.motion.current, stopped, `${inputKind} intent must not survive returning and re-entering`);
    assert.equal(hook.enteredCount, calls); assert.equal(hook.frames, 0);
    hook.move(3100, 1200, 100);
    if (renderDriven) hook.renderFrame(3116); else hook.frame(3116);
    assert.deepEqual(hook.result.motion.current.actor, stopped.actor, 'post-entry first coordinate is a fresh baseline');
    hook.move(3132, 1220, 100);
    if (renderDriven) hook.renderFrame(3148); else hook.frame(3148);
    assert.ok(hook.result.motion.current.speed > 0, 'fresh hover can walk again without pressing');
  }, { renderDriven });
});
check('first keyboard hold after explicit entry survives return and motion-preference changes', () => withHook(hook => {
  const home = { ...hook.result.pose };
  for (let round = 0; round < 3; round++) {
    if (round) {
      // App.returnToEntry batches jumpTo(HOME) with entered=false, then focuses
      // Begin button. The next deliberate Begin activation re-enables the hook.
      hook.result.jumpTo(home);
      hook.setOptions({ enabled: false, entered: false });
      if (round === 2) {
        hook.setOptions({ reduced: true });
        hook.setOptions({ reduced: false });
      }
    }
    hook.setOptions({ enabled: true, entered: true });
    hook.surface.focus();
    const start = { ...hook.result.actor }, enteredBefore = hook.enteredCount;
    const downAt = 100 + round * 4000;
    hook.key(downAt, 'keydown', 'ArrowUp');
    assert.equal(hook.enteredCount, enteredBefore + 1, 'an entered garden still accepts the first keydown');
    assert.equal(hook.frames, 1, 'entry state effects must preserve the first held key');
    for (let elapsed = 16; elapsed <= 2800; elapsed += 16) {
      // Browser repeat events must neither restart nor cancel the held intent.
      if (elapsed % 320 === 0) hook.key(downAt + elapsed, 'keydown', 'ArrowUp', { repeat: true });
      hook.frame(downAt + elapsed, downAt + elapsed - 8);
      assert.equal(hook.frames, 1, `round ${round}, hold cancelled at ${elapsed} ms`);
      const [, vy] = hook.surface.dataset.journeyIntent.split(',').map(Number);
      assert.ok(vy > MEADOW_SPEED * .8, 'held keyboard intention must remain active throughout the first entry');
    }
    assert.ok(hook.result.actor.y - start.y > MEADOW_SPEED * .82 * 2.8 * .6, 'first hold must travel well beyond a single frame');
    assert.equal(hook.enteredCount, enteredBefore + 1, 'repeat events must not re-enter the garden');
    hook.key(downAt + 2816, 'keyup', 'ArrowUp');
    assert.equal(hook.frames, 0);
    const stopped = { actor: { ...hook.result.actor }, pose: { ...hook.result.pose } };
    hook.frame(downAt + 3000);
    assert.deepEqual({ actor: hook.result.actor, pose: hook.result.pose }, stopped);
  }
}));
check('mounted hook survives input after the RAF timestamp and keeps the placed direction', () => withHook(hook => {
  const start = { ...hook.result.actor };
  hook.move(100, 800, 300); hook.move(116, 820, 300);
  assert.equal(hook.enteredCount, 0, 'hover movement must not call the invitation entry callback');
  hook.frame(120, 112);
  assert.ok(hook.frames > 0, 'fresh direction must not cancel itself on the first RAF');
  for (let time = 136; time <= 8200; time += 16) hook.frame(time, time - 8);
  assert.ok(Math.hypot(hook.result.actor.x - start.x, hook.result.actor.y - start.y) > 1000);
  assert.ok(hook.result.motion.current.speed > MEADOW_SPEED * .9);
  assert.equal(hook.frames, 1);
  hook.surface.dispatch('pointerleave', { pointerType: 'mouse' }); hook.commit();
  const rested = structuredClone(hook.result.motion.current);
  assert.equal(hook.frames, 0); assert.equal(rested.speed, 0);
  hook.frame(10000); assert.deepEqual(hook.result.motion.current, rested);
}));

check('mounted mousemove-only stream works, controls cancel it and fresh motion resumes', () => withHook(hook => {
  const start = { ...hook.result.actor };
  hook.move(100, 800, 300, 'mousemove'); hook.move(116, 820, 300, 'mousemove');
  for (let i = 0; i < 25; i++) { hook.move(132 + i * 16, 824 + i * 2, 300, 'mousemove'); hook.frame(136 + i * 16); }
  assert.ok(Math.hypot(hook.result.actor.x - start.x, hook.result.actor.y - start.y) > 5);
  hook.move(550, 900, 300, 'mousemove', { target: hook.control() });
  assert.equal(hook.frames, 0);
  const stopped = { ...hook.result.actor };
  hook.frame(570); assert.deepEqual(hook.result.actor, stopped);
  hook.move(580, 920, 300, 'mousemove'); hook.move(596, 940, 300, 'mousemove'); hook.frame(610);
  assert.ok(hook.frames > 0);
  hook.surface.inert = true; hook.frame(626); assert.equal(hook.frames, 0);
}));
check('returning to the little light stops, duplicate coordinates do not restart, and fresh motion resumes', () => withHook(hook => {
  hook.move(100, 900, 250); hook.move(116, 920, 250);
  for (let time = 132; time < 700; time += 16) hook.frame(time);
  const neutral = hook.neutral();
  hook.move(716, neutral.x, neutral.y);
  for (let time = 732; time <= 1300; time += 16) hook.frame(time);
  assert.equal(hook.result.motion.current.speed, 0);
  assert.equal(hook.frames, 0);
  const rested = { ...hook.result.actor };
  hook.move(1400, neutral.x, neutral.y); hook.frame(1416);
  assert.equal(hook.frames, 0, 'compatibility/layout duplicate must not restart the stopped pointer');
  assert.deepEqual(hook.result.actor, rested);
  hook.move(1432, neutral.x + 120, neutral.y); hook.frame(1448);
  assert.equal(hook.frames, 1, 'first real displacement after neutral stop should resume');
  hook.setOptions({ enabled: false });
  const panelPosition = { ...hook.result.actor };
  hook.setOptions({ enabled: true });
  hook.move(1600, 1000, 200); hook.frame(1616);
  assert.equal(hook.frames, 0); assert.deepEqual(hook.result.actor, panelPosition);
  hook.move(1632, 1005, 200); hook.frame(1648);
  assert.ok(hook.frames > 0);
}));

check('mounted hook passes through world hitboxes continuously and still stops for their click', () => withHook(hook => {
  hook.move(100, 800, 300); hook.move(116, 820, 300);
  for (let i = 0; i < 25; i++) { hook.move(132 + i * 16, 824 + i * 2, 300); hook.frame(136 + i * 16); }
  const object = hook.worldObject(), before = { ...hook.result.actor };
  hook.surface.dispatch('pointerover', { pointerType: 'mouse', target: object });
  assert.ok(hook.frames > 0, 'moving hitbox boundaries must not cancel the walk');
  for (let i = 0; i < 20; i++) { hook.move(550 + i * 16, 900 + i * 2, 300, 'pointermove', { target: object }); hook.frame(554 + i * 16); }
  assert.ok(Math.hypot(hook.result.actor.x - before.x, hook.result.actor.y - before.y) > 20);
  hook.surface.dispatch('pointerdown', { pointerType: 'mouse', target: object, button: 0 });
  assert.equal(hook.frames, 0);
  let clickSuppressed = false;
  hook.surface.dispatch('click', { target: object, detail: 1, preventDefault() { clickSuppressed = true; } });
  assert.equal(clickSuppressed, false, 'the object click must remain available to open its panel');
}));
check('wheel alone travels identically over a world object and blank ground in both frame drivers', () => {
  for (const renderDriven of [false, true]) {
    const outcomes = [];
    for (const overObject of [false, true]) withHook(hook => {
      hook.setOptions({ entered: true, renderDriven });
      const start = { ...hook.result.actor };
      const consumed = hook.wheel(100, 0, -120, { target: overObject ? hook.worldObject() : hook.surface });
      assert.equal(consumed, true, `${overObject ? 'world object' : 'ground'} wheel must be consumed`);
      for (let time = 116; time <= 900; time += 16) {
        if (renderDriven) hook.renderFrame(time); else hook.frame(time);
      }
      const distance = Math.hypot(hook.result.actor.x - start.x, hook.result.actor.y - start.y);
      assert.ok(distance > 20, 'wheel must move without any pointer-move or leftover hover lease');
      assert.equal(hook.result.motion.current.speed, 0);
      assert.equal(hook.frames, 0);
      outcomes.push({ actor: hook.result.actor, pose: hook.result.pose });
    });
    assert.deepEqual(outcomes[1], outcomes[0], 'landmark hitbox must not change the wheel response');
  }
});
check('wheel over UI controls, dialog content, blocked scenes or zoom gestures never starts walking', () => {
  const targets = ['button', 'input', 'textarea', 'select', '[role="dialog"]', '[data-no-journey]'];
  for (const kind of targets) withHook(hook => {
    hook.setOptions({ entered: true });
    const start = structuredClone(hook.result.motion.current);
    assert.equal(hook.wheel(100, 0, -120, { target: hook.control(kind) }), false, `${kind} must retain its wheel event`);
    hook.frame(500);
    assert.equal(hook.frames, 0);
    assert.deepEqual(hook.result.motion.current, start);
  });
  for (const blocked of ['disabled', 'inert', 'ctrl', 'meta']) withHook(hook => {
    hook.setOptions({ entered: true, enabled: blocked !== 'disabled' });
    hook.surface.inert = blocked === 'inert';
    const start = structuredClone(hook.result.motion.current);
    assert.equal(hook.wheel(100, 0, -120, { target: hook.worldObject(), ctrlKey: blocked === 'ctrl', metaKey: blocked === 'meta' }), false);
    hook.frame(500);
    assert.equal(hook.frames, 0);
    assert.deepEqual(hook.result.motion.current, start);
  });
});
check('movement keys resume directly from restored landmark focus in both frame drivers', () => {
  for (const renderDriven of [false, true]) {
    for (const code of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'PageUp', 'PageDown']) withHook(hook => {
      hook.setOptions({ entered: true, renderDriven });
      hook.setOptions({ enabled: false });
      hook.setOptions({ enabled: true });
      const object = hook.worldObject();
      object.focus(); hook.commit();
      const start = { ...hook.result.actor };
      assert.equal(hook.key(100, 'keydown', code, { target: object }), true, `${code} must guide from landmark focus`);
      for (let time = 116; time <= 900; time += 16) {
        if (renderDriven) hook.renderFrame(time); else hook.frame(time);
      }
      assert.ok(Math.hypot(hook.result.actor.x - start.x, hook.result.actor.y - start.y) > 20);
      assert.equal(hook.key(916, 'keyup', code, { target: object }), true);
      assert.equal(hook.result.motion.current.speed, 0);
      assert.equal(hook.frames, 0);
    });
  }
});
check('reading shortcuts retain focus until a walking key hands off to the surface in both frame drivers', () => {
  for (const renderDriven of [false, true]) for (const code of ['ArrowUp', 'ArrowRight', 'KeyW', 'KeyD', 'PageDown']) withHook(hook => {
    hook.setOptions({ entered: true, renderDriven });
    hook.setOptions({ enabled: false });
    hook.setOptions({ enabled: true });
    const opener = hook.shortcut(); opener.focus(); hook.commit();
    const start = structuredClone(hook.result.motion.current);
    if (renderDriven) hook.renderFrame(80); else hook.frame(80);
    assert.deepEqual(hook.result.motion.current, start, 'restoring opener focus must not resume old motion');
    assert.equal(hook.document.activeElement, opener, 'restoration preserves the accessible reading opener');
    assert.equal(hook.key(100, 'keydown', code), true);
    assert.equal(hook.document.activeElement, hook.surface, 'the first walking key transfers focus before movement');
    for (let time = 116; time <= 900; time += 16) {
      if (renderDriven) hook.renderFrame(time); else hook.frame(time);
    }
    assert.ok(Math.hypot(hook.result.actor.x - start.actor.x, hook.result.actor.y - start.actor.y) > 20);
    hook.key(916, 'keyup', code);
    assert.equal(hook.result.motion.current.speed, 0);
    assert.equal(hook.frames, 0);
    assert.deepEqual(hook.surface.focusOptions, [{ preventScroll: true }]);
  });
});
check('shortcut activation and traversal keys, modifiers and unrelated controls never start walking', () => {
  for (const code of ['Enter', 'Space', 'Tab', 'Escape', 'Home']) withHook(hook => {
    hook.setOptions({ entered: true });
    const opener = hook.shortcut(); opener.focus(); hook.commit();
    const start = structuredClone(hook.result.motion.current);
    assert.equal(hook.key(100, 'keydown', code), false);
    hook.frame(300);
    assert.equal(hook.document.activeElement, opener);
    assert.deepEqual(hook.result.motion.current, start);
  });
  for (const modifier of ['ctrlKey', 'metaKey', 'altKey', 'defaultPrevented']) withHook(hook => {
    const opener = hook.shortcut(); opener.focus(); hook.commit();
    const start = structuredClone(hook.result.motion.current);
    assert.equal(hook.key(100, 'keydown', 'ArrowRight', { [modifier]: true }), false);
    hook.frame(300);
    assert.deepEqual(hook.result.motion.current, start);
    assert.equal(hook.document.activeElement, opener);
  });
  for (const kind of ['button', 'a', 'input', 'textarea', 'select', '[contenteditable="true"]']) withHook(hook => {
    const control = hook.control(kind); control.outsideSurface = true; control.focus(); hook.commit();
    const start = structuredClone(hook.result.motion.current);
    assert.equal(hook.key(100, 'keydown', 'ArrowRight'), false);
    hook.frame(300);
    assert.deepEqual(hook.result.motion.current, start);
    assert.equal(hook.document.activeElement, control);
  });
});
check('reading, an open map and a hidden page block shortcut movement without consuming its key', () => {
  for (const blocker of ['reading', 'inert', 'hidden']) withHook(hook => {
    hook.setOptions({ entered: true, enabled: blocker !== 'reading' });
    hook.surface.inert = blocker === 'inert';
    hook.document.hidden = blocker === 'hidden';
    const opener = hook.shortcut(); opener.focus(); hook.commit();
    const start = structuredClone(hook.result.motion.current);
    assert.equal(hook.key(100, 'keydown', 'ArrowRight'), false);
    hook.frame(300);
    assert.deepEqual(hook.result.motion.current, start);
    assert.equal(hook.document.activeElement, opener);
    assert.equal(hook.frames, 0);
  });
});
check('blur and hidden-page cancellation require fresh movement after a shortcut handoff', () => {
  for (const renderDriven of [false, true]) for (const cancellation of ['blur', 'hidden']) withHook(hook => {
    hook.setOptions({ entered: true, renderDriven });
    const opener = hook.shortcut(); opener.focus(); hook.commit();
    hook.key(100, 'keydown', 'ArrowRight');
    for (let time = 116; time <= 500; time += 16) {
      if (renderDriven) hook.renderFrame(time); else hook.frame(time);
    }
    assert.ok(hook.result.motion.current.speed > 0);
    if (cancellation === 'blur') hook.window.dispatch('blur');
    else { hook.document.hidden = true; hook.document.dispatch('visibilitychange'); }
    hook.commit();
    const paused = structuredClone(hook.result.motion.current);
    assert.equal(paused.speed, 0);
    hook.document.hidden = false; hook.document.dispatch('visibilitychange'); hook.commit();
    if (renderDriven) hook.renderFrame(700); else hook.frame(700);
    assert.deepEqual(hook.result.motion.current, paused);
    hook.move(716, 1000, 150);
    if (renderDriven) hook.renderFrame(732); else hook.frame(732);
    assert.deepEqual(hook.result.motion.current.actor, paused.actor, 'a single post-focus coordinate only establishes a baseline');
    hook.move(748, 1020, 150);
    if (renderDriven) hook.renderFrame(764); else hook.frame(764);
    assert.ok(hook.result.motion.current.speed > 0);
  });
});
check('landmark activation keys and UI editing keys retain their defaults without walking', () => {
  for (const code of ['Enter', 'Space']) withHook(hook => {
    hook.setOptions({ entered: true });
    const object = hook.worldObject();
    object.focus(); hook.commit();
    const start = structuredClone(hook.result.motion.current);
    assert.equal(hook.key(100, 'keydown', code, { target: object }), false, `${code} must remain available to the landmark button`);
    hook.frame(500);
    assert.equal(hook.frames, 0);
    assert.deepEqual(hook.result.motion.current, start);
  });
  for (const kind of ['button', 'a', 'input', 'textarea', 'select', '[contenteditable="true"]', '[role="dialog"]', '[data-no-journey]']) withHook(hook => {
    hook.setOptions({ entered: true });
    const start = structuredClone(hook.result.motion.current);
    assert.equal(hook.key(100, 'keydown', 'ArrowUp', { target: hook.control(kind) }), false, `${kind} must retain movement keys`);
    hook.frame(500);
    assert.equal(hook.frames, 0);
    assert.deepEqual(hook.result.motion.current, start);
  });
  for (const blocked of ['disabled', 'ctrlKey', 'metaKey', 'altKey']) withHook(hook => {
    hook.setOptions({ entered: true, enabled: blocked !== 'disabled' });
    const start = structuredClone(hook.result.motion.current);
    assert.equal(hook.key(100, 'keydown', 'ArrowUp', { target: hook.worldObject(), [blocked]: true }), false);
    hook.frame(500);
    assert.equal(hook.frames, 0);
    assert.deepEqual(hook.result.motion.current, start);
  });
});
check('walking hands landmark focus to the surface before the landmark leaves the view', () => {
  for (const renderDriven of [false, true]) withHook(hook => {
    hook.setOptions({ entered: true, renderDriven });
    const object = hook.worldObject(); object.focus(); hook.commit();
    const start = { ...hook.result.actor };
    assert.equal(hook.key(100, 'keydown', 'ArrowRight'), true);
    for (let time = 116; time <= 900; time += 16) {
      if (time === 500) object.remove(); // A distant landmark's button unmounts.
      if (renderDriven) hook.renderFrame(time); else hook.frame(time);
      assert.ok(hook.result.motion.current.speed > 0, 'focus handoff and landmark removal must not cancel held movement');
    }
    assert.ok(hook.result.actor.x - start.x > 20);
    hook.key(916, 'keyup', 'ArrowRight');
    const turnStart = { ...hook.result.actor };
    assert.equal(hook.key(932, 'keydown', 'ArrowUp'), true, 'the next direction must reach the surface after the landmark unmounts');
    for (let time = 948; time <= 1748; time += 16) {
      if (renderDriven) hook.renderFrame(time); else hook.frame(time);
    }
    assert.ok(hook.result.actor.y - turnStart.y > 20);
    hook.key(1764, 'keyup', 'ArrowUp');
    assert.equal(hook.result.motion.current.speed, 0);
    assert.equal(hook.frames, 0);
    assert.equal(hook.document.activeElement, hook.surface);
    assert.deepEqual(hook.surface.focusOptions, [{ preventScroll: true }]);
    // Input outside the scene stays outside; the hook has no global keydown.
    hook.document.activeElement = hook.document.body;
    assert.equal(hook.key(1800, 'keydown', 'ArrowUp'), false);
    if (renderDriven) hook.renderFrame(1816); else hook.frame(1816);
    assert.equal(hook.result.motion.current.speed, 0);
    assert.equal(hook.frames, 0);
  });
});
check('mounted edge pointer continues for eight seconds with no renewed events or finger movement', () => withHook(hook => {
  hook.setOptions({ entered: true });
  hook.move(100, 1200, 120); hook.move(116, 1279, 120);
  const start = { ...hook.result.actor };
  let minimumIntent = Infinity, minimumStride = Infinity;
  for (let time = 132; time <= 8200; time += 16) {
    const before = { ...hook.result.actor }; hook.frame(time + 4, time - 4);
    if (time > 800) {
      const [vx, vy] = hook.surface.dataset.journeyIntent.split(',').map(Number);
      minimumIntent = Math.min(minimumIntent, Math.hypot(vx, vy));
      minimumStride = Math.min(minimumStride, Math.hypot(hook.result.actor.x - before.x, hook.result.actor.y - before.y) / .016);
      assert.equal(hook.result.moving, true); assert.equal(hook.frames, 1);
    }
  }
  assert.ok(minimumIntent > MEADOW_SPEED * .99);
  assert.ok(minimumStride > MEADOW_SPEED * .9);
  assert.ok(Math.hypot(hook.result.actor.x - start.x, hook.result.actor.y - start.y) > 1500);
  hook.surface.dispatch('pointerleave', { pointerType: 'mouse' }); hook.commit();
  assert.equal(hook.frames, 0); assert.equal(hook.result.motion.current.speed, 0);
}));

check('the drawing frame advances a live sample before React commits, with no second RAF owner', () => withHook(hook => {
  hook.setOptions({ renderDriven: true });
  hook.move(100, 1080, 120); hook.move(116, 1100, 120);
  assert.equal(hook.frames, 0, 'the controller must not schedule a competing RAF in render-driven mode');
  const published = { ...hook.result.actor }, motion = hook.result.motion;
  hook.renderFrame(132, false);
  assert.ok(Math.hypot(motion.current.actor.x - published.x, motion.current.actor.y - published.y) > 0);
  assert.ok(motion.current.speed > 0);
  assert.equal(motion.current.moving, true);
  assert.deepEqual(hook.result.actor, published, 'the drawing sample must advance without waiting for React');
  hook.commit();
  assert.equal(hook.result.motion, motion, 'the shared frame reference must stay stable across commits');
  assert.deepEqual(hook.result.actor, motion.current.actor);
  assert.equal(hook.frames, 0);
}));

check('render-driven stationary pointer stays continuous until deliberately returned to the little light', () => withHook(hook => {
  hook.setOptions({ renderDriven: true });
  hook.move(100, 1080, 120); hook.move(116, 1100, 120);
  let minimumSpeed = Infinity;
  for (let time = 132; time <= 8200; time += 16) {
    hook.renderFrame(time + 4); assert.equal(hook.frames, 0);
    if (time > 800) { minimumSpeed = Math.min(minimumSpeed, hook.result.motion.current.speed); assert.equal(hook.result.motion.current.moving, true); }
  }
  assert.ok(minimumSpeed > MEADOW_SPEED * .9, `a placed pointer slowed to ${minimumSpeed}`);
  const neutral = hook.neutral(); hook.move(8220, neutral.x, neutral.y);
  for (let time = 8236; time < 9000; time += 16) hook.renderFrame(time);
  assert.equal(hook.result.motion.current.speed, 0); assert.equal(hook.result.motion.current.moving, false);
  const rested = structuredClone(hook.result.motion.current);
  hook.renderFrame(11000); assert.deepEqual(hook.result.motion.current, rested); assert.equal(hook.frames, 0);
}));

check('panel cancellation and exact restoration update the live sample immediately', () => withHook(hook => {
  hook.setOptions({ renderDriven: true });
  hook.move(100, 900, 160); hook.move(116, 920, 160);
  for (let time = 132; time < 360; time += 16) hook.renderFrame(time);
  const before = structuredClone(hook.result.motion.current);
  assert.ok(before.speed > 0);
  hook.setOptions({ enabled: false });
  const frozen = structuredClone(hook.result.motion.current);
  assert.equal(frozen.moving, false); assert.equal(frozen.speed, 0); assert.equal(frozen.guidance.active, false);
  assert.deepEqual(frozen.actor, before.actor); assert.deepEqual(frozen.pose, before.pose);
  hook.renderFrame(380); assert.deepEqual(hook.result.motion.current, frozen);
  hook.setOptions({ enabled: true });
  hook.renderFrame(396); assert.deepEqual(hook.result.motion.current, frozen);
  hook.move(412, 1050, 100); hook.renderFrame(428);
  assert.deepEqual(hook.result.motion.current.actor, frozen.actor, 'the first post-panel coordinate is a baseline');
  hook.move(444, 1060, 100); hook.renderFrame(460);
  assert.ok(hook.result.motion.current.speed > 0);
  hook.result.jumpTo(before.pose, before.actor, before.heading);
  assert.deepEqual(hook.result.motion.current.actor, before.actor);
  assert.deepEqual(hook.result.motion.current.pose, before.pose);
  assert.deepEqual(hook.result.motion.current.heading, before.heading);
  assert.equal(hook.result.motion.current.speed, 0);
  assert.equal(hook.frames, 0);
}));

check('changing frame drivers transfers input without a second RAF or a doubled step', () => withHook(hook => {
  hook.setOptions({ renderDriven: true });
  hook.key(100, 'keydown', 'ArrowRight');
  for (let time = 116; time <= 340; time += 16) hook.renderFrame(time);
  assert.equal(hook.frames, 0);
  assert.ok(hook.result.motion.current.speed > 0);
  hook.setOptions({ renderDriven: false });
  assert.equal(hook.frames, 1, 'the fallback should take over the existing held input');
  let before = { ...hook.result.motion.current.actor };
  hook.renderFrame(348);
  assert.deepEqual(hook.result.motion.current.actor, before, 'the drawing callback is inactive under the fallback driver');
  hook.frame(356);
  assert.ok(Math.hypot(hook.result.motion.current.actor.x - before.x, hook.result.motion.current.actor.y - before.y) <= MEADOW_SPEED * .016 + 1e-7);
  assert.equal(hook.frames, 1);
  hook.setOptions({ renderDriven: true });
  assert.equal(hook.frames, 0, 'the old fallback callback must be cancelled');
  before = { ...hook.result.motion.current.actor };
  hook.frame(372);
  assert.deepEqual(hook.result.motion.current.actor, before, 'a cancelled fallback cannot advance the sample');
  hook.renderFrame(372);
  assert.ok(Math.hypot(hook.result.motion.current.actor.x - before.x, hook.result.motion.current.actor.y - before.y) > 0);
  const once = { ...hook.result.motion.current.actor };
  hook.renderFrame(372);
  assert.deepEqual(hook.result.motion.current.actor, once, 're-entering at the same timestamp must not double-integrate');
  hook.key(388, 'keyup', 'ArrowRight');
  assert.equal(hook.result.motion.current.speed, 0);
  assert.equal(hook.result.motion.current.moving, false);
  assert.equal(hook.frames, 0);
}));

check('a near pointer keeps its slow pace instead of being caught by the moving character and camera', () => {
  for (const renderDriven of [false, true]) withHook(hook => {
    hook.setOptions({ entered: true, renderDriven });
    const n = hook.neutral(), target = { x: n.x + n.radius + 20, y: n.y };
    hook.move(100, target.x - 2, target.y); hook.move(116, target.x, target.y);
    let earlySpeed = 0;
    for (let time = 132; time <= 8200; time += 16) {
      if (renderDriven) hook.renderFrame(time); else hook.frame(time);
      if (time === 932) earlySpeed = hook.result.motion.current.speed;
    }
    assert.ok(earlySpeed > 1, 'a small displacement must make a visible gentle walk');
    assert.ok(hook.result.motion.current.speed > earlySpeed * .9, 'the camera must not eat a held near-pointer direction');
    assert.ok(hook.result.motion.current.speed < MEADOW_SPEED * .6, 'near steering must remain gentle');
  });
});
check('desktop clicking blank ground never starts or re-arms a walk', () => withHook(hook => {
  hook.setOptions({ entered: true });
  const before = structuredClone(hook.result.motion.current);
  hook.surface.dispatch('pointerdown', { pointerType: 'mouse', button: 0, buttons: 1 });
  hook.surface.dispatch('pointerup', { pointerType: 'mouse', button: 0, buttons: 0 }); hook.commit();
  hook.frame(200); assert.deepEqual(hook.result.motion.current, before); assert.equal(hook.frames, 0);
  hook.move(220, 1000, 150); hook.frame(236); assert.equal(hook.frames, 0);
  hook.move(252, 1020, 150); hook.frame(268); assert.ok(hook.result.motion.current.speed > 0);
}));
check('leaving the canvas, controls, reading and focus loss cancel a persistent direction safely', () => {
  for (const renderDriven of [false, true]) for (const reason of ['leave', 'mouse-leave', 'control', 'focus', 'reading', 'blur', 'hidden', 'map']) withHook(hook => {
    hook.setOptions({ entered: true, renderDriven }); hook.move(100, 1000, 120); hook.move(116, 1020, 120);
    for (let time = 132; time < 800; time += 16) { if (renderDriven) hook.renderFrame(time); else hook.frame(time); }
    assert.ok(hook.result.motion.current.speed > 0);
    if (reason === 'leave') hook.surface.dispatch('pointerleave', { pointerType: 'mouse' });
    if (reason === 'mouse-leave') hook.surface.dispatch('mouseleave');
    if (reason === 'control') hook.move(820, 1040, 120, 'pointermove', { target: hook.control() });
    if (reason === 'focus') hook.control().focus();
    if (reason === 'reading') hook.setOptions({ enabled: false });
    if (reason === 'blur') hook.window.dispatch('blur');
    if (reason === 'hidden') { hook.document.hidden = true; hook.document.dispatch('visibilitychange'); }
    if (reason === 'map') { hook.surface.inert = true; if (renderDriven) hook.renderFrame(820); else hook.frame(820); }
    hook.commit(); const stopped = structuredClone(hook.result.motion.current);
    assert.equal(stopped.speed, 0, reason); assert.equal(hook.frames, 0);
    hook.document.hidden = false; hook.surface.inert = false; hook.setOptions({ enabled: true });
    if (renderDriven) hook.renderFrame(1000); else hook.frame(1000);
    assert.deepEqual(hook.result.motion.current, stopped, `${reason}: return must not revive stale direction`);
    hook.move(1016, 1050, 120); if (renderDriven) hook.renderFrame(1032); else hook.frame(1032);
    assert.deepEqual(hook.result.motion.current.actor, stopped.actor);
    hook.move(1048, 1070, 120); if (renderDriven) hook.renderFrame(1064); else hook.frame(1064);
    assert.ok(hook.result.motion.current.speed > 0, `${reason}: fresh steering must resume`);
  });
});

if (failures) process.exitCode = 1;
