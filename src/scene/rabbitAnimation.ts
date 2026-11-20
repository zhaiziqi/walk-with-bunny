import type { MeadowPoint } from './meadowMotion';
import type { RabbitDiagonalDirection } from './rabbitDiagonalAtlas';
export type RabbitDirection = 'front'|'right'|'back'|'left'|RabbitDiagonalDirection;
export type RabbitStance = 'planted'|'crouch'|'airborne';
export type RabbitGait = {phase:number;lift:number;liftVelocity:number;speed:number;settle:number;landingLift:number;wasMoving:boolean;landed:boolean};
export type RabbitTurn = {bodyAngle:number;headAngle:number;angularVelocity:number};
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const smooth=(value:number)=>{const t=clamp(value,0,1);return t*t*(3-2*t);};
const angleDelta=(from:number,to:number)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));
/** Exact critical damping keeps height and velocity continuous when input is released or resumed. */
export function rabbitSpring(value:number,velocity:number,target:number,delta:number,frequency=30){
 const dt=clamp(Number.isFinite(delta)?delta:0,0,.05),error=value-target,c=(velocity+frequency*error)*dt,decay=Math.exp(-frequency*dt);
 return {value:target+(error+c)*decay,velocity:(velocity-frequency*c)*decay};
}
export const emptyRabbitGait=():RabbitGait=>({phase:0,lift:0,liftVelocity:0,speed:0,settle:1,landingLift:0,wasMoving:false,landed:false});
/** Travel owns the stride; time only resolves body anticipation, weight and landing in place. */
export function advanceRabbitGait(previous:RabbitGait,travel:number,delta:number,moving:boolean):RabbitGait {
 const dt=clamp(Number.isFinite(delta)?delta:0,0,.05);
 if(!dt)return previous;
 if(!Number.isFinite(travel)||travel>80)return emptyRabbitGait();
 const walking=moving&&travel>.00001;
 if(!walking){
  const spring=rabbitSpring(previous.lift,previous.liftVelocity??0,0,dt);
  const settle=previous.wasMoving?dt/.28:Math.min(1,previous.settle+dt/.28);
  const landed=spring.value<.08&&Math.abs(spring.velocity)<2;
  return {...previous,phase:landed&&settle>=1?0:previous.phase,lift:landed?0:Math.max(0,spring.value),liftVelocity:landed?0:spring.velocity,
   landingLift:previous.wasMoving?previous.lift:previous.landingLift,settle,speed:previous.speed*Math.exp(-dt/.1),wasMoving:false,landed:previous.lift>0&&landed};
 }
 const speed=previous.speed+(travel/dt-previous.speed)*(1-Math.exp(-dt*10));
 const ratio=clamp(speed/240,0,1),stride=66+30*ratio;
 const phase=(previous.phase+travel/stride)%1,flight=clamp((phase-.38)/.48,0,1);
 const desiredLift=Math.sin(flight*Math.PI)*(8+18*ratio),spring=rabbitSpring(previous.lift,previous.liftVelocity??0,desiredLift,dt);
 const lift=Math.max(0,spring.value);
 return {phase,lift,liftVelocity:spring.velocity,speed,settle:0,landingLift:0,wasMoving:true,landed:(previous.lift>1&&lift<=1)||(phase<previous.phase&&lift<1)};
}
export function rabbitStance(gait:RabbitGait):RabbitStance {
 if(!gait.wasMoving)return gait.lift>2?'airborne':gait.settle<.85?'crouch':'planted';
 return gait.phase<.2?'planted':gait.phase<.38?'crouch':gait.phase<.86?'airborne':'planted';
}
/** The planted foot holds, then the body travels through the airborne portion. */
export function rabbitGroundBlend(phase:number){return smooth((phase-.30)/.52);}
const diagonal=Math.SQRT1_2;
export const rabbitDirectionVectors:Record<RabbitDirection,MeadowPoint>={front:{x:0,y:-1},frontRight:{x:diagonal,y:-diagonal},right:{x:1,y:0},backRight:{x:diagonal,y:diagonal},back:{x:0,y:1},backLeft:{x:-diagonal,y:diagonal},left:{x:-1,y:0},frontLeft:{x:-diagonal,y:-diagonal}};
export function rabbitDirection(heading:MeadowPoint,previous:RabbitDirection):RabbitDirection {
 const candidates=Object.keys(rabbitDirectionVectors) as RabbitDirection[];
 const score=(direction:RabbitDirection)=>rabbitDirectionVectors[direction].x*heading.x+rabbitDirectionVectors[direction].y*heading.y;
 const best=candidates.reduce((a,b)=>score(a)>score(b)?a:b);
 return score(best)>score(previous)+.045?best:previous;
}
/** Preserve each drawing's aspect ratio and stance proportions across independently drawn views. */
export function rabbitPoseDimensions(frame:{width:number;height:number;footInset:number},plantedHeight:number) {
 const scale=192/plantedHeight;
 return {width:frame.width*scale,height:frame.height*scale,footInset:frame.footInset*scale};
}
export const emptyRabbitTurn=(heading:MeadowPoint):RabbitTurn=>({bodyAngle:Math.atan2(heading.y,heading.x),headAngle:Math.atan2(heading.y,heading.x),angularVelocity:0});
/** Head follows intent first; torso follows actual locomotion. The feet never rotate around a remote pivot. */
export function advanceRabbitTurn(previous:RabbitTurn,heading:MeadowPoint,intent:MeadowPoint,delta:number):RabbitTurn {
 const dt=clamp(Number.isFinite(delta)?delta:0,0,.05);if(!dt)return previous;
 const bodyTarget=Math.atan2(heading.y,heading.x),headTarget=Math.atan2(intent.y,intent.x);
 const bodyStep=angleDelta(previous.bodyAngle,bodyTarget)*(1-Math.exp(-dt/.075));
 const actualBodyStep=clamp(bodyStep,-6*dt,6*dt),bodyAngle=previous.bodyAngle+actualBodyStep;
 const headStep=angleDelta(previous.headAngle,headTarget)*(1-Math.exp(-dt/.045));
 let headAngle=previous.headAngle+clamp(headStep,-11*dt,11*dt);
 headAngle=bodyAngle+clamp(angleDelta(bodyAngle,headAngle),-.62,.62);
 return {bodyAngle,headAngle,angularVelocity:previous.angularVelocity+(actualBodyStep/dt-previous.angularVelocity)*(1-Math.exp(-dt/.08))};
}
export function rabbitIdleAttention(idle:number,distance:number){
 if(idle<1.4||distance>370)return 0;
 const arrive=smooth((idle-1.4)/1.2),cycle=(idle-1.4)%8;
 return arrive*(cycle<3?Math.sin(cycle/3*Math.PI):0);
}
