import assert from 'node:assert/strict';
import { LARGE_POND_BANK as bank, constrainWalkableGround as constrain } from '../src/scene/walkableGround.ts';
import { advanceMeadow } from '../src/scene/meadowMotion.ts';

let failures = 0;
const check=(name,fn)=>{try{fn();console.log(`PASS: ${name}`);}catch(error){failures++;console.error(`FAIL: ${name}: ${error.message}`);}};
const near=(a,b,epsilon=1e-4)=>assert.ok(Math.abs(a-b)<epsilon,`${a} ≠ ${b}`);
const radius=p=>Math.hypot((p.x-bank.x)/bank.radiusX,(p.y-bank.y)/bank.radiusY);
const point=(x,y)=>({x:bank.x+x,y:bank.y+y});

check('points outside the pond remain exactly unchanged in every direction',()=>{
  for(let i=0;i<64;i++){
    const angle=i/64*Math.PI*2;
    const outside=point(Math.cos(angle)*bank.radiusX*1.1,Math.sin(angle)*bank.radiusY*1.1);
    Object.freeze(outside);assert.equal(constrain(outside),outside);
  }
  const far={x:0,y:-220};assert.equal(constrain(far),far);
});

check('approaching from all four sides stops on the correct bank',()=>{
  for(const [x,y,rx,ry]of [[410,0,420,0],[-410,0,-420,0],[0,280,0,290],[0,-280,0,-290]]){
    const result=constrain(point(x,y));
    near(result.x,bank.x+rx);near(result.y,bank.y+ry);assert.ok(radius(result)>=1);
  }
});

check('diagonal and interior destinations use the Euclidean nearest rim',()=>{
  for(const [x,y]of [[250,120],[-250,120],[250,-120],[-250,-120],[85,-140],[1,220],[150,1],[0,0],[110,0]]){
    const desired=point(x,y),projected=constrain(desired),distance=Math.hypot(projected.x-desired.x,projected.y-desired.y);
    near(radius(projected),1);
    for(let i=0;i<3600;i++){
      const angle=i/3600*Math.PI*2,candidate=point(Math.cos(angle)*bank.radiusX,Math.sin(angle)*bank.radiusY);
      assert.ok(distance<=Math.hypot(candidate.x-desired.x,candidate.y-desired.y)+1e-4,'projection is not the nearest bank');
    }
  }
});

check('diagonal walking slides along the curved bank with both axes free',()=>{
  let actor=point(0,-290),previous=actor;
  for(let i=0;i<80;i++){
    const desired={x:actor.x+5,y:actor.y+3};
    actor=constrain(desired,previous);
    assert.ok(radius(actor)>=1-1e-9,'walk entered water');
    assert.ok(Math.hypot(actor.x-previous.x,actor.y-previous.y)<7,'shore projection caused a jump');
    assert.ok(actor.x>=previous.x,'tangent motion was lost');
    previous=actor;
  }
  assert.ok(actor.x>bank.x+250&&actor.y>bank.y-220,'walking was locked to an axis');
});

check('walking directly into the bank stops, reversing leaves immediately, release does not drift',()=>{
  const start=point(0,-290);
  let actor=start;
  for(let i=0;i<50;i++)actor=constrain({x:actor.x,y:actor.y+4},actor);
  near(actor.x,start.x);near(actor.y,start.y);
  const away={x:actor.x-3,y:actor.y-4};assert.equal(constrain(away,actor),away);
  const pose={...away,zoom:1},stopped=advanceMeadow(pose,{x:200,y:200},1/60,false);
  assert.equal(stopped,pose);assert.equal(constrain(stopped,away),stopped);
});

check('saved submerged positions recover to a deterministic rim and preserve approach-side ties',()=>{
  const saved=point(80,-140),restored=constrain(saved);
  assert.ok(radius(restored)>=1);assert.ok(restored.y<bank.y);
  const center=point(0,0);
  near(constrain(center).y,bank.y-bank.radiusY);
  near(constrain(center,point(0,400)).y,bank.y+bank.radiusY);
  near(constrain(center,point(0,-400)).y,bank.y-bank.radiusY);
  const repeated=constrain(restored,restored);assert.equal(repeated,restored);
  assert.deepEqual(saved,point(80,-140),'saved object was mutated');
});

check('near-axis numerical cases stay finite and nonfinite input delegates to existing bounds guards',()=>{
  for(const y of [1e-10,1e-8,1e-6,.001,-1e-10,-1e-6])for(const x of [0,100,219,300,419]){
    const result=constrain(point(x,y));
    assert.ok(Number.isFinite(result.x)&&Number.isFinite(result.y));
    assert.ok(radius(result)>=1-1e-7&&radius(result)<1.001);
  }
  for(const invalid of [{x:NaN,y:0},{x:0,y:Infinity}])assert.equal(constrain(invalid),invalid);
});
if(failures)process.exitCode=1;
