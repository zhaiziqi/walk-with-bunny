import type { JourneyPose } from './journey';
import { constrainPose, objects } from './world';
import type { Place, WorldObject } from './world';
import { paths, pathDistance } from './gardenAtlas';
import type { AtmosphereColor } from './gardenAtlas';
import type { MeadowPoint } from './meadowMotion';

// The ground is XY and altitude is Z. These values are shared by WebGL,
// the accessible object targets, the walking controller and the static view.
const BACK = 900, ALTITUDE = 1350, AIM = 150;
const LENGTH = Math.hypot(BACK + AIM, ALTITUDE);
export const FORWARD_Y = (BACK + AIM) / LENGTH;
export const FORWARD_Z = -ALTITUDE / LENGTH;
export const BILLBOARD_TILT = Math.atan2(BACK + AIM, ALTITUDE);
export function terrainHeight(x:number,y:number) {
  const mound=(cx:number,cy:number,rx:number,ry:number,h:number)=>h*Math.exp(-(((x-cx)/rx)**2)-(((y-cy)/ry)**2));
  // A long, soft ridge hides the clearing until the path curls around its eastern shoulder.
  let height=mound(-240,-680,510,285,155)+mound(-720,-1180,620,440,80)
    +mound(930,-780,470,600,115)-mound(275,-1360,360,320,24)
    +mound(-400,460,300,270,112)+mound(400,1200,480,400,155)+mound(-650,2050,460,360,100)
    +mound(65,385,245,440,95)-mound(-640,745,270,225,28)
    +mound(1400,2050,640,510,150)+mound(-2050,2600,620,570,165)
    +mound(250,3400,710,400,180)+mound(1800,3800,570,500,190)
    -mound(1400,4300,480,410,75)+mound(-1150,5450,720,620,170)
    +mound(850,6800,800,710,235)+mound(-1750,7250,640,560,155)
    +mound(-200,8500,900,650,85)+Math.sin(x*.002+y*.001)*15+Math.cos(y*.002)*10;
  const flatten=(cx:number,cy:number,rx:number,ry:number,level:number,bank=.65)=>{
    const radius=Math.hypot((x-cx)/rx,(y-cy)/ry);
    const fade=Math.max(0,Math.min(1,(radius-1)/bank)),blend=1-fade*fade*(3-2*fade);
    height=height*(1-blend)+level*blend;
  };
  // Continuous banks enclose both pools, with no water intersecting rippling terrain.
  flatten(-330,260,145,100,18);
  flatten(-1200,3200,440,300,28);
  // A calm level patch gives the final small door a believable threshold and foreground.
  flatten(-200,8500,260,200,75,.85);
  return height;
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
/** Close silhouettes emerge together; faraway shadows never advertise undiscovered landmarks. */
export function landmarkReveal(object:Pick<WorldObject,'x'|'y'>,actor:MeadowPoint,reading=false) {
  if(reading)return 1;
  const t=Math.max(0,Math.min(1,(1120-Math.hypot(actor.x-object.x,actor.y-object.y))/420));
  return t*t*(3-2*t);
}
/** Shared sRGB mist tint for WebGL, the terrain shader, and the static scene. */
export function depthFogColor(fog:AtmosphereColor):AtmosphereColor {
  const cool:AtmosphereColor=[.76,.83,.85];
  return fog.map((value,i)=>value*.82+cool[i]*.18) as AtmosphereColor;
}
export function depthFog(depth:number) {return Math.max(0,Math.min(1,(depth-2450)/2650));}
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
  // Legacy consumers get the primary trail; the exploration renderer paints the whole atlas.
  const main=paths.slice(0,7);
  if(y<=main[0].points[0].y)return main[0].points[0].x;
  for(const path of main)for(let i=1;i<path.points.length;i++) {
    const a=path.points[i-1],b=path.points[i];
    if(y>=a.y&&y<=b.y) {
      const t=(y-a.y)/Math.max(.001,b.y-a.y);
      return a.x+(b.x-a.x)*t;
    }
  }
  return -200;
}

export type DepthTree={x:number;y:number;w:number;h:number;art:'tree'|'willow'|'blossom';footInset:number;tint:string};
function grove(art:DepthTree['art'],tint:string,points:[number,number,number,number][]):DepthTree[] {
  const footInset=art==='tree'?.032552:art==='willow'?.02408854:.02148438;
  return points.map(([x,y,w,h])=>({x,y,w,h,art,tint,footInset}));
}
/** Sparse authored landmarks. Open ground separates encounters; the atlas is not a forest wallpaper. */
export const depthTrees:DepthTree[]=[
  // The first meadow has one near blossom and a far willow beyond the bend.
  ...grove('blossom','#eee0df',[[ -900,-1280,390,610 ]]),
  ...grove('willow','#b7c9c4',[[ 880,-100,390,610 ]]),
  // A single tree marks the lantern clearing; its bank hides the next region.
  ...grove('tree','#b5c5b5',[[ -1330,700,360,630 ]]),
  // The orchard is discovered later, in a small asymmetric pair.
  ...grove('blossom','#f1dde1',[[ 430,1900,350,590 ],[ 1550,2360,300,530 ]]),
  ...grove('tree','#b8cbb8',[[ -1700,1900,310,590 ]]),
  // Quiet water and one leaning silhouette, with open reflections opposite it.
  ...grove('willow','#b8d0c6',[[ -1720,3170,530,760 ],[ -610,3790,310,520 ]]),
  ...grove('blossom','#dfd4d7',[[ 2080,3080,290,500 ]]),
  // A short shaded passage gives way to the bare stone archway.
  ...grove('tree','#a9c0b6',[[ 850,4210,350,670 ],[ 2100,4660,330,630 ]]),
  ...grove('willow','#b4c0cc',[[ -1810,5390,430,690 ]]),
  ...grove('tree','#bdc7cf',[[ -370,5850,260,520 ],[ 2190,5780,320,610 ]]),
  // The hill is mostly sky and grass. Small, distant shapes give scale.
  ...grove('blossom','#ded2db',[[ 1490,7330,290,510 ]]),
  ...grove('tree','#b1bfcb',[[ -1810,7050,290,560 ]]),
  // The final clearing retains one side frame, not a ring of trees.
  ...grove('tree','#acbcd0',[[ -900,8460,370,680 ]]),
  ...grove('blossom','#d1ccd8',[[ 800,9140,260,500 ]]),
].filter(item=>{
  const path=pathDistance(item.x,item.y);
  return path.distance>path.width*.5+48;
});
