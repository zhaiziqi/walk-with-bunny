import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';
registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/src/') ? `${specifier}.ts` : specifier, context);
} });
const { createFloofAttention, advanceFloofAttention, resumeFloofAttention, floofAttentionPose, floofAttentionVertex } = await import('../src/scene/floofAttention.ts');
const { createMushroomListening } = await import('../src/scene/mushroomListening.ts');
const { hollowMushrooms } = await import('../src/scene/hollowArch.ts');
const actor = { x: 1197, y: 4104 }, cap = hollowMushrooms[1];
let checks = 0, failures = 0;
function check(name, run) { checks++; try { run(); console.log(`PASS: ${name}`); } catch(error) { failures++; console.error(`FAIL: ${name}\n${error.stack}`); } }
function mushroom(t, { point = actor, side = -1, order = [1, 0, 2], engaged = true } = {}) {
  return { ...createMushroomListening(point), engaged, order, sequenceTime: t, lightSide: side, focus: 1 };
}
function run(seconds, { fps = 60, point = actor, state = createFloofAttention(point), start = 0, moving = false, speed = 0, getMushroom, observe } = {}) {
  const frames = Math.round(seconds * fps), dt = seconds / frames;
  for(let i = 1; i <= frames; i++) {
    const time = start + i * dt;
    state = advanceFloofAttention(state, point, dt, { mushrooms: getMushroom ? getMushroom(time) : mushroom(time, { point }), speed, moving });
    observe?.(state,time);
  }
  return state;
}
check('idle breathing or ordinary movement cannot manufacture an environmental reply', () => {
  const idle = run(20, { getMushroom: () => null });
  const walking = run(4, { moving:true, speed:180 });
  assert.equal(idle.amount,0); assert.equal(walking.amount,0);
});
check('the companion waits until the light is outside its cap, then replies during the pause', () => {
  let earliest = Infinity, peak = 0;
  run(4, { observe(state,t) { if(state.amount>.05) earliest=Math.min(earliest,t); peak=Math.max(peak,state.amount); if(t<1.08) assert.equal(state.amount,0); } });
  assert.ok(earliest>1.15 && earliest<1.55); assert.ok(peak>.9);
  const held=run(2); assert.ok(held.amount>.9); assert.equal(held.source,1);
});
check('only the visible full greeting responds; closed caps and brief revisit nods do not', () => {
  for(const getMushroom of [t=>mushroom(t,{order:[1]}),t=>mushroom(t,{engaged:false}),()=>mushroom(-1),()=>mushroom(12)]) {
    assert.equal(run(4,{getMushroom}).amount,0);
  }
});
check('a distant light cannot attract a reply through the rest of the map', () => {
  const point={x:cap.x+600,y:cap.y};
  assert.equal(run(4,{point}).amount,0);
});
check('attention points toward the actual light on either side and can naturally look upward', () => {
  const left={x:cap.x-180,y:cap.y-100}, right={x:cap.x+180,y:cap.y-100};
  const a=run(2,{point:left,getMushroom:t=>mushroom(t,{point:left,side:-1})});
  const b=run(2,{point:right,getMushroom:t=>mushroom(t,{point:right,side:1})});
  assert.ok(a.directionX>.25 && b.directionX<-.25);
  assert.ok(a.directionY>.4 && b.directionY>.4);
  const directlyBelow=run(2); assert.ok(directlyBelow.directionY>.9);
});
check('a moving focus never steals the reply from the light that is actually out', () => {
  const result=run(2,{getMushroom:t=>({...mushroom(t),focus:4})});
  assert.equal(result.source,1);assert.ok(result.amount>.9);
});
check('walking releases the expression smoothly without changing actor coordinates', () => {
  const before=run(2), first=advanceFloofAttention(before,actor,1/60,{mushrooms:mushroom(2),moving:true,speed:180});
  assert.ok(first.amount<before.amount && first.amount>before.amount*.75);
  const released=run(.6,{state:before,start:2,moving:true,speed:180});
  assert.ok(released.amount<.01);assert.deepEqual(released.actor,actor);
});
check('the finite light outing settles once and never loops while parked', () => {
  const result=run(12);
  assert.equal(result.amount,0);assert.equal(result.source,-1);
  const later=run(30,{state:result,start:12});assert.equal(later.amount,0);
});
check('the deformation fixes the planted foot and leaves the below-ground sheet unchanged', () => {
  const pose=floofAttentionPose(run(2));
  for(const x of [-.7,-.3,0,.3,.7]) for(const y of [-.2,0]) assert.deepEqual(floofAttentionVertex(x,y,pose),{x,y});
  const top=floofAttentionVertex(0,1,pose);assert.ok(top.y>1.06 && top.y<1.16);
  assert.deepEqual(floofAttentionVertex(.3,.7,floofAttentionPose(null)),{x:.3,y:.7});
});
check('the light-facing edge puffs while the opposite edge stays quieter', () => {
  const right={x:cap.x+180,y:cap.y-100};
  const pose=floofAttentionPose(run(2,{point:right,getMushroom:t=>mushroom(t,{point:right,side:1})}));
  const toward=floofAttentionVertex(-.4,.52,pose),away=floofAttentionVertex(.4,.52,pose);
  // Subtract the shared lean so only the local silhouette inflation is compared.
  const lean=pose.leanX/120*(.52/1.12)**2;
  assert.ok(Math.abs(toward.x-lean+.4)>Math.abs(away.x-lean-.4)*1.4);
});
check('reading is an exact pause, and reduced-motion handoff preserves the same expression', () => {
  const before=run(1.9);
  assert.equal(advanceFloofAttention(before,{x:actor.x+20,y:actor.y},1,{paused:true}),before);
  const resumed=resumeFloofAttention(before,actor);
  assert.deepEqual(floofAttentionPose(resumed),floofAttentionPose(before));
  assert.deepEqual(resumed.actor,actor);
});
check('map relocation clears the old reply, while a suspended frame does not skip it', () => {
  const before=run(1.9), far={x:actor.x+800,y:actor.y};
  assert.equal(resumeFloofAttention(before,far).amount,0);
  assert.equal(advanceFloofAttention(before,far,1/60,{mushrooms:mushroom(2)}).amount,0);
  assert.deepEqual(floofAttentionPose(advanceFloofAttention(before,actor,2,{mushrooms:mushroom(3)})),floofAttentionPose(before));
});
check('30, 60 and 120 FPS produce comparable entry, peak and release', () => {
  const traces=[30,60,120].map(fps=>{
    const values=[];let max=0;
    run(4,{fps,observe(state,t){max=Math.max(max,state.amount);if(Math.abs(t*2-Math.round(t*2))<1e-6)values.push(state.amount);}});
    return {values,max};
  });
  for(const trace of traces) {assert.ok(trace.max>.9);trace.values.forEach((value,index)=>assert.ok(Math.abs(value-traces[1].values[index])<.035));}
});
check('invalid frames cannot poison the state or mutate prior snapshots', () => {
  const before=run(1.9), saved=JSON.stringify(before);
  for(const dt of [0,-1,NaN,Infinity]) assert.equal(advanceFloofAttention(before,actor,dt),before);
  assert.equal(advanceFloofAttention(before,{x:NaN,y:0},1/60),before);
  const result=advanceFloofAttention(before,actor,1/60,{mushrooms:{...mushroom(2),lightSide:NaN},speed:NaN});
  assert.ok(Object.values(floofAttentionPose(result)).every(Number.isFinite));
  assert.equal(JSON.stringify(before),saved);
});
console.log(`${checks-failures}/${checks} floof attention checks passed.`);
process.exitCode=failures?1:0;
