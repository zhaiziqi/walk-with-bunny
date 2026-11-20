import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';
registerHooks({resolve(specifier,context,nextResolve){
 if(specifier.startsWith('.')&&!extname(specifier)&&context.parentURL?.includes('/src/'))return nextResolve(`${specifier}.ts`,context);
 return nextResolve(specifier,context);
}});
const { paths, regions, pathDistance, playBounds }=await import('../src/scene/gardenAtlas.ts');
const { terrainHeight, depthTrees, landmarkReveal, depthVisibility, depthFocusPose, depthProject, depthCamera }=await import('../src/scene/depthWorld.ts');
const { objects, HOME }=await import('../src/scene/world.ts');
const { MEADOW_SPEED }=await import('../src/scene/meadowMotion.ts');
const path=paths.find(item=>item.id==='entry-lantern'),entry=regions.find(item=>item.id==='entry'),lantern=objects.find(item=>item.id==='puzzle');
let failures=0;
const check=(name,fn)=>{try{fn();console.log(`PASS: ${name}`);}catch(error){failures++;console.error(`FAIL: ${name}: ${error.message}`);}};
const length=path.points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-path.points[i].x,p.y-path.points[i].y),0);
check('the first trail contains a substantial walk and a visible change of direction',()=>{
 assert.ok(length>3000,`only ${length.toFixed(0)} world units`);
 assert.ok(length/MEADOW_SPEED>12,`only ${(length/MEADOW_SPEED).toFixed(1)} seconds at maximum speed`);
 assert.ok(Math.max(...path.points.map(p=>p.x))>350,'right shoulder is missing');
 assert.ok(Math.min(...path.points.map(p=>p.x))<-800,'left clearing approach is missing');
 assert.deepEqual(path.points[0],{x:entry.x,y:entry.y});
 assert.deepEqual(path.points.at(-1),{x:lantern.x,y:lantern.y});
 console.log(`  ${Math.round(length)} units; ${(length/MEADOW_SPEED).toFixed(1)} seconds at maximum speed, before pauses or turns.`);
});
check('the route follows continuous walkable grades around the painted bank',()=>{
 const crest=terrainHeight(-240,-680),shoulder=terrainHeight(420,-850);
 // Historical low-angle scenery required a >150-unit ridge. The approved
 // elevated view uses a lower painted bank; absolute height is no longer the
 // occlusion contract. Keep the existing .68 maximum walking grade and sample
 // inside every segment, including tiny steps, to catch ledges/discontinuities.
 assert.ok(pathDistance(-240,-680).distance>190,'the route cuts across the ridge crest');
 let maximumGrade=0,samples=0;
 for(let i=1;i<path.points.length;i++){
  const a=path.points[i-1],b=path.points[i],distance=Math.hypot(b.x-a.x,b.y-a.y);
  const steps=Math.max(1,Math.ceil(distance/5)),step=distance/steps,dx=(b.x-a.x)/distance,dy=(b.y-a.y)/distance;
  let previous=terrainHeight(a.x,a.y);
  for(let j=1;j<=steps;j++){
   const x=a.x+dx*step*j,y=a.y+dy*step*j,z=terrainHeight(x,y);
   assert.ok(Number.isFinite(z));
   const grade=Math.abs(z-previous)/step;
   const tinyGrade=Math.abs(terrainHeight(x+dx*.01,y+dy*.01)-terrainHeight(x-dx*.01,y-dy*.01))/.02;
   maximumGrade=Math.max(grade,tinyGrade,maximumGrade);samples++;
   assert.ok(grade<.68&&tinyGrade<.68,`steep or discontinuous trail near ${x.toFixed(0)},${y.toFixed(0)}; grade ${Math.max(grade,tinyGrade).toFixed(3)}`);
   assert.ok(x>=playBounds.minX&&x<=playBounds.maxX&&y>=playBounds.minY&&y<=playBounds.maxY);
   previous=z;
  }
 }
 console.log(`  Bank ${(crest-shoulder).toFixed(0)} units above shoulder; ${samples} samples, maximum grade ${(maximumGrade*100).toFixed(1)}%.`);
});
check('both directions keep the rabbit lower body clear of the ridge under camera follow',()=>{
 // The release/reversal screenshot exposed an actual occlusion. Probe the first route with
 // realistic forward and reverse camera leads instead of checking only the landmark views.
 for(const [index,actor]of path.points.entries())for(const direction of[-1,1]){
  const before=path.points[Math.max(0,index-1)],after=path.points[Math.min(path.points.length-1,index+1)];
  const length=Math.hypot(after.x-before.x,after.y-before.y);
  const pose={x:actor.x+(after.x-before.x)/length*150*direction,y:actor.y+220+(after.y-before.y)/length*150*direction,zoom:1};
  const camera=depthCamera(pose,1280,720),body=terrainHeight(actor.x,actor.y)+35;
  for(let i=2;i<100;i++){
   const t=i/100,x=camera.x+(actor.x-camera.x)*t,y=camera.y+(actor.y-camera.y)*t,z=camera.z+(body-camera.z)*t;
   assert.ok(z>terrainHeight(x,y),`ridge hides lower body near ${actor.x.toFixed(0)},${actor.y.toFixed(0)}; direction ${direction}`);
  }
 }
});
check('entrance frames the path while the lantern remains undisclosed',()=>{
 assert.equal(landmarkReveal(lantern,entry),0);
 assert.equal(landmarkReveal(lantern,{x:lantern.x,y:lantern.y}),1);
 assert.equal(landmarkReveal(lantern,entry,true),1,'explicit reading must still frame a selected object');
 const firstTrees=depthTrees.filter(tree=>tree.y<-900);
 assert.ok(firstTrees.length>0&&firstTrees.length<=2,'the entrance should retain an isolated side frame, not paired tree rows');
 for(const [w,h]of [[1280,720],[1440,900],[1920,1080],[2560,1080]]){
  const foot=depthProject(entry.x,entry.y,HOME,w,h);
  assert.ok(foot.x>w*.1&&foot.x<w*.9&&foot.y>h*.3&&foot.y<h*.85,`${w}×${h} rabbit outside the main field`);
 }
});
check('landmark reveal is bounded and continuous; close targets remain visible and distant clues stay hidden',()=>{
 // The old test equated a legacy fog curve with terrain rendering. FloofTerrain
 // now has its own distant pigment wash. Verify the actual discovery and target
 // visibility contract instead of imposing old shader endpoints on new art.
 for(let angle=0;angle<Math.PI*2;angle+=Math.PI/4){
  const at=distance=>landmarkReveal(lantern,{x:lantern.x+Math.cos(angle)*distance,y:lantern.y+Math.sin(angle)*distance});
  assert.equal(at(1300),0,'unvisited far landmarks must not appear');
  assert.equal(at(600),1,'close silhouettes must be complete');
  assert.ok(at(900)>0&&at(900)<1,'the approach must contain a gradual reveal');
  let previous=0;
  for(let distance=1300;distance>=0;distance-=25){
   const reveal=at(distance);
   assert.ok(Number.isFinite(reveal)&&reveal>=previous-1e-10&&reveal>=0&&reveal<=1);
   previous=reveal;
  }
  for(const boundary of [700,1120])assert.ok(Math.abs(at(boundary-.01)-at(boundary+.01))<.001,'crossing a reveal boundary must not pop');
 }
 for(const [width,height]of [[1280,720],[1440,900],[1920,1080],[2560,1080]]){
  const pose=depthFocusPose('puzzle',width,height,false);
  const near=depthVisibility(lantern,pose,width,height);
  assert.ok(near>.9,`${width}×${height}: a reached landmark is faded or clipped`);
  const distant={...lantern,y:lantern.y+3000};
  const far=depthVisibility(distant,pose,width,height);
  assert.ok(Number.isFinite(far)&&far>=0&&far<near,'distant targets cannot be clearer than the reached silhouette');
  assert.equal(depthVisibility({...lantern,y:pose.y-5000},pose,width,height),0,'targets behind the camera cannot receive clicks');
  assert.equal(depthVisibility({...lantern,x:pose.x+10000},pose,width,height),0,'offscreen targets cannot receive clicks');
 }
});
if(failures)process.exitCode=1;
