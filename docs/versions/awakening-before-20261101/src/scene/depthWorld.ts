import type { JourneyPose } from './journey';
import { constrainPose, objects } from './world';
import type { Place, WorldObject } from './world';
import { paths, pathDistance } from './gardenAtlas';

// The ground is XY and altitude is Z. These values are shared by WebGL,
// the accessible object targets, the walking controller and the static view.
const BACK = 1450, ALTITUDE = 620, AIM = 550;
const LENGTH = Math.hypot(BACK + AIM, ALTITUDE);
export const FORWARD_Y = (BACK + AIM) / LENGTH;
export const FORWARD_Z = -ALTITUDE / LENGTH;
export const BILLBOARD_TILT = Math.atan2(BACK + AIM, ALTITUDE);
export function terrainHeight(x:number,y:number) {
  const mound=(cx:number,cy:number,rx:number,ry:number,h:number)=>h*Math.exp(-(((x-cx)/rx)**2)-(((y-cy)/ry)**2));
  let height=mound(-400,460,300,270,112)+mound(400,1200,480,400,155)+mound(-650,2050,460,360,100)
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
/** Hand placed groves frame clearings; the same registry drives rendering and foreground occlusion. */
export const depthTrees:DepthTree[]=[
  ...grove('tree','#e1e8d2',[
    [-820,-80,345,620],[590,200,370,690],[-350,390,320,620],[-1030,830,355,660],[110,960,300,570],
    [-1430,1050,420,760],[-1770,1510,370,680],[-2170,2060,470,830],[-1440,2190,360,670],
    [350,2970,430,790],[830,3320,380,740],[-270,3300,370,690],
  ]),
  ...grove('blossom','#f1dce4',[
    [310,1750,390,650],[640,1950,350,610],[1300,1820,440,750],[1330,2330,390,700],[660,2350,340,620],
    [1780,2240,470,790],[2210,2710,400,700],[1680,3090,340,620],[-170,2230,340,600],
  ]),
  ...grove('willow','#c3dbce',[
    [-1800,2820,570,800],[-1630,3470,510,740],[-660,3270,480,710],[-900,3650,490,730],
    [-2190,3200,520,800],[-2100,3700,440,700],[-1670,4000,420,680],[-730,2980,410,650],
  ]),
  ...grove('tree','#a7c7bc',[
    [900,4000,420,800],[1740,4050,440,860],[1920,4510,470,880],[1230,4580,350,660],
    [680,4380,430,850],[2360,3980,460,900],[2530,4840,500,930],[1750,5150,410,800],
  ]),
  ...grove('willow','#b6bfd0',[
    [-1530,5110,520,840],[-570,5300,440,760],[-1540,5700,450,740],[-2300,4890,500,850],
  ]),
  ...grove('tree','#b1bfcb',[
    [-2090,5800,460,870],[-690,5980,380,750],[-2250,6390,500,880],[-1450,6730,370,710],
    [360,6410,350,660],[1590,6650,390,730],[1950,7100,440,780],[1970,6010,430,790],
  ]),
  ...grove('blossom','#e1d2e0',[
    [500,7020,330,610],[810,7410,300,570],[-300,7290,350,630],[-1230,7660,380,660],
  ]),
  ...grove('tree','#b7c3da',[
    [-600,8050,390,760],[470,8390,410,790],[-730,8690,440,820],[620,8870,460,850],
    [-1260,8720,500,890],[-160,9300,490,860],[1120,8290,470,890],[-1620,8310,470,880],
  ]),
].filter(item=>{
  const path=pathDistance(item.x,item.y);
  return path.distance>path.width*.5+48;
});
