import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';
registerHooks({resolve(specifier,context,nextResolve){if(specifier.startsWith('.')&&!extname(specifier)&&context.parentURL?.includes('/src/'))return nextResolve(`${specifier}.ts`,context);return nextResolve(specifier,context);}});
const { groundVelocity, steerMeadow, emptyMeadowDynamics, followMeadowCamera, advanceMeadow, advanceMeadowLook, meadowPressIntent, MEADOW_SPEED, MEADOW_MAX_CAMERA_LEAD, SHARED_RABBIT_FOOT_OFFSET, MEADOW_CAMERA_FREE_ZONE, keyboardMeadowVelocity, wheelMeadowVelocity, wheelMeadowDuration } = await import('../src/scene/meadowMotion.ts');
const { constrainPose, panBounds } = await import('../src/scene/world.ts');
const { depthProject, terrainHeight } = await import('../src/scene/depthWorld.ts');

let failures=0;
const check=(name,fn)=>{try{fn();console.log(`PASS: ${name}`);}catch(error){failures++;console.error(`FAIL: ${name}: ${error.message}`);}};
const near=(a,b,epsilon=1e-7)=>assert.ok(Math.abs(a-b)<epsilon,`${a} ≠ ${b}`);
const origin={x:0,y:0,zoom:1};
const startActor={x:0,y:-SHARED_RABBIT_FOOT_OFFSET};
// The controller carries acceleration and angular velocity between frames.
// Resetting its fifth argument each frame does not represent the live hook.
const step=(state,target,dt=1/60)=>steerMeadow(state.heading,state.speed,target,dt,state);
const initial=(heading={x:1,y:0},speed=0)=>({heading,speed,velocity:{x:heading.x*speed,y:heading.y*speed},...emptyMeadowDynamics()});
check('pointer direction compensates ground perspective, including off-centre shear',()=>{
  const foot={x:720,y:640}, axisX={x:721,y:640}, axisY={x:720.2,y:639.5};
  const world=groundVelocity({x:920,y:440},foot,axisX,axisY);
  const screen={x:world.x+.2*world.y,y:-.5*world.y};
  near(screen.x,-screen.y); near(Math.hypot(world.x,world.y),MEADOW_SPEED);
  assert.deepEqual(groundVelocity(foot,foot,axisX,axisY),{x:0,y:0});
});
check('rabbit accelerates into a stride without instant full-speed sliding',()=>{
  const first=step(initial(),{x:240,y:0});
  assert.ok(first.speed>0 && first.speed<MEADOW_SPEED*.2);
  let state=first;
  for(let i=1;i<120;i++){
    const previous=state.speed;
    state=step(state,{x:240,y:0});
    assert.ok(state.speed>=previous && state.speed<=MEADOW_SPEED,'acceleration must approach its target without overshoot');
    if(i===20)assert.ok(state.speed>MEADOW_SPEED*.9,'a soft start must still reach a useful stride within 350 ms');
  }
  near(state.speed,MEADOW_SPEED,1e-6);near(state.velocity.x,MEADOW_SPEED,1e-6);
});
check('sharp reversal turns smoothly and reaches the opposite direction',()=>{
  let state=initial({x:1,y:0},240);
  const first=step(state,{x:-240,y:0});
  assert.ok(first.heading.x>0 && first.heading.y>0);
  assert.ok(first.speed>210&&first.speed<240,'reversing must brake smoothly instead of snapping to zero');
  let position={...origin},outward=0;
  for(let i=0;i<36;i++){
    state=step(state,{x:-240,y:0});
    position=advanceMeadow(position,state.velocity,1/60);outward=Math.max(outward,position.x);
  }
  assert.ok(outward<35,'a reversal must stay compact');
  assert.ok(position.x<0,'a reversal must recover its initial outward travel within 600 ms');
  for(let i=0;i<144;i++)state=step(state,{x:-240,y:0});
  near(state.heading.x,-1);near(state.heading.y,0);near(state.velocity.x,-240);
});
check('ordinary quarter turns keep a continuous stride without a planted pause',()=>{
  let state=initial({x:1,y:0},180);
  for(let i=0;i<30;i++){
    const previous=state.speed;
    state=step(state,{x:0,y:180});
    assert.ok(state.speed>70,'ordinary turn cannot repeatedly reset the gait');
    assert.ok(Math.abs(state.speed-previous)<18,'speed change must remain bounded');
  }
  assert.ok(state.heading.y>.99 && state.speed>180*.95,'a quarter turn must be travelling in its new direction within 500 ms');
  for(let i=0;i<150;i++)state=step(state,{x:0,y:180});
  near(state.heading.y,1);near(state.speed,180);
});
check('the camera follows the stride with bounded lag and directional framing',()=>{
  let camera=origin,actor=startActor,look={x:0,y:0},unframed=origin,state=initial();
  for(let i=0;i<240;i++){
    state=step(state,{x:240,y:0});
    const advanced=advanceMeadow({...actor,zoom:1},state.velocity,1/60);
    actor={x:advanced.x,y:advanced.y};
    look=advanceMeadowLook(look,state.heading,state.speed,1/60);
    camera=followMeadowCamera(camera,actor,1/60,true,{...state,lead:look});
    unframed=followMeadowCamera(unframed,actor,1/60);
    assert.ok(actor.x>camera.x);
    assert.ok(Math.hypot(actor.x-camera.x,actor.y+220-camera.y)<=MEADOW_MAX_CAMERA_LEAD+1e-7);
    if(i<10)assert.equal(camera,origin,'the first small steps must not jerk the camera');
  }
  assert.ok(actor.x-camera.x<MEADOW_CAMERA_FREE_ZONE,'sustained travel must bring the companion back into the quiet framing zone');
  assert.ok(camera.x>unframed.x+120,'directional framing must show more ground ahead than a trailing camera');
});
check('explicit cancellation freezes actor and camera even with existing follow lag',()=>{
  const camera={x:120,y:75,zoom:1}; const actor={x:172,y:-130};
  assert.equal(followMeadowCamera(camera,actor,1/60,false),camera);
  const actorPose={...actor,zoom:1};
  assert.equal(advanceMeadow(actorPose,{x:240,y:0},1/60,false),actorPose);
  // Zero target velocity is natural braking. Explicit cancellation bypasses
  // integration; the mounted hook checks that it also clears controller state.
});
check('long frames cannot leap the character or let it outrun the camera',()=>{
  near(advanceMeadow(origin,{x:240,y:0},30).x,12);
  const followed=followMeadowCamera(origin,{x:1000,y:0},30);
  assert.ok(Math.hypot(1000-followed.x,220-followed.y)<=MEADOW_MAX_CAMERA_LEAD+1e-7);
  assert.equal(followMeadowCamera(origin,startActor,NaN),origin);
});
check('turning at a world edge can reverse without getting stuck outside bounds',()=>{
  const bounds=panBounds(1440,900);
  let actor={x:bounds.x,y:0},state=initial();
  for(let i=0;i<90;i++){
    state=step(state,{x:-240,y:0});
    const advanced=advanceMeadow({...actor,y:actor.y+220,zoom:1},state.velocity,1/60);
    const clamped=constrainPose(advanced,1440,900);
    actor={x:clamped.x,y:clamped.y-220};
    assert.ok(actor.x<=bounds.x,'turning must not escape the world boundary');
  }
  assert.ok(actor.x<bounds.x-40);
});
check('camera damping is stable at ordinary desktop frame rates',()=>{
  const results=[];
  for(const fps of [30,60,120]){
    let camera=origin,actor=startActor;
    for(let i=0;i<fps*2;i++){
      const advanced=advanceMeadow({...actor,zoom:1},{x:240,y:0},1/fps);
      actor={x:advanced.x,y:advanced.y};camera=followMeadowCamera(camera,actor,1/fps);
    }
    results.push(camera.x);
  }
  assert.ok(Math.max(...results)-Math.min(...results)<8);
});
check('pointer speed offers a broad careful-walk range',()=>{
  const foot={x:0,y:0},xAxis={x:1,y:0},yAxis={x:0,y:-1};
  const speeds=[20,45,90,150,230].map(x=>Math.hypot(...Object.values(groundVelocity({x,y:0},foot,xAxis,yAxis))));
  assert.ok(speeds.every((value,i)=>i===0||value>speeds[i-1]));
  assert.ok(speeds[1]<70);assert.ok(speeds[2]>60&&speeds[2]<140);near(speeds[4],MEADOW_SPEED);
});
check('keyboard diagonals and wheel impulses use bounded walking velocities',()=>{
  const keyboard=keyboardMeadowVelocity(new Set(['KeyW','KeyD']));
  assert.ok(keyboard.x>0&&keyboard.y>0);near(Math.hypot(keyboard.x,keyboard.y),MEADOW_SPEED*.82);
  assert.deepEqual(keyboardMeadowVelocity(new Set(['KeyW','KeyS'])),{x:0,y:0});
  const wheel=wheelMeadowVelocity(3000,3000);near(Math.hypot(wheel.x,wheel.y),MEADOW_SPEED);
  let state=steerMeadow({x:1,y:0},0,wheel,1/60);
  const next=advanceMeadow(origin,state.velocity,1/60);
  assert.ok(Math.hypot(next.x,next.y)<4,'wheel cannot teleport a full event delta');
});
check('camera gives room for the first steps and direction-dependent framing',()=>{
  assert.equal(followMeadowCamera(origin,{x:MEADOW_CAMERA_FREE_ZONE*.5,y:-220},1/60),origin);
  const actor={x:300,y:100};
  const right=followMeadowCamera(origin,actor,1/60,true,{heading:{x:1,y:0},speed:240});
  const left=followMeadowCamera(origin,actor,1/60,true,{heading:{x:-1,y:0},speed:240});
  assert.ok(right.x>left.x);assert.equal(followMeadowCamera(right,actor,1/60,false,{heading:{x:1,y:0},speed:240}),right);
});
check('a single wheel gesture survives a full reversal and walks in both directions',()=>{
  let actor={...origin},heading={x:0,y:-1};
  for(const sign of [1,-1]){
    const velocity=wheelMeadowVelocity(0,sign*120),duration=wheelMeadowDuration(heading,velocity)/1000;
    assert.ok(duration>.75&&duration<=.85,'reversal must budget turn plus a bounded stride');
    const start={...actor};let state=initial(heading);
    for(let frame=0;frame<Math.ceil(duration*60);frame++){
      const remaining=Math.max(0,Math.min(1,(duration-frame/60)/.13));
      state=step(state,{x:velocity.x*remaining,y:velocity.y*remaining});
      actor=advanceMeadow(actor,state.velocity,1/60);
    }
    assert.ok((actor.y-start.y)*sign>20,`single ${sign>0?'down':'up'} wheel did not walk after turning`);
    const brakingStart={...actor};
    for(let frame=0;frame<30;frame++){
      const priorSpeed=state.speed;
      state=step(state,{x:0,y:0});
      actor=advanceMeadow(actor,state.velocity,1/60);
      assert.ok(state.speed<=priorSpeed,'an expired wheel must brake monotonically');
    }
    assert.equal(state.speed,0,'an expired wheel must settle within 500 ms');
    assert.ok(Math.hypot(actor.x-brakingStart.x,actor.y-brakingStart.y)<MEADOW_SPEED*.3*.55,'wheel braking must remain a short settle');
    const stopped={...actor};
    for(let frame=0;frame<60;frame++){
      state=step(state,{x:0,y:0});
      actor=advanceMeadow(actor,state.velocity,1/60);
      assert.deepEqual(actor,stopped,'an expired wheel must not resume drifting');
    }
    heading=state.heading;
  }
  near(wheelMeadowDuration({x:0,y:1},{x:0,y:240}),260);
});
check('a blank-ground press anticipates immediately without moving before the click guard',()=>{
  let actor={...origin};
  for(let ms=0;ms<90;ms+=10){
    const intent=meadowPressIntent(ms,false,false);
    assert.equal(intent.anticipating,true);assert.equal(intent.walking,false);
    actor=advanceMeadow(actor,{x:240,y:0},.01,intent.walking);
  }
  assert.deepEqual(actor,origin);assert.equal(meadowPressIntent(90,false,false).walking,true);
  for(const ms of [0,50,90,500])assert.deepEqual(meadowPressIntent(ms,true,false),{anticipating:false,walking:false});
  assert.deepEqual(meadowPressIntent(90,true,true),{anticipating:true,walking:true});
});
check('camera look reverses gently and remains exactly frozen after release',()=>{
  let look={x:190,y:0};
  const next=advanceMeadowLook(look,{x:-1,y:0},240,1/60);
  assert.ok(next.x>170,'a sharp turn cannot instantly flip camera look');
  for(let i=0;i<60;i++)look=advanceMeadowLook(look,{x:-1,y:0},240,1/60);
  assert.ok(look.x< -160);
  assert.equal(advanceMeadowLook(look,{x:1,y:0},240,1/60,false),look);
  const camera={x:110,y:20,zoom:1};
  assert.equal(followMeadowCamera(camera,{x:500,y:50},1/60,false,{heading:{x:-1,y:0},speed:240,lead:look}),camera);
});
check('smooth camera look is independent of frame rate for a held direction',()=>{
  const results=[30,60,120].map(fps=>{
    let look={x:190,y:0};
    for(let i=0;i<fps;i++)look=advanceMeadowLook(look,{x:0,y:1},180,1/fps);
    return look;
  });
  for(const look of results){near(look.x,results[0].x);near(look.y,results[0].y);}
});
check('ridge steering retains forward, backward and diagonal intent on a horizontal tangent',()=>{
  for(const actor of [{x:114,y:-592},{x:97,y:-554},{x:-120,y:-480}])for(const offset of [-180,0,180]){
    const pose={x:actor.x+offset,y:actor.y+220,zoom:1},z=terrainHeight(actor.x,actor.y);
    const foot=depthProject(actor.x,actor.y,pose,1440,900,z);
    const axisX=depthProject(actor.x+1,actor.y,pose,1440,900,z);
    const axisY=depthProject(actor.x,actor.y+1,pose,1440,900,z);
    assert.ok(axisY.y<foot.y,'forward must project upward even on the far side of the ridge');
    for(const [dx,dy] of [[0,-180],[0,180],[-180,-180],[180,180]]){
      const velocity=groundVelocity({x:foot.x+dx,y:foot.y+dy},foot,axisX,axisY);
      const projected={x:(axisX.x-foot.x)*velocity.x+(axisY.x-foot.x)*velocity.y,y:(axisX.y-foot.y)*velocity.x+(axisY.y-foot.y)*velocity.y};
      assert.ok(velocity.y*dy<0,'terrain slope must not reverse north/south steering');
      const inputLength=Math.hypot(dx,dy),projectedLength=Math.hypot(projected.x,projected.y);
      near(projected.x/projectedLength,dx/inputLength,1e-6);near(projected.y/projectedLength,dy/inputLength,1e-6);
    }
  }
});
check('the reported hillside hold walks northwest instead of oscillating near the ridge',()=>{
  let actor={x:114,y:-592},camera={x:114,y:-372,zoom:1},look={x:0,y:0};
  let state=initial({x:0,y:1});
  const start={...actor};
  for(let i=0;i<150;i++){
    const z=terrainHeight(actor.x,actor.y),foot=depthProject(actor.x,actor.y,camera,1440,900,z);
    const axisX=depthProject(actor.x+1,actor.y,camera,1440,900,z),axisY=depthProject(actor.x,actor.y+1,camera,1440,900,z);
    const target=groundVelocity({x:480,y:350},foot,axisX,axisY);
    assert.ok(target.x<0&&target.y>0,'a held upper-left pointer must retain northwest intent');
    state=step(state,target);
    actor=advanceMeadow({...actor,zoom:1},state.velocity,1/60);
    look=advanceMeadowLook(look,state.heading,state.speed,1/60);
    camera=followMeadowCamera(camera,actor,1/60,true,{...state,lead:look});
  }
  assert.ok(actor.x<start.x-100&&actor.y>start.y+200,`insufficient progress: ${JSON.stringify(actor)}`);
});
if(failures)process.exitCode=1;
