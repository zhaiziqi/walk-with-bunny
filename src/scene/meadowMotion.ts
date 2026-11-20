import type { JourneyPose } from './journey';

export type MeadowPoint = { x: number; y: number };
export type MeadowGuidance = { active: boolean; heading: MeadowPoint; strength: number };
export const SHARED_RABBIT_FOOT_OFFSET = 220;
export const MEADOW_SPEED = 240;
export const MEADOW_HOLD_DELAY_MS = 90;
export const MEADOW_POINTER_DEAD_ZONE = 14;
export const MEADOW_POINTER_FULL_SPEED = 210;
export const MEADOW_ACCELERATION_TIME = .38;
export const MEADOW_TURN_RATE = 4.8;
export const MEADOW_FOLLOW_TIME = .52;
export const MEADOW_CAMERA_FREE_ZONE = 76;
export const MEADOW_MAX_CAMERA_LEAD = 240;
export const MEADOW_DIRECTIONAL_LEAD = 190;
const clamp = (value:number,min:number,max:number) => Math.max(min,Math.min(max,value));
const smooth = (value:number) => {const t=clamp(value,0,1);return t*t*(3-2*t);};

/** Blank ground responds visually at once; objects retain their short-click behaviour. */
export function meadowPressIntent(elapsedMs:number,worldObject:boolean,moved:boolean) {
 const anticipating=!worldObject||moved;
 return {anticipating,walking:anticipating&&elapsedMs>=MEADOW_HOLD_DELAY_MS};
}

