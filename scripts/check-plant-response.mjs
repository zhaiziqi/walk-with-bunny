import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';
registerHooks({ resolve(specifier, context, next) {
  return next(specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/src/') ? `${specifier}.ts` : specifier, context);
} });
const { canopyContact, advanceLeafBend, leafFlex, firstTrailGrass, shrubDimensions } = await import('../src/scene/plantResponse.ts');
const { paths } = await import('../src/scene/gardenAtlas.ts');
let failures = 0;
const check = (name, fn) => { try { fn(); console.log(`PASS: ${name}`); } catch (error) { failures++; console.error(`FAIL: ${name}: ${error.message}`); } };
check('the visually overlapping entrance fern responds beyond the former root circle', () => {
  const actor = { x: -405, y: -1566 };
  // Recorded visual-overlap regression from docs/versions/tree-dense-20261101/gardenAtlas.ts.
  // Keep its geometry explicit so later art/layout edits do not erase the original contact case.
  const plant = { x: -424.2702008831976, y: -1689.989189644013, width: 55, height: 41, kind: 'fern', phase: 2.399963 };
  const { width, height } = shrubDimensions(plant);
  assert.ok(Math.hypot(actor.x-plant.x, actor.y-plant.y)>110);
  assert.ok(canopyContact(plant,width,height,actor,actor)>.25);
  assert.equal(canopyContact(plant,width,height,{x:plant.x+400,y:plant.y},{x:plant.x+400,y:plant.y}),0);
});
check('a real short passage catches leaves while a map jump does not sweep distant plants', () => {
  const plant = {x:0,y:0};
  assert.ok(canopyContact(plant,80,100,{x:-85,y:5},{x:85,y:5})>.99);
  assert.equal(canopyContact(plant,80,100,{x:-1000,y:0},{x:1000,y:0}),0);
});
check('plant roots remain fixed and bending increases towards the leaf tips', () => {
  for (const h of [60,123,165,240]) { assert.equal(leafFlex(0,h),0); assert.equal(leafFlex(h*.1,h),0); assert.equal(leafFlex(h,h),1); assert.ok(leafFlex(h*.8,h)>leafFlex(h*.4,h)); }
});
check('spring response is frame-rate independent and settles after passage', () => {
  const states = [30,60,120].map(fps => {let state={value:0,velocity:0}; for(let i=0;i<fps;i++) state=advanceLeafBend(state,.8,1/fps); return state;});
  for(const state of states) { assert.ok(Math.abs(state.value-states[0].value)<1e-10); assert.ok(Math.abs(state.velocity-states[0].velocity)<1e-10); }
  let state=states[0]; for(let i=0;i<180;i++) state=advanceLeafBend(state,0,1/60);
  assert.ok(Math.abs(state.value)<1e-8); assert.ok(Math.abs(state.velocity)<1e-7);
});
check('small entrance tufts follow the actual route and cover ordinary forward travel', () => {
  const grass=firstTrailGrass(), path=paths.find(p=>p.id==='entry-lantern');
  assert.ok(grass.length>=20 && grass.length<=32,`${grass.length} tufts`);
  assert.ok(grass.some(p=>p.y<-1650)); assert.ok(grass.some(p=>p.y>550));
  let total=0, reactive=0;
  for(let i=1;i<path.points.length;i++) {
    const a=path.points[i-1],b=path.points[i],length=Math.hypot(b.x-a.x,b.y-a.y);
    for(let j=0;j<10;j++) {const p={x:a.x+(b.x-a.x)*(j+.5)/10,y:a.y+(b.y-a.y)*(j+.5)/10};total+=length/10;
      if(grass.some(g=>canopyContact(g,g.width+24,100,p,p)>.08)) reactive+=length/10;
    }
  }
  assert.ok(reactive/total>.70,`${(100*reactive/total).toFixed(1)}% coverage`);
  console.log(`  ${grass.length} small tufts; ${(100*reactive/total).toFixed(1)}% sampled first-route contact coverage.`);
});
if(failures) process.exitCode=1;
