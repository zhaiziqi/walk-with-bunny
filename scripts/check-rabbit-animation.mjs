import assert from 'node:assert/strict';
import { emptyRabbitGait, advanceRabbitGait, rabbitStance, rabbitGroundBlend, rabbitDirection, rabbitIdleAttention, rabbitSpring, emptyRabbitTurn, advanceRabbitTurn, rabbitDirectionVectors, rabbitPoseDimensions } from '../src/scene/rabbitAnimation.ts';
import { rabbitAtlasFrames } from '../src/scene/rabbitAtlas.ts';
import { rabbitDiagonalFrames } from '../src/scene/rabbitDiagonalAtlas.ts';
let failures=0;
const check=(name,fn)=>{try{fn();console.log(`PASS: ${name}`);}catch(error){failures++;console.error(`FAIL: ${name}: ${error.message}`);}};
const near=(a,b,e=1e-6)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
check('walking actually visits support, crouch and flight poses with contact events',()=>{
 let state=emptyRabbitGait(),landings=0;const poses=new Set();
 for(let i=0;i<180;i++){state=advanceRabbitGait(state,3,1/60,true);poses.add(rabbitStance(state));landings+=Number(state.landed);assert.ok(state.lift>=0&&state.lift<=26);}
 assert.deepEqual(poses,new Set(['planted','crouch','airborne']));assert.ok(landings>=4&&landings<20);
});
check('idle and blocked movement do not keep cycling the legs',()=>{
 let state=emptyRabbitGait();for(let i=0;i<90;i++)state=advanceRabbitGait(state,0,1/60,true);
 near(state.phase,0);near(state.lift,0);assert.equal(rabbitStance(state),'planted');
});
check('an interrupted hop lands in place and prepares a planted restart',()=>{
 let state={...emptyRabbitGait(),phase:.61,lift:24,wasMoving:true};
 const originalPhase=state.phase;let lastHeight=state.lift;
 for(let i=0;i<18;i++){state=advanceRabbitGait(state,0,1/60,false);if(state.settle<1)near(state.phase,originalPhase);else near(state.phase,0);assert.ok(state.lift<=lastHeight);lastHeight=state.lift;}
 near(state.lift,0);assert.equal(rabbitStance(state),'planted');
});
check('the visible foot stays planted and catches up during flight',()=>{
 near(rabbitGroundBlend(.05),0);near(rabbitGroundBlend(.25),0);
 assert.ok(rabbitGroundBlend(.6)>.5);near(rabbitGroundBlend(.9),1);
});
check('eight direction centres use real drawings and boundaries do not flicker',()=>{
 const allFrames={...rabbitAtlasFrames,...rabbitDiagonalFrames};
 for(const [direction,vector] of Object.entries(rabbitDirectionVectors)){
  assert.equal(rabbitDirection(vector,'front'),direction);
  assert.equal(Object.keys(allFrames[direction]).length,3);
 }
 let direction='right';
 for(let i=0;i<120;i++){
  const angle=Math.PI/8+(i%2?1:-1)*.01;
  direction=rabbitDirection({x:Math.cos(angle),y:Math.sin(angle)},direction);
  assert.equal(direction,'right','small motion near the sector edge must retain the view');
 }
 assert.equal(rabbitDirection({x:.71,y:.70},'right'),'backRight');
});
check('teleports do not create a giant hop; context attention only happens nearby after rest',()=>{
 assert.deepEqual(advanceRabbitGait({...emptyRabbitGait(),phase:.6,lift:20},900,1/60,true),emptyRabbitGait());
 near(rabbitIdleAttention(1,20),0);near(rabbitIdleAttention(3,800),0);assert.ok(rabbitIdleAttention(3,80)>.5);
});
check('all atlas poses use the same source-to-world scale and a consistent foot edge',()=>{
 for(const views of Object.values({...rabbitAtlasFrames,...rabbitDiagonalFrames}))for(const frame of Object.values(views)){
  const [u0,v0,u1,v1]=frame.uv;assert.ok(u0>=0&&v0>=0&&u1<=1&&v1<=1&&u1>u0&&v1>v0);
  near(frame.width/((u1-u0)*1024),.46);near(frame.height/((v1-v0)*1536),.46);
  assert.ok(frame.footInset>=0&&frame.footInset<4);
 }
});
check('diagonal and cardinal drawings retain stance proportions without a scale pop',()=>{
 for(const views of Object.values({...rabbitAtlasFrames,...rabbitDiagonalFrames})){
  const planted=rabbitPoseDimensions(views.planted,views.planted.height);near(planted.height,166);
  for(const frame of Object.values(views)){
   const normalized=rabbitPoseDimensions(frame,views.planted.height);
   near(normalized.width/normalized.height,frame.width/frame.height);
   near(normalized.height/planted.height,frame.height/views.planted.height);
   assert.ok(normalized.footInset<2);
  }
 }
});
check('release and early restart preserve a hop instead of snapping its height',()=>{
 let state=emptyRabbitGait();
 while(state.phase<.55)state=advanceRabbitGait(state,3,1/60,true);
 assert.ok(state.lift>5);
 const released=advanceRabbitGait(state,0,1/120,false);
 assert.ok(Math.abs(released.lift-state.lift)<3);
 near(released.phase,state.phase);
 const resumed=advanceRabbitGait(released,1.5,1/120,true);
 assert.ok(resumed.lift>5,'a resumed hop may not reset to ground');
 assert.ok(Math.abs(resumed.lift-released.lift)<3);
 assert.ok(resumed.phase>released.phase&&resumed.phase-released.phase<.03);
 state=resumed;
 for(let i=0;i<90;i++)state=advanceRabbitGait(state,0,1/60,false);
 near(state.lift,0);near(state.liftVelocity,0);near(state.phase,0);
});
check('spring landing has the same height and velocity across desktop frame rates',()=>{
 const results=[30,60,120].map(fps=>{
  let state={value:20,velocity:90};
  for(let i=0;i<fps*.2;i++)state=rabbitSpring(state.value,state.velocity,0,1/fps);
  return state;
 });
 for(const state of results){near(state.value,results[0].value);near(state.velocity,results[0].velocity);assert.ok(state.value<1);}
});
check('head anticipates a turn while torso rotation stays bounded and settles',()=>{
 let state=emptyRabbitTurn({x:1,y:0});
 for(let i=0;i<6;i++)state=advanceRabbitTurn(state,{x:1,y:0},{x:0,y:1},1/60);
 near(state.bodyAngle,0);assert.ok(state.headAngle>.45&&state.headAngle<=.62);
 for(let i=0;i<120;i++){
  const previous=state;
  state=advanceRabbitTurn(state,{x:0,y:1},{x:0,y:1},1/60);
  assert.ok(Math.abs(state.bodyAngle-previous.bodyAngle)<=6/60+1e-8);
  assert.ok(Math.abs(state.headAngle-state.bodyAngle)<=.62+1e-8);
 }
 near(state.bodyAngle,Math.PI/2);near(state.headAngle,Math.PI/2);
 near(state.angularVelocity,0,.001);
});
check('heading across minus/plus pi uses the short turn with no full-spin artifact',()=>{
 const vector=angle=>({x:Math.cos(angle),y:Math.sin(angle)});
 let state=emptyRabbitTurn(vector(Math.PI-.02));
 const start=state.bodyAngle;
 for(let i=0;i<90;i++)state=advanceRabbitTurn(state,vector(-Math.PI+.02),vector(-Math.PI+.02),1/60);
 near(state.bodyAngle-start,.04);
 assert.ok(Math.abs(state.headAngle-state.bodyAngle)<.001);
});
check('equal distance at ordinary frame rates has consistent stride progress',()=>{
 const results=[];for(const fps of [30,60,120]){let state=emptyRabbitGait();for(let i=0;i<fps*2;i++)state=advanceRabbitGait(state,150/fps,1/fps,true);results.push(state.phase);}
 assert.ok(Math.max(...results)-Math.min(...results)<.03);
});
if(failures)process.exitCode=1;
