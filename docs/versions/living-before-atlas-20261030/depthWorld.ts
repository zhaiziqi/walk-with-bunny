import type { JourneyPose } from './journey';
import { constrainPose, objects } from './world';
import type { Place, WorldObject } from './world';

// The ground is XY and altitude is Z. These values are shared by WebGL,
// the accessible object targets, the walking controller and the static view.
const BACK = 1450, ALTITUDE = 620, AIM = 550;
const LENGTH = Math.hypot(BACK + AIM, ALTITUDE);
export const FORWARD_Y = (BACK + AIM) / LENGTH;
export const FORWARD_Z = -ALTITUDE / LENGTH;
export const BILLBOARD_TILT = Math.atan2(BACK + AIM, ALTITUDE);
export function terrainHeight(x:number,y:number) {
  const mound=(cx:number,cy:number,rx:number,ry:number,h:number)=>h*Math.exp(-(((x-cx)/rx)**2)-(((y-cy)/ry)**2));
  const raw=mound(-400,460,300,270,112)+mound(400,1200,480,400,155)+mound(-650,2050,460,360,100)
    +Math.sin(x*.002+y*.001)*15+Math.cos(y*.002)*10;
  // A shallow hollow holds the little pool; the bank joins the surrounding terrain.
  const radius=Math.hypot((x+330)/145,(y-260)/100);
  const fade=Math.max(0,Math.min(1,(radius-1)/.65));
  const pool=1-fade*fade*(3-2*fade);
  return raw*(1-pool)+18*pool;
}
export function depthCamera(pose:JourneyPose,_width:number,height:number) {
  const focal=height/(2*Math.tan(55*Math.PI/360))*pose.zoom;
  const altitude=ALTITUDE+terrainHeight(pose.x,pose.y-220)*.42;
  return {x:pose.x,y:pose.y-BACK,z:altitude,targetY:pose.y+AIM,targetZ:altitude-ALTITUDE,focal,
    fov:Math.atan(height/(2*focal))*360/Math.PI};
}
export function depthProject(x:number,y:number,pose:JourneyPose,width:number,height:number,z=terrainHeight(x,y)) {
  const c=depthCamera(pose,width,height),dx=x-c.x,dy=y-c.y,dz=z-c.z;
  const depth=Math.max(1,dy*FORWARD_Y+dz*FORWARD_Z),up=dy*(-FORWARD_Z)+dz*FORWARD_Y;
  const scale=c.focal/depth;
  return {x:width/2+dx*scale,y:height/2-up*scale,scale,depth};
}
export function depthFog(depth:number) {return Math.max(0,Math.min(1,(depth-1650)/2600));}
export function depthVisibility(object:Pick<WorldObject,'x'|'y'|'width'|'height'>,pose:JourneyPose,width:number,height:number) {
  const p=depthProject(object.x,object.y,pose,width,height);
  if(p.depth<100||p.x+object.width*p.scale/2<0||p.x-object.width*p.scale/2>width||p.y<0||p.y-object.height*p.scale>height)return 0;
  return 1-depthFog(p.depth)*.93;
}
export function depthFocusPose(place:Place,width:number,height:number,reading=false):JourneyPose {
  const object=objects.find(item=>item.id===place)!;
  const zoom=reading?1.18:1;
  const focal=height/(2*Math.tan(55*Math.PI/360))*zoom;
  const scale=focal/1350;
  return constrainPose({x:object.x+(reading?width*.20/scale:80),y:object.y+220,zoom},width,height);
}
export function pathX(y:number) {
  const points=[[-900,0],[-220,0],[70,-100],[310,-330],[750,-650],[1100,-200],[1550,550],[1900,300],[2350,-250],[3200,-350]];
  for(let i=1;i<points.length;i++)if(y<points[i][0]) {
    const [ay,ax]=points[i-1],[by,bx]=points[i],t=Math.max(0,Math.min(1,(y-ay)/(by-ay))),s=t*t*(3-2*t);
    return ax+(bx-ax)*s;
  }
  return -350;
}

export const depthTrees=[
  {x:-820,y:-80,w:345,h:620},{x:590,y:200,w:370,h:690},
  {x:-350,y:390,w:320,h:620},{x:-1030,y:830,w:355,h:660},
  {x:110,y:960,w:300,h:570},{x:940,y:1280,w:360,h:680},
  {x:-900,y:1650,w:350,h:650},{x:110,y:2000,w:330,h:630},
  {x:-820,y:2620,w:360,h:680},{x:600,y:2860,w:400,h:730},
  {x:-1530,y:1800,w:520,h:900},{x:1620,y:2300,w:570,h:1050},
];
