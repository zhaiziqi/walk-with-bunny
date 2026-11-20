import type { AtlasInteractionState, AtlasPulse, AtlasSite } from './atlasInteraction';
import { terrainHeight } from './depthWorld';

type Point = { x: number; y: number };
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (n: number) => { const p = clamp(n); return p * p * (3 - 2 * p); };
const random = (n: number) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
const mushroomAspect = 1312 / 1199;
const reveal = (actor: Point, x: number, y: number) => smooth((1500 - Math.hypot(actor.x - x, actor.y - y)) / 750);

/** Shared painted silhouettes: the same feet and coordinates in both renderers. */
export const hollowMushrooms = [
  { x: 1215, y: 4350, w: 140 * mushroomAspect, h: 140, foot: .91, phase: .2, flip: false },
  { x: 1335, y: 4220, w: 176 * mushroomAspect, h: 176, foot: .91, phase: .7, flip: true },
  { x: 1405, y: 4430, w: 108 * mushroomAspect, h: 108, foot: .91, phase: 1.1, flip: false },
  { x: 1545, y: 4310, w: 150 * mushroomAspect, h: 150, foot: .91, phase: 1.6, flip: false },
  { x: 1625, y: 4435, w: 120 * mushroomAspect, h: 120, foot: .91, phase: 2.3, flip: true },
];
export const archComposition = {
  x: -1100, y: 5400, w: 435, h: 580, foot: .95,
  chimeHeight: 464, chimeW: 54, chimeH: 168, chimeTop: .04,
};
/** The lower stonework follows the existing bank; the arch crown and hanging pivot stay rigid. */
export function archGroundOffset(worldX: number, localHeight: number) {
  if (!Number.isFinite(worldX) || !Number.isFinite(localHeight) || localHeight >= 160) return 0;
  const footWeight = 1 - smooth(localHeight / 160);
  return (terrainHeight(worldX, archComposition.y) - terrainHeight(archComposition.x, archComposition.y)) * footWeight;
}
export const archMotes = Array.from({ length: 7 }, (_, i) => ({
  x: archComposition.x + (random(i + 41) - .5) * 540,
  y: archComposition.y + (random(i + 97) - .5) * 250,
  z: 80 + random(i + 12) * 250,
  size: 3.5 + random(i + 61) * 2.5,
}));
export const hollowReveal = (actor: Point) => reveal(actor, 1400, 4300);
export const archReveal = (actor: Point) => reveal(actor, archComposition.x, archComposition.y);

/** Damped pendulum: activation adds motion continuously, then returns to the common wind. */
export function chimeResponse(time: number, age: number, windLean = 0) {
  const safeAge = Math.max(0, age);
  const response = Math.sin(safeAge * 4.3) * Math.exp(-safeAge * .58) * smooth(safeAge / .25);
  return windLean * .055 + Math.sin(time * .61) * .012 + response * .18;
}
export function archMotePose(time: number, index: number, age: number) {
  const point = archMotes[index];
  const response = Math.sin(clamp(age / 5.5) * Math.PI) ** 2;
  return {
    x: point.x + Math.sin(time * .23 + index * 1.7) * 18,
    y: point.y + Math.cos(time * .17 + index) * 9,
    z: point.z + Math.sin(time * .37 + index * 2) * 12 + response * 22,
    opacity: .28 + (Math.sin(time * .9 + index * 2) + 1) * .12 + response * .20,
  };
}

export function restoreHollowArchMemory(state: AtlasInteractionState, site: AtlasSite, actor: Point, memories: readonly string[] = [], pulse: AtlasPulse = null): AtlasInteractionState {
  if ((site.id !== 'hollow' && site.id !== 'arch') || !memories.includes(site.event)) return state;
  const inside = Math.hypot(actor.x - site.x, actor.y - site.y) < site.radius + 90;
  return { ...state, inside, fired: inside, pulseSerial: pulse?.id === site.id ? pulse.serial : state.pulseSerial };
}

