export type AtlasSiteId = 'orchard' | 'pond' | 'hollow' | 'arch' | 'hill' | 'moon';
export type AtlasPulse = { id: string; serial: number } | null;
export type AtlasSite = { id: AtlasSiteId; x: number; y: number; radius: number; dwell: number; event: string; label: string; hint: string };
export const atlasEncounterSites: AtlasSite[] = [
  { id:'orchard', x:900,y:2100,radius:310,dwell:0,event:'orchard-petals',label:'摇一摇花枝',hint:'花瓣，会记得你经过。' },
  { id:'pond',x:-1200,y:3200,radius:480,dwell:0,event:'pond-lilies',label:'轻碰水面',hint:'一圈涟漪，把远处也轻轻唤醒。' },
  { id:'hollow',x:1400,y:4300,radius:310,dwell:0,event:'mushroom-chime',label:'和蘑菇打个招呼',hint:'一朵、两朵，秘密正在传过去。' },
  { id:'arch',x:-1100,y:5400,radius:340,dwell:1.8,event:'arch-awake',label:'轻推风铃',hint:'旧门廊里，还有风停留。' },
  { id:'hill',x:1000,y:6800,radius:340,dwell:1.1,event:'paper-flock',label:'借一阵风',hint:'纸鸟展开翅膀，替你试一试天空。' },
  { id:'moon',x:-200,y:8500,radius:350,dwell:2.1,event:'moon-ring',label:'轻触月光',hint:'走了这么远，月光也在这里等你。' },
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
export function sequencePulse(age:number,index:number,spacing=.24) {
  const t=age-index*spacing;
  return t<0?0:Math.sin(Math.min(1,t/.7)*Math.PI)*Math.exp(-Math.max(0,t-.7)*3);
}
export function petalFlight(age:number,index:number) {
  const t=Math.max(0,age-index*.075),p=Math.min(1,t/7.2),a=index*2.39996+t*.65;
  return {x:Math.cos(a)*(45+p*175)+p*100,y:Math.sin(a)*(32+p*95)+p*55,z:Math.max(2,340*(1-p)+Math.sin(t*1.8+index)*p*15),opacity:Math.min(1,t*3)*(p>.9?1-(p-.9)*3:1),rotation:t*(.5+index*.02)};
}
export function flockFlight(age:number,index:number) {
  const t=Math.max(0,age-index*.16),p=Math.min(1,t/8),angle=p*Math.PI*2+index*.22;
  return {x:Math.sin(angle)*Math.sin(p*Math.PI)*360+index*24-48,y:Math.cos(angle)*Math.sin(p*Math.PI)*260+p*150,z:24+Math.sin(p*Math.PI)*(230+index*18),bank:Math.sin(angle)*.28,landed:p>=1};
}
