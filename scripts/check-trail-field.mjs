import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/src/')) return nextResolve(`${specifier}.ts`, context);
  return nextResolve(specifier, context);
} });
const { paths } = await import('../src/scene/gardenAtlas.ts');
const { createTrailField, trailField, sampleTrailField, trailQuietClearing, lanternQuietClearing, trailTextureReduction, trailTextureSoftening } = await import('../src/scene/trailField.ts');
let failures = 0;
const check = (name, fn) => { try { fn(); console.log(`PASS: ${name}`); } catch (error) { failures++; console.error(`FAIL: ${name}: ${error.message}`); } };

check('the first route follows the flower and authored bend, not the unrelated blue bank', () => {
  assert.ok(sampleTrailField(350, -1110).wash > .45, 'the first flower has no connecting light');
  // This is where the decorative blue-band formula crosses the flower latitude.
  const blueX = -(-1110 * .55 + 150 + Math.sin(-1110 * .0014) * 105) / .70;
  assert.equal(sampleTrailField(blueX, -1110).wash, 0, 'the old bank still receives false route paint');
  for (const point of [[420, -850], [-150, -360], [-850, 280], [-650, 750], [270, 1240], [900, 2100]]) {
    assert.ok(sampleTrailField(...point).wash > .50, `missing real bend ${point}`);
  }
});

check('every main leg is connected and alternate paths stay quieter away from junctions', () => {
  for (const [index, route] of paths.entries()) {
    const isolated = createTrailField([route]);
    for (const point of route.points) {
      const value = isolated.sample(point.x, point.y).wash;
      assert.ok(value >= (index < 7 ? .539 : .172), `${route.id} has a break at ${JSON.stringify(point)}`);
      assert.ok(value <= (index < 7 ? 1 : .32) + 1e-10, `${route.id} lost its primary/side hierarchy`);
      assert.ok(sampleTrailField(point.x, point.y).wash >= value - 1e-10, 'joining a branch erased a path');
    }
  }
  const junction = sampleTrailField(-650, 750).wash;
  assert.ok(junction > .5 && junction <= 1, 'multiple routes must not add into a bright junction disc');
});

check('the indexed field agrees with a full geometry search at route edges and across the world', () => {
  const smooth = n => { const t = Math.max(0, Math.min(1, n)); return t * t * (3 - 2 * t); };
  const exhaustive = (x, y) => {
    let result = 0;
    paths.forEach((route, index) => {
      for (let i = 1; i < route.points.length; i++) {
        const a = route.points[i - 1], b = route.points[i], dx = b.x - a.x, dy = b.y - a.y, length2 = dx * dx + dy * dy;
        const t = length2 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / length2)) : 0;
        const distance = Math.hypot(x - a.x - t * dx, y - a.y - t * dy);
        const inner = route.width * .25 + 35, outer = route.width * .5 + 175;
        result = Math.max(result, (1 - smooth((distance - inner) / (outer - inner))) * (index < 7 ? 1 : .32));
      }
    });
    return result * (.77 + .13 * Math.sin(x * .0081 + y * .0057) + .10 * Math.sin(y * .0143 - x * .0042));
  };
  let samples = 0;
  for (let x = -3300; x <= 3300; x += 227) for (let y = -2800; y <= 10500; y += 223) {
    assert.ok(Math.abs(sampleTrailField(x, y).wash - exhaustive(x, y)) < 1e-12, `index omitted a segment at ${x},${y}`); samples++;
  }
  // The entire expanded edge must be indexed, not just the segment centre.
  for (const route of paths) for (let i = 1; i < route.points.length; i += 7) {
    const a = route.points[i - 1], b = route.points[i], dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy);
    for (const offset of [-250, -160, -70, 70, 160, 250]) {
      const x = b.x - dy / length * offset, y = b.y + dx / length * offset;
      assert.ok(Math.abs(sampleTrailField(x, y).wash - exhaustive(x, y)) < 1e-12, `index loses feather on ${route.id}`); samples++;
    }
  }
  console.log(`  ${samples} samples checked against an exhaustive segment query.`);
});

