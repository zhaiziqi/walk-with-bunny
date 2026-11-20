import { restGift, restGiftArtwork } from './restGift';
import { useRestGiftArt } from './restGiftArt';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { StaticGardenProps } from './StaticGarden';
import { BILLBOARD_TILT, depthProject, landmarkReveal, terrainHeight } from './depthWorld';
import { createFloofBrushCanvas } from './floofBrushCanvas';
import { createFloofArt } from './floofSceneryArt';
import { floofPlants } from './floofSceneryData';
import { useFloofPaintedLeaves } from './floofPaintedLeaves';
import { sceneAssetUrl } from '../diagnostics/assetQA';
import { loadLocalImage } from './loadLocalImage';
import { createFloofCanvas } from './floofCompanionArt';
import { bunnyWalkPreview, mistGardenPreview } from './paintedBunnyArt';
import { mistGreetingEndMs, mistGreetingLean, mistGreetingPeakMs, type MistGreetingRef } from './mistGreeting';
import { regionAtmosphere } from './gardenAtlas';
import { objects } from './world';
import { createTrailState, guidePosition, guideVisible, trailPassageBloom, trailSites, trailFlowerOffsets } from './trailState';
import { sampleTrailField, trailPalette, trailTextureReduction } from './trailField';
import { orchardPondField, orchardPondTint } from './orchardPondAtmosphere';
import { hollowArchField, hollowArchTint } from './hollowArchAtmosphere';
import { hillMoonField, hillMoonTint } from './hillMoonAtmosphere';
import { archComposition, archGroundOffset, archMotes, archReveal, chimeArtwork, hollowMushrooms, hollowReveal, createMushroomFallbackCanvas, createArchFallbackCanvas, createChimeCanvas } from './hollowArch';
import { chimeListeningPose, createChimeListening, inspectChimeListening } from './chimeListening';
import { pondFootprint, pondReveal, pondGlimpse, orchardReveal, orchardBlossoms, orchardFallenPetals, pondDriftPetals, createOrchardPetalCanvas, createPondFallbackCanvas } from './orchardPond';
import { drawGroundDecal } from './drawGroundDecal';
import { giftGate } from './giftGate';
import { puzzleDesk, usePuzzleDeskArt } from './puzzleDesk';
import { createPaperBirdCanvas, hillBirds } from './hillMoon';
import { createMoonClearing, inspectMoonClearing, moonObjectTint } from './moonClearing';
import { paperGuideBirdPose, paperGuideVisibility, inspectPaperGuide } from './paperGuide';
import { floofAttentionPose, floofAttentionVertex } from './floofAttention';
import { orangeRest, orangeRestPose, orangeRestVertex, inspectOrangeRest } from './orangeRest';
import { useOrangeRestArt, createOrangeCupCanvas, paintOrangeCup, orangeCupArt, orangeRestReveal } from './orangeRestArt';
import { inspectPondListening, pondPetalPose, pondRipplePose } from './pondListening';
import { paintPondDreamSnapshot } from './pondDreamArt';
import { createMushroomListening, inspectMushroomListening, listeningMushroomPose, mushroomLightPose, mushroomVertex } from './mushroomListening';

const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const smooth = (a: number, b: number, v: number) => { const p = clamp((v - a) / (b - a)); return p * p * (3 - 2 * p); };
const mound = (x: number, y: number, cx: number, cy: number, rx: number, ry: number) => Math.exp(-(((x - cx) / rx) ** 2) - ((y - cy) / ry) ** 2);
const mix = (a: number[], b: number[], t: number) => a.map((value, i) => value + (b[i] - value) * t);
const css = (rgb: number[]) => `rgb(${rgb.map(v => Math.round(clamp(v) * 255)).join(',')})`;
const random = (n: number) => { const p = Math.sin(n * 127.1 + 19.73) * 43758.5453; return p - Math.floor(p); };

function groundColor(x: number, y: number, trail = sampleTrailField(x, y)) {
  const twilight = regionAtmosphere(x, y).dusk;
  const sage = mix([.657, .727, .610], [.520, .625, .630], twilight * .85);
  const blue = mix([.600, .660, .764], [.471, .543, .664], twilight * .78);
  const underpaint = mix([.433, .582, .526], [.427, .541, .566], twilight * .75);
  const diagonal = x * .70 + y * .55 + 150 + Math.sin(y * .0014) * 105;
  const edge = Math.sin(x * .021 + y * .017) * 42 + Math.cos(y * .039 - x * .016) * 17;
  const slopeBand = (1 - smooth(180 + edge, 360 + edge, Math.abs(diagonal))) * (1 - smooth(950, 2450, Math.abs(y + 750)));
  const bankPaint = Math.max(slopeBand, mound(x, y, 930, -780, 490, 610) * .46);
  let color = mix(sage, blue, bankPaint * .84);
  const shade = mound(x, y, -340, -910, 650, 180) * .43 + mound(x, y, 1080, -570, 490, 380) * .70;
  color = mix(color, underpaint, shade * 1.1);
  const westBank = mound(x, y, -240, -680, 510, 285);
  color = color.map((value, i) => value + [.017, .024, .017][i] * westBank);
  const lowerShoulder = y + 2040 + .32 * x + 105 * Math.sin(x * .0017);
  const shoulder = (1 - smooth(35 + edge * .3, 150, Math.abs(lowerShoulder))) * (1 - smooth(-350, 360, x));
  color = mix(color, underpaint, shoulder * .32);
  color = color.map((value, i) => value + [.042, .043, .012][i] * mound(x, y, -400, -1830, 950, 120));
  const laterBank = smooth(-.2, .8, Math.sin(x * .0009) * Math.cos(y * .0009));
  color = mix(color, blue, laterBank * smooth(600, 2300, y) * .3);
  const light = mound(x, y, 80, -2050, 650, 570) * .38 + mound(x, y, 320, -1590, 380, 940) * .58 + mound(x, y, -650, 750, 340, 290) * .38;
  color = color.map((value, i) => value + [.065, .053, .025][i] * light);
  const trailColor = hillMoonTint(hollowArchTint(orchardPondTint(color, orchardPondField(x, y)), hollowArchField(x,y)), hillMoonField(x,y)).map((value, i) => value
    + trailPalette.route[i] * trail.wash * (trailPalette.paperBase + trailPalette.paperVariation * .5) + trailPalette.clearing[i] * trail.quiet);
  return trailColor;
}

