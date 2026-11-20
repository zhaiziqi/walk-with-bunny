import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';
registerHooks({resolve(specifier,context,nextResolve){
  return nextResolve(specifier.startsWith('.')&&!extname(specifier)&&context.parentURL?.includes('/src/')?`${specifier}.ts`:specifier,context);
}});
const { archComposition, archGroundOffset, archMotes, archMotePose, archReveal, chimeResponse, hollowMushrooms, hollowReveal, restoreHollowArchMemory } = await import('../src/scene/hollowArch.ts');
const { terrainHeight, BILLBOARD_TILT } = await import('../src/scene/depthWorld.ts');
import { advanceAtlasInteraction, atlasEncounterSites, emptyAtlasInteraction } from '../src/scene/atlasInteraction.ts';

let checks = 0;
const check = (name, run) => { run(); checks++; console.log(`PASS: ${name}`); };
check('the five mushrooms keep an open asymmetric footprint and shared planted anchors', () => {
  assert.equal(hollowMushrooms.length, 5);
  const feet = new Set();
  for (const mushroom of hollowMushrooms) {
    assert.ok([mushroom.x,mushroom.y,mushroom.w,mushroom.h,mushroom.foot,mushroom.phase].every(Number.isFinite));
    assert.ok(mushroom.h>=100&&mushroom.h<=180&&mushroom.w/mushroom.h>1.08&&mushroom.w/mushroom.h<1.10);
    assert.equal(mushroom.foot,.91);
    assert.ok(Math.hypot(mushroom.x-1400,mushroom.y-4300)<300);
    feet.add(`${mushroom.x},${mushroom.y}`);
  }
  assert.equal(feet.size,5);
  assert.ok(new Set(hollowMushrooms.map(p=>p.y)).size>3,'the patch must not become a straight row');
  assert.deepEqual([archComposition.x,archComposition.y],[-1100,5400]);
  assert.equal(archComposition.foot,.95);
  assert.ok(archComposition.chimeHeight<archComposition.h*archComposition.foot);
  assert.ok(archComposition.chimeHeight-archComposition.chimeH>0);
});
check('both new silhouettes fade continuously in either travel direction and stay hidden from the previous site', () => {
  for(const [at,center] of [[hollowReveal,{x:1400,y:4300}],[archReveal,{x:-1100,y:5400}]]){
    assert.equal(at(center),1);
    assert.equal(at({x:center.x+1500,y:center.y}),0);
    let previous=0;
    for(let distance=1600;distance>=0;distance-=2){
      const value=at({x:center.x+distance,y:center.y});
      assert.ok(value>=previous&&value<=1&&value-previous<.0041);
      assert.equal(value,at({x:center.x-distance,y:center.y}));
      assert.equal(value,at({x:center.x,y:center.y-distance}));
      previous=value;
    }
  }
  assert.equal(hollowReveal({x:-1200,y:3200}),0);
  assert.equal(archReveal({x:1400,y:4300}),0);
});
check('both stone feet settle onto the existing slope without moving in world Y or bending the crown', () => {
  const base=terrainHeight(archComposition.x,archComposition.y),sin=Math.sin(BILLBOARD_TILT),cos=Math.cos(BILLBOARD_TILT);
  for(const offset of [-.33,.33]){
    const worldX=archComposition.x+archComposition.w*offset;
    const delta=archGroundOffset(worldX,0),localY=delta*sin,localZ=delta*cos;
    const worldYShift=localY*cos-localZ*sin;
    const worldZ=base+3+localY*sin+localZ*cos;
    assert.ok(Math.abs(worldYShift)<1e-12);
    assert.ok(Math.abs(worldZ-(terrainHeight(worldX,archComposition.y)+3))<1e-10);
    for(const height of [160,220,archComposition.chimeHeight,archComposition.h])assert.equal(archGroundOffset(worldX,height),0);
    for(let height=-30;height<190;height+=.1){
      const a=archGroundOffset(worldX,height),b=archGroundOffset(worldX,height+.001);
      assert.ok(Number.isFinite(a)&&Math.abs(a-b)<.001,'foot deformation must have no seam');
    }
    for(const seam of [0,160])assert.ok(Math.abs(archGroundOffset(worldX,seam-.001)-archGroundOffset(worldX,seam+.001))<1e-7);
  }
  assert.equal(archGroundOffset(NaN,0),0);
});
check('the hanging chime starts continuously, damps without a reset, and retains restrained shared-wind motion', () => {
  const resting=chimeResponse(20,100,.5);
  assert.ok(Math.abs(chimeResponse(20,0,.5)-resting)<1e-12);
  assert.ok(Math.abs(chimeResponse(20,.001,.5)-resting)<.00001);
  let peak=0;
  for(let age=0;age<30;age+=.01){
    const value=chimeResponse(20,age,.5);
    assert.ok(Number.isFinite(value)&&Math.abs(value)<.23);
    assert.ok(Math.abs(value-chimeResponse(20,age+.001,.5))<.002);
    peak=Math.max(peak,Math.abs(value-resting));
  }
  assert.ok(peak>.08,'activation must have a visible but restrained swing');
  assert.ok(Math.abs(chimeResponse(20,15,.5)-resting)<.0001);
});
check('seven motes remain near their own positions instead of circling or filling the view', () => {
  assert.equal(archMotes.length,7);
  for(let i=0;i<7;i++)for(const t of [0,1,5,27,100])for(const age of [0,2.75,6,100]){
    const p=archMotePose(t,i,age),rest=archMotes[i];
    assert.ok(Math.abs(p.x-rest.x)<=18&&Math.abs(p.y-rest.y)<=9);
    assert.ok(Math.abs(p.z-rest.z)<=34);
    assert.ok(p.opacity>=.28&&p.opacity<=.721);
    assert.ok([p.x,p.y,p.z,p.opacity].every(Number.isFinite));
  }
});
check('reading freezes the encounter, and a restored region consumes its old pulse without replaying', () => {
  for(const id of ['hollow','arch']){
    const site=atlasEncounterSites.find(s=>s.id===id), actor={x:site.x,y:site.y}, pulse={id,serial:4};
    let state=restoreHollowArchMemory(emptyAtlasInteraction(),site,actor,[site.event],pulse);
    assert.ok(state.fired&&state.inside);
    assert.equal(state.age,100);
    assert.equal(advanceAtlasInteraction(state,site,0,.05,false,true,{id,serial:5}),state);
    for(let i=0;i<100;i++)state=advanceAtlasInteraction(state,site,0,.05,false,false,pulse);
    assert.equal(state.activations,0);
    state=advanceAtlasInteraction(state,site,0,.05,false,false,{id,serial:5});
    assert.equal(state.activations,1,'a new deliberate click must respond after restoring');
    state=advanceAtlasInteraction(state,site,site.radius+150,.05,true,false,{id,serial:5});
    state=advanceAtlasInteraction(state,site,0,.05,true,false,{id,serial:5});
    for(let i=0;i<50;i++)state=advanceAtlasInteraction(state,site,0,.05,false,false,{id,serial:5});
    assert.equal(state.activations,2,'a real departure and return must re-arm the optional encounter');
    assert.ok(!('lastSongId' in state)&&!('puzzleSolved' in state)&&!('giftUnlocked' in state));
  }
});
check('unvisited or unrelated scenes are unaffected by the new renderer-memory restore', () => {
  for(const site of atlasEncounterSites){
    const original=emptyAtlasInteraction(),actor={x:site.x,y:site.y};
    assert.equal(restoreHollowArchMemory(original,site,actor,[]),original);
    if(site.id!=='hollow'&&site.id!=='arch')assert.equal(restoreHollowArchMemory(original,site,actor,[site.event]),original);
    else {
      const distant=restoreHollowArchMemory(original,site,{x:site.x+2000,y:site.y},[site.event]);
      assert.ok(!distant.inside&&!distant.fired);
    }
  }
});
console.log(`${checks} hollow-to-arch checks passed.`);
