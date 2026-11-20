import type { AtlasInteractionState, AtlasPulse, AtlasSite } from './atlasInteraction';

type Point = { x: number; y: number };
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (n: number) => { const p = clamp(n); return p * p * (3 - 2 * p); };
const random = (n: number) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
const reveal = (actor: Point, center: Point) => smooth((1550 - Math.hypot(actor.x - center.x, actor.y - center.y)) / 800);

export const hillBirds = [
  { x: 815, y: 6825, w: 110, h: 96.25, foot: .72, phase: .2, flip: false },
  { x: 965, y: 6720, w: 94, h: 82.25, foot: .72, phase: .8, flip: true },
  { x: 1110, y: 6875, w: 104, h: 91, foot: .72, phase: 1.3, flip: false },
  { x: 1225, y: 6770, w: 88, h: 77, foot: .72, phase: 2.1, flip: true },
];
export const moonGround = { x: -200, y: 8290, w: 420, h: 520 };
export const moonOrb = { x: 320, y: 8870, lift: 250, w: 108, h: 108 };
export const moonMotes = [
  { x: -540, y: 8410, z: 115, size: 4.5 },
  { x: 130, y: 8340, z: 105, size: 4 },
  { x: -440, y: 8720, z: 165, size: 5 },
  { x: 165, y: 8760, z: 135, size: 3.5 },
  { x: -40, y: 8150, z: 80, size: 4.5 },
  { x: 440, y: 8540, z: 170, size: 4 },
];
export const hillReveal = (actor: Point) => reveal(actor, { x: 1000, y: 6800 });
export const moonReveal = (actor: Point) => reveal(actor, { x: -200, y: 8500 });
export function moonLightResponse(age: number, awake: boolean) {
  const response = Math.sin(clamp(age / 6) * Math.PI) ** 2;
  return (awake ? .17 : .08) + response * .16;
}
export function moonMotePose(time: number, index: number, age: number) {
  const mote = moonMotes[index], response = Math.sin(clamp(age / 6) * Math.PI) ** 2;
  return {
    x: mote.x + Math.sin(time * .14 + index * 1.4) * 14,
    y: mote.y + Math.cos(time * .11 + index * 1.1) * 9,
    z: mote.z + Math.sin(time * .25 + index) * 11 + response * 12,
    opacity: .28 + (Math.sin(time * .65 + index * 1.6) + 1) * .10 + response * .12,
  };
}
export function restoreHillMoonMemory(state: AtlasInteractionState, site: AtlasSite, actor: Point, memories: readonly string[] = [], pulse: AtlasPulse = null): AtlasInteractionState {
  if ((site.id !== 'hill' && site.id !== 'moon') || !memories.includes(site.event)) return state;
  const inside = Math.hypot(actor.x - site.x, actor.y - site.y) < site.radius + 90;
  return { ...state, inside, fired: inside, pulseSerial: pulse?.id === site.id ? pulse.serial : state.pulseSerial };
}

/** Four little paper silhouettes share one softly brushed sheet, optionally split at the wing hinge. */
export function createPaperBirdCanvas(part: 'body' | 'leftWing' | 'rightWing' | 'whole' = 'whole') {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 224;
  const ctx = canvas.getContext('2d')!;
  const wing = (side: number) => {
    ctx.save(); ctx.translate(128, 126); ctx.scale(side, 1);
    ctx.beginPath(); ctx.moveTo(0, 9); ctx.bezierCurveTo(26, -12, 62, -49, 105, -62);
    ctx.quadraticCurveTo(83, -24, 67, 7); ctx.quadraticCurveTo(39, 24, 0, 9); ctx.closePath();
    ctx.fillStyle = side < 0 ? '#eae5d7' : '#d1d9d3'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(2, 8); ctx.lineTo(102, -59); ctx.quadraticCurveTo(61, -28, 42, 15); ctx.closePath(); ctx.fillStyle = side < 0 ? 'rgba(255,246,220,.45)' : 'rgba(235,232,216,.40)'; ctx.fill();
    ctx.restore();
  };
  if (part === 'leftWing' || part === 'whole') wing(-1);
  if (part === 'rightWing' || part === 'whole') wing(1);
  if (part === 'body' || part === 'whole') {
    ctx.fillStyle = '#ece7d7'; ctx.beginPath(); ctx.moveTo(117, 136); ctx.quadraticCurveTo(122, 111, 133, 103); ctx.lineTo(146, 107); ctx.lineTo(137, 112); ctx.quadraticCurveTo(139, 136, 131, 150); ctx.lineTo(122, 161.28); ctx.lineTo(120, 145); ctx.lineTo(111, 150); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(133,148,151,.35)'; ctx.beginPath(); ctx.moveTo(129, 114); ctx.lineTo(127, 149); ctx.lineTo(122, 160); ctx.lineTo(123, 133); ctx.closePath(); ctx.fill();
  }
  ctx.save(); ctx.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 520; i++) { ctx.fillStyle = i % 3 ? 'rgba(255,251,230,.11)' : 'rgba(105,129,145,.065)'; ctx.fillRect(random(i + 22) * 256, random(i + 92) * 224, .6 + random(i) * 6, .4 + random(i + 11) * 1.1); }
  ctx.restore(); return canvas;
}

/** A single soft painted trail of reflected light, not a ring or an independent floor plane. */
export function createMoonGroundCanvas() {
  const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 800;
  const ctx = canvas.getContext('2d')!;
  for (let i = 0; i < 9; i++) {
    const y = 90 + i * 72, x = 320 + Math.sin(i * .53) * 30;
    const rx = 90 + i * 6, ry = 105;
    ctx.save(); ctx.translate(x, y); ctx.scale(rx, ry);
    const wash = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    wash.addColorStop(0, 'rgba(243,235,206,.30)'); wash.addColorStop(.5, 'rgba(220,230,220,.13)'); wash.addColorStop(1, 'rgba(216,225,230,0)');
    ctx.fillStyle = wash; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
  }
  ctx.save(); ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 480; i++) { ctx.fillStyle = 'rgba(0,0,0,.07)'; ctx.fillRect(random(i + 8) * 640, random(i + 78) * 800, 3 + random(i) * 12, .8); }
  ctx.restore(); return canvas;
}

export function createPaperMoonCanvas() {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  for (let layer = 0; layer < 7; layer++) {
    ctx.fillStyle = layer < 2 ? 'rgba(228,233,221,.075)' : 'rgba(235,233,213,.28)';
    ctx.beginPath(); ctx.arc(128, 128, 91 - layer * .8, 0, Math.PI * 2); ctx.fill();
  }
  ctx.save(); ctx.globalCompositeOperation = 'source-atop';
  const shade = ctx.createRadialGradient(91, 101, 5, 91, 101, 140);
  shade.addColorStop(0, 'rgba(248,241,215,.08)'); shade.addColorStop(1, 'rgba(128,155,173,.18)'); ctx.fillStyle = shade; ctx.fillRect(0,0,256,256);
  for (let i = 0; i < 650; i++) { ctx.fillStyle = i % 3 ? 'rgba(255,248,227,.055)' : 'rgba(122,149,169,.06)'; ctx.fillRect(random(i + 14) * 256, random(i + 84) * 256, .7 + random(i) * 7, .6 + random(i + 33) * 2); }
  ctx.restore(); return canvas;
}