function tinted(source: HTMLCanvasElement | HTMLImageElement, color: string, canvas = document.createElement('canvas')) {
  canvas.width = 'naturalWidth' in source ? source.naturalWidth : source.width;
  canvas.height = 'naturalHeight' in source ? source.naturalHeight : source.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(source, 0, 0); ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = color; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(source, 0, 0);
  return canvas;
}

let paintedGroundCache: HTMLCanvasElement | null = null;
let paintedGroundRequest: Promise<HTMLCanvasElement | null> | undefined;
function usePaintedGround() {
  const [canvas, setCanvas] = useState(paintedGroundCache);
  useEffect(() => {
    let active = true;
    paintedGroundRequest ??= loadLocalImage(sceneAssetUrl('/art/floof/painted-ground-material-v1.png')).promise.then(image => {
      if (!image) return null;
      try {
        const width = Math.min(1024, image.naturalWidth), height = Math.round(width * image.naturalHeight / image.naturalWidth);
        const tile = document.createElement('canvas'); tile.width = width * 2; tile.height = height * 2;
        const ctx = tile.getContext('2d');
        if (!ctx) return null;
        // Four mirrored copies give the repeated tile identical paint at every edge.
        for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
          ctx.save(); ctx.translate(sx < 0 ? width * 2 : 0, sy < 0 ? height * 2 : 0); ctx.scale(sx, sy);
          ctx.drawImage(image, 0, 0, width, height); ctx.restore();
        }
        paintedGroundCache = tile; return tile;
      } catch { return null; }
    });
    void paintedGroundRequest.then(value => { if (active) setCanvas(value); });
    return () => { active = false; };
  }, []);
  return canvas;
}

