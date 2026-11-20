import assert from 'node:assert/strict';
import { advanceTrail, createTrailState, guidePosition, guideVisible, trailPassageBloom, trailSites, trailFlowerOpening } from '../src/scene/trailState.ts';
import { gardenWind, advanceGardenClock } from '../src/scene/gardenWind.ts';
import { walkedThrough } from '../src/scene/ecology.ts';
import { paths, pathDistance } from '../src/scene/gardenAtlas.ts';

let failures=0;
const check=(name,run)=>{try{run();console.log(`PASS: ${name}`);}catch(error){failures++;console.error(`FAIL: ${name}: ${error.message}`);}};
const tick=(state,actor,moving=false,seconds=1)=>{const events=[];for(let i=0;i<Math.ceil(seconds/.02);i++){const next=advanceTrail(state,actor,moving,.02,false);state=next.state;events.push(...next.events);}return {state,events};};
const step=(state,to,events,speed=150)=>{const dx=to.x-state.previous.x,dy=to.y-state.previous.y,n=Math.ceil(Math.hypot(dx,dy)/(speed*.02)),from={...state.previous};for(let i=1;i<=n;i++){const result=advanceTrail(state,{x:from.x+dx*i/n,y:from.y+dy*i/n},true,.02,false);state=result.state;events.push(...result.events);}return state;};
const start={x:0,y:-1800};

check('the bud opens progressively through the dwell threshold without closing for a frame',()=>{
  let state=createTrailState(trailSites.flower),previous=trailFlowerOpening(state),crossed=false;
  for(let i=0;i<210;i++){
    const next=advanceTrail(state,trailSites.flower,false,.02,false).state,value=trailFlowerOpening(next);
    assert.ok(value>=previous&&value<=1,'opening must stay monotonic');
    if(!state.flowerOpen&&next.flowerOpen){assert.ok(Math.abs(value-previous)<.005);crossed=true;}
    state=next;previous=value;
  }
  assert.ok(crossed);assert.equal(previous,1);
  const walking=advanceTrail(createTrailState(trailSites.flower),trailSites.flower,true,.02,false).state;
  assert.equal(walking.flowerOpen,false,'passing does not replace the optional pause');
});

