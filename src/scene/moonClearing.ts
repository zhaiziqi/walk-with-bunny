type Point = { x: number; y: number };
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => { const t = clamp(v); return t * t * (3 - 2 * t); };
const between = (a: number, b: number, v: number) => smooth((v - a) / (b - a));

/** One arrival, stored above either renderer. A pause never advances the cloud. */
export type MoonClearingState = {
  actor: Point; armed: boolean; approach: number; age: number; phase: number; completed: boolean;
};
export type MoonClearingRef = { current: MoonClearingState | null };
export function createMoonClearing(actor: Point, completed = false): MoonClearingState {
  return { actor: { ...actor }, armed: false, approach: 0, age: completed ? 2.4 : -1, phase: completed ? 1 : 0, completed };
}
/** Renderer changes rebase movement evidence, keeping an underway cloud crossing intact. */
export function resumeMoonClearing(state: MoonClearingState, actor: Point): MoonClearingState {
  return { ...state, actor: { ...actor }, armed: false, approach: 0 };
}
export function advanceMoonClearing(state: MoonClearingState, actor: Point, delta: number, paused = false): MoonClearingState {
  if (paused || !Number.isFinite(delta) || delta <= 0 || !Number.isFinite(actor.x) || !Number.isFinite(actor.y)) return state;
  const step = Math.hypot(actor.x - state.actor.x, actor.y - state.actor.y);
  if (delta > .25 || step > 80) return { ...state, actor: { ...actor }, armed: false, approach: 0 };
  const dt = Math.min(delta, .05);
  const inside = Math.hypot((actor.x + 80) / 680, (actor.y - 8220) / 510) < 1;
  const armed = state.armed || (step > .015 && inside);
  const approach = inside && armed ? Math.min(.4, state.approach + dt) : 0;
  let age = state.age;
  if (age < 0 && approach >= .4) age = 0;
  else if (age >= 0) age = Math.min(2.4, age + dt);
  const phase = age < 0 ? 0 : smooth(age / 2.4);
  return { actor: { ...actor }, armed, approach, age, phase, completed: state.completed || phase === 1 };
}
export function inspectMoonClearing(state: MoonClearingState) {
  return { phase: +state.phase.toFixed(4), age: +state.age.toFixed(3), completed: state.completed, armed: state.armed };
}

/** Ground-space light and cloud share this finite field with both renderers. */
export function moonClearingField(x: number, y: number, phase = 0) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { coverage: 0, light: 0, shadow: 0 };
  if (!Number.isFinite(phase)) phase = 0;
  const coverage = 1 - between(.60, 1, Math.hypot((x + 200) / 1440, (y - 8460) / 1190));
  const d = .82 * (x + 200) + .57 * (y - 8500) + 55 * Math.sin((y - 7800) * .0017);
  const edge = 520 - 1750 * smooth(phase);
  const shade = 1 - between(edge - 220, edge + 220, d);
  const band = 1 - between(330, 600, Math.abs(.85 * (x + 200) - .42 * (y - 8420) + Math.sin((y - 7900) * .003) * 22));
  return { coverage, light: coverage * band * (1 - shade), shadow: coverage * shade };
}
export const moonClearingGLSL = `
vec3 sampleMoonClearing(vec2 p, float phase) {
  float coverage = 1. - smoothstep(.60, 1., length((p - vec2(-200.,8460.)) / vec2(1440.,1190.)));
  float d = .82 * (p.x + 200.) + .57 * (p.y - 8500.) + 55. * sin((p.y - 7800.) * .0017);
  float edge = 520. - 1750. * smoothstep(0.,1.,phase);
  float shade = 1. - smoothstep(edge - 220.,edge + 220.,d);
  float band = 1. - smoothstep(330.,600.,abs(.85 * (p.x + 200.) - .42 * (p.y - 8420.) + sin((p.y - 7900.) * .003) * 22.));
  return vec3(coverage, coverage * band * (1. - shade), coverage * shade);
}`;

/** Preserve the accepted meadow palette; arrival timing still drives the bird. */
export function moonObjectTint(_x: number, _y: number, _phase: number, _kind: 'door' | 'bird' | 'floof'): [number, number, number] {
  return [1, 1, 1];
}
