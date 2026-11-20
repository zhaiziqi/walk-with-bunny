import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';
import { PerspectiveCamera, Raycaster, Vector3 } from 'three';
// Node strips TS types; resolve the extension-free source imports exactly as Vite does.
registerHooks({resolve(specifier,context,nextResolve){
  if(specifier.startsWith('.')&&!extname(specifier)&&context.parentURL?.includes('/src/'))return nextResolve(`${specifier}.ts`,context);
  return nextResolve(specifier,context);
}});
const { advanceMeadow, meadowScreenFoot, meadowVelocity, MEADOW_SPEED, MEADOW_POINTER_DEAD_ZONE, MEADOW_POINTER_FULL_SPEED, SHARED_RABBIT_FOOT_OFFSET } = await import('../src/scene/meadowMotion.ts');
const { constrainPose, panBounds, objects } = await import('../src/scene/world.ts');
const { encounterRadius } = await import('../src/scene/meadowWorld.ts');
const { groundExtent } = await import('../src/scene/gardenAtlas.ts');
const { depthCamera, depthFocusPose, terrainHeight } = await import('../src/scene/depthWorld.ts');

// Historical tests used a 40 px full-speed distance and projected the corners of
// a 3480×2630 flat meadow via world.project(). Those assumptions described the
// old flat pan scene. The live scene now uses the exported pointer speed range,
// independent x/y world positions, depthCamera and FloofTerrain's groundExtent.