check('a walked route leaves unique local traces, while map jumps and stillness do not',()=>{
  let state=createTrailState(start);const events=[];
  for(const point of trailSites.passages)state=step(state,point,events);
  assert.ok(state.passages.every(Boolean));
  assert.equal(events.filter(event=>event.startsWith('trail-passage-')).length,trailSites.passages.length);
  const again=[];for(const point of [...trailSites.passages].reverse())state=step(state,point,again);
  assert.equal(again.filter(event=>event.startsWith('trail-passage-')).length,0);
  const jump=advanceTrail(createTrailState(start),trailSites.passages[4],true,.02,false);
  assert.ok(jump.state.passages.every(value=>!value));
  assert.equal(tick(jump.state,trailSites.passages[4],false,4).events.filter(event=>event.startsWith('trail-passage-')).length,0);
});
check('the flower reveals the guide; a triggered flight completes before it waits on a perch',()=>{
  const first=trailSites.perches[0];
  let state=createTrailState(first);
  const unseen=advanceTrail(state,{x:first.x,y:first.y+2},true,.02,false).state;
  assert.equal(guideVisible(unseen),false);assert.equal(unseen.guideFlying,false);
  state=createTrailState(first,['trail-flower-open']);
  state=advanceTrail(state,{x:first.x,y:first.y+2},true,.02,false).state;
  assert.ok(guideVisible(state)&&state.guideMet&&state.guideFlying);
  for(let i=0;i<20;i++)state=advanceTrail(state,{x:state.previous.x+.1,y:state.previous.y+.6},true,.02,false).state;
  assert.ok(state.guideProgress>0);
  const point=guidePosition(state),inFlight=state;
  const restStep=advanceTrail(state,state.previous,false,.02,false).state;
  assert.ok(restStep.guideProgress>state.guideProgress,'stopping must not freeze a flight');
  const completed=tick(restStep,restStep.previous,false,5),stopped=completed.state;
  assert.equal(stopped.guideFlying,false);assert.equal(stopped.guideIndex,1);
  assert.deepEqual(guidePosition(stopped),{...trailSites.perches[1],lift:0});
  assert.deepEqual(completed.events,['trail-guide-perch-1']);
  assert.notDeepEqual(guidePosition(stopped),point);
  const away=advanceTrail(stopped,{x:stopped.previous.x,y:stopped.previous.y-2},true,.02,false).state;
  assert.equal(away.guideFlying,false);
  const far=advanceTrail(stopped,{x:1700,y:1900},true,.02,false).state;
  assert.equal(far.guideFlying,false);
  const reversed=advanceTrail(inFlight,{x:inFlight.previous.x,y:inFlight.previous.y-2},true,.02,false).state;
  assert.ok(reversed.guideProgress>inFlight.guideProgress,'turning away also allows a natural landing');
  assert.equal(reversed.guideDuration,inFlight.guideDuration,'flight pace stays independent of current walking speed');
  const frozen=advanceTrail(inFlight,inFlight.previous,false,.02,true);
  assert.equal(frozen.state,inFlight,'reading still freezes environmental encounters');
  const still=tick(stopped,stopped.previous,false,4);
  assert.equal(still.state.guideIndex,1);assert.deepEqual(still.events,[]);
});
check('optional stillness opens a flower, and reading freezes both opening and return',()=>{
  let state=createTrailState(trailSites.flower);
  let result=tick(state,trailSites.flower,false,.8);assert.equal(result.state.flowerOpen,false);
  const paused=advanceTrail(result.state,trailSites.flower,false,20,true);assert.equal(paused.state,result.state);assert.deepEqual(paused.events,[]);
  result=tick(result.state,trailSites.flower,false,.7);assert.equal(result.state.flowerOpen,true);assert.deepEqual(result.events,['trail-flower-open']);
  state=advanceTrail(result.state,{x:1200,y:6000},false,.02,false).state;
  assert.equal(state.flowerOpen,true);assert.equal(tick(state,trailSites.flower,false,5).events.length,0);
  const restored=createTrailState(trailSites.flower,['trail-flower-open']);assert.equal(restored.flowerOpen,true);assert.ok(restored.bloomAge>2);
  assert.equal('puzzleComplete' in state,false);
});
check('lantern is always accessible, and only visited passages bloom after it wakes',()=>{
  const result=advanceTrail(createTrailState(start),trailSites.lantern,false,.02,false);
  assert.deepEqual(result.events,['trail-lantern-awake']);assert.equal(result.state.flowerOpen,false);assert.equal(result.state.guideMet,false);
  assert.ok(trailSites.passages.every((_,i)=>!trailPassageBloom(result.state,i)));
  let state=createTrailState(start);state=step(state,trailSites.passages[0],[]);
  assert.equal(trailPassageBloom(state,0),false);
  state=advanceTrail(state,trailSites.lantern,false,.02,false).state;
  assert.equal(trailPassageBloom(state,0),true);assert.equal(trailPassageBloom(state,7),false);
});
check('a real return gets one new greeting, while teleports, repeated entry and reading do not',()=>{
  let state=createTrailState(start,['trail-flower-open','trail-lantern-awake']);
  const teleport=advanceTrail(state,trailSites.flower,true,.02,false);
  assert.equal(teleport.state.returned,false);assert.deepEqual(teleport.events,[]);
  const frozen=advanceTrail(teleport.state,{x:trailSites.flower.x+1,y:trailSites.flower.y},true,.02,true);
  assert.equal(frozen.state.returned,false);
  const wiggle=advanceTrail(teleport.state,{x:trailSites.flower.x+1,y:trailSites.flower.y},true,.02,false);
  assert.equal(wiggle.state.returned,false);
  state=step(wiggle.state,start,[]);const firstEvents=[];state=step(state,trailSites.flower,firstEvents);
  assert.ok(firstEvents.includes('trail-returned'));assert.equal(state.returned,true);
  state=step(state,start,[]);const events=[];state=step(state,trailSites.flower,events);
  assert.ok(!events.includes('trail-returned'));
  const restored=createTrailState(trailSites.flower,['trail-flower-open','trail-lantern-awake','trail-returned']);
  assert.equal(restored.returned,true);assert.ok(restored.returnAge>3);
});
check('the guide can reverse from the lantern, and restores its homeward perch',()=>{
  const last=trailSites.perches.length-1,point=trailSites.perches[last];
  let state=createTrailState(point,['trail-flower-open',`trail-guide-perch-${last}`,'trail-lantern-awake']);
  const result=advanceTrail(state,point,false,.02,false);
  assert.ok(result.events.includes('trail-guide-homeward'));assert.equal(result.state.guideDirection,-1);
  const previous=trailSites.perches[last-1],dx=previous.x-point.x,dy=previous.y-point.y,d=Math.hypot(dx,dy);
  state=advanceTrail(result.state,{x:point.x+dx/d,y:point.y+dy/d},true,.02,false).state;
  assert.equal(state.guideFlying,true);
  const restored=createTrailState(point,['trail-flower-open',`trail-guide-perch-${last}`,'trail-lantern-awake','trail-guide-homeward','trail-guide-return-6','trail-guide-return-5']);
  assert.equal(restored.guideDirection,-1);assert.equal(restored.guideIndex,5);
  assert.deepEqual(guidePosition(restored),{...trailSites.perches[5],lift:0});
});
check('environmental memories reconstruct on remount without replaying the same events',()=>{
  const memories=['trail-flower-open','trail-lantern-awake','trail-butterfly-met','trail-guide-perch-2','trail-passage-0','trail-passage-1','trail-returned'];
  const state=createTrailState(start,memories);assert.equal(state.guideIndex,2);assert.deepEqual(state.passages,[true,true,false,false,false,false,false,false]);
  assert.equal(tick(state,trailSites.flower,false,3).events.length,0);
});
check('slow, normal and full-speed journeys complete all guide perches and the return greeting',()=>{
  const route=paths.find(path=>path.id==='entry-lantern');
  assert.ok(pathDistance(trailSites.flower.x,trailSites.flower.y).distance<trailSites.flower.radius);
  for(const speed of [60,150,240]) {
  let state=createTrailState(route.points[0]),paused=false;const events=[];
  for(const point of route.points){
    state=step(state,point,events,speed);
    if(!paused&&Math.hypot(point.x-trailSites.flower.x,point.y-trailSites.flower.y)<120){
      const wait=tick(state,point,false,3.2);state=wait.state;events.push(...wait.events);paused=true;
    }
  }
  assert.equal(state.guideIndex,trailSites.perches.length-1);assert.equal(state.guideDirection,-1);
  assert.ok(state.passages.every(Boolean));assert.equal(state.lanternAwake,true);
  for(const point of [...route.points].reverse())state=step(state,point,events,speed);
  assert.equal(state.guideIndex,0);assert.equal(state.returned,true);
  assert.equal(events.filter(event=>event==='trail-returned').length,1);
  }
});
check('contact comes from the traversed segment, never a teleport or a stationary pointer',()=>{
  const site={x:0,y:0,radius:12};
  assert.ok(walkedThrough({x:-30,y:0},{x:30,y:0},site,true));
  assert.equal(walkedThrough({x:-300,y:0},{x:300,y:0},site,true),false);
  assert.equal(walkedThrough({x:0,y:0},{x:0,y:0},site,true),false);
  assert.equal(walkedThrough({x:0,y:0},{x:3,y:0},site,false),false);
});
check('one wind clock pauses exactly and distant plants sample a coherent travelling gust',()=>{
  assert.equal(advanceGardenClock(5,9,true),5);assert.equal(advanceGardenClock(5,9,false),5.05);assert.equal(advanceGardenClock(5,NaN,false),5);
  for(let t=0;t<60;t+=.07){const a=gardenWind(t,100,150),b=gardenWind(t,101,151);assert.ok(Object.values(a).every(Number.isFinite));assert.ok(Math.abs(a.lean-b.lean)<.02);assert.ok(a.gust>=0&&a.gust<=1);}
  const atSource=gardenWind(5.5,0,0),laterDownwind=gardenWind(6.5,520,0);assert.ok(Math.abs(atSource.gust-laterDownwind.gust)<1e-10);
});
if(failures)process.exitCode=1;
