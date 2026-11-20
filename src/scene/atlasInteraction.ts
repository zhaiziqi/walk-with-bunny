export type AtlasSiteId = 'orchard' | 'pond' | 'hollow' | 'arch' | 'hill' | 'moon';
export type AtlasPulse = { id: string; serial: number } | null;
export type AtlasSite = { id: AtlasSiteId; x: number; y: number; radius: number; dwell: number; event: string; label: string; hint: string };
// Keep the visible E prompt and the chime's manual response within one boundary.
export const chimeInteractionRadius = 640;
export const atlasEncounterSites: AtlasSite[] = [
  { id:'orchard', x:900,y:2100,radius:310,dwell:0,event:'orchard-petals',label:'Stir the blossoms',hint:'The petals remember your passing.' },
  { id:'pond',x:-1200,y:3200,radius:480,dwell:0,event:'pond-lilies',label:'Touch the water',hint:'A ripple wakes the water beyond.' },
  { id:'hollow',x:1400,y:4300,radius:310,dwell:0,event:'mushroom-chime',label:'Greet the mushrooms',hint:'One, then another. A secret travels on.' },
  { id:'arch',x:-1100,y:5400,radius:chimeInteractionRadius,dwell:1.8,event:'arch-awake',label:'Stir the chime',hint:'The breeze still lingers in the old archway.' },
  { id:'hill',x:1000,y:6800,radius:340,dwell:1.1,event:'paper-flock',label:'Borrow a little breeze',hint:'Paper wings unfold to try the sky.' },
  { id:'moon',x:-200,y:8500,radius:350,dwell:2.1,event:'moon-ring',label:'Touch the moonlight',hint:'After all this wandering, the moon is waiting too.' },
];
export type AtlasInteractionState = {inside:boolean; dwell:number; fired:boolean; age:number; activations:number; pulseSerial:number};
export const emptyAtlasInteraction = ():AtlasInteractionState => ({inside:false,dwell:0,fired:false,age:100,activations:0,pulseSerial:-1});
/** Fixed-site state. Reading is a hard pause; pulses cannot activate a distant site. */
export function advanceAtlasInteraction(state:AtlasInteractionState,site:AtlasSite,distance:number,delta:number,moving:boolean,reading:boolean,pulse:AtlasPulse=null):AtlasInteractionState {
  if(reading||!Number.isFinite(delta)||delta<=0)return state;
  const dt=Math.min(.05,delta),inside=distance<(state.inside?site.radius+90:site.radius);
  let next={...state,inside,age:state.age+dt};
  if(!inside){next.dwell=0;next.fired=false;return next;}
  next.dwell=moving?0:state.dwell+dt;
  const manual=pulse?.id===site.id&&pulse.serial!==state.pulseSerial;
  const automatic=!state.fired&&(site.dwell===0||next.dwell>=site.dwell);
  if(manual||automatic){next={...next,age:0,fired:true,activations:state.activations+1,pulseSerial:manual?pulse.serial:state.pulseSerial};}
  return next;
}
export function petalFlight(age:number,index:number) {
  const t=Math.max(0,age-index*.075),p=Math.min(1,t/7.2),a=index*2.39996+t*.65;
  return {x:Math.cos(a)*(45+p*175)+p*100,y:Math.sin(a)*(32+p*95)+p*55,z:Math.max(2,340*(1-p)+Math.sin(t*1.8+index)*p*15),opacity:Math.min(1,t*3)*(p>.9?1-(p-.9)*3:1),rotation:t*(.5+index*.02)};
}
export function flockFlight(age:number,index:number) {
  const t=Math.max(0,age-index*.16),p=Math.min(1,t/8),angle=p*Math.PI*2+index*.22;
  return {x:Math.sin(angle)*Math.sin(p*Math.PI)*360+index*24-48,y:Math.cos(angle)*Math.sin(p*Math.PI)*260+p*150,z:24+Math.sin(p*Math.PI)*(230+index*18),bank:Math.sin(angle)*.28,landed:p>=1};
}
