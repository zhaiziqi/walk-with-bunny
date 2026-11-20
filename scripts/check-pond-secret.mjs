import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';
registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/src/') ? `${specifier}.ts` : specifier, context);
} });
const { createPondListening, advancePondListening, resumePondListening } = await import('../src/scene/pondListening.ts');
const { pondSecretPose, pondReflectionCenter } = await import('../src/scene/pondReflection.ts');
const { depthProject, terrainHeight, BILLBOARD_TILT } = await import('../src/scene/depthWorld.ts');
const { pondFootprint } = await import('../src/scene/orchardPond.ts');
const center={x:pondFootprint.x,y:pondFootprint.y};
const bank=angle=>({x:center.x+Math.cos(angle)*420,y:center.y+Math.sin(angle)*290});
let checks=0,failures=0;
function check(name,fn){checks++;try{fn();console.log(`PASS: ${name}`);}catch(error){failures++;console.error(`FAIL: ${name}\n${error.stack}`);}}
function hold(state,seconds,{fps=60,speed=0,actor=state.actor,observe,...options}={}){
 const count=Math.ceil(seconds*fps),dt=seconds/count;
 for(let i=0;i<count;i++){state=advancePondListening(state,typeof actor==='function'?actor(i,dt):actor,dt,{speed,...options});observe?.(state,i,dt);}
 return state;
}
function approach(angle=-Math.PI/2,fps=60){
 const target=bank(angle), start={x:target.x+Math.cos(angle)*340,y:target.y+Math.sin(angle)*340};
 let state=createPondListening(start);const count=Math.ceil(340/190*fps),dt=340/190/count;
 for(let i=1;i<=count;i++){const t=i/count;state=advancePondListening(state,{x:start.x+(target.x-start.x)*t,y:start.y+(target.y-start.y)*t},dt,{speed:190});}
 return state;
}
function startSecret(state=approach(),fps=60){
 for(let i=0;i<fps*6&&state.secretAge<0;i++)state=advancePondListening(state,state.actor,1/fps,{speed:0});
 assert.ok(state.secretAge>=0,'a genuine quiet visit should eventually reveal its secret');return state;
}
check('stationary mounting and map relocation cannot discover the secret',()=>{
 let state=hold(createPondListening(bank(0)),30);assert.equal(state.secretAge,-1);assert.equal(state.secretAmount,0);assert.equal(state.secretSeen,false);
 state=advancePondListening(createPondListening({x:0,y:0}),bank(0),1/60,{speed:190});state=hold(state,30);
 assert.equal(state.secretSeen,false);assert.equal(state.secretAmount,0);
});
check('real approach waits for three quiet seconds before the finite reflection begins',()=>{
 const arrival=approach(),early=hold(arrival,2.9);assert.equal(early.secretAge,-1);assert.equal(early.secretAmount,0);
 const start=startSecret(early);assert.ok(start.secretQuiet>=3);assert.equal(start.secretSeen,false);
 const peak=hold(start,1.6);assert.ok(peak.secretAmount>.95&&peak.secretSeen);
 const end=hold(peak,10);assert.equal(end.secretAmount,0);assert.equal(end.secretAge,4);assert.equal(end.secretSeen,true);
});
check('walking disperses emerging ears immediately and an unseen interruption can retry later',()=>{
 const early=hold(startSecret(),.45);assert.ok(early.secretAmount>.1&&!early.secretSeen);
 const stepped={x:early.actor.x+3,y:early.actor.y};
 const interrupted=advancePondListening(early,stepped,1/60,{speed:180});
 assert.equal(interrupted.secretAge,-1);assert.equal(interrupted.secretQuiet,0);assert.ok(interrupted.secretAmount<early.secretAmount);
 const brieflyStill=hold(interrupted,.8);assert.equal(brieflyStill.secretAge,-1);assert.ok(brieflyStill.secretAmount<.01);
 const retried=hold(startSecret(brieflyStill),1.6);assert.ok(retried.secretSeen&&retried.secretAmount>.95);
});
check('a completed secret never loops on a long pause or a later real return',()=>{
 let state=hold(startSecret(),1.6);assert.ok(state.secretSeen);
 state=hold(state,40);assert.equal(state.secretAmount,0);
 state=advancePondListening(state,{x:state.actor.x+600,y:state.actor.y},1/60);assert.ok(state.secretSeen);
 state=advancePondListening(state,bank(0),1/60);state=advancePondListening(state,{x:bank(0).x+1,y:bank(0).y},1/60,{speed:60});
 state=hold(state,30);assert.ok(state.engaged&&state.secretSeen);assert.equal(state.secretAge,-1);assert.equal(state.secretAmount,0);
});
check('reading and a same-place renderer handoff retain the exact partial secret',()=>{
 const state=hold(startSecret(),.8);
 assert.equal(advancePondListening(state,{x:0,y:0},20,{paused:true}),state);
 const resumed=resumePondListening(state,state.actor);assert.deepEqual(pondSecretPose(resumed),pondSecretPose(state));
 assert.equal(resumed.secretAge,state.secretAge);assert.equal(resumed.secretQuiet,state.secretQuiet);
 const jumped=resumePondListening(state,{x:state.actor.x+500,y:state.actor.y});assert.equal(jumped.secretAge,-1);assert.equal(jumped.secretAmount,0);assert.equal(jumped.secretSeen,false);
});
check('suspended or invalid frames cannot skip a hidden moment or consume discovery',()=>{
 const before=hold(startSecret(),.4), saved=JSON.stringify(before);
 const resumed=advancePondListening(before,before.actor,5);assert.equal(resumed.secretAge,before.secretAge);assert.equal(resumed.secretSeen,false);
 for(const delta of [NaN,0,-1,Infinity]) assert.equal(advancePondListening(before,before.actor,delta),before);
 assert.equal(advancePondListening(before,{x:NaN,y:1},1/60),before);assert.equal(JSON.stringify(before),saved);
});
check('the subtle uneven pair stays attached to the existing reflection on every bank',()=>{
 for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2,.7,2.4]){
  const state=hold(startSecret(approach(angle)),1.6),pose=pondSecretPose(state),reflection=pondReflectionCenter(state);
  assert.equal(pose.ears.length,2);assert.ok(pose.amount>.95);
  assert.notEqual(pose.ears[0].radiusY,pose.ears[1].radiusY);
  for(const ear of pose.ears){
   assert.ok(Object.values(ear).every(Number.isFinite));assert.ok(ear.opacity>.2&&ear.opacity<=.32);
   const inward=(center.x-state.source.x)*ear.x+(center.y-state.source.y)*ear.y;assert.ok(inward>0);
   for(let i=0;i<16;i++){
    const a=i*Math.PI/8,dx=Math.cos(a)*ear.radiusX*1.4,dy=Math.sin(a)*ear.radiusY*1.4;
    const x=reflection.x+ear.x+dx*Math.cos(ear.rotation)-dy*Math.sin(ear.rotation);
    const y=reflection.y+ear.y+dx*Math.sin(ear.rotation)+dy*Math.cos(ear.rotation);
    assert.ok(((x-center.x)/380)**2+((y-center.y)/250)**2<.97**2,'the readable ear contour remains in the painted water');
   }
  }
 }
});
check('the reflected body clears the companion silhouette at the captured south-bank camera',()=>{
 const actor={x:-1195.607734,y:2896.607679},camera={x:-1199.729242,y:3115.691387,zoom:1.18};
 const state={...createPondListening(actor),source:{x:-1196.7,y:2995.01}},saved=JSON.stringify(state);
 const reflection=pondReflectionCenter(state);
 const old=depthProject(state.source.x,state.source.y,camera,1280,720,terrainHeight(state.source.x,state.source.y)+5.8);
 const visible=depthProject(reflection.x,reflection.y,camera,1280,720,terrainHeight(reflection.x,reflection.y)+5.8);
 const top=depthProject(actor.x,actor.y+120*Math.cos(BILLBOARD_TILT),camera,1280,720,terrainHeight(actor.x,actor.y)+3+120*Math.sin(BILLBOARD_TILT));
 assert.ok(old.y>top.y,'the captured old position was hidden behind the companion');
 assert.ok(visible.y<top.y-12,'the quiet reflection must have clear space above the companion');
 assert.ok(Math.abs(Math.hypot(reflection.x-state.source.x,reflection.y-state.source.y)-80)<1e-7);
 assert.equal(JSON.stringify(state),saved,'the visual reflection inset must not move wave sources or state');
});
check('30, 60 and 120 FPS preserve the same wait, visible peak and finite release',()=>{
 const results=[30,60,120].map(fps=>{
  const start=startSecret(approach(-Math.PI/2,fps),fps),samples=[];let seenAt=-1;
  const end=hold(start,5,{fps,observe(state,index,dt){const t=(index+1)*dt;if(state.secretSeen&&seenAt<0)seenAt=t;if(Math.abs(t*2-Math.round(t*2))<1e-7)samples.push(state.secretAmount);}});
  return {samples,seenAt,end};
 });
 for(const result of results){assert.ok(result.seenAt>=1.15&&result.seenAt<1.3);assert.ok(result.end.secretAmount<.001);result.samples.forEach((x,i)=>assert.ok(Math.abs(x-results[1].samples[i])<.025));}
});
check('the first quiet secret does not alter the ripple or petal state',()=>{
 const initial=startSecret(),disabled={...initial,secretSeen:true,secretAge:-1};
 const shown=hold(initial,4),quiet=hold(disabled,4);
 assert.deepEqual(shown.ripples,quiet.ripples);assert.deepEqual(shown.petals,quiet.petals);
 assert.deepEqual(shown.source,quiet.source);assert.equal(shown.serial,quiet.serial);
});
console.log(`${checks-failures}/${checks} pond secret checks passed.`);process.exitCode=failures?1:0;
