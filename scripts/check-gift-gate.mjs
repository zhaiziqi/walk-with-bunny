import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';

registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/src/') ? `${specifier}.ts` : specifier, context);
} });
const { giftGate } = await import('../src/scene/giftGate.ts');
const { objects } = await import('../src/scene/world.ts');
const { BILLBOARD_TILT, depthProject, depthFocusPose, terrainHeight } = await import('../src/scene/depthWorld.ts');
const { SHARED_RABBIT_FOOT_OFFSET } = await import('../src/scene/meadowMotion.ts');
const { moonClearingField } = await import('../src/scene/moonClearing.ts');

const gate = objects.find(object => object.id === 'lock');
const viewports = [[1280, 720], [1440, 900], [1920, 1080], [1920, 720]];
const variants = [giftGate.foot, giftGate.fallbackFoot];
let checks = 0;
const check = (name, run) => { run(); checks++; console.log(`PASS: ${name}`); };
const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-8, `${message}: ${actual} vs ${expected}`);
const ground = terrainHeight(gate.x, gate.y);

// Project physical billboard corners independently of Canvas's screen-space drawImage.
// These are geometry checks, not a substitute for mounting either renderer in a browser.
function billboard(x, y, w, h, foot, lift, pose, width, height) {
  const z = terrainHeight(x, y) + 3 + lift;
  const vertex = (u, v) => {
    const vertical = (foot - v) * h;
    return depthProject(x + (u - .5) * w, y + vertical * Math.cos(BILLBOARD_TILT), pose, width, height, z + vertical * Math.sin(BILLBOARD_TILT));
  };
  const corners = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([u, v]) => vertex(u, v));
  return {
    left: Math.min(...corners.map(p => p.x)), right: Math.max(...corners.map(p => p.x)),
    top: Math.min(...corners.map(p => p.y)), bottom: Math.max(...corners.map(p => p.y)),
    foot: vertex(.5, foot), corners,
  };
}
function views(width, height) {
  const approach = [-240, 0, 240].flatMap(dx => [-320, -180, 80].map(dy => ({
    x: gate.x + dx, y: gate.y + dy + SHARED_RABBIT_FOOT_OFFSET, zoom: 1,
  })));
  return { approach, reading: depthFocusPose(gate.id, width, height, true) };
}
function withinFrame(rect, width, height) {
  assert.ok(rect.top > 74, 'the complete sheet must clear the desktop header');
  assert.ok(rect.left > 24 && rect.right < width - 24, 'the sheet must fit horizontally');
  assert.ok(rect.bottom < height - 54, 'the threshold must leave room for the garden controls');
}

check('the world size preserves the supplied PNG aspect and its measured ground anchor', () => {
  const png = readFileSync(new URL('../public/art/floof/gift-door-painting-v1.png', import.meta.url));
  assert.equal(png.toString('ascii', 12, 16), 'IHDR');
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
  near(gate.width / gate.height, width / height, 'paint must not be stretched');
  near(gate.width, giftGate.width, 'world and renderer width');
  near(gate.height, giftGate.height, 'world and renderer height');
  for (const foot of variants) assert.ok(foot > .5 && foot < 1, 'both artworks need a lower, internal ground anchor');
  near(gate.height - gate.footInset, gate.height * giftGate.foot, 'the DOM target must start at the painted sheet top');
});

check('painted and fallback thresholds project to the same ground point in both rendering conventions', () => {
  for (const [width, height] of viewports) {
    const { approach, reading } = views(width, height);
    for (const pose of [...approach, reading]) {
      const anchor = depthProject(gate.x, gate.y, pose, width, height, ground + 3);
      for (const foot of variants) {
        const rect = billboard(gate.x, gate.y, gate.width, gate.height, foot, 0, pose, width, height);
        near(rect.foot.x, anchor.x, 'threshold X'); near(rect.foot.y, anchor.y, 'threshold Y');
        near(rect.left, anchor.x - gate.width * anchor.scale / 2, 'Canvas left vs physical plane');
        near(rect.top, anchor.y - gate.height * foot * anchor.scale, 'Canvas top vs physical plane');
        for (const corner of rect.corners) near(corner.depth, anchor.depth, 'billboard must face the camera');
      }
    }
  }
});

check('the full threshold and both jambs lie on the existing level terrain', () => {
  for (let i = 0; i <= 16; i++) for (const dy of [-24, 0, 24]) {
    const x = gate.x + gate.width * (i / 16 - .5);
    near(terrainHeight(x, gate.y + dy), ground, 'a threshold must not float over or cut into a slope');
  }
});

check('nearby approaches retain the whole door above the controls on standard and wide desktops', () => {
  for (const [width, height] of viewports) for (const pose of views(width, height).approach) for (const foot of variants) {
    withinFrame(billboard(gate.x, gate.y, gate.width, gate.height, foot, 0, pose, width, height), width, height);
  }
});

check('the reading camera retains the complete door and leaves the right-hand gift panel clear', () => {
  for (const [width, height] of viewports) for (const foot of variants) {
    const rect = billboard(gate.x, gate.y, gate.width, gate.height, foot, 0, views(width, height).reading, width, height);
    withinFrame(rect, width, height);
    // The desktop gift dialog is 600 CSS px wide, with a 5% right inset.
    assert.ok(rect.right < width * .95 - 600, 'the scenery door must not disappear under the reading panel');
  }
});

check('the moonlight field covers the door and approaching visitor and ends before earlier regions', () => {
  const approaches = [-160, 0, 160].flatMap(dx => [-320, -180, 0].map(dy => ({ x: gate.x + dx, y: gate.y + dy })));
  for (const point of [{ x: gate.x, y: gate.y }, ...approaches]) {
    const shaded = moonClearingField(point.x, point.y, 0), revealed = moonClearingField(point.x, point.y, 1);
    assert.ok(shaded.coverage > .95, 'door and approaching visitor must share the clearing');
    assert.equal(shaded.coverage, revealed.coverage, 'cloud movement must not move its world-space support');
    assert.ok(revealed.light > shaded.light + .8 && revealed.shadow < shaded.shadow - .8, 'the cloud must uncover both subjects');
    assert.ok(Object.values(revealed).every(Number.isFinite));
  }
  for (const [x, y] of [[1000, 6800], [-1100, 5400], [-200, 7269], [-200, 9651], [-1641, 8460], [1241, 8460]]) {
    for (const phase of [0, .5, 1]) assert.deepEqual(moonClearingField(x, y, phase), { coverage: 0, light: 0, shadow: 0 });
  }
});
console.log(`${checks} gift-gate geometry checks passed.`);
