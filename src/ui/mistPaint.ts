// Paint, brush and mask contain alpha and pigment only. The live garden stays in its own renderer.
type Point = { x: number; y: number };

function sheet(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function random(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => v * v * (3 - 2 * v);

// Repeatable pigment pools. Closer sampling along one axis gives them a brushed direction.
const rand = random(41833);
const lattice = Float32Array.from({ length: 64 * 64 }, rand);
function noise(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = ease(x - ix), fy = ease(y - iy);
  const row = (iy & 63) * 64, next = ((iy + 1) & 63) * 64;
  const left = ix & 63, right = (ix + 1) & 63;
  const a = lattice[row + left] * (1 - fx) + lattice[row + right] * fx;
  const b = lattice[next + left] * (1 - fx) + lattice[next + right] * fx;
  return a + (b - a) * fy;
}

function paintWash(width: number, height: number, anchor: Point) {
  // Keep the low-frequency wash inexpensive even on a very large Retina desktop.
  const ratio = Math.min(.72, 1080 / width, 800 / height);
  const wash = sheet(Math.max(1, Math.round(width * ratio)), Math.max(1, Math.round(height * ratio)));
  const ctx = wash.getContext('2d')!;
  const pixels = ctx.createImageData(wash.width, wash.height);
  const tooth = random(2081);
  const span = Math.max(320, Math.min(width, height));
  const gap = Math.max(40, Math.min(88, span * .1));
  const seed = random(9876);

  for (let j = 0; j < wash.height; j++) {
    const y = j * height / wash.height, sy = y / height;
    for (let i = 0; i < wash.width; i++) {
      const x = i * width / wash.width, sx = x / width;
      const u = (x - anchor.x) / span, v = (y - anchor.y) / span;
      // Broad moving air meets a warm, low opening across the right of the valley.
      // Pigment settles along that slope. Neither the hole nor the light is a disc.
      const drift = v + u * .29;
      const bank = noise(12 + u * 2.2, 32 + drift * 4.6);
      const bloom = noise(42 + u * 6, 19 + drift * 15 + bank * 2.1);
      const edge = noise(7 + u * 22, 12 + drift * 47 + bloom * 1.6);
      const strand = noise(33 + u * 52, 20 + drift * 185 + bank * 4);
      const horizon = .69 - .5 * sx + .07 * Math.sin(sx * 6 + .5);
      const backlight = Math.exp(-Math.pow((sy - horizon + (bloom - .5) * .065) / .15, 2));
      const amber = clamp(backlight * (.18 + .86 * sx) + .28 * sx + (bank - .5) * .21);
      const mist = clamp(.38 + bank * .34 + bloom * .18 + edge * .08 + strand * .055);
      const speck = (tooth() - .5) * 6.4;
      const p = (j * wash.width + i) * 4;
      pixels.data[p] = 80 + mist * 120 + amber * 63 + speck;
      pixels.data[p + 1] = 119 + mist * 91 + amber * 32 + speck;
      pixels.data[p + 2] = 135 + mist * 74 + amber * 8 + speck;
      const gx = (x - anchor.x + gap * .29) / gap;
      const gy = (y - anchor.y + gap * .04) / gap;
      const seam = .4 * gx + .08 * gx * gx + (edge - .5) * .34;
      const distance = gx * gx * .30 + ((gy + seam) * 1.03) ** 2;
      const clear = 1 - ease(clamp((distance + (strand - .5) * .18 - .07) / 1.16));
      const landAtFoot = Math.max(0, sy - .57) * 1.02;
      const rip = Math.exp(-Math.pow((drift + .055 + (bank - .5) * .15) / .16, 2));
      pixels.data[p + 3] = 255 * clamp(.77 + .17 * bank + .08 * bloom - landAtFoot - .28 * rip - .71 * clear);
    }
  }
  ctx.putImageData(pixels, 0, 0);
  // Dry narrow fibres catch the light on a few bank edges. Most of the wash is quiet.
  ctx.globalCompositeOperation = 'source-atop';
  ctx.lineCap = 'round';
  for (let k = 0; k < wash.width * wash.height / 170; k++) {
    const x = seed() * wash.width, y = seed() * wash.height;
    const u = x / wash.width, v = y / wash.height;
    const pool = noise(12 + u * 13, 31 + (v + .29 * u) * 24);
    if (pool < .46) continue;
    const length = (2 + seed() ** 2 * 19) * ratio;
    const tilt = -.12 - .31 * Math.sin(u * 4 + pool);
    ctx.strokeStyle = seed() > .32 ? 'rgba(255,244,214,.105)' : 'rgba(70,100,107,.08)';
    ctx.lineWidth = .35 + seed() * .55;
    ctx.beginPath(); ctx.moveTo(x,y);
    ctx.quadraticCurveTo(x + length * .46,y + tilt * length * .3, x + length,y + tilt * length);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  return wash;
}

// The mirror is a separate, fully opaque sheet until a gesture removes pigment.
// The webcam is shown by its own video element. It is never sampled by this canvas.
function paintCondensedGlass(width: number, height: number, pixelWidth: number, pixelHeight: number) {
  const glass = sheet(pixelWidth, pixelHeight);
  const ctx = glass.getContext('2d', { alpha: false })!;
  const seed = random(1643);
  // Only the broad colour fields are low frequency. Water beads are painted at screen density.
  const ratio = Math.min(.5, 750 / width, 560 / height);
  const ground = sheet(Math.max(1, Math.round(width * ratio)), Math.max(1, Math.round(height * ratio)));
  const groundCtx = ground.getContext('2d')!;
  const pixels = groundCtx.createImageData(ground.width, ground.height);
  for (let j = 0; j < ground.height; j++) {
    const v = j / ground.height;
    for (let i = 0; i < ground.width; i++) {
      const u = i / ground.width;
      const bank = noise(3 + u * 3.4, 42 + v * 3.8 + .7 * u);
      const cloud = noise(24 + u * 10, 18 + v * 12 + bank);
      const grain = (seed() - .5) * 2.9;
      const shade = ease(v) * 24 + (bank - .5) * 14 + (cloud - .5) * 4;
      const light = Math.exp(-((u - .76) ** 2 * 3 + (v - .23) ** 2 * 7));
      const index = (j * ground.width + i) * 4;
      pixels.data[index] = 222 - shade + 16 * light + grain;
      pixels.data[index + 1] = 232 - shade * .87 + 9 * light + grain;
      pixels.data[index + 2] = 230 - shade * .85 - 2 * light + grain;
      pixels.data[index + 3] = 255;
    }
  }
  groundCtx.putImageData(pixels, 0, 0);
  ctx.drawImage(ground, 0, 0, pixelWidth, pixelHeight);
  ctx.setTransform(pixelWidth / width, 0, 0, pixelHeight / height, 0, 0);
  ctx.lineCap = 'round';

  const count = Math.max(260, Math.min(1200, Math.round(width * height / 1600)));
  let lastX = width / 2, lastY = height / 2;
  for (let k = 0; k < count; k++) {
    const clustered = k > 0 && seed() < .2;
    const x = clustered ? lastX + (seed() - .5) * 17 : seed() * width;
    const y = clustered ? lastY + (seed() - .5) * 22 : seed() ** .72 * height;
    lastX = x; lastY = y;
    const r = seed() < .01 ? 3.6 + 2 * seed() : .75 + 2.85 * seed() ** 3;
    const h = r * (1 + .13 * seed());
    const intensity = .38 + .62 * clamp((r - .75) / 2.85);
    if (r > 1.9 && seed() < .09) {
      const run = 5 + seed() ** 2 * 23;
      const trail = ctx.createLinearGradient(0, y - run, 0, y);
      trail.addColorStop(0, 'rgba(255,255,255,0)');
      trail.addColorStop(1, 'rgba(252,254,249,.55)');
      ctx.strokeStyle = trail;
      ctx.lineWidth = .45 + seed() * .65;
      ctx.beginPath();
      ctx.moveTo(x + .7, y - run);
      ctx.quadraticCurveTo(x - 1, y - run * .42, x, y);
      ctx.stroke();
    }
    const halo = ctx.createRadialGradient(x, y + h * .23, r * .34, x, y + h * .23, r * 1.48);
    halo.addColorStop(0, `rgba(89,111,109,${.29 * intensity})`);
    halo.addColorStop(1, 'rgba(89,111,109,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(x - r * 1.5, y - h * 1.4, r * 3, h * 3.1);
    const body = ctx.createLinearGradient(0, y - h, 0, y + h);
    body.addColorStop(0, `rgba(82,105,104,${.53 * intensity})`);
    body.addColorStop(.48, `rgba(188,207,202,${.6 * intensity})`);
    body.addColorStop(1, `rgba(255,255,247,${.94 * intensity})`);
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.ellipse(x, y, r, h, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(255,255,249,${.9 * intensity})`;
    ctx.lineWidth = Math.max(.28, r * .14);
    ctx.beginPath(); ctx.ellipse(x, y, r * .77, h * .78, 0, .15, Math.PI * .76); ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${.94 * intensity})`;
    ctx.beginPath(); ctx.ellipse(x - r * .28, y - h * .5, r * .25, h * .14, -.45, 0, Math.PI * 2); ctx.fill();
  }
  return glass;
}

function paintBrush(glass = false) {
  const size = 128;
  const brush = sheet(size, size);
  const ctx = brush.getContext('2d')!;
  const pixels = ctx.createImageData(size, size);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = (i + .5) / size * 2 - 1, y = (j + .5) / size * 2 - 1;
      const dryEdge = (noise(22 + x * 4, 19 + y * 5) - .5) * .24 + (noise(8 + x * 13, 27 + y * 12) - .5) * .055;
      const distance = Math.hypot(x + .13 * y * y, y * 1.05) + dryEdge * (glass ? .34 : 1);
      const transition = glass ? (distance - .69) / .29 : (distance - .38) / .57;
      pixels.data[(j * size + i) * 4 + 3] = 255 * (1 - ease(clamp(transition)));
    }
  }
  ctx.putImageData(pixels, 0, 0);
  return brush;
}

let dabBrush: HTMLCanvasElement | undefined;
let glassBrush: HTMLCanvasElement | undefined;
let wispBrush: HTMLCanvasElement | undefined;

// Broken edges and thin patches across the middle keep the cleared air uneven.
function paintWisp() {
  const wisp = sheet(144, 86);
  const ctx = wisp.getContext('2d')!;
  const pixels = ctx.createImageData(wisp.width, wisp.height);
  for (let j = 0; j < wisp.height; j++) {
    for (let i = 0; i < wisp.width; i++) {
      const x = (i + .5) / wisp.width * 2 - 1;
      const y = (j + .5) / wisp.height * 2 - 1;
      const fibre = noise(14 + x * 3.1, 34 + y * 5);
      const bend = .16 * Math.sin(x * 3 + .5) + (fibre - .5) * .18;
      const distance = Math.hypot(x, (y - bend) * 1.17);
      const density = (1 - ease(clamp(distance))) * (.57 + .43 * fibre);
      pixels.data[(j * wisp.width + i) * 4 + 3] = 255 * density;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  return wisp;
}

// A thin streak of sunlit vapour. All strands taper into transparent paint.
function paintDrift() {
  const drift = sheet(248, 80), ctx = drift.getContext('2d')!;
  const pixels = ctx.createImageData(drift.width, drift.height);
  for (let j = 0; j < drift.height; j++) {
    for (let i = 0; i < drift.width; i++) {
      const u = i / drift.width, v = (j / drift.height - .5) * 2;
      const bend = .22 * Math.sin((u - .11) * 6.6) + .09 * Math.sin(u * 11);
      const cross = v - bend;
      const grain = noise(13 + u * 12, 44 + cross * 41);
      const width = .12 + .43 * Math.sin(u * Math.PI);
      const envelope = ease(clamp(1 - Math.abs(cross) / width)) * Math.sin(Math.PI * u) ** 1.45;
      const plume = noise(20 + u * 7, 23 + cross * 4 + u * 2);
      const p = (j * drift.width + i) * 4;
      pixels.data[p] = 234 + 15 * grain;
      pixels.data[p + 1] = 214 + 26 * grain;
      pixels.data[p + 2] = 174 + 36 * grain;
      pixels.data[p + 3] = 255 * envelope * (.18 + .60 * plume + .22 * grain);
    }
  }
  ctx.putImageData(pixels, 0, 0);
  return drift;
}

function paintSeed() {
  const seed = sheet(84, 84), ctx = seed.getContext('2d')!;
  const rand = random(9204);
  ctx.translate(42, 38);
  ctx.lineCap = 'round';
  // The pappus catches more light than its falling grain.
  for (let k = 0; k < 21; k++) {
    const a = -Math.PI * (.99 - k / 21) - rand() * .08;
    const len = 20 + rand() * 8;
    const x = Math.cos(a) * len, y = Math.sin(a) * len;
    ctx.strokeStyle = 'rgba(255,248,220,' + (.39 + rand() * .52) + ')';
    ctx.lineWidth = 1 + rand() * .65;
    ctx.beginPath(); ctx.moveTo(0,0);
    ctx.quadraticCurveTo(x * .43, y * .72, x,y); ctx.stroke();
  }
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = '#daca9e';
  ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(1,10,5,17); ctx.stroke();
  ctx.fillStyle = '#907957';
  ctx.beginPath(); ctx.ellipse(5.1,18.3,1.55,4.3,-.3,0,Math.PI * 2); ctx.fill();
  return seed;
}

const breezeSeeds = [
  { x: .70, y: .43, size: 25, phase: 1.1, opacity: .85 },
  { x: .85, y: .27, size: 15, phase: 2.8, opacity: .56 },
  { x: .30, y: .63, size: 18, phase: 5.3, opacity: .58 },
];

type Wake = { x: number; y: number; radius: number; angle: number; born: number; side: number; seed: boolean };
let driftSprite: HTMLCanvasElement | undefined;
let seedSprite: HTMLCanvasElement | undefined;
const uphillBanks = [
  { x: 36, y: -19, rx: 88, ry: 50, tilt: -.32, start: 0, opacity: .89 },
  { x: 88, y: -62, rx: 85, ry: 54, tilt: -.64, start: .16, opacity: .78 },
  { x: 135, y: -108, rx: 64, ry: 42, tilt: -.24, start: .32, opacity: .66 },
];

export function createMistPainter(canvas: HTMLCanvasElement, width: number, height: number, anchor: Point) {
  width = Math.max(1, width);
  height = Math.max(1, height);
  const dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(5_000_000 / (width * height)));
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));
  const ctx = canvas.getContext('2d')!;
  const wash = paintWash(width, height, anchor);
  const mask = sheet(canvas.width, canvas.height);
  const maskCtx = mask.getContext('2d')!;
  const sx = canvas.width / width, sy = canvas.height / height;
  ctx.setTransform(sx, 0, 0, sy, 0, 0);
  maskCtx.setTransform(sx, 0, 0, sy, 0, 0);
  const brush = dabBrush ??= paintBrush();
  const vapour = driftSprite ??= paintDrift();
  const seed = seedSprite ??= paintSeed();
  let discovery = 0;
  let mirror = false;
  let glass: HTMLCanvasElement | undefined;
  let lastGlassProgress = -1;
  let hand: (Point & { radius: number }) | null = null;
  let hasDabs = false;
  let lastWakeAt = -Infinity, serial = 0;
  const wakes: Wake[] = [];
  function setMirror(active: boolean) {
    if (active === mirror) return;
    mirror = active;
    hasDabs = false;
    maskCtx.clearRect(0, 0, width, height);
    wakes.length = 0;
    lastGlassProgress = -1;
    if (active) glass ??= paintCondensedGlass(width, height, canvas.width, canvas.height);
    render(0);
  }
  function setHand(location: (Point & { radius: number }) | null) {
    hand = location;
  }
  function touch(x: number, y: number, radius: number, dx: number, dy: number) {
    if (mirror) return;
    const now = performance.now(), distance = Math.hypot(dx, dy);
    if (distance < 1.5 || distance > 110 || now - lastWakeAt < 48) return;
    lastWakeAt = now;
    const side = serial % 2 === 0 ? -1 : 1;
    const angle = Math.atan2(dy, dx);
    const rim = radius * (.8 + .17 * Math.sin(serial * 1.8));
    wakes.push({ x: x - Math.sin(angle) * rim * side, y: y + Math.cos(angle) * rim * side,
      angle, radius, side, born: now, seed: serial % 4 === 1 });
    serial++;
    if (wakes.length > 24) wakes.shift();
  }
  function place(sprite: HTMLCanvasElement, x: number, y: number, w: number, h: number, angle: number, alpha: number) {
    ctx.save();
    ctx.globalAlpha = clamp(alpha);
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  function beckon(progress: number) {
    discovery = clamp(progress);
  }

  function dab(x: number, y: number, radius: number, strength: number) {
    if (radius <= 0 || strength <= 0) return;
    hasDabs = true;
    const alpha = clamp(mirror ? strength / .7 : strength);
    const tip = mirror ? (glassBrush ??= paintBrush(true)) : brush;
    if (mirror) {
      // Commit to the displayed glass in the sample callback. Camera inference
      // can still deliver frames when the garden animation loop is throttled.
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(tip, x - radius, y - radius, radius * 2, radius * 2);
      ctx.restore();
    }
    // Keep the trail for the animated meadow and for an explicit glass fade.
    maskCtx.globalAlpha = alpha;
    maskCtx.drawImage(tip, x - radius, y - radius, radius * 2, radius * 2);
  }

  function render(release: number, now = performance.now()) {
    const progress = clamp(release);
    if (mirror && glass) {
      if (progress === lastGlassProgress) return;
      lastGlassProgress = progress;
      ctx.save();
      // Identity transform keeps even the fractional-DPR border pixels entirely sealed.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      if (progress > 0) ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (progress < 1) {
        ctx.globalAlpha = 1 - ease(progress);
        ctx.drawImage(glass, 0, 0);
        if (hasDabs) {
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'destination-out';
          ctx.drawImage(mask, 0, 0);
        }
      }
      ctx.restore();
      return;
    }
    ctx.clearRect(0, 0, width, height);
    if (progress === 1) return;
    const fade = 1 - ease(clamp((progress - .34) / .66));
    const time = now * .001;
    ctx.globalAlpha = fade;
    ctx.drawImage(wash, 0, 0, width, height);
    // Two depths of air. The mask is applied AFTER these move, so a wiped
    // point stays clean even while intact banks slide past it.
    place(vapour, width * .75 + Math.sin(time * .072) * 18, height * .27 + Math.sin(time * .105) * 6,
      width * .83, height * .32, -.235, fade * .39);
    place(vapour, width * .25 + Math.sin(time * .093 + 1.2) * 22, height * .73 + Math.cos(time * .14) * 9,
      width * .7, height * .36, -.53, fade * .27);
    for (const petal of breezeSeeds) {
      const swing = time * .24 + petal.phase;
      const x = width * petal.x + Math.sin(swing * .57) * 19;
      const y = height * petal.y + Math.cos(swing) * 7;
      place(seed, x, y, petal.size, petal.size, -.6 + Math.sin(swing * 1.1) * .33,
        petal.opacity * fade);
    }
    // The gesture displaces air at its two shoulders. Leading strands billow
    // sideways and briefly carry a loosened seed, then subside.
    while (wakes.length && now - wakes[0].born > 1050) wakes.shift();
    for (const wake of wakes) {
      const age = clamp((now - wake.born) / 1050);
      const envelope = Math.min(1, age * 13 + .25) * (1 - ease(age));
      const normal = wake.angle + wake.side * Math.PI / 2;
      const spread = wake.radius * (.12 + age * .53);
      const x = wake.x + Math.cos(normal) * spread + Math.cos(wake.angle) * age * 17;
      const y = wake.y + Math.sin(normal) * spread - age * 12;
      place(vapour, x, y, wake.radius * (1.45 + age * .9), wake.radius * (.48 + age * .35),
        wake.angle - wake.side * age * .4, envelope * fade * .68);
      if (wake.seed) {
        const size = 15 + 4 * age;
        place(seed, x + Math.cos(normal) * age * 19, y - 3 - age * 19, size, size,
          normal * .35 + wake.side * age * .85, envelope * fade);
      }
    }
    // Composite every pigment pass before erasing. Even a newly displaced cloud
    // crossing a previously wiped gap cannot put white back over the video.
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'destination-out';
    if (hasDabs) ctx.drawImage(mask, 0, 0, width, height);
    if (discovery > 0) {
      const wisp = wispBrush ??= paintWisp();
      for (const bank of uphillBanks) {
        const phase = ease(clamp((discovery - bank.start) / (1 - bank.start)));
        if (!phase) continue;
        ctx.save();
        ctx.translate(anchor.x + bank.x - 8 * (1 - phase), anchor.y + bank.y);
        ctx.rotate(bank.tilt);
        ctx.globalAlpha = bank.opacity * phase;
        ctx.drawImage(wisp, -bank.rx, -bank.ry, bank.rx * 2, bank.ry * 2);
        ctx.restore();
      }
    }
    if (progress > 0) {
      // A broad front travels uphill, beginning at the clearing. Erode soft banks in
      // the direction of the path while the surrounding air gradually becomes clear.
      const reach = Math.hypot(width, height) * progress;
      ctx.save();
      ctx.translate(anchor.x + reach * .13, anchor.y - reach * .31);
      ctx.rotate(-.52);
      ctx.scale(1, .68);
      ctx.globalAlpha = Math.min(1, progress * 8);
      ctx.drawImage(brush, -reach * 1.6, -reach * 1.6, reach * 3.2, reach * 3.2);
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';

    if (hand && progress < .36) {
      // A small tuft caught on the fingertip shows where the tracked hand is.
      // It is temporary, independent of the stored transparency mask.
      const size = 23 + Math.min(8, hand.radius * .063);
      const x = hand.x, y = hand.y;
      ctx.globalAlpha = fade * .78;
      ctx.fillStyle = '#584b3a'; ctx.beginPath(); ctx.arc(x, y + 1, 2.1, 0, 2 * Math.PI); ctx.fill();
      ctx.fillStyle = '#fff4ca'; ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 2 * Math.PI); ctx.fill();
      place(seed, x + size * .34, y - size * .22, size, size, .57 + Math.sin(time) * .09, fade);
      ctx.globalAlpha = 1;
    }
  }

  render(0);
  return { dab, beckon, render, setHand, setMirror, touch };
}
