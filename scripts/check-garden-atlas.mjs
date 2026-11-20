import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';
registerHooks({resolve(specifier,context,nextResolve){
  if(specifier.startsWith('.')&&!extname(specifier)&&context.parentURL?.includes('/src/'))return nextResolve(`${specifier}.ts`,context);
  return nextResolve(specifier,context);
}});
const { regions, paths, pathDistance, regionAt, regionAtmosphere, cameraBounds, playBounds, groundExtent, gardenShrubs } = await import('../src/scene/gardenAtlas.ts');
const { constrainPose, objects } = await import('../src/scene/world.ts');
const { terrainHeight, depthTrees, depthFocusPose, depthVisibility, depthCamera } = await import('../src/scene/depthWorld.ts');

let failures = 0;
const check=(name,fn)=>{try{fn();console.log(`PASS: ${name}`);}catch(error){failures++;console.error(`FAIL: ${name}: ${error.message}`);}};
const near=(a,b,epsilon=1e-7)=>assert.ok(Math.abs(a-b)<epsilon,`${a} ≠ ${b}`);
const length=path=>path.points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-path.points[i].x,p.y-path.points[i].y),0);

check('eight distinct regions connect through a winding route with five return loops',()=>{
  assert.equal(regions.length,8);
  assert.equal(new Set(regions.map(item=>item.id)).size,8);
  const visited=new Set(['entry']);
  for(let pass=0;pass<regions.length;pass++)for(const path of paths){
    if(visited.has(path.from))visited.add(path.to);
    if(visited.has(path.to))visited.add(path.from);
  }
  assert.equal(visited.size,regions.length);
  assert.equal(paths.length-regions.length+1,5,'connected graph must contain five independent loops');
  for(const path of paths){
    const a=regions.find(item=>item.id===path.from),b=regions.find(item=>item.id===path.to);
    near(path.points[0].x,a.x);near(path.points[0].y,a.y);
    near(path.points.at(-1).x,b.x);near(path.points.at(-1).y,b.y);
    assert.ok(path.points.length>10);
    assert.ok(length(path)>=Math.hypot(a.x-b.x,a.y-b.y));
  }
});

check('the primary route lasts over a minute at walking speed, with substantial side trails',()=>{
  const primary=paths.slice(0,7).reduce((sum,path)=>sum+length(path),0);
  const side=paths.slice(7).reduce((sum,path)=>sum+length(path),0);
  assert.ok(primary>14000,`primary route is only ${primary} units`);
  assert.ok(primary/240>60,`primary walk is only ${primary/240} seconds`);
  assert.ok(side>14000,`side paths total only ${side} units`);
  assert.ok(regions.at(-1).y-regions[0].y>8500);
  console.log(`  Primary trail ${Math.round(primary)} units / ${Math.round(primary/240)} s; side trails ${Math.round(side)} units.`);
});

check('all regions and complete sampled routes are reachable at desktop sizes and zooms',()=>{
  for(const [width,height]of [[1280,720],[1440,900],[1920,1080],[2560,1080]])for(const zoom of [.85,1,1.18,1.45]){
    for(const point of [...regions,...paths.flatMap(path=>path.points)]){
      const pose=constrainPose({x:point.x,y:point.y+220,zoom},width,height);
      near(pose.x,point.x);near(pose.y-220,point.y);
    }
  }
  assert.ok(groundExtent.minX<playBounds.minX-3000&&groundExtent.maxX>playBounds.maxX+3000);
  // The southern skirt must be behind the actual oblique camera, not an old origin-based margin.
  const southernCamera=depthCamera({x:0,y:cameraBounds.minY,zoom:.85},2560,1080);
  assert.ok(groundExtent.minY<southernCamera.y-200);
  assert.ok(groundExtent.maxY>playBounds.maxY+3000);
});

check('asymmetric world edges reverse immediately and nonfinite camera input is safe',()=>{
  const beyond=constrainPose({x:-1e9,y:-1e9,zoom:Infinity},1440,900);
  near(beyond.x,cameraBounds.minX);near(beyond.y,cameraBounds.minY);near(beyond.zoom,1);
  const reverse=constrainPose({...beyond,x:beyond.x+1,y:beyond.y+1},1440,900);
  assert.ok(reverse.x>beyond.x&&reverse.y>beyond.y);
  const invalid=constrainPose({x:NaN,y:Infinity,zoom:NaN},1440,900);
  assert.ok(Object.values(invalid).every(Number.isFinite));
});