/** No animation loop: input can move through the same projection while the world stays still. */
export function FloofStatic({ pose, width, height, actor, lampOn, images, reading = false, trailEvents = [], moonClearing, paperGuide, pondListening, mushroomListening, floofAttention, mistGreeting, chimeListening, orangeRestRef, orangeRestVersion }: StaticGardenProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const groundLayer = useMemo(() => document.createElement('canvas'), []);
  const pigmentLayer = useMemo(() => document.createElement('canvas'), []);
  const pigmentMask = useMemo(() => document.createElement('canvas'), []);
  const art = useMemo(createFloofArt, []);
  const showEarTips = bunnyWalkPreview() || mistGardenPreview();
  const greeting = mistGreeting?.current;
  const [heldGreeting, setHeldGreeting] = useState<MistGreetingRef['current']>(null);
  useEffect(() => {
    if (!greeting || reading) return;
    const peak = greeting.startedAt + mistGreetingPeakMs;
    const end = greeting.startedAt + mistGreetingEndMs;
    const now = performance.now();
    if (!Number.isFinite(end) || now >= end) return;
    // A pair of still poses keeps the reduced-motion renderer event-driven.
    const show = window.setTimeout(() => {
      if (performance.now() < end) setHeldGreeting(greeting);
    }, Math.max(0, peak - now));
    const settle = window.setTimeout(() => setHeldGreeting(null), end - now);
    return () => { window.clearTimeout(show); window.clearTimeout(settle); };
  }, [greeting, reading]);
  const companionSheet = useMemo(() => createFloofCanvas(showEarTips), [showEarTips]);
  const pondFallback = useMemo(createPondFallbackCanvas, []), petalArt = useMemo(createOrchardPetalCanvas, []);
  const mushroomFallback = useMemo(createMushroomFallbackCanvas, []), archFallback = useMemo(createArchFallbackCanvas, []);
  const chimeArt = useMemo(() => ({bell:createChimeCanvas('bell'),paper:createChimeCanvas('paper')}), []);
  const birdArt = useMemo(() => ({ body: createPaperBirdCanvas('body'), left: createPaperBirdCanvas('leftWing'), right: createPaperBirdCanvas('rightWing') }), []);
  const moonArtLayers = useMemo(() => new Map<string, HTMLCanvasElement>(), []);
  const petalSheets = useMemo(() => new Map([...orchardFallenPetals, ...pondDriftPetals].map(petal => [petal.color, tinted(petalArt, petal.color)])), [petalArt]);
  const brush = useMemo(createFloofBrushCanvas, []);
  const paintedLeaves = useFloofPaintedLeaves(), paintedGround = usePaintedGround();
  const deskArt = usePuzzleDeskArt();
  const parcelArt = useRestGiftArt();
  const restArt = useOrangeRestArt(), cupArt = useMemo(() => createOrangeCupCanvas(), []);
  const leaves = useMemo(() => new Map(floofPlants.map(plant => [plant.tint, tinted(art.leaf, plant.tint)])), [art]);
  const doorContact = useMemo(() => images.contact ? tinted(images.contact, '#607177') : null, [images.contact]);
  useEffect(() => {
    const node = canvas.current; if (!node) return;
    // A newly opened or hidden tab can briefly have no drawable viewport.
    // Wait for its next size update rather than using an empty source canvas.
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const pixelWidth = Math.round(width * dpr), pixelHeight = Math.round(height * dpr);
    if (pixelWidth < 1 || pixelHeight < 1) return;
    if (pondListening?.current) node.dataset.pondListening = JSON.stringify(inspectPondListening(pondListening.current));
    const rememberedMushrooms = mushroomListening?.current ?? createMushroomListening(actor);
    node.dataset.mushroomState = JSON.stringify(inspectMushroomListening(rememberedMushrooms));
    const attention = floofAttentionPose(floofAttention?.current ?? null);
    if (!reading && greeting && heldGreeting === greeting && performance.now() < greeting.startedAt + mistGreetingEndMs) {
      attention.leanX += mistGreetingLean(greeting, greeting.startedAt + mistGreetingPeakMs);
    }
    node.dataset.companionArt = showEarTips ? 'ear-tip-light' : 'light-being';
    const sip = orangeRestPose(orangeRestRef?.current);
    if (orangeRestRef?.current) node.dataset.orangeRest = JSON.stringify(inspectOrangeRest(orangeRestRef.current));
    node.dataset.floofAttention = JSON.stringify(attention);
    if (paperGuide?.current) node.dataset.paperGuide = JSON.stringify(inspectPaperGuide(paperGuide.current));
    const rememberedChime = chimeListening?.current ?? createChimeListening(actor);
    node.dataset.chimeListening = JSON.stringify(inspectChimeListening(rememberedChime));
    const rememberedMoon = moonClearing?.current ?? createMoonClearing(actor, trailEvents.includes('moon-ring'));
    node.dataset.moonClearing = JSON.stringify(inspectMoonClearing(rememberedMoon));
    // Copy only the rendered layer; the original character and scenery art stay untouched.
    const moonlit = (source: HTMLCanvasElement | HTMLImageElement, x: number, y: number, kind: 'door' | 'bird' | 'floof', slot: string) => {
      const tint = moonObjectTint(x, y, rememberedMoon.phase, kind);
      if (tint.every(value => value === 1)) return source;
      let layer = moonArtLayers.get(slot);
      if (!layer) { layer = document.createElement('canvas'); moonArtLayers.set(slot, layer); }
      return tinted(source, css(tint), layer);
    };
    const context = node.getContext('2d'); if (!context) return;
    node.width = pixelWidth; node.height = pixelHeight;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    const project = (x: number, y: number, z?: number) => depthProject(x, y, pose, width, height, z);
    context.fillStyle = css(groundColor(actor.x, actor.y)); context.fillRect(0, 0, width, height);

    // Keep the inexpensive perspective mesh, then soften only its pigment layer.
    // Brushwork and grounded objects are added afterwards at full clarity.
    const padding = 48, paintScale = .5;
    groundLayer.width = Math.ceil((width + padding * 2) * paintScale);
    groundLayer.height = Math.ceil((height + padding * 2) * paintScale);
    const ground = groundLayer.getContext('2d')!;
    ground.setTransform(paintScale, 0, 0, paintScale, padding * paintScale, padding * paintScale);
    pigmentMask.width = groundLayer.width; pigmentMask.height = groundLayer.height;
    const mask = pigmentMask.getContext('2d')!;
    mask.setTransform(paintScale, 0, 0, paintScale, padding * paintScale, padding * paintScale);
    ground.fillStyle = css(groundColor(actor.x, actor.y));
    ground.fillRect(-padding, -padding, width + padding * 2, height + padding * 2);
    const step = 105, x0 = Math.floor((pose.x - 3300) / step) * step, y0 = Math.floor((pose.y - 1900) / step) * step;
    const columns = 64, rows = 72;
    const vertices = Array.from({ length: rows + 1 }, (_, row) => Array.from({ length: columns + 1 }, (_, column) => project(x0 + column * step, y0 + row * step)));
    for (let row = rows - 1; row >= 0; row--) for (let column = 0; column < columns; column++) {
      const a = vertices[row][column], b = vertices[row][column + 1], c = vertices[row + 1][column + 1], d = vertices[row + 1][column];
      if (Math.max(a.x, b.x, c.x, d.x) < -padding || Math.min(a.x, b.x, c.x, d.x) > width + padding || Math.max(a.y, b.y, c.y, d.y) < -padding || Math.min(a.y, b.y, c.y, d.y) > height + padding) continue;
      const x = x0 + (column + .5) * step, y = y0 + (row + .5) * step, trail = sampleTrailField(x, y);
      ground.fillStyle = css(groundColor(x, y, trail));
      ground.beginPath(); ground.moveTo(a.x, a.y); ground.lineTo(b.x, b.y); ground.lineTo(c.x, c.y); ground.lineTo(d.x, d.y); ground.closePath(); ground.fill();
      ground.strokeStyle = ground.fillStyle; ground.lineWidth = 1.2; ground.stroke();
      const calm = Math.max(trailTextureReduction(trail), orchardPondField(x,y).calm, hollowArchField(x,y).calm, hillMoonField(x,y).calm);
      if (calm > .001) {
        mask.fillStyle = `rgba(0,0,0,${calm})`;
        mask.beginPath(); mask.moveTo(a.x, a.y); mask.lineTo(b.x, b.y); mask.lineTo(c.x, c.y); mask.lineTo(d.x, d.y); mask.closePath(); mask.fill();
      }
    }
    context.save(); context.filter = `blur(${18 * dpr}px)`;
    context.drawImage(groundLayer, -padding, -padding, width + padding * 2, height + padding * 2);
    context.restore();
    const at = project(actor.x, actor.y), origin = project(0, 0, 0);
    const pattern = context.createPattern(paintedGround ?? brush, 'repeat');
    if (pattern) {
      const scaleX = paintedGround ? 4920 / paintedGround.width : 1.5;
      const scaleY = paintedGround ? 3280 / paintedGround.height * .789 : 1.1;
      pattern.setTransform(new DOMMatrix().translate(origin.x, origin.y).scale(at.scale * scaleX, at.scale * scaleY));
      pigmentLayer.width = node.width; pigmentLayer.height = node.height;
      const pigment = pigmentLayer.getContext('2d')!;
      pigment.setTransform(dpr, 0, 0, dpr, 0, 0);
      pigment.fillStyle = pattern; pigment.fillRect(0, 0, width, height);
      // The same world-space field softens pigment along the route and beneath
      // the first flower. Blurring only this mask prevents visible mesh seams.
      pigment.save(); pigment.globalCompositeOperation = 'destination-out'; pigment.filter = `blur(${18 * dpr}px)`;
      pigment.drawImage(pigmentMask, -padding, -padding, width + padding * 2, height + padding * 2); pigment.restore();
      context.save(); context.globalCompositeOperation = 'soft-light'; context.globalAlpha = paintedGround ? .22 : .40;
      context.drawImage(pigmentLayer, 0, 0, width, height); context.restore();
    }

    // Water belongs to the XY ground, below the bank silhouettes and the companion.
    const waterAlpha = pondReveal(actor);
    if (waterAlpha > .005) {
      context.save(); context.globalAlpha = waterAlpha;
      drawGroundDecal(context, images.pondPaint ?? pondFallback, { ...pondFootprint, z: (x,y) => terrainHeight(x,y)+3.4 }, project, width, height);
      context.restore();
    }
    const glintAlpha = pondGlimpse(actor) * (1-waterAlpha) * .16 + waterAlpha * .045;
    if (images.glow && glintAlpha > .005) {
      context.save(); context.globalAlpha = glintAlpha;
      drawGroundDecal(context,images.glow,{ x:pondFootprint.x-60,y:pondFootprint.y+30,width:400,height:74,
        z:()=>terrainHeight(pondFootprint.x,pondFootprint.y)+4 },project,width,height,4,2);
      context.restore();
    }
    const blossomAlpha = 2100 > actor.y - 1100 ? orchardReveal(actor) : 0;
    const rememberedWater = pondListening?.current;
    if (rememberedWater && waterAlpha > .005) {
      context.save();
      // Clip in world coordinates before projecting: the bank is not a screen ellipse.
      context.beginPath();
      const waterZ = terrainHeight(pondFootprint.x, pondFootprint.y) + 5;
      for (let i = 0; i <= 64; i++) {
        const angle = i / 64 * Math.PI * 2;
        const p = project(pondFootprint.x + Math.cos(angle) * 380 * .95, pondFootprint.y + Math.sin(angle) * 250 * .95, waterZ);
        if (i === 0) context.moveTo(p.x, p.y); else context.lineTo(p.x, p.y);
      }
      context.closePath(); context.clip();
      context.globalAlpha = waterAlpha;
      drawGroundDecal(context, paintPondDreamSnapshot(rememberedWater.dream), {
        ...pondFootprint, z: () => terrainHeight(pondFootprint.x, pondFootprint.y) + 6.5,
      }, project, width, height, 18, 18);
      // Frozen wave fronts show the same encounter without advancing its clock.
      rememberedWater.ripples.forEach(ripple => {
        const wave = pondRipplePose(ripple); if (wave.opacity < .002) return;
        context.globalAlpha = wave.opacity * 1.12 * waterAlpha;
        context.strokeStyle = '#f0edd3'; context.lineWidth = 1.2; context.beginPath();
        for (let i = 0; i <= 64; i++) {
          const angle = i / 64 * Math.PI * 2;
          const p = project(ripple.x + Math.cos(angle) * wave.radiusX, ripple.y + Math.sin(angle) * wave.radiusY, waterZ);
          if (i === 0) context.moveTo(p.x, p.y); else context.lineTo(p.x, p.y);
        }
        context.stroke();
      });
      context.restore();
    }
    const restingPetals = (petals: typeof orchardFallenPetals, alpha: number) => {
      if (alpha < .005) return;
      context.save(); context.globalAlpha = alpha;
      petals.forEach(petal => drawGroundDecal(context,petalSheets.get(petal.color)!,{
        x:petal.x,y:petal.y,width:petal.w,height:petal.h,rotation:petal.rotation,z:(x,y)=>terrainHeight(x,y)+4,
      },project,width,height,1,1));
      context.restore();
    };
    restingPetals(orchardFallenPetals, blossomAlpha * .67);
    // A static snapshot keeps the petals where the last real passage left them.
    // It never advances the water model or emits a new encounter event.
    restingPetals(pondDriftPetals.map((petal, index) => ({
      ...petal, ...pondPetalPose(pondListening?.current ?? null, index, 0),
    })), waterAlpha * (trailEvents.includes('pond-lilies') ? .72 : .59));

    type DrawItem = { depth: number; draw: () => void };
    const items: DrawItem[] = [];
    const sprite = (image: HTMLCanvasElement | HTMLImageElement, x: number, y: number, w: number, h: number, foot = .96, alpha = 1, flip = false, lift = 0) => {
      const point = project(x, y, terrainHeight(x, y) + 3 + lift), dw = w * point.scale, dh = h * point.scale;
      if (point.depth < 100 || point.x + dw / 2 < 0 || point.x - dw / 2 > width || point.y + dh * (1 - foot) < 0 || point.y - dh * foot > height) return;
      items.push({ depth: point.depth, draw: () => { context.save(); context.globalAlpha = alpha; context.translate(point.x, point.y); context.scale(flip ? -1 : 1, 1); context.drawImage(image, -dw / 2, -dh * foot, dw, dh); context.restore(); } });
    };
    const shadow = (x: number, y: number, size: number, opacity = .20) => {
      const p = project(x, y, terrainHeight(x, y) + 2), radius = size * p.scale;
      context.save(); context.translate(p.x, p.y); context.scale(1, .52);
      const gradient = context.createRadialGradient(0, 0, 1, 0, 0, radius);
      gradient.addColorStop(0, `rgba(61,85,92,${opacity})`); gradient.addColorStop(1, 'rgba(61,85,92,0)');
      context.fillStyle = gradient; context.fillRect(-radius, -radius, radius * 2, radius * 2); context.restore();
    };
    floofPlants.forEach(plant => {
      if (Math.hypot(plant.x - actor.x, plant.y - actor.y) > 3300 || plant.y < actor.y - 1650) return;
      shadow(plant.x, plant.y, plant.w * .35, plant.small ? .08 : .17);
      const leaf = !plant.small && paintedLeaves ? paintedLeaves[plant.paint ?? 'sage'] : leaves.get(plant.tint)!;
      sprite(leaf, plant.x, plant.y, plant.w, plant.h, .96, 1, plant.flip);
    });
    const restAlpha = orangeRestReveal(actor), parcelSize=restGiftArtwork();
    if (restAlpha > .005) {
      const baseZ = terrainHeight(orangeRest.x,orangeRest.y)+3;
      const restFoot = project(orangeRest.x,orangeRest.y,baseZ);
      paintOrangeCup(cupArt, sip.liquid);
      const restProject=(x:number,y:number,z=0)=>project(orangeRest.x+x,
        orangeRest.y+y*Math.cos(BILLBOARD_TILT)-z*Math.sin(BILLBOARD_TILT),
        baseZ+y*Math.sin(BILLBOARD_TILT)+z*Math.cos(BILLBOARD_TILT));
      items.push({depth:restFoot.depth,draw:()=>{
        context.save();context.globalAlpha=restAlpha;
        drawGroundDecal(context,restArt,{x:0,y:0,width:orangeRest.width,height:orangeRest.height,z:()=>0},
          (x,y)=>restProject(x,y+orangeRest.height*(orangeRest.foot-.5)),width,height,8,8);
        drawGroundDecal(context,cupArt,{x:0,y:0,width:orangeCupArt.width,height:orangeCupArt.height,z:()=>0},
          (x,y)=>restProject(x+orangeRest.cup.x,y+orangeRest.cup.y+orangeCupArt.height*(orangeCupArt.foot-.5),.5),width,height,4,8);
        drawGroundDecal(context,parcelArt,{x:0,y:0,width:parcelSize.width,height:parcelSize.height,z:()=>0},
          (x,y)=>restProject(x+restGift.x,y+restGift.y+parcelSize.height*(parcelSize.foot-.5),1),width,height,4,8);
        context.restore();
      }});
    }
    if (blossomAlpha > .005) orchardBlossoms.forEach(plant => {
      shadow(plant.x,plant.y,plant.w*.3,.15*blossomAlpha);
      sprite(art.flower,plant.x,plant.y,plant.w,plant.h,.96,blossomAlpha);
    });
    const hollowAlpha = hollowReveal(actor), archAlpha = archReveal(actor);
    if(hollowAlpha > .005) hollowMushrooms.forEach((mushroom, index) => {
      shadow(mushroom.x,mushroom.y,mushroom.w*.35,.19*hollowAlpha);
      const response = listeningMushroomPose(rememberedMushrooms, index);
      const peekingLight = mushroomLightPose(rememberedMushrooms, index);
      const footZ = terrainHeight(mushroom.x,mushroom.y)+3;
      const foot = project(mushroom.x,mushroom.y,footZ);
      if (foot.depth < 100) return;
      const projectBillboard = (x: number, y: number) => project(mushroom.x+x,
        mushroom.y+y*Math.cos(BILLBOARD_TILT),footZ+y*Math.sin(BILLBOARD_TILT));
      if (images.glow && response.glow > .005) {
        context.save(); context.globalAlpha = response.glow*hollowAlpha;
        drawGroundDecal(context,images.glow,{x:mushroom.x,y:mushroom.y,width:mushroom.w*1.25,height:mushroom.w*.7,
          z:()=>footZ+.6},project,width,height,4,2);
        context.restore();
      }
      items.push({depth:foot.depth,draw:()=>{
        context.save();
        // The remembered opening is rendered without advancing a single clock.
        // The painting is drawn afterwards, so its cap/stalk still occlude the glow.
        const lightY = mushroom.h*.40, open=clamp(response.capLift/.15);
        const light = projectBillboard(0,lightY);
        const rx = mushroom.w*.275*light.scale, ry = mushroom.h*.10*light.scale;
        context.save(); context.translate(light.x,light.y); context.scale(rx,ry);
        const warmth = context.createRadialGradient(0,0,0,0,0,1);
        warmth.addColorStop(0,'rgba(255,233,176,.95)'); warmth.addColorStop(.45,'rgba(255,233,176,.62)'); warmth.addColorStop(1,'rgba(255,233,176,0)');
        context.globalAlpha=response.warmth*(.18+open*.7)*hollowAlpha;
        context.fillStyle=warmth; context.fillRect(-1,-1,2,2); context.restore();
        // Preserve the exact remembered location, including an unfinished peek.
        // One small opaque centre stays readable inside its soft halo. The cap
        // occludes it until it has actually crossed the lip, as in the live view.
        const drawPeekingLight = () => {
          if (peekingLight.opacity < .002) return;
          const point = projectBillboard(peekingLight.x*mushroom.w,peekingLight.y*mushroom.h);
          const radius = peekingLight.radius*point.scale;
          context.save(); context.translate(point.x,point.y);
          const drawLantern = (outerRadius: number, color: string, opacity: number) => {
            const gradient = context.createRadialGradient(0,0,0,0,0,outerRadius);
            gradient.addColorStop(0,`rgba(${color},1)`);
            gradient.addColorStop(.38,`rgba(${color},.84)`);
            gradient.addColorStop(.70,`rgba(${color},.22)`);
            gradient.addColorStop(1,`rgba(${color},0)`);
            context.globalAlpha=peekingLight.opacity*hollowAlpha*opacity;
            context.fillStyle=gradient;
            context.fillRect(-outerRadius,-outerRadius,outerRadius*2,outerRadius*2);
          };
          drawLantern(radius*3.2,'255,221,157',.38);
          drawLantern(radius*1.35,'255,247,215',1);
          context.restore();
        };
        if (peekingLight.travel <= .32) drawPeekingLight();
        context.globalAlpha=hollowAlpha;
        drawGroundDecal(context,images.mushroomPaint ?? mushroomFallback,{x:0,y:0,width:mushroom.w,height:mushroom.h,z:()=>0},(x,y)=>{
          const vertex=mushroomVertex(x/mushroom.w*(mushroom.flip ? -1 : 1),y/mushroom.h+mushroom.foot-.5,response);
          return projectBillboard(vertex.x*mushroom.w,vertex.y*mushroom.h);
        },width,height,12,24);
        if (peekingLight.travel > .32) drawPeekingLight();
        context.restore();
      }});
    });
    if(archAlpha > .005) {
      const arch = archComposition;
      [-1,1].forEach(side => shadow(arch.x+side*arch.w*.33,arch.y,50,.22*archAlpha));
      const archFoot=project(arch.x,arch.y,terrainHeight(arch.x,arch.y)+3);
      items.push({depth:archFoot.depth,draw:()=>{
        context.save();context.globalAlpha=archAlpha;
        drawGroundDecal(context,images.archPaint ?? archFallback,{x:arch.x,y:0,width:arch.w,height:arch.h,z:()=>0},(x,y)=>{
          const localHeight=y+(arch.foot-.5)*arch.h;
          return project(x,arch.y+localHeight*Math.cos(BILLBOARD_TILT),terrainHeight(arch.x,arch.y)+3+localHeight*Math.sin(BILLBOARD_TILT)+archGroundOffset(x,localHeight));
        },width,height,10,20);
        context.restore();
      }});
      // The pendant hangs from the same billboard-space pivot as the live scene.
      const tilt = BILLBOARD_TILT, h = arch.chimeHeight;
      const p = project(arch.x,arch.y+h*Math.cos(tilt)-4*Math.sin(tilt),terrainHeight(arch.x,arch.y)+3+h*Math.sin(tilt)+4*Math.cos(tilt));
      items.push({depth:p.depth,draw:()=>{
        context.save(); context.globalAlpha=.94*archAlpha;
        const response=chimeListeningPose(rememberedChime);
        const projectChime=(x:number,y:number,z=0)=>{
          const px=x*Math.cos(response.bellAngle)-y*Math.sin(response.bellAngle);
          const py=x*Math.sin(response.bellAngle)+y*Math.cos(response.bellAngle)+h;
          return project(arch.x+px,arch.y+py*Math.cos(tilt)-(4+z)*Math.sin(tilt),
            terrainHeight(arch.x,arch.y)+3+py*Math.sin(tilt)+(4+z)*Math.cos(tilt));
        };
        drawGroundDecal(context,chimeArt.bell,{x:0,y:0,width:arch.chimeW,height:arch.chimeH,z:()=>0},
          (x,y)=>projectChime(x,y+arch.chimeH*(arch.chimeTop-.5)),width,height,4,12);
        const hinge=chimeArtwork.paperPivot/chimeArtwork.height;
        drawGroundDecal(context,chimeArt.paper,{x:0,y:0,width:arch.chimeW,height:arch.chimeH,z:()=>0},(x,y)=>{
          const py=y+arch.chimeH*(hinge-.5);
          return projectChime(x*Math.cos(response.paperAngle)-py*Math.sin(response.paperAngle),
            x*Math.sin(response.paperAngle)+py*Math.cos(response.paperAngle)+arch.chimeH*(arch.chimeTop-hinge),.05);
        },width,height,4,12);
        context.restore();
      }});
      archMotes.forEach(mote=>{
        const p=project(mote.x,mote.y,terrainHeight(mote.x,mote.y)+3+mote.z);
        if(p.depth<100||p.x<0||p.x>width||p.y<0||p.y>height)return;
        items.push({depth:p.depth,draw:()=>{context.save();context.globalAlpha=.35*archAlpha;context.fillStyle='#fff0d2';context.beginPath();context.arc(p.x,p.y,mote.size*.5*p.scale,0,Math.PI*2);context.fill();context.restore();}});
      });
    }
    // Draw the same session snapshot, even after its guide has left the hill.
    // Reduced motion neither advances the guide nor generates discovery events.
    hillBirds.forEach((bird, index) => {
      const birdPose = paperGuideBirdPose(paperGuide?.current ?? null, index, paperGuide?.current?.time ?? 0);
      const alpha = paperGuideVisibility(actor, birdPose) * birdPose.opacity;
      if (alpha <= .005) return;
      shadow(birdPose.x, birdPose.y, bird.w * .32, .16 * Math.max(.12, 1 - birdPose.lift / 260) * alpha);
      const birdZ = terrainHeight(birdPose.x,birdPose.y)+3+birdPose.lift;
      const birdFoot = project(birdPose.x,birdPose.y,birdZ);
      if (birdFoot.depth < 100) return;
      const litBird = {
        body: moonlit(birdArt.body, birdPose.x, birdPose.y, 'bird', `bird-${index}-body`),
        left: moonlit(birdArt.left, birdPose.x, birdPose.y, 'bird', `bird-${index}-left`),
        right: moonlit(birdArt.right, birdPose.x, birdPose.y, 'bird', `bird-${index}-right`),
      };
      items.push({depth:birdFoot.depth,draw:()=>{
        context.save(); context.globalAlpha=alpha;
        const bank = birdPose.bank + birdPose.farewellLean;
        const projectPart = (x:number,y:number,z:number) => {
          const flippedX = x*(bird.flip ? -1 : 1);
          const px = flippedX*Math.cos(bank)-y*Math.sin(bank), py = flippedX*Math.sin(bank)+y*Math.cos(bank);
          return project(birdPose.x+px,birdPose.y+py*Math.cos(BILLBOARD_TILT)-z*Math.sin(BILLBOARD_TILT),
            birdZ+py*Math.sin(BILLBOARD_TILT)+z*Math.cos(BILLBOARD_TILT));
        };
        for (const side of [-1,1]) {
          const angle = side < 0 ? birdPose.leftWingAngle : -birdPose.rightWingAngle;
          drawGroundDecal(context,side < 0 ? litBird.left : litBird.right,{x:0,y:0,width:bird.w,height:bird.h,z:()=>0},
            (x,y)=>projectPart(x*Math.cos(angle),y+bird.h*(bird.foot-.5),-x*Math.sin(angle)),width,height,8,8);
        }
        drawGroundDecal(context,litBird.body,{x:0,y:0,width:bird.w,height:bird.h,z:()=>0},
          (x,y)=>projectPart(x,y+bird.h*(bird.foot-.5),.2),width,height,6,6);
        context.restore();
      }});
    });
    const memory = createTrailState(actor, trailEvents);
    trailFlowerOffsets.forEach(([dx, dy, size]) => sprite(art.flower, trailSites.flower.x + dx, trailSites.flower.y + dy, 104 * size * (memory.flowerOpen ? 1 : .62), 156 * size));
    trailSites.passages.forEach((point, i) => {
      if (trailPassageBloom(memory, i)) sprite(art.flower, point.x + (i % 2 ? -46 : 46), point.y + 7, 104 * .25, 156 * .25);
    });
    if (guideVisible(memory)) {
      const guide = guidePosition(memory), p = project(guide.x, guide.y, terrainHeight(guide.x, guide.y) + 58 + guide.lift);
      items.push({ depth: p.depth, draw: () => {
        context.save(); context.translate(p.x, p.y); context.scale(p.scale, p.scale); context.fillStyle = '#fff2d8';
        context.beginPath(); context.moveTo(0, 0); context.bezierCurveTo(-28, -26, -29, -2, -4, 5); context.bezierCurveTo(-17, 20, -2, 14, 0, 5); context.bezierCurveTo(13, 21, 22, 12, 5, 3); context.bezierCurveTo(30, -8, 21, -29, 0, 0); context.fill(); context.restore();
      } });
    }
    objects.forEach(object => {
      const alpha = landmarkReveal(object, actor, reading); if (alpha < .005) return;
      if (object.id === 'lock') {
        if (doorContact && alpha > .01) {
          // Same world-space footprints and opacity as Landmark's ground layers.
          const baseZ = terrainHeight(object.x, object.y) + 3;
          context.save(); context.globalAlpha = .12 * alpha;
          drawGroundDecal(context, doorContact, { x: object.x - 38, y: object.y - 12, width: 304, height: 80, rotation: .16, z: () => baseZ - .2 }, project, width, height, 6, 4);
          context.globalAlpha = .46 * alpha;
          drawGroundDecal(context, doorContact, { x: object.x, y: object.y, width: 306, height: 32, z: () => baseZ + .1 }, project, width, height, 6, 2);
          context.restore();
        }
      } else shadow(object.x, object.y, object.width * .5, .17 * alpha);
      if (object.id === 'puzzle' && (lampOn || memory.lanternAwake)) {
        const p = project(object.x, object.y), r = 230 * p.scale;
        const glow = context.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        glow.addColorStop(0, 'rgba(255,216,137,.22)'); glow.addColorStop(1, 'rgba(255,216,137,0)');
        context.fillStyle = glow; context.fillRect(p.x - r, p.y - r, r * 2, r * 2);
      }
      const image = object.id === 'lock' ? images.doorPaint ?? art.door : art[object.id === 'puzzle' ? 'lantern' : 'flower'];
      const foot = object.id === 'lock' ? (images.doorPaint ? giftGate.foot : giftGate.fallbackFoot) : 1 - object.footInset / object.height;
      const litImage = object.id === 'lock' ? moonlit(image, object.x, object.y, 'door', 'door') : image;
      sprite(litImage, object.x, object.y, object.width, object.height, foot, alpha);
    });
    const deskAlpha = landmarkReveal(puzzleDesk, actor, reading);
    if (deskAlpha > .005) {
      shadow(puzzleDesk.x, puzzleDesk.y, puzzleDesk.width * .39, .10 * deskAlpha);
      sprite(deskArt, puzzleDesk.x, puzzleDesk.y, puzzleDesk.width, puzzleDesk.height, puzzleDesk.foot, deskAlpha);
    }
    shadow(actor.x + 7, actor.y - 4, 70, .27);
    // WebGL uses the same 174-unit sheet: its painted core is ~120 units and
    // the rest is transparent fur margin. Keep both the size and .359 centre.
    const floofZ = terrainHeight(actor.x,actor.y)+3, floofFoot=project(actor.x,actor.y,floofZ);
    const litFloof = moonlit(companionSheet, actor.x, actor.y, 'floof', 'floof');
    items.push({depth:floofFoot.depth,draw:()=>{
      drawGroundDecal(context,litFloof,{x:0,y:0,width:174,height:174,z:()=>0},(x,y)=>{
        const attentive=floofAttentionVertex(x/120,(y+174*.359)/120,attention);
        const point=orangeRestVertex(attentive.x,attentive.y,sip);
        return project(actor.x+point.x*120,actor.y+point.y*120*Math.cos(BILLBOARD_TILT),floofZ+point.y*120*Math.sin(BILLBOARD_TILT));
      },width,height,18,18);
    }});
    items.sort((a, b) => b.depth - a.depth).forEach(item => item.draw());

    // Fixed, sparse airborne pigment preserves the atmosphere without running an animation loop.
    for (let i = 0; i < 12; i++) {
      const x = Math.floor(pose.x / 2200) * 2200 - 1000 + random(i + 23) * 3600;
      const y = Math.floor(pose.y / 2200) * 2200 - 1000 + random(i + 91) * 3600;
      const p = project(x, y, terrainHeight(x, y) + 70 + random(i + 41) * 200);
      if (p.x < 0 || p.x > width || p.y < 0 || p.y > height) continue;
      context.fillStyle = 'rgba(255,246,217,.42)'; context.beginPath(); context.arc(p.x, p.y, Math.max(.6, 2 * p.scale), 0, Math.PI * 2); context.fill();
    }
  }, [pose, width, height, actor, lampOn, images, reading, trailEvents, moonClearing, paperGuide, pondListening, mushroomListening, floofAttention, greeting, heldGreeting, showEarTips, chimeListening, orangeRestRef, orangeRestVersion, restArt, cupArt, parcelArt, art, companionSheet, brush, leaves, doorContact, paintedLeaves, paintedGround, deskArt, groundLayer, pigmentLayer, pigmentMask, pondFallback, petalSheets, mushroomFallback, archFallback, chimeArt, birdArt, moonArtLayers]);
  return <canvas ref={canvas} className="static-garden floof-static" aria-hidden="true" style={{ position: 'absolute', inset: 0, width, height, pointerEvents: 'none' }}/>;
}