let failures = 0;
function check(name, run) {
  try { run(); console.log(`PASS: ${name}`); }
  catch (error) { failures++; console.error(`FAIL: ${name}\n${error.message}`); }
}
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
const origin = { x: 0, y: 0, zoom: 1 }, foot = { x: 720, y: 648 };
const desktopViewports = [[1280,720],[1440,900],[1920,1080],[2560,1080]];
const speedPoint = (distance, angle = 0) => ({ x: foot.x + Math.cos(angle) * distance, y: foot.y - Math.sin(angle) * distance });
check('pointer direction supports both axes and equal diagonal speed', () => {
  const distance = MEADOW_POINTER_FULL_SPEED + 40;
  const right = meadowVelocity(speedPoint(distance), foot), up = meadowVelocity(speedPoint(distance, Math.PI / 2), foot);
  const diagonal = meadowVelocity(speedPoint(distance, Math.PI / 4), foot);
  near(right.x, MEADOW_SPEED); near(right.y, 0); near(up.x, 0); near(up.y, MEADOW_SPEED);
  assert.ok(diagonal.x > 0 && diagonal.y > 0);
  near(Math.hypot(diagonal.x, diagonal.y), MEADOW_SPEED);
});
check('near-foot dead zone rests; approaching the foot slows continuously', () => {
  assert.deepEqual(meadowVelocity(speedPoint(MEADOW_POINTER_DEAD_ZONE - 1),foot),{x:0,y:0});
  let previousSpeed = 0;
  for (let i = 1; i <= 20; i++) {
    const distance = MEADOW_POINTER_DEAD_ZONE + (MEADOW_POINTER_FULL_SPEED - MEADOW_POINTER_DEAD_ZONE) * i / 20;
    const speed = Math.hypot(...Object.values(meadowVelocity(speedPoint(distance),foot)));
    assert.ok(speed > previousSpeed && speed <= MEADOW_SPEED + 1e-7);
    previousSpeed = speed;
  }
  near(previousSpeed, MEADOW_SPEED);
  near(meadowVelocity(speedPoint(MEADOW_POINTER_FULL_SPEED * 2), foot).x, MEADOW_SPEED);
});
check('one second of slow, medium and full-speed integration is frame-rate independent', () => {
  for (const distance of [MEADOW_POINTER_FULL_SPEED * .35, MEADOW_POINTER_FULL_SPEED * .7, MEADOW_POINTER_FULL_SPEED * 1.2]) for (const fps of [30,60,120]) {
    const velocity = meadowVelocity(speedPoint(distance, Math.PI / 4),foot);
    let result = origin;
    for(let i=0;i<fps;i++) result=advanceMeadow(result,velocity,1/fps);
    near(result.x,velocity.x); near(result.y,velocity.y); near(result.zoom,1);
  }
});
check('inactive and zero-velocity integration stays still; stalled frames cannot leap', () => {
  const velocity = meadowVelocity(speedPoint(MEADOW_POINTER_FULL_SPEED + 40),foot);
  assert.equal(advanceMeadow(origin,velocity,.016,false),origin);
  assert.equal(advanceMeadow(origin,meadowVelocity(null,foot),.016),origin);
  near(advanceMeadow(origin,velocity,15).x,MEADOW_SPEED*.05);
  assert.equal(advanceMeadow(origin,velocity,NaN),origin);
});
check('world bounds clamp without a dead zone when direction reverses', () => {
  const bounds=panBounds(1440,900), edge={x:bounds.x,y:bounds.y,zoom:1};
  const outward={x:MEADOW_SPEED,y:MEADOW_SPEED};
  assert.deepEqual(constrainPose(advanceMeadow(edge,outward,.05),1440,900),edge);
  const reversed=constrainPose(advanceMeadow(edge,{x:-MEADOW_SPEED,y:-MEADOW_SPEED},.05),1440,900);
  assert.ok(reversed.x<edge.x&&reversed.y<edge.y);
});
check('foot anchor scales with the same world offset at desktop sizes', () => {
  assert.deepEqual(meadowScreenFoot(1440,900,.9),foot);
  assert.deepEqual(meadowScreenFoot(1920,1080,1.08),{x:960,y:777.6});
});
check('every landmark can be discovered by walking within the desktop world bounds', () => {
  for (const [width,height] of desktopViewports) for (const object of objects) {
    // The closest legal camera pose produces the closest legal character position.
    const closest=constrainPose({x:object.x,y:object.y+SHARED_RABBIT_FOOT_OFFSET,zoom:1},width,height);
    const distance=Math.hypot(object.x-closest.x,object.y-(closest.y-SHARED_RABBIT_FOOT_OFFSET));
    assert.ok(distance<encounterRadius,`${width}×${height} ${object.id}: nearest distance ${distance} is outside ${encounterRadius}`);
  }
});
check('desktop navigation destinations place the character inside all discovery circles', () => {
  for (const [width,height] of desktopViewports) for (const object of objects) {
    const destination=depthFocusPose(object.id,width,height,false);
    const actor={x:destination.x,y:destination.y-SHARED_RABBIT_FOOT_OFFSET};
    const distance=Math.hypot(object.x-actor.x,object.y-actor.y);
    assert.ok(distance<encounterRadius,`${width}×${height} ${object.id}: navigation leaves character ${distance} away`);
  }
});
check('actual painted ground covers the whole desktop viewport at world and zoom limits', () => {
  let samples=0, minimumMargin=Infinity;
  for (const [width,height] of desktopViewports) for (const zoom of [.85,1,1.22,1.45]) {
    for (const x of [-1e6,0,1e6]) for (const y of [-1e6,0,1e6]) {
      const pose=constrainPose({x,y,zoom},width,height);
      const label=`${width}×${height}, zoom ${zoom}, camera (${pose.x},${pose.y})`;
      const c=depthCamera(pose,width,height), camera=new PerspectiveCamera(c.fov,width/height,1,18000);
      camera.position.set(c.x,c.y,c.z);camera.up.set(0,0,1);camera.lookAt(c.x,c.targetY,c.targetZ);
      camera.updateProjectionMatrix();camera.updateMatrixWorld();
      // Independent Three rays sample the corners, edge midpoints and centre.
      // Find the first terrain crossing so a bank in front is not skipped.
      for (const horizontal of [-1,0,1]) for (const vertical of [-1,0,1]) {
        const raycaster=new Raycaster();raycaster.setFromCamera({x:horizontal,y:vertical},camera);
        const ray=raycaster.ray, point=new Vector3();
        assert.ok(ray.direction.z<0,`${label}: horizon appears inside the viewport`);
        const clearance=t=>{ray.at(t,point);return point.z-terrainHeight(point.x,point.y);};
        let low=0,high=64;
        while(high<camera.far&&clearance(high)>0){low=high;high+=64;}
        assert.ok(high<camera.far,`${label}: viewport ray misses terrain before the far plane`);
        for(let i=0;i<35;i++){
          const mid=(low+high)/2;if(clearance(mid)>0)low=mid;else high=mid;
        }
        ray.at((low+high)/2,point);
        assert.ok(point.toArray().every(Number.isFinite),`${label}: invalid ground intersection`);
        const margin=Math.min(point.x-groundExtent.minX,groundExtent.maxX-point.x,point.y-groundExtent.minY,groundExtent.maxY-point.y);
        minimumMargin=Math.min(minimumMargin,margin);samples++;
        assert.ok(margin>0,`${label}: ground edge exposed at (${horizontal},${vertical}), margin ${margin}`);
      }
    }
  }
  console.log(`  ${samples} Three.js terrain rays; minimum mesh-edge margin ${minimumMargin.toFixed(1)} world units.`);
});
if(failures) process.exitCode=1;
