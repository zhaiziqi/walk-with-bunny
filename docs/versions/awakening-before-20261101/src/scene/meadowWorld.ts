import type { Place } from './world';

/** Small independent landmarks, with room to walk around and behind every one. */
export const trees = [
  {x:-560, y:230, width:295, height:420},
  {x:700, y:430, width:330, height:470},
  {x:-1190, y:-220, width:275, height:391},
  {x:1100, y:-610, width:270, height:384},
  {x:-240, y:-1000, width:320, height:455},
  {x:-1230, y:800, width:310, height:441},
  {x:1190, y:1000, width:300, height:427},
];
export const sprouts = Array.from({length:58}, (_,i) => {
  const seed = (n:number) => {const v=Math.sin(n*127.1+311.7)*43758.5453; return v-Math.floor(v);};
  return {x:(seed(i+1)-.5)*3000,y:(seed(i+100)-.5)*2200,width:30+seed(i+600)*40,phase:seed(i+800)*6.28};
});
export const encounterCopy: Record<Place,string> = {
  puzzle:'你一靠近，小灯便醒了。',
  music:'风里，好像藏着一首歌。',
  lock:'小路的尽头，有一份心意。',
};
export const encounterRadius=185;
export const meadowWidth=3480;
export const meadowHeight=2630;
