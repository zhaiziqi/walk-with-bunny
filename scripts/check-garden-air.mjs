import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';
registerHooks({resolve(specifier,context,nextResolve){
 if(specifier.startsWith('.')&&!extname(specifier)&&context.parentURL?.includes('/src/'))return nextResolve(`${specifier}.ts`,context);
 return nextResolve(specifier,context);
}});
const { createAirSeeds,airPosition }=await import('../src/scene/airMotion.ts');
const { groundExtent }=await import('../src/scene/gardenAtlas.ts');
const { depthProject,terrainHeight }=await import('../src/scene/depthWorld.ts');
const { advanceGardenClock }=await import('../src/scene/gardenWind.ts');
const { HOME }=await import('../src/scene/world.ts');
const seeds=createAirSeeds(groundExtent),actor={x:0,y:-1800},heading={x:0,y:1};
let failures=0;
function check(name,fn){try{fn();console.log(`PASS: ${name}`);}catch(error){failures++;console.error(`FAIL: ${name}: ${error.message}`);}}
check('bounded fixed world air is deterministic across camera rebuilds',()=>{
 assert.ok(seeds.length>1000&&seeds.length<3000);
 assert.deepEqual(seeds,createAirSeeds(groundExtent));
 assert.ok(seeds.some(s=>s.leaf)&&seeds.some(s=>!s.leaf));
 console.log(`  ${seeds.length} motes across the entire atlas; one point-cloud draw call.`);
});
check('the actual entry camera sees sparse air at different depths',()=>{
 const visible=seeds.map(seed=>{
  const p=airPosition(seed,0,actor,heading,0);
  const floor=Math.max(...[-115,0,115].flatMap(dx=>[-75,0,75].map(dy=>terrainHeight(seed.x+dx,seed.y+dy))));
  return depthProject(p.x,p.y,HOME,1280,720,floor+p.lift);
 }).filter(p=>p.x>0&&p.x<1280&&p.y>0&&p.y<720&&p.depth>650&&p.depth<4200);
 assert.ok(visible.length>25&&visible.length<180,`${visible.length} visible points`);
 assert.ok(visible.some(p=>p.depth<2000)&&visible.some(p=>p.depth>2900));
 console.log(`  ${visible.length} visible at entry across near, middle and far depths.`);
});
check('stillness retains motion while the shared reading clock freezes it',()=>{
 let total=0;
 for(const seed of seeds.slice(0,100)){
  const a=airPosition(seed,0,actor,heading,0),b=airPosition(seed,2,actor,heading,0);
  total+=Math.hypot(b.x-a.x,b.y-a.y,b.lift-a.lift);
 }
 assert.ok(total/100>8,`only ${total/100} average world units of motion over two seconds`);
 const paused=advanceGardenClock(2,1/60,true);
 assert.equal(paused,2);
 assert.deepEqual(airPosition(seeds[0],paused,actor,heading,0),airPosition(seeds[0],2,actor,heading,0));
});
check('local passage parts nearby pollen without moving remote air',()=>{
 const seed=seeds.find(s=>!s.leaf),rest=airPosition(seed,1,actor,heading,0);
 const local={x:rest.x-35,y:rest.y};
 const brushed=airPosition(seed,1,local,heading,1);
 assert.ok(brushed.x>rest.x&&brushed.y>rest.y&&brushed.lift>rest.lift);
 assert.deepEqual(airPosition(seed,1,{x:rest.x+1000,y:rest.y},heading,1),airPosition(seed,1,{x:rest.x+1000,y:rest.y},heading,0));
 assert.deepEqual(airPosition(seed,1,local,heading,0),rest);
});
check('long sessions preserve bounded soft light and continuous positions',()=>{
 for(const time of [0,10,3600,86400])for(const seed of seeds.slice(0,120)){
  const p=airPosition(seed,time,actor,heading,1),next=airPosition(seed,time+1/60,actor,heading,1);
  assert.ok(Number.isFinite(p.x+p.y+p.lift+p.opacity));
  assert.ok(p.opacity>.2&&p.opacity<=.84);
  assert.ok(p.lift>35&&p.lift<550);
  assert.ok(Math.hypot(next.x-p.x,next.y-p.y,next.lift-p.lift)<3,'a point teleported');
 }
});
if(failures)process.exitCode=1;