check('cell boundaries are continuous and invalid or remote positions remain safe', () => {
  for (let x = -2880; x <= 2880; x += 320) for (let y = -2560; y <= 9920; y += 320) {
    const at = sampleTrailField(x, y), left = sampleTrailField(x - .0001, y), right = sampleTrailField(x + .0001, y);
    const below = sampleTrailField(x, y - .0001), above = sampleTrailField(x, y + .0001);
    assert.ok(Number.isFinite(at.wash) && at.wash >= 0 && at.wash <= 1);
    assert.ok(Number.isFinite(at.quiet) && at.quiet >= 0 && at.quiet <= 1);
    assert.ok(Math.abs(left.wash - right.wash) < .0001 && Math.abs(below.wash - above.wash) < .0001, 'bucket boundary pops');
    assert.ok(Math.abs(left.quiet - right.quiet) < .0001 && Math.abs(below.quiet - above.quiet) < .0001, 'clearing boundary pops');
  }
  for (const [x, y] of [[NaN, 1], [Infinity, 1], [1, -Infinity], [1e20, -1e20]]) {
    assert.deepEqual(sampleTrailField(x, y), { wash: 0, quiet: 0 });
  }
});

check('the flower clearing quiets a local area and query work is bounded by nearby segments', () => {
  const { x, y, radiusX, radiusY } = trailQuietClearing;
  assert.equal(sampleTrailField(x, y).quiet, 1);
  assert.ok(sampleTrailField(x + radiusX, y).quiet < .14);
  assert.ok(sampleTrailField(x, y + radiusY * 3).quiet < .000001);
  assert.ok(trailField.maxCandidates < trailField.segmentCount * .12, 'each sample still searches too much of the atlas');
  const started = performance.now();
  for (let row = 0; row <= 264; row++) for (let column = 0; column <= 200; column++) sampleTrailField(-8000 + column * 80, -5000 + row * 21000 / 264);
  console.log(`  ${trailField.segmentCount} segments total; at most ${trailField.maxCandidates} candidates per query. 53,265 mesh samples: ${(performance.now() - started).toFixed(1)} ms (informational, not a browser FPS measurement).`);
});
check('texture softening stays local, respects route hierarchy, and preserves the first-flower clearing', () => {
  assert.equal(trailTextureReduction(sampleTrailField(350, -1110)), .58, 'first-flower treatment changed');
  assert.equal(trailTextureReduction(sampleTrailField(3000, 9000)), 0, 'untouched meadow texture changed');
  for (const route of paths.slice(7)) {
    const field = createTrailField([route]);
    for (const point of route.points) {
      const paint = field.sample(point.x, point.y);
      // The lantern clearing remains calm where the alternate route joins it.
      if (paint.quiet < .001) assert.ok(trailTextureReduction(paint) <= trailTextureSoftening * .32 + 1e-10, 'a secondary route became as calm as the main route');
    }
  }
});
check('the puzzle lantern gains a local quiet patch without washing out nearby slopes or distant sites', () => {
  const {x,y,radiusX,radiusY}=lanternQuietClearing;
  assert.equal(sampleTrailField(x,y).quiet,1);
  assert.equal(trailTextureReduction(sampleTrailField(x,y)),.58);
  assert.ok(sampleTrailField(x+radiusX,y).quiet<.14);
  assert.ok(sampleTrailField(x,y+radiusY*3).quiet<.000001);
  for(const point of [[900,2100],[-1200,3200],[1400,4300],[-1100,5400],[1000,6800],[-200,8500]]) {
    assert.ok(sampleTrailField(...point).quiet<.000001,'the lantern clearing leaked into a later destination');
  }
  assert.ok(sampleTrailField(-240,-680).quiet<.001,'the blue ridge was flattened into the lantern clearing');
});
if (failures) process.exitCode = 1;
