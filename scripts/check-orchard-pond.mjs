import assert from 'node:assert/strict';
import { orchardBlossoms, orchardFallenPetals, orchardPetalPose, orchardReveal, pondDriftPetals, pondFootprint, pondGlimpse, pondReveal, restoreOrchardPondMemory } from '../src/scene/orchardPond.ts';
import { advanceAtlasInteraction, atlasEncounterSites, emptyAtlasInteraction } from '../src/scene/atlasInteraction.ts';

let checks = 0;
const check = (name, run) => { run(); checks++; console.log(`PASS: ${name}`); };
check('the pond stays undisclosed from music, emerges through the bend and remains continuous in reverse', () => {
  assert.equal(pondReveal({x:900,y:2100}),0);
  assert.equal(pondGlimpse({x:900,y:2100}),0);
  assert.ok(pondGlimpse({x:560,y:2470})>0); assert.equal(pondReveal({x:560,y:2470}),0);
  const bend = pondReveal({x:-180,y:2640}); assert.ok(bend > .1 && bend < 1);
  assert.equal(pondReveal({x:-975,y:2955}),1);
  let previous = 0;
  for(let distance=1800;distance>=0;distance-=2){
    const actor={x:pondFootprint.x+distance,y:pondFootprint.y}, value=pondReveal(actor);
    assert.ok(value>=previous && value-previous<.004); previous=value;
    assert.equal(value,pondReveal({x:pondFootprint.x-distance,y:pondFootprint.y}));
  }
  assert.equal(orchardReveal({x:900,y:2100}),1);
  assert.equal(orchardReveal({x:-1200,y:3200}),0);
});
check('shared layout contains the old water footprint and leaves the main music flower clear', () => {
  assert.deepEqual([pondFootprint.x,pondFootprint.y],[-1200,3200]);
  assert.equal(pondFootprint.waterRadiusX,380); assert.equal(pondFootprint.waterRadiusY,250);
  assert.ok(pondFootprint.width>pondFootprint.waterRadiusX*2 && pondFootprint.height>pondFootprint.waterRadiusY*2);
  for(const flower of orchardBlossoms)assert.ok(Math.abs(flower.x-900)>150);
  for(const petal of [...orchardFallenPetals,...pondDriftPetals]){
    assert.ok([petal.x,petal.y,petal.w,petal.h,petal.rotation].every(Number.isFinite));
    assert.ok(petal.w>0&&petal.h>petal.w);
  }
});
check('the sparse ambient petals never jump onto a different trajectory when a response starts or ends', () => {
  for(const time of [0,8,23.1,300])for(let i=0;i<4;i++){
    const poses=[100,0,4,8.39,8.41].map(age=>orchardPetalPose(time,i,age));
    for(const pose of poses.slice(1))assert.deepEqual(pose,poses[0]);
  }
  assert.equal(Array.from({length:14},(_,i)=>orchardPetalPose(20,i,30)).filter(p=>p.visible).length,4);
});
check('response petals have bounded grounded paths and fade before the response expires', () => {
  for(let i=4;i<14;i++){
    assert.equal(orchardPetalPose(10,i,0).opacity,0);
    const last=orchardPetalPose(10,i,8.399);
    assert.ok(last.opacity<.06,'late petals must not disappear at full opacity');
    assert.equal(orchardPetalPose(10,i,8.4).opacity,0);
  }
  for(let i=0;i<14;i++)for(let age=0;age<10;age+=.1){
    const p=orchardPetalPose(17,i,age,{x:1.2,y:.3});
    assert.ok([p.x,p.y,p.z,p.rotation,p.tilt,p.opacity].every(Number.isFinite));
    assert.ok(p.z>=23&&p.z<180&&Math.abs(p.x)<350&&Math.abs(p.y)<150);
    assert.ok(p.opacity>=0&&p.opacity<=.78);
  }
});
check('the orchard encounter remains optional, isolated from business state and frozen during reading', () => {
  for(const id of ['orchard']){
    const site=atlasEncounterSites.find(s=>s.id===id);
    let state=advanceAtlasInteraction(emptyAtlasInteraction(),site,100,.02,true,false);
    assert.equal(state.activations,1);
    const frozen=advanceAtlasInteraction(state,site,100,1,true,true,{id,serial:1});
    assert.equal(frozen,state);
    for(let i=0;i<200;i++)state=advanceAtlasInteraction(state,site,100,.02,false,false);
    assert.equal(state.activations,1);
    assert.ok(!('puzzleSolved' in state)&&!('lastSongId' in state)&&!('giftUnlocked' in state));
  }
});
check('restoring the visited orchard never restarts its burst, but departure and a new entry can respond again', () => {
  for(const id of ['orchard']){
    const site=atlasEncounterSites.find(s=>s.id===id), actor={x:site.x,y:site.y};
    let restored=restoreOrchardPondMemory(emptyAtlasInteraction(),site,actor,[site.event]);
    assert.ok(restored.inside&&restored.fired); assert.equal(restored.age,100); assert.equal(restored.activations,0);
    for(let i=0;i<300;i++)restored=advanceAtlasInteraction(restored,site,0,.02,false,false);
    assert.equal(restored.activations,0,'no replay at the same place after static/WebGL switching');
    restored=advanceAtlasInteraction(restored,site,site.radius+200,.02,true,false);
    restored=advanceAtlasInteraction(restored,site,0,.02,true,false);
    assert.equal(restored.activations,1,'a real re-entry still has a local response');
    const original=emptyAtlasInteraction();
    assert.equal(restoreOrchardPondMemory(original,site,actor,[]),original);
    const distant=restoreOrchardPondMemory(emptyAtlasInteraction(),site,{x:site.x+2000,y:site.y},[site.event]);
    assert.equal(distant.inside,false); assert.equal(distant.fired,false);
    const priorPulse={id:site.id,serial:8};
    let pulsed=restoreOrchardPondMemory(emptyAtlasInteraction(),site,actor,[site.event],priorPulse);
    pulsed=advanceAtlasInteraction(pulsed,site,0,.02,false,false,priorPulse);
    assert.equal(pulsed.activations,0,'a retained click pulse must not replay on remount');
    pulsed=advanceAtlasInteraction(pulsed,site,0,.02,false,false,{id:site.id,serial:9});
    assert.equal(pulsed.activations,1,'a new deliberate interaction must still work');
  }
  const unrelated=atlasEncounterSites.find(s=>s.id==='arch'), original=emptyAtlasInteraction();
  assert.equal(restoreOrchardPondMemory(original,unrelated,{x:unrelated.x,y:unrelated.y},[unrelated.event]),original);
});
console.log(`${checks} orchard-to-pond checks passed.`);
