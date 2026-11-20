import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';
import { PerspectiveCamera, Vector3 } from 'three';
// Node strips TS types; match the extension-free relative imports used by Vite.
registerHooks({resolve(specifier,context,nextResolve){
  if(specifier.startsWith('.')&&!extname(specifier)&&context.parentURL?.includes('/src/'))return nextResolve(`${specifier}.ts`,context);
  return nextResolve(specifier,context);
}});
const { depthCamera, depthProject, depthVisibility, depthFocusPose, terrainHeight, BILLBOARD_TILT }=await import('../src/scene/depthWorld.ts');
const { objects, constrainPose }=await import('../src/scene/world.ts');
const { groundVelocity, SHARED_RABBIT_FOOT_OFFSET }=await import('../src/scene/meadowMotion.ts');
const { wheelJourney }=await import('../src/scene/journey.ts');
const { encounterRadius }=await import('../src/scene/meadowWorld.ts');

let failures=0,projectionSamples=0;
const check=(name,fn)=>{try{fn();console.log(`PASS: ${name}`);}catch(error){failures++;console.error(`FAIL: ${name}: ${error.message}`);}};
const near=(a,b,epsilon=1e-6)=>assert.ok(Math.abs(a-b)<epsilon,`${a} ≠ ${b}`);
const viewports=[[1280,720],[1440,900],[1920,1080],[2560,1080]];
const poses=[{x:0,y:0,zoom:1},{x:-600,y:800,zoom:1},{x:550,y:1700,zoom:1.18},{x:-250,y:2570,zoom:1.18}];
function actualCamera(pose,width,height){
  const c=depthCamera(pose,width,height),camera=new PerspectiveCamera(c.fov,width/height,1,18000);
  camera.position.set(c.x,c.y,c.z);camera.up.set(0,0,1);camera.lookAt(c.x,c.targetY,c.targetZ);
  camera.updateProjectionMatrix();camera.updateMatrixWorld();return camera;
}
function actualProject(point,camera,width,height){
  const p=new Vector3(point.x,point.y,point.z).project(camera);
  return {x:(p.x+1)*width/2,y:(1-p.y)*height/2};
}
check('shared depth projection agrees with the actual Three perspective camera',()=>{
  for(const [width,height]of viewports)for(const pose of poses){
    const camera=actualCamera(pose,width,height);
    for(const dx of [-450,0,450])for(const dy of [-220,500,1600]){
      const x=pose.x+dx,y=pose.y+dy,z=terrainHeight(x,y);
      const shared=depthProject(x,y,pose,width,height,z),actual=actualProject({x,y,z},camera,width,height);
      near(shared.x,actual.x);near(shared.y,actual.y);projectionSamples++;
    }
  }
});
check('upright billboard dimensions match the accessible projected object bounds',()=>{
  for(const [width,height]of viewports)for(const object of objects){
    const pose=depthFocusPose(object.id,width,height,true),camera=actualCamera(pose,width,height);
    const foot={x:object.x,y:object.y,z:terrainHeight(object.x,object.y)};
    const p=depthProject(foot.x,foot.y,pose,width,height,foot.z);
    const top={x:foot.x,y:foot.y+Math.cos(BILLBOARD_TILT)*object.height,z:foot.z+Math.sin(BILLBOARD_TILT)*object.height};
    const actual=actualProject(top,camera,width,height);
    near(actual.x,p.x);near(p.y-actual.y,object.height*p.scale);
  }
});
check('near landmarks are larger than distant landmarks under the same camera',()=>{
  for(const [width,height]of viewports)for(const pose of poses){
    const nearPoint=depthProject(pose.x,pose.y-220,pose,width,height);
    const farPoint=depthProject(pose.x,pose.y+1600,pose,width,height);
    assert.ok(nearPoint.scale>farPoint.scale*1.7);
    assert.ok(nearPoint.y>farPoint.y);
  }
});
check('every landmark is reachable and completely framed at all tested desktop sizes',()=>{
  for(const [width,height]of viewports)for(const object of objects){
    const reached=constrainPose({x:object.x,y:object.y+SHARED_RABBIT_FOOT_OFFSET,zoom:1},width,height);
    const actor={x:reached.x,y:reached.y-SHARED_RABBIT_FOOT_OFFSET};
    assert.ok(Math.hypot(actor.x-object.x,actor.y-object.y)<encounterRadius,`${width}×${height} ${object.id} unreachable`);
    for(const reading of [false,true]){
      const pose=depthFocusPose(object.id,width,height,reading),p=depthProject(object.x,object.y,pose,width,height);
      assert.ok(p.x-object.width*p.scale/2>0&&p.x+object.width*p.scale/2<width,`${object.id} horizontal clipping`);
      assert.ok(p.y-object.height*p.scale>0&&p.y<height,`${object.id} vertical clipping`);
      assert.ok(depthVisibility(object,pose,width,height)>.5);
    }
  }
});
check('horizon and terrain edges stay finite; behind-camera targets are not interactive',()=>{
  const pose={x:0,y:0,zoom:1};
  for(const x of [-7000,0,7000])for(const y of [-5000,0,5000,11000,1e6]){
    const p=depthProject(x,y,pose,1440,900);
    assert.ok(Object.values(p).every(Number.isFinite));assert.ok(p.scale>0);
  }
  assert.equal(depthVisibility({x:0,y:-5000,width:180,height:220},pose,1440,900),0);
});
check('pointer-to-ground conversion tracks screen directions on sloped terrain',()=>{
  for(const pose of poses){
    const actor={x:pose.x+40,y:pose.y-180},width=1440,height=900;
    const foot=depthProject(actor.x,actor.y,pose,width,height);
    const axisX=depthProject(actor.x+1,actor.y,pose,width,height),axisY=depthProject(actor.x,actor.y+1,pose,width,height);
    for(const [dx,dy]of [[200,0],[-200,0],[0,-200],[0,200],[200,-200],[-200,200]]){
      const velocity=groundVelocity({x:foot.x+dx,y:foot.y+dy},foot,axisX,axisY);
      const next=depthProject(actor.x+velocity.x*.01,actor.y+velocity.y*.01,pose,width,height);
      const screen={x:next.x-foot.x,y:next.y-foot.y};
      const alignment=(screen.x*dx+screen.y*dy)/(Math.hypot(screen.x,screen.y)*Math.hypot(dx,dy));
      assert.ok(alignment>.999,`ground heading alignment ${alignment}`);
    }
  }
});
check('wheel down advances into the +y garden and wheel up retraces it',()=>{
  const start={x:10,y:20,zoom:1},down=wheelJourney(start,30,-80,1);
  assert.equal(down.y,100);assert.equal(down.x,40);
  assert.deepEqual(wheelJourney(down,-30,80,1),start);
});
console.log(`Compared ${projectionSamples} ground points with Three.js.`);
if(failures)process.exitCode=1;