export function meadowScreenFoot(width:number,height:number,scale:number):MeadowPoint {
 return {x:width/2,y:height/2+SHARED_RABBIT_FOOT_OFFSET*scale};
}
/** Nearby pointers allow a careful walk; the outer range asks for a small run. */
export function meadowVelocity(pointer:MeadowPoint|null,foot:MeadowPoint):MeadowPoint {
 if(!pointer)return {x:0,y:0};
 const dx=pointer.x-foot.x,dy=foot.y-pointer.y,distance=Math.hypot(dx,dy);
 if(!Number.isFinite(distance)||distance<=MEADOW_POINTER_DEAD_ZONE)return {x:0,y:0};
 const fraction=clamp((distance-MEADOW_POINTER_DEAD_ZONE)/(MEADOW_POINTER_FULL_SPEED-MEADOW_POINTER_DEAD_ZONE),0,1);
 const speed=MEADOW_SPEED*(.22*fraction+.78*smooth(fraction));
 return {x:dx/distance*speed,y:dy/distance*speed};
}
export function advanceMeadow(current:JourneyPose,velocity:MeadowPoint,deltaSeconds:number,active=true):JourneyPose {
 if(!active||!Number.isFinite(deltaSeconds)||deltaSeconds<=0)return current;
 const dt=Math.min(deltaSeconds,.05),vx=Number.isFinite(velocity.x)?velocity.x:0,vy=Number.isFinite(velocity.y)?velocity.y:0;
 if(!vx&&!vy)return current;
 return {...current,x:current.x+vx*dt,y:current.y+vy*dt};
}
/** Convert the desired screen direction into the actual foreshortened terrain plane. */
export function groundVelocity(pointer:MeadowPoint|null,foot:MeadowPoint,axisX:MeadowPoint,axisY:MeadowPoint):MeadowPoint {
 const screen=meadowVelocity(pointer,foot),speed=Math.hypot(screen.x,screen.y);
 if(!speed)return {x:0,y:0};
 const ax=axisX.x-foot.x,ay=axisX.y-foot.y,bx=axisY.x-foot.x,by=axisY.y-foot.y;
 const determinant=ax*by-ay*bx;
 if(!Number.isFinite(determinant)||Math.abs(determinant)<1e-8)return screen;
 const x=(screen.x*by+screen.y*bx)/determinant,y=(-ax*screen.y-ay*screen.x)/determinant,length=Math.hypot(x,y);
 return length>0?{x:x/length*speed,y:y/length*speed}:{x:0,y:0};
}
type MeadowBrake={speed:number;acceleration:number;angularVelocity:number;cameraWeight:number;duration:number;elapsed:number};
export type MeadowDynamics={angularVelocity:number;acceleration:number;brake:MeadowBrake|null;cameraWeight?:number};
export const emptyMeadowDynamics=():MeadowDynamics=>({angularVelocity:0,acceleration:0,brake:null,cameraWeight:0});
export type MeadowLocomotion=MeadowDynamics&{heading:MeadowPoint;speed:number;velocity:MeadowPoint;cameraWeight:number};
const finite=(value:number|undefined,fallback=0)=>Number.isFinite(value)?value!:fallback;
function damped(value:number,velocity:number,target:number,dt:number,frequency:number) {
 const error=value-target,c=(velocity+frequency*error)*dt,decay=Math.exp(-frequency*dt);
 return {value:target+(error+c)*decay,velocity:(velocity-frequency*c)*decay};
}
/** Carry angular velocity and acceleration between frames, including a bounded natural stop. */
export function steerMeadow(heading:MeadowPoint,speed:number,target:MeadowPoint,deltaSeconds:number,previous:Partial<MeadowDynamics>={},stopWithinSeconds?:number):MeadowLocomotion {
 const dt=clamp(finite(deltaSeconds),0,.05),desiredSpeed=Math.min(MEADOW_SPEED,Math.hypot(target.x,target.y));
 const from=Math.atan2(finite(heading.y),finite(heading.x,1));
 const currentSpeed=clamp(finite(speed),0,MEADOW_SPEED),angularVelocity=finite(previous.angularVelocity),acceleration=finite(previous.acceleration);
 const result=(angle:number,nextSpeed:number,dynamics:MeadowDynamics,cameraWeight=1):MeadowLocomotion=>{
  const nextHeading={x:Math.cos(angle),y:Math.sin(angle)};
  return {...dynamics,heading:nextHeading,speed:nextSpeed,velocity:{x:nextHeading.x*nextSpeed,y:nextHeading.y*nextSpeed},cameraWeight};
 };
 if(!Number.isFinite(desiredSpeed))return result(from,0,emptyMeadowDynamics(),0);
 if(!dt)return result(from,currentSpeed,{angularVelocity,acceleration,brake:previous.brake??null},previous.cameraWeight??1);
 if(desiredSpeed<.001){
  if((stopWithinSeconds!==undefined&&stopWithinSeconds<=0)||currentSpeed===0)return result(from,0,emptyMeadowDynamics(),0);
  // Match speed and its existing downward slope, then reach exact zero with
  // zero final acceleration. The input lease supplies an absolute deadline.
  const duration=stopWithinSeconds===undefined?.30:Math.max(dt,finite(stopWithinSeconds)+dt);
  const brake=previous.brake??{speed:currentSpeed,acceleration:clamp(acceleration,-2*currentSpeed/duration,0),angularVelocity,cameraWeight:previous.cameraWeight??1,duration,elapsed:0};
  const elapsed=Math.min(brake.duration,brake.elapsed+dt),t=elapsed/brake.duration;
  if(t>=1)return result(from,0,emptyMeadowDynamics(),0);
  const h=1-3*t*t+2*t*t*t,derivative=(-6*t+6*t*t)/brake.duration;
  const nextSpeed=Math.max(0,brake.speed*h+brake.acceleration*brake.duration*(t-2*t*t+t*t*t));
  const nextAcceleration=brake.speed*derivative+brake.acceleration*(1-4*t+3*t*t);
  const integral=(p:number)=>p-p*p*p+.5*p*p*p*p;
  const angle=from+brake.angularVelocity*brake.duration*(integral(t)-integral(brake.elapsed/brake.duration));
  return result(angle,nextSpeed,{angularVelocity:brake.angularVelocity*h,acceleration:nextAcceleration,brake:{...brake,elapsed}},brake.cameraWeight*h);
 }
 const to=Math.atan2(target.y,target.x);
 let turn=Math.atan2(Math.sin(to-from),Math.cos(to-from));
 // At a near-exact reversal, tiny pointer noise must not flip the chosen arc.
 if(Math.abs(turn)>Math.PI-.12&&Math.abs(angularVelocity)>.1)turn=Math.sign(angularVelocity)*Math.abs(turn);
 const turnRate=MEADOW_TURN_RATE+2.6*(1-currentSpeed/MEADOW_SPEED);
 const rotation=damped(0,angularVelocity,turn,dt,9);
 const nextAngular=clamp(rotation.velocity,-turnRate,turnRate);
 const step=nextAngular===rotation.velocity?rotation.value:(angularVelocity+nextAngular)*.5*dt;
 const angle=from+step,remaining=turn-step;
 const alignment=.16+.84*smooth((Math.cos(remaining)+.45)/1.45);
 const pace=damped(currentSpeed,acceleration,desiredSpeed*alignment,dt,12);
 const nextSpeed=clamp(pace.value,0,MEADOW_SPEED);
 const cameraWeight=1-(1-clamp(previous.cameraWeight??1,0,1))*Math.exp(-dt/.12);
 return result(angle,nextSpeed,{angularVelocity:nextAngular,acceleration:nextSpeed===pace.value?pace.velocity:0,brake:null},cameraWeight);
}
/** Common keyboard input for the same walking integrator as the mouse. */
export function keyboardMeadowVelocity(keys:ReadonlySet<string>):MeadowPoint {
 const x=Number(keys.has('ArrowRight')||keys.has('KeyD'))-Number(keys.has('ArrowLeft')||keys.has('KeyA'));
 const y=Number(keys.has('ArrowUp')||keys.has('KeyW')||keys.has('PageUp'))-Number(keys.has('ArrowDown')||keys.has('KeyS')||keys.has('PageDown'));
 const length=Math.hypot(x,y);return length?{x:x/length*MEADOW_SPEED*.82,y:y/length*MEADOW_SPEED*.82}:{x:0,y:0};
}
/** Wheel events request a bounded velocity burst, never a direct change of coordinates. */
export function wheelMeadowVelocity(dx:number,dy:number):MeadowPoint {
 if(!Number.isFinite(dx)||!Number.isFinite(dy))return {x:0,y:0};
 const length=Math.hypot(dx,dy);if(length<.1)return {x:0,y:0};
 const speed=Math.min(MEADOW_SPEED,36+length*2.6);return {x:dx/length*speed,y:dy/length*speed};
}
/** A short wheel gesture must survive its turn before spending the walking part. */
export function wheelMeadowDuration(heading:MeadowPoint,velocity:MeadowPoint):number {
 if(!Number.isFinite(velocity.x)||!Number.isFinite(velocity.y)||Math.hypot(velocity.x,velocity.y)<.001)return 0;
 const from=Math.atan2(heading.y,heading.x),to=Math.atan2(velocity.y,velocity.x);
 const turn=Math.abs(Math.atan2(Math.sin(to-from),Math.cos(to-from)));
 return Math.min(850,260+turn/MEADOW_TURN_RATE*1000);
}
/** Smooth the framing direction independently of body steering, including a planted turn. */
export function advanceMeadowLook(previous:MeadowPoint,heading:MeadowPoint,speed:number,deltaSeconds:number,active=true):MeadowPoint {
 if(!active||!Number.isFinite(deltaSeconds)||deltaSeconds<=0)return previous;
 const distance=MEADOW_DIRECTIONAL_LEAD*smooth(speed/MEADOW_SPEED),amount=1-Math.exp(-Math.min(deltaSeconds,.05)/.34);
 return {x:previous.x+(heading.x*distance-previous.x)*amount,y:previous.y+(heading.y*distance-previous.y)*amount};
}
/** Directional framing and a quiet free zone; release deliberately never advances this. */
export function followMeadowCamera(camera:JourneyPose,actor:MeadowPoint,deltaSeconds:number,active=true,motion?:Pick<MeadowLocomotion,'heading'|'speed'>&{lead?:MeadowPoint;cameraWeight?:number}):JourneyPose {
 if(!active||!Number.isFinite(deltaSeconds)||deltaSeconds<=0)return camera;
 const dt=Math.min(.05,deltaSeconds),base={x:actor.x,y:actor.y+SHARED_RABBIT_FOOT_OFFSET};
 const look=motion?MEADOW_DIRECTIONAL_LEAD*smooth(motion.speed/MEADOW_SPEED):0;
 const lead=motion?.lead??{x:(motion?.heading.x??0)*look,y:(motion?.heading.y??0)*look};
 const target={x:base.x+lead.x,y:base.y+lead.y};
 const dx=target.x-camera.x,dy=target.y-camera.y,distance=Math.hypot(dx,dy);
 let x=camera.x,y=camera.y;
 if(distance>MEADOW_CAMERA_FREE_ZONE){
  const excess=distance-MEADOW_CAMERA_FREE_ZONE,amount=(1-Math.exp(-dt/MEADOW_FOLLOW_TIME))*clamp(motion?.cameraWeight??1,0,1);
  x+=dx/distance*excess*amount;y+=dy/distance*excess*amount;
 }
 const bx=base.x-x,by=base.y-y,lag=Math.hypot(bx,by);
 if(lag>MEADOW_MAX_CAMERA_LEAD){x=base.x-bx/lag*MEADOW_MAX_CAMERA_LEAD;y=base.y-by/lag*MEADOW_MAX_CAMERA_LEAD;}
 return x===camera.x&&y===camera.y?camera:{...camera,x,y};
}
