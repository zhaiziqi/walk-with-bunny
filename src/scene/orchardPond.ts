import type { AtlasInteractionState, AtlasPulse, AtlasSite } from './atlasInteraction';

/** Shared composition for the music clearing and its quiet water, independent of either renderer. */
export type MeadowPoint = { x: number; y: number };
export const pondFootprint = { x: -1200, y: 3200, width: 860, height: 830, waterRadiusX: 380, waterRadiusY: 250 };
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => { const p = clamp(value); return p * p * (3 - 2 * p); };
const random = (index: number) => { const n = Math.sin(index * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };

/** Water is glimpsed after leaving the orchard; no hard visibility edge advertises it from afar. */
export function pondReveal(actor: MeadowPoint) {
  return smooth((1700 - Math.hypot(actor.x - pondFootprint.x, actor.y - pondFootprint.y)) / 800);
}
export function pondGlimpse(actor: MeadowPoint) {
  return smooth((2100 - Math.hypot(actor.x - pondFootprint.x, actor.y - pondFootprint.y)) / 850);
}
export function orchardReveal(actor: MeadowPoint) {
  return smooth((1600 - Math.hypot(actor.x - 900, actor.y - 2100)) / 700);
}
/** Renderer switches preserve the orchard burst; pond state now lives in pondListening. */
export function restoreOrchardPondMemory(state: AtlasInteractionState, site: AtlasSite, actor: MeadowPoint, memories: readonly string[] = [], pulse: AtlasPulse = null): AtlasInteractionState {
  if (site.id !== 'orchard' || !memories.includes(site.event)) return state;
  const inside = Math.hypot(actor.x - site.x, actor.y - site.y) < site.radius + 90;
  return { ...state, inside, fired: inside, pulseSerial: pulse?.id === site.id ? pulse.serial : state.pulseSerial };
}
export const orchardBlossoms = [
  { x: 710, y: 2155, w: 73, h: 103, phase: .2 },
  { x: 1115, y: 2200, w: 58, h: 86, phase: .7 },
];
export const orchardFallenPetals = Array.from({ length: 14 }, (_, i) => ({
  x: 900 + (random(i + 20) - .5) * 430,
  y: 2100 + (random(i + 60) - .5) * 255,
  w: 10 + i % 5 * 1.5, h: 17 + i % 4 * 2,
  rotation: random(i + 80) * Math.PI * 2,
  color: ['#e7bac8', '#edd3d2', '#e9d8c9'][i % 3],
}));
// Three readable painted accents; the texture occupies only ~60% of each sheet.
export const pondDriftPetals = [
  { x: -1305, y: 3130, w: 20, h: 31, rotation: .7, color: '#dfb3bd' },
  { x: -1020, y: 3238, w: 16, h: 27, rotation: 2.4, color: '#e2bdc4' },
  { x: -1104, y: 3076, w: 14, h: 24, rotation: 1.5, color: '#e5bdb5' },
];

/** A burst settles into the clearing. Idle petals drift independently and remain sparse. */
export function orchardPetalPose(time: number, index: number, eventAge: number, wind: MeadowPoint = { x: .5, y: .2 }) {
  // The four idle petals keep their own phase through a response. Switching
  // between active/idle trajectories at its endpoint would visibly jump them.
  const burst = index >= 4, active = burst && eventAge >= 0 && eventAge < 8.4;
  const elapsed = burst ? Math.max(0, eventAge - index * .11) : (time * .23 + index * 1.34) % 7.8;
  const progress = clamp(elapsed / 7.2);
  const angle = index * 2.39996 + elapsed * .29;
  const radius = 55 + progress * 105;
  const envelope = smooth(elapsed / .7) * (1 - smooth((progress - .7) / .3));
  return {
    x: Math.cos(angle) * radius + elapsed * wind.x * 17 - 40,
    y: Math.sin(angle) * radius * .48 + elapsed * wind.y * 12,
    z: 28 + Math.sin(progress * Math.PI) * (active ? 145 : 95) + Math.sin(elapsed * 1.4 + index) * 5,
    rotation: angle * .5 + Math.sin(elapsed * 1.1 + index) * .32,
    tilt: Math.sin(elapsed * 1.8 + index) * .5,
    opacity: envelope * (burst ? (active ? .78 : 0) : .38),
    visible: active || !burst,
  };
}

/** A small painted petal sheet used in both WebGL and the static scene. */
export function createOrchardPetalCanvas() {
  const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  for (let i = 0; i < 7; i++) {
    ctx.save(); ctx.translate(32 + Math.sin(i * 2.3) * 1.2, 49 + Math.cos(i) * 1.1);
    ctx.scale(1 - i * .024, 1 - i * .018);
    ctx.fillStyle = ['rgba(242,227,217,.18)', 'rgba(245,231,223,.17)', 'rgba(255,245,229,.16)'][i % 3];
    ctx.beginPath(); ctx.moveTo(-2, 35); ctx.bezierCurveTo(-15, 13, -27, -13, -12, -30);
    ctx.bezierCurveTo(3, -43, 28, -17, 16, 3); ctx.quadraticCurveTo(12, 24, -2, 35); ctx.fill(); ctx.restore();
  }
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 170; i++) {
    ctx.fillStyle = `rgba(0,0,0,${.03 + random(i + 400) * .15})`;
    ctx.fillRect(random(i + 160) * 64, random(i + 310) * 96, .6 + random(i) * 1.5, .4 + random(i + 7));
  }
  return canvas;
}

/** Only used if the generated pond sheet fails to load: layered pigment, never a hard blue disc. */
export function createPondFallbackCanvas() {
  const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 500;
  const ctx = canvas.getContext('2d')!;
  for (let layer = 11; layer >= 0; layer--) {
    const growth = layer * 2.8;
    ctx.beginPath();
    for (let i = 0; i <= 96; i++) {
      const angle = i / 96 * Math.PI * 2, edge = 1 + Math.sin(angle * 5) * .018 + Math.cos(angle * 9) * .012;
      const x = 320 + Math.cos(angle) * (277 + growth) * edge, y = 250 + Math.sin(angle) * (148 + growth * .7) * edge;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fillStyle = layer > 7 ? 'rgba(129,154,132,.045)' : 'rgba(115,151,157,.12)'; ctx.fill();
  }
  ctx.save(); ctx.globalCompositeOperation = 'source-atop';
  const light = ctx.createRadialGradient(400, 295, 8, 340, 265, 230);
  light.addColorStop(0, 'rgba(231,235,217,.36)'); light.addColorStop(1, 'rgba(105,134,151,.04)');
  ctx.fillStyle = light; ctx.fillRect(0, 0, 640, 500);
  for (let i = 0; i < 420; i++) {
    ctx.fillStyle = i % 3 ? 'rgba(232,235,218,.045)' : 'rgba(77,114,134,.035)';
    ctx.fillRect(random(i + 80) * 640, random(i + 240) * 500, 5 + random(i) * 30, .4 + random(i + 12) * 1.7);
  }
  ctx.restore(); return canvas;
}