check('nearest trail queries agree with curved path points and preserve branch widths',()=>{
  for(const path of paths)for(const point of path.points){
    const result=pathDistance(point.x,point.y);
    assert.ok(result.distance<1e-7);
    assert.ok(result.width>=80&&result.width<=154);
    assert.ok(paths.some(item=>item.id===result.pathId));
  }
  const far=pathDistance(-3000,9800);
  assert.ok(far.distance>1000);
});

check('terrain is finite and continuous, with both ponds and the secret door on level ground',()=>{
  for(let x=-8000;x<=8000;x+=400)for(let y=-5000;y<=16000;y+=350){
    const height=terrainHeight(x,y);
    assert.ok(Number.isFinite(height));
    assert.ok(Math.abs(terrainHeight(x+.01,y)-height)<.04);
    assert.ok(Math.abs(terrainHeight(x,y+.01)-height)<.04);
  }
  for(let i=0;i<24;i++){
    const angle=i*Math.PI/12;
    near(terrainHeight(-1200+Math.cos(angle)*430,3200+Math.sin(angle)*290),28);
    near(terrainHeight(-330+Math.cos(angle)*140,260+Math.sin(angle)*95),18);
  }
  near(terrainHeight(-200,8500),75);
  assert.ok(terrainHeight(1000,6800)>190,'wind hill should provide a noticeable crest');
});

check('atmosphere transitions are continuous and leave the entrance bright',()=>{
  assert.ok(regionAtmosphere(regions[0].x,regions[0].y).dusk<.02);
  assert.ok(regionAtmosphere(-200,8500).dusk>.95);
  for(const region of regions)assert.equal(regionAt(region.x,region.y).id,region.id);
  for(let y=-1000;y<=10000;y+=100)for(let x=-3000;x<=3000;x+=300){
    const before=regionAtmosphere(x,y),after=regionAtmosphere(x+.01,y+.01);
    assert.ok(before.dusk>=0&&before.dusk<=1);
    assert.ok(Math.abs(before.dusk-after.dusk)<.001);
    for(const key of ['ground','fog','sky'])for(let i=0;i<3;i++){
      assert.ok(Number.isFinite(before[key][i])&&before[key][i]>=0&&before[key][i]<=1);
      assert.ok(Math.abs(before[key][i]-after[key][i])<.001);
    }
  }
});

check('groves and shrubs use fixed irregular locations, varied art, and unobstructed trail centers',()=>{
  assert.ok(depthTrees.length>0&&depthTrees.length<=24,'sparse atlas must not regain a repeated tree wall');
  assert.deepEqual(new Set(depthTrees.map(tree=>tree.art)),new Set(['tree','willow','blossom']));
  assert.ok(gardenShrubs.length>0&&gardenShrubs.length<=80,'low plants should stay in a few small groups');
  assert.equal(new Set(depthTrees.map(tree=>`${tree.x},${tree.y}`)).size,depthTrees.length);
  for(const tree of depthTrees){
    const path=pathDistance(tree.x,tree.y);
    assert.ok(path.distance>path.width*.5+48);
    assert.ok(tree.w>0&&tree.h>0&&tree.footInset>0&&tree.footInset<.1);
  }
  // Open hills and clearings intentionally need no grove at their centre.
});

check('original interaction identities remain intact and relocated landmarks can be framed',()=>{
  assert.deepEqual(objects.map(item=>item.id).sort(),['lock','music','puzzle']);
  const expected={puzzle:[-650,750],music:[900,2100],lock:[-200,8500]};
  for(const object of objects){
    near(object.x,expected[object.id][0]);near(object.y,expected[object.id][1]);
    for(const [width,height]of [[1280,720],[1440,900],[2560,1080]])for(const reading of [false,true]){
      const pose=depthFocusPose(object.id,width,height,reading);
      assert.ok(depthVisibility(object,pose,width,height)>.8,`${object.id} not visible`);
    }
  }
});
if(failures)process.exitCode=1;