/** These quiet code-painted sheets are a real asset-failure fallback, shared with Canvas. */
export function createMushroomFallbackCanvas() {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 320;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#e1ddcc'; ctx.beginPath(); ctx.moveTo(117, 142); ctx.bezierCurveTo(117, 208, 100, 270, 109, 289);
  ctx.quadraticCurveTo(130, 298, 149, 287); ctx.bezierCurveTo(138, 246, 154, 186, 145, 137); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(114,125,141,.18)'; ctx.beginPath(); ctx.moveTo(139, 151); ctx.bezierCurveTo(134, 212, 129, 263, 141, 290); ctx.lineTo(150, 286); ctx.bezierCurveTo(138, 240, 154, 181, 145, 137); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#bea6b7'; ctx.beginPath(); ctx.moveTo(32, 138); ctx.bezierCurveTo(46, 63, 84, 39, 130, 42); ctx.bezierCurveTo(181, 42, 222, 81, 224, 146); ctx.bezierCurveTo(184, 169, 76, 171, 32, 138); ctx.fill();
  ctx.fillStyle = '#d6c2c7'; ctx.beginPath(); ctx.moveTo(38, 137); ctx.bezierCurveTo(78, 149, 183, 157, 220, 143); ctx.bezierCurveTo(188, 174, 77, 175, 38, 137); ctx.fill();
  ctx.save(); ctx.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 650; i++) { ctx.fillStyle = i % 3 ? 'rgba(249,235,216,.06)' : 'rgba(102,112,132,.05)'; ctx.fillRect(random(i + 4) * 256, random(i + 89) * 320, 1 + random(i + 12) * 8, .6 + random(i) * 2); }
  ctx.restore(); return canvas;
}

export function createArchFallbackCanvas() {
  const canvas = document.createElement('canvas'); canvas.width = 435; canvas.height = 580;
  const ctx = canvas.getContext('2d')!; ctx.scale(435 / 450, 1);
  ctx.beginPath(); ctx.moveTo(82, 551); ctx.lineTo(78, 230); ctx.bezierCurveTo(71, 5, 370, 14, 372, 231); ctx.lineTo(370, 551); ctx.lineTo(316, 551); ctx.lineTo(317, 233); ctx.bezierCurveTo(318, 82, 134, 86, 131, 231); ctx.lineTo(136, 551); ctx.closePath(); ctx.fillStyle = '#d8d7cb'; ctx.fill();
  ctx.save(); ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = 'rgba(117,136,151,.24)'; ctx.fillRect(119, 205, 19, 340); ctx.fillRect(351, 220, 22, 325);
  ctx.strokeStyle = 'rgba(125,137,144,.25)'; ctx.lineWidth = 3;
  for (const y of [270, 338, 402, 476]) { ctx.beginPath(); ctx.moveTo(70, y); ctx.lineTo(143, y + 3); ctx.moveTo(313, y + 7); ctx.lineTo(378, y + 4); ctx.stroke(); }
  for (let i = 0; i < 1100; i++) { ctx.fillStyle = i % 3 ? 'rgba(254,249,231,.09)' : 'rgba(110,130,143,.05)'; ctx.fillRect(random(i + 9) * 450, random(i + 53) * 580, 2 + random(i) * 12, 1 + random(i + 44) * 3); }
  ctx.restore();
  return canvas;
}

/** The top anchor is at 4% of the sheet, with room for a fixed thread, bell and little paper slip. */
export const chimeArtwork = { width: 128, height: 400, top: 16, paperPivot: 190 };
export function createChimeCanvas(part: 'whole' | 'bell' | 'paper' = 'whole') {
  const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 400;
  const ctx = canvas.getContext('2d')!;
  if (part !== 'paper') {
    ctx.strokeStyle = '#a3aaa6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(64, 16); ctx.lineTo(64, 144); ctx.stroke();
    ctx.fillStyle = '#c9c1a7'; ctx.beginPath(); ctx.moveTo(30, 191); ctx.bezierCurveTo(33, 139, 92, 136, 98, 191); ctx.quadraticCurveTo(65, 207, 30, 191); ctx.fill();
    ctx.fillStyle = '#eee3c7'; ctx.beginPath(); ctx.ellipse(64, 191, 34, 7, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (part !== 'bell') {
    ctx.strokeStyle = '#adb1a6'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(64, 190); ctx.lineTo(64, 275); ctx.stroke();
    ctx.fillStyle = '#ece4d0'; ctx.beginPath(); ctx.moveTo(45, 270); ctx.lineTo(77, 272); ctx.lineTo(81, 362); ctx.lineTo(46, 358); ctx.closePath(); ctx.fill();
  }
  ctx.save(); ctx.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 130; i++) { ctx.fillStyle = 'rgba(119,129,140,.10)'; ctx.fillRect(random(i + 53) * 128, random(i + 97) * 400, .7 + random(i) * 4, .6); }
  ctx.restore(); return canvas;
}
