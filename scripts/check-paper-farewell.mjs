import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';
registerHooks({ resolve(specifier, context, next) {
  return next(specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/src/') ? `${specifier}.ts` : specifier, context);
} });
const { createPaperGuide, advancePaperGuide, resumePaperGuide, paperGuideBirdPose, paperGuidePerches } = await import('../src/scene/paperGuide.ts');
const { hillBirds } = await import('../src/scene/hillMoon.ts');
const { objects } = await import('../src/scene/world.ts');
const door = objects.find(object => object.id === 'lock');
let checks = 0, failures = 0;
const check = (name, run) => { checks++; try { run(); console.log(`PASS: ${name}`); } catch (error) { failures++; console.error(`FAIL: ${name}\n${error.stack}`); } };
const point = value => ({ x: value.x, y: value.y });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const pose = state => paperGuideBirdPose(state, state.leader, state.time);
function hold(state, seconds, fps = 60, options = {}, observe) {
  const count = Math.ceil(seconds * fps), dt = seconds / count;
  for (let i = 0; i < count; i++) { state = advancePaperGuide(state, state.actor, dt, { speed: 0, ...options }); observe?.(state); }
  return state;
}
function stepTo(state, target, fps = 60, speed = 180, options = {}) {
  const gap = distance(state.actor, target), d = Math.min(gap, speed / fps);
  return advancePaperGuide(state, {x: state.actor.x + (target.x - state.actor.x) / (gap || 1) * d,
    y: state.actor.y + (target.y - state.actor.y) / (gap || 1) * d}, 1 / fps, { speed: d * fps, ...options });
}
function meet(index = 1, fps = 60, options = {}) {
  const home = hillBirds[index];
  return hold(advancePaperGuide(createPaperGuide({x:home.x - 1,y:home.y}), point(home), 1 / fps, {speed:fps,...options}), 15, fps, options);
}
function arrive(index = 1, fps = 60, options = {}) {
  let state = meet(index, fps, options);
  for (let i = 0; i < fps * 70 && !state.finished; i++) {
    const current = pose(state), next = paperGuidePerches[Math.min(state.perch, paperGuidePerches.length - 1)];
    const dx = next.x-current.x, dy = next.y-current.y, length = Math.hypot(dx,dy)||1;
    const target = state.target===state.perch && state.restTime<=.7 ? state.actor : {x:current.x+dx/length*90,y:current.y+dy/length*90};
    state=stepTo(state,target,fps,180,options);
  }
  assert.ok(state.finished, 'real following must reach the final perch');
  return state;
}
function begin(state, fps = 60) {
  for (let i=0;i<fps*5 && state.farewellAge<0;i++) state=hold(state,1/fps,fps);
  assert.ok(state.farewellAge>=0,'nearby grounded guide should begin a farewell');
  return state;
}
check('the farewell waits for the final landing and a real nearby visitor',()=>{
  const early=hold(meet(),90); assert.equal(early.perch,1); assert.equal(early.farewellAge,-1);
  const landed=arrive(); assert.equal(landed.farewellAge,-1);
  const start=begin(landed); assert.ok(start.lift<=5 && start.speed<2); assert.ok(distance(start.actor,pose(start))<220);
});
check('cloud cover delays only the goodbye, preserving the complete journey and landing',()=>{
  const options={moonlightReady:false}, covered=arrive(1,60,options), ordinary=arrive();
  assert.deepEqual(covered,ordinary,'the gate must not alter travel or landing');
  const waited=hold(covered,30,60,options);
  assert.equal(waited.farewellAge,-1); assert.equal(waited.lift,4); assert.equal(waited.speed,0);
  assert.deepEqual(point(pose(waited)),paperGuidePerches.at(-1)); assert.equal(pose(waited).opacity,1);
  const clear=advancePaperGuide(waited,waited.actor,1/60,{speed:0,moonlightReady:true});
  assert.equal(clear.farewellAge,0); assert.deepEqual(point(pose(clear)),point(pose(waited)));
  const completed=hold(clear,8,60,options);
  assert.equal(completed.farewellAge,6.5,'cloud changes after the start cannot interrupt the flight');
  assert.equal(pose(completed).opacity,0);
});
check('a distant visitor or a map arrival cannot trigger a farewell through waiting',()=>{
  let state=arrive(); const end=point(pose(state));
  state=advancePaperGuide(state,{x:end.x+700,y:end.y},1/60,{speed:0});
  state=hold(state,30); assert.equal(state.farewellAge,-1);
  state=advancePaperGuide(state,{x:end.x-80,y:end.y-100},1/60,{speed:0});
  state=hold(state,30); assert.equal(state.farewellAge,-1); assert.equal(state.ready,false);
  state=stepTo(state,{x:end.x-70,y:end.y-100}); state=begin(state); assert.equal(state.farewellAge,0);
});
check('the bird bows, folds and points before taking off from the same foot position',()=>{
  const start=begin(arrive()), anchor=point(pose(start)); let previous=pose(start);
  let maxLean=0,maxFold=0,maxDifference=0;
  const end=hold(start,3.8,60,{},state=>{
    const current=pose(state); assert.deepEqual(point(current),anchor); assert.equal(current.lift,4);
    assert.ok(Math.abs(current.farewellLean-previous.farewellLean)<.025);
    assert.ok(Math.abs(current.leftWingAngle-previous.leftWingAngle)<.08);
    maxLean=Math.max(maxLean,Math.abs(current.farewellLean));
    maxFold=Math.max(maxFold,Math.min(current.leftWingAngle,current.rightWingAngle));
    maxDifference=Math.max(maxDifference,Math.abs(current.leftWingAngle-current.rightWingAngle)); previous=current;
  });
  assert.ok(maxLean>.19 && maxFold>.9 && maxDifference>.8);
  assert.ok(Math.abs(end.farewellAge-3.8)<.001); assert.equal(pose(end).farewellLean,0);
  assert.ok(Math.abs(pose(end).leftWingAngle-.52)<.001); assert.ok(Math.abs(pose(end).rightWingAngle-.52)<.001);
  assert.equal(pose(end).opacity,1);
});
check('a visible continuous flight leaves to the side and back, then becomes fully invisible',()=>{
  const start=begin(arrive()), anchor=pose(start); let previous=anchor, visibleTravel=0;
  const end=hold(start,8,60,{},state=>{
    const current=pose(state);
    assert.ok(Object.values(current).filter(value=>typeof value==='number').every(Number.isFinite));
    assert.ok(distance(current,previous)<4.4,'departure cannot jump horizontally');
    assert.ok(Math.abs(current.lift-previous.lift)<2,'takeoff cannot jump vertically');
    assert.ok(Math.abs(current.opacity-previous.opacity)<.04,'fade must not pop');
    assert.ok(current.opacity>=0 && current.opacity<=1);
    if(current.departureProgress>0 && current.opacity>.9){
      visibleTravel=Math.max(visibleTravel,distance(current,anchor));
      assert.equal(current.flying,current.lift>5);
    }
    previous=current;
  });
  assert.ok(visibleTravel>200,'the bird must visibly travel before fading');
  const final=pose(end);
  assert.equal(end.farewellAge,6.5); assert.equal(final.opacity,0); assert.equal(final.departureProgress,1); assert.equal(final.departed,true);
  assert.ok(Math.abs(final.x-anchor.x)>=350 && final.y>anchor.y+140 && final.lift>70);
  assert.equal(final.flying,false); assert.equal(final.farewellLean,0);
  assert.equal(end.s,start.s); assert.equal(end.perch,start.perch);
});
check('departure starts and ends with continuous position, opacity and wing angles',()=>{
  const state=begin(arrive());
  for(const boundary of [3.8,6.5]){
    const before=pose({...state,farewellAge:boundary-1e-5}),at=pose({...state,farewellAge:boundary}),after=pose({...state,farewellAge:boundary+1e-5});
    for(const sample of [before,after]){
      assert.ok(distance(sample,at)<.001); assert.ok(Math.abs(sample.lift-at.lift)<.001);
      assert.ok(Math.abs(sample.opacity-at.opacity)<.001);
      assert.ok(Math.abs(sample.leftWingAngle-at.leftWingAngle)<.001);
      assert.ok(Math.abs(sample.rightWingAngle-at.rightWingAngle)<.001);
    }
  }
});
check('the wing that extends faces the actual door even for mirrored bird sheets',()=>{
  for(let leader=0;leader<hillBirds.length;leader++){
    let state=hold(begin(arrive(leader)),2); const current=pose(state);
    const localSide=(door.x<current.x?-1:1)*(hillBirds[leader].flip?-1:1);
    const towards=localSide<0?current.leftWingAngle:current.rightWingAngle;
    const away=localSide<0?current.rightWingAngle:current.leftWingAngle;
    assert.ok(Math.cos(towards)>Math.cos(away)+.25,`leader ${leader}: the door-side wing must be visibly wider`);
  }
});
check('the bow keeps its first visitor-side when the companion changes direction',()=>{
  const start=begin(arrive()); let state=start;
  const originalSide=start.farewellSide;
  for(let i=0;i<60;i++) state=stepTo(state,{x:pose(start).x-originalSide*130,y:pose(start).y-50});
  assert.equal(state.farewellSide,originalSide); assert.ok(state.farewellAge>start.farewellAge);
});
check('departing and returning cannot replay the completed goodbye',()=>{
  let state=hold(begin(arrive()),8), before=point(pose(state));
  state=advancePaperGuide(state,{x:before.x+800,y:before.y-600},1/60,{speed:0});
  state=hold(state,15); assert.equal(state.farewellAge,6.5);
  for(let i=0;i<600;i++)state=stepTo(state,{x:before.x-80,y:before.y-80});
  state=hold(state,8); assert.equal(state.farewellAge,6.5); assert.deepEqual(point(pose(state)),before);
  assert.equal(pose(state).farewellLean,0); assert.equal(pose(state).opacity,0); assert.equal(pose(state).departed,true);
});
check('reading freezes both the gesture and departing bird including its opacity',()=>{
  for(const age of [1.9,4.7,6.1]){
    const state=hold(begin(arrive()),age), before=structuredClone(state), visible=pose(state);
    const paused=hold(state,20,60,{paused:true}); assert.equal(paused,state); assert.deepEqual(paused,before); assert.deepEqual(pose(paused),visible);
    const continued=hold(paused,.3); assert.ok(continued.farewellAge>state.farewellAge);
  }
});
check('returning from static mode preserves the exact farewell snapshot and continues it once',()=>{
  for(const age of [.7,4.8,6.2,8]){
    const state=hold(begin(arrive()),age), before=pose(state);
    const restored=resumePaperGuide(state,state.actor); assert.equal(restored.farewellAge,state.farewellAge); assert.deepEqual(pose(restored),before);
    const after=hold(restored,8); assert.equal(after.farewellAge,6.5); assert.equal(after.perch,state.perch); assert.equal(pose(after).opacity,0);
  }
});
check('non-leading paper birds keep their ordinary pose throughout the farewell',()=>{
  for(const age of [2,4.8,6.5,30]){
    const state=hold(begin(arrive()),age);
    hillBirds.forEach((home,index)=>{
      if(index===state.leader)return;
      const current=paperGuideBirdPose(state,index,state.time,.3), ordinary=paperGuideBirdPose(null,index,state.time,.3);
      assert.deepEqual(current,ordinary);assert.deepEqual(point(current),point(home)); assert.equal(current.opacity,1); assert.equal(current.departed,false);
    });
  }
});
check('farewell timing and silhouettes agree at 30, 60 and 120 FPS',()=>{
  for(const age of [.4,1.0,2.0,3.2,4.5,5.9,6.5,8]){
    const states=[30,60,120].map(fps=>hold(begin(arrive(1,fps),fps),age,fps));
    const middle=pose(states[1]);
    for(const state of states){const current=pose(state);assert.ok(Math.abs(current.farewellLean-middle.farewellLean)<.02);assert.ok(Math.abs(current.leftWingAngle-middle.leftWingAngle)<.05);assert.ok(Math.abs(state.farewellAge-states[1].farewellAge)<.04);assert.ok(distance(current,middle)<.05);assert.ok(Math.abs(current.opacity-middle.opacity)<.001);}
  }
});
check('bad input and a suspended frame do not skip or mutate the farewell',()=>{
  const state=hold(begin(arrive()),.7), before=structuredClone(state);
  for(const dt of [0,-1,NaN,Infinity])assert.equal(advancePaperGuide(state,state.actor,dt),state);
  assert.deepEqual(advancePaperGuide(state,state.actor,5),state);
  assert.equal(advancePaperGuide(state,{x:NaN,y:0},1/60),state);
  assert.deepEqual(state,before);
});
check('stopping just short of the last perch lands without another movement gesture',()=>{
  const arrived=arrive(), endpoint=arrived.s;
  for(const [gap,speed] of [[1.153,.734],[.353,.236]]){
    const stopped={...arrived,finished:false,perch:arrived.perch-1,s:endpoint-gap,speed,lift:4,restTime:0,farewellAge:-1,invitation:false,playerSpeed:0};
    const landed=advancePaperGuide(stopped,stopped.actor,1/60,{speed:0});
    assert.ok(landed.finished); assert.equal(landed.s,endpoint); assert.equal(landed.speed,0);
    assert.equal(landed.farewellAge,-1,'landing still waits before its farewell');
    assert.deepEqual(point(landed.actor),point(stopped.actor));
    assert.ok(distance(pose(landed),pose(stopped))<2,'the final correction stays below two world units');
    assert.ok(begin(landed).farewellAge>=0);
  }
});
check('a stopped guide more than two world units short does not skip its final approach',()=>{
  const arrived=arrive(), pending={...arrived,finished:false,perch:arrived.perch-1,s:arrived.s-2.1,speed:0,lift:4,restTime:0,farewellAge:-1,invitation:false,playerSpeed:0};
  const waited=hold(pending,12);
  assert.equal(waited.finished,false);assert.equal(waited.s,pending.s);assert.equal(waited.farewellAge,-1);
});
check('the environmental farewell never adds puzzle or gift-unlock state',()=>{
  const state=hold(begin(arrive()),6);
  for(const key of ['puzzleSolved','questions','envelopeStored','lastDraw','giftUnlocked','password'])assert.ok(!(key in state));
  assert.equal(state.s,hold(state,30).s);
});
console.log(`${checks-failures}/${checks} paper farewell checks passed.`);
if(failures)process.exitCode=1;
