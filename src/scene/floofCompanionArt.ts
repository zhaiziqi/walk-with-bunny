export const floofRandom = (n: number) => { const v = Math.sin(n * 127.1 + 19.73) * 43758.5453; return v - Math.floor(v); };

/** An irregular painted edge stays readable at traveller scale; there is no animal atlas. */
export function createFloofCanvas(withEarTips = false) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const cx = 256, cy = 263;
  const radius = (a: number) => 174 + Math.sin(a * 7 + 1.4) * 7 + Math.sin(a * 13 - .7) * 4 + Math.sin(a * 21) * 2.5;
  // Each rounded tuft tapers back into the original contour at both roots.
  const tuft = (u: number, height: number) => Math.abs(u) < 1 ? height * (1 - u ** 4) ** 3 : 0;
  const liftAt = (angle: number) => {
    if (!withEarTips) return 0;
    const crown = Math.atan2(Math.cos(angle), -Math.sin(angle));
    return tuft((crown + .25) / .19, 21) + tuft((crown - .15) / .18, 40);
  };
  ctx.beginPath();
  for (let i = 0; i <= 240; i++) {
    const a = i / 240 * Math.PI * 2, r = radius(a);
    const lift = liftAt(a);
    const x = cx + Math.cos(a) * r - .46 * lift, y = cy + Math.sin(a) * r - lift;
    if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  const pigment = ctx.createLinearGradient(150, 120, 330, 465);
  pigment.addColorStop(0, '#fff9e6'); pigment.addColorStop(.5, '#fff3d4'); pigment.addColorStop(1, '#e8dfc7');
  ctx.fillStyle = pigment; ctx.fill();
  // Short dry-brush fibres overlap the core, with a soft falloff rather than a halo outline.
  for (let i = 0; i < 1550; i++) {
    const a = floofRandom(i + 2) * Math.PI * 2, r = radius(a), length = 3 + floofRandom(i + 71) * 16;
    const inner = r - 6 - floofRandom(i + 193) * 9, twist = (floofRandom(i + 269) - .5) * .09;
    const base = cy + Math.sin(a) * inner;
    const lift = liftAt(a), lean = -.46 * lift;
    ctx.strokeStyle = base > 345 ? `rgba(240,232,208,${.25 + floofRandom(i + 89) * .48})` : `rgba(255,247,224,${.32 + floofRandom(i + 89) * .55})`;
    ctx.lineWidth = .65 + floofRandom(i + 113) * 1.9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * inner + lean, base - lift);
    ctx.quadraticCurveTo(cx + Math.cos(a + twist) * r + lean, cy + Math.sin(a + twist) * r - lift,
      cx + Math.cos(a + twist * .6) * (r + length) + lean, cy + Math.sin(a + twist * .6) * (r + length) - lift);
    ctx.stroke();
  }
  ctx.save(); ctx.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 6200; i++) {
    const x = floofRandom(i + 177) * 512, y = floofRandom(i + 359) * 512, s = .5 + floofRandom(i + 47) * 2.3;
    ctx.fillStyle = i % 3 ? 'rgba(255,255,245,.075)' : 'rgba(174,164,133,.035)';
    ctx.fillRect(x, y, s, s * .65);
  }
  ctx.restore();
  return canvas;
}
