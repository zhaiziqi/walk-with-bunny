import { pondFootprint } from './orchardPond';
import { DREAM_TRAIL_LIFETIME, type PondDreamState } from './pondDream';

export const pondDreamPaint = { width: 640, height: 618, brushRadius: 200, brushCore: 70 } as const;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (a: number, b: number, n: number) => { const p = clamp((n - a) / (b - a)); return p * p * (3 - 2 * p); };
const random = (n: number) => { const p = Math.sin(n * 127.1 + 311.7) * 43758.5453; return p - Math.floor(p); };

/** The night is painted once and revealed by the reflection's actual path.
 * It lives only below the water: there is no new foreground particle layer. */
export function createPondNightCanvas() {
  const canvas = document.createElement('canvas'); canvas.width = pondDreamPaint.width; canvas.height = pondDreamPaint.height;
  const ctx = canvas.getContext('2d')!;
  const { width: w, height: h } = canvas;
  ctx.fillStyle = '#284a68'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 48; i++) {
    const x = random(i + 2) * w, y = random(i + 35) * h;
    const r = 35 + random(i + 74) * 180;
    const wash = ctx.createRadialGradient(x, y, 0, x, y, r);
    const color = i % 3 === 0 ? '137,123,167' : i % 3 === 1 ? '37,56,86' : '107,143,157';
    wash.addColorStop(0, `rgba(${color},${.07 + random(i + 95) * .12})`);
    wash.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = wash; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // A slant of soft pigment suggests depth without a sharp galaxy image.
  ctx.save(); ctx.translate(w * .5, h * .52); ctx.rotate(-.43); ctx.scale(1, .21);
  const cloud = ctx.createRadialGradient(0, 0, 0, 0, 0, w * .45);
  cloud.addColorStop(0, 'rgba(161,158,188,.20)'); cloud.addColorStop(.5, 'rgba(113,143,163,.08)'); cloud.addColorStop(1, 'rgba(88,116,151,0)');
  ctx.fillStyle = cloud; ctx.fillRect(-w, -w, w * 2, w * 2); ctx.restore();
  // Slight pigment grain is fixed in the water, never screen-space noise.
  for (let i = 0; i < 14000; i++) {
    ctx.fillStyle = i % 2 ? 'rgba(219,224,213,.035)' : 'rgba(15,37,66,.035)';
    ctx.fillRect(random(i + 170) * w, random(i + 370) * h, .5 + random(i + 9) * 1.6, .6 + random(i + 21) * 1.2);
  }
  for (let i = 0; i < 31; i++) {
    const angle = random(i + 800) * Math.PI * 2, radius = Math.sqrt(random(i + 940)) * .86;
    const wx = Math.cos(angle) * 380 * radius, wy = Math.sin(angle) * 250 * radius;
    const x = (wx / pondFootprint.width + .5) * w, y = (.5 - wy / pondFootprint.height) * h;
    const r = i % 7 === 0 ? 2.5 : 1.3 + random(i + 1010) * .8;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 4.5);
    glow.addColorStop(0, 'rgba(255,240,204,.24)'); glow.addColorStop(1, 'rgba(255,240,204,0)');
    ctx.fillStyle = glow; ctx.fillRect(x - r * 5, y - r * 5, r * 10, r * 10);
    ctx.fillStyle = i % 3 ? '#f0ead3' : '#c5d7df'; ctx.globalAlpha = .68 + random(i + 1060) * .30;
    ctx.beginPath(); ctx.ellipse(x, y, r, r * .76, 0, 0, Math.PI * 2); ctx.fill();
    if (i % 7 === 0) {
      ctx.strokeStyle = '#fff4d5'; ctx.lineWidth = .8; ctx.globalAlpha = .75;
      ctx.beginPath(); ctx.moveTo(x - r * 2.6, y); ctx.lineTo(x + r * 2.6, y); ctx.moveTo(x, y - r * 2.6); ctx.lineTo(x, y + r * 2.6); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  return canvas;
}

export function pondDreamTrailStrength(age: number, strength: number) {
  return Math.max(0, strength) * (1 - smooth(DREAM_TRAIL_LIFETIME * .38, DREAM_TRAIL_LIFETIME, age));
}

/** Same deterministic brush contour and reflection silhouette as the GPU layer. */
function field(x: number, y: number, state: PondDreamState) {
  const t = state.time, dx = x - state.reflection.x + pondFootprint.x, dy = y - state.reflection.y + pondFootprint.y;
  const wiggle = Math.sin(y * .055 + x * .018) * 3 + Math.sin(x * .083 - y * .026) * 1.7;
  const shore = 1 - smooth(.83, .95, Math.hypot(x / 380, y / 250) + wiggle * .0018);
  let mask = .48 * (1 - smooth(pondDreamPaint.brushCore, pondDreamPaint.brushRadius, Math.hypot(dx, dy) + wiggle));
  for (const stamp of state.trail) {
    const d = Math.hypot(x + pondFootprint.x - stamp.x, y + pondFootprint.y - stamp.y) + wiggle;
    mask = Math.max(mask, (1 - smooth(pondDreamPaint.brushCore, pondDreamPaint.brushRadius, d)) * pondDreamTrailStrength(stamp.age, stamp.strength));
  }
  const px = dx + Math.sin(dy * .12 + t * .9) * 2.2;
  const angle = Math.atan2(dy, px), radius = Math.hypot(px / 46, dy / 39);
  const fluff = .90 + Math.sin(angle * 17 + .4) * .025 + Math.sin(angle * 29) * .018;
  let body = 1 - smooth(fluff, fluff + .16, radius);
  const earAmount = .25 + state.playfulness * .75;
  const ear = (cx: number, cy: number, turn: number) => {
    const ex = px - cx, ey = dy - cy, c = Math.cos(turn), s = Math.sin(turn);
    return (1 - smooth(.8, 1.06, Math.hypot((ex * c + ey * s) / 13, (-ex * s + ey * c) / 28))) * earAmount;
  };
  body = Math.max(body, ear(-16, 43, -.17), ear(16, 45, .2));
  const streak = .88 + .12 * Math.sin(dy * .31 + t * .7);
  const halo = Math.exp(-((px / 72) ** 2 + (dy / 81) ** 2) * 1.8) * .18;
  return { night: clamp(mask * state.playfulness * .91 * shore * state.presence),
    body: clamp(Math.max(body * .90 * streak, halo) * shore * state.presence) };
}

let nightPixels: ImageData | undefined;
const snapshots = new WeakMap<PondDreamState, HTMLCanvasElement>();
let blank: HTMLCanvasElement | undefined;

/** A frozen snapshot from the same world-space history; no clocks advance.
 * Cached by immutable model snapshot so static travel never repaints the toy. */
export function paintPondDreamSnapshot(state: PondDreamState | null | undefined) {
  if (!state) {
    if (!blank) { blank = document.createElement('canvas'); blank.width = pondDreamPaint.width; blank.height = pondDreamPaint.height; }
    return blank;
  }
  const existing = snapshots.get(state); if (existing) return existing;
  if (!nightPixels) nightPixels = createPondNightCanvas().getContext('2d')!.getImageData(0, 0, pondDreamPaint.width, pondDreamPaint.height);
  const canvas = document.createElement('canvas'); canvas.width = pondDreamPaint.width; canvas.height = pondDreamPaint.height;
  const ctx = canvas.getContext('2d')!, pixels = ctx.createImageData(canvas.width, canvas.height);
  if (state.presence > .001) for (let py = 0; py < canvas.height; py++) for (let px = 0; px < canvas.width; px++) {
    const x = ((px + .5) / canvas.width - .5) * pondFootprint.width, y = (.5 - (py + .5) / canvas.height) * pondFootprint.height;
    if (Math.hypot(x / 380, y / 250) > .98) continue;
    const { night, body } = field(x, y, state), alpha = body + night * (1 - body), i = (py * canvas.width + px) * 4;
    if (alpha < .001) continue;
    for (let c = 0; c < 3; c++) pixels.data[i + c] = (nightPixels.data[i + c] * night * (1 - body) + [255, 246, 216][c] * body) / alpha;
    pixels.data[i + 3] = alpha * 255;
  }
  ctx.putImageData(pixels, 0, 0); snapshots.set(state, canvas); return canvas;
}
