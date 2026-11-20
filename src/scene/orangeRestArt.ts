import { useEffect, useMemo, useState } from 'react';
import { sceneAssetUrl } from '../diagnostics/assetQA';
import { loadLocalImage } from './loadLocalImage';
import { orangeRest, type OrangeRestPoint } from './orangeRest';

export const orangeCupArt = { width: 80, height: 83, foot: .91 } as const;

export function orangeRestReveal(actor: OrangeRestPoint) {
  const value = Math.max(0, Math.min(1, (1200 - Math.hypot(actor.x-orangeRest.x, actor.y-orangeRest.y))/550));
  return value * value * (3 - 2 * value);
}

function createRestFallback() {
  const canvas=document.createElement('canvas'); canvas.width=720; canvas.height=480;
  const c=canvas.getContext('2d')!;
  c.lineCap='round';
  const leg=(x:number,y:number,length:number,width:number,color:string)=>{
    c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(x-9,y+length);c.stroke();
  };
  leg(150,260,120,23,'#b8b4a0');leg(450,260,120,23,'#b8b4a0');
  leg(94,282,116,27,'#d8cfb9');leg(484,282,116,27,'#d8cfb9');
  c.fillStyle='#d9d1bb';c.beginPath();c.ellipse(290,235,242,89,0,0,Math.PI*2);c.fill();
  c.fillStyle='#eee5cd';c.beginPath();c.ellipse(290,221,242,81,0,0,Math.PI*2);c.fill();
  leg(573,332,68,18,'#d8cfb9');leg(677,332,68,18,'#d8cfb9');
  c.fillStyle='#d6ceb8';c.beginPath();c.ellipse(625,322,81,39,0,0,Math.PI*2);c.fill();
  c.fillStyle='#eae1ca';c.beginPath();c.ellipse(625,313,81,35,0,0,Math.PI*2);c.fill();
  return canvas;
}

/** Original alpha is preserved; both renderers share the same optional asset. */
export function useOrangeRestArt() {
  const fallback=useMemo(createRestFallback,[]);
  const [image,setImage]=useState<HTMLImageElement|null>(null);
  useEffect(()=>{
    let active=true;const request=loadLocalImage(sceneAssetUrl('/art/rest/orange-table-v1.png'));
    void request.promise.then(value=>{if(active)setImage(value);});
    return()=>{active=false;request.cancel();};
  },[]);
  return image??fallback;
}

const noise=(i:number)=>{const value=Math.sin(i*91.791+3.31)*43758.5453;return value-Math.floor(value);};

/** Small painted glass: no UI border or icon. The liquid level is real geometry
 * in this texture, so a silent sip is still visible. Repaint only when it changes. */
export function paintOrangeCup(canvas:HTMLCanvasElement, liquid=.82) {
  if(canvas.width!==192)canvas.width=192;
  if(canvas.height!==256)canvas.height=256;
  const c=canvas.getContext('2d')!;c.clearRect(0,0,192,256);
  const level=Math.max(0,Math.min(1,liquid)),top=223-level*151;
  // Fine, diffuse contact shadow belongs to the tabletop, not a floating halo.
  const shadow=c.createRadialGradient(98,232,2,98,232,49);
  shadow.addColorStop(0,'rgba(93,102,78,.23)');shadow.addColorStop(1,'rgba(93,102,78,0)');
  c.save();c.translate(0,231);c.scale(1,.25);c.translate(0,-231);
  c.fillStyle=shadow;c.fillRect(40,178,116,110);c.restore();
  const glass=()=>{c.beginPath();c.moveTo(53,72);c.bezierCurveTo(59,63,137,63,143,72);c.lineTo(132,221);c.bezierCurveTo(128,237,68,237,64,221);c.closePath();};
  glass();c.fillStyle='rgba(239,244,222,.35)';c.fill();
  c.save();glass();c.clip();
  const juice=c.createLinearGradient(61,top,137,225);
  juice.addColorStop(0,'#f6bd65');juice.addColorStop(.5,'#e6a443');juice.addColorStop(1,'#cb8c3b');
  c.fillStyle=juice;c.fillRect(50,top,97,167);
  // Uneven translucent pigment, clipped to the liquid rather than a noisy outline.
  for(let i=0;i<420;i++){
    const x=52+noise(i)*94,y=top+noise(i+431)*(229-top);
    c.fillStyle=i%3?'rgba(255,230,163,.13)':'rgba(162,105,56,.07)';
    c.beginPath();c.ellipse(x,y,.5+noise(i+91)*2.2,.5+noise(i+125)*1.3,noise(i)*3,0,Math.PI*2);c.fill();
  }
  c.fillStyle='#f7c777';c.beginPath();c.ellipse(98,top,42-(top-70)*.06,8,0,0,Math.PI*2);c.fill();
  c.strokeStyle='rgba(255,231,174,.6)';c.lineWidth=1.8;c.beginPath();c.ellipse(98,top,40-(top-70)*.06,7,0,0,Math.PI);c.stroke();
  c.restore();
  // A short paper straw bends to the approachable side of the table.
  c.lineCap='round';c.lineJoin='round';
  c.strokeStyle='#b5b39c';c.lineWidth=8;c.beginPath();c.moveTo(105,183);c.lineTo(111,48);c.lineTo(10,29);c.stroke();
  c.strokeStyle='#f5efcf';c.lineWidth=5;c.beginPath();c.moveTo(104,183);c.lineTo(110,48);c.lineTo(10,29);c.stroke();
  c.strokeStyle='rgba(225,181,139,.65)';c.lineWidth=2;
  for(let i=0;i<4;i++){c.beginPath();c.moveTo(80+i*7,35+i*2.5);c.lineTo(79+i*7,40+i*2.5);c.stroke();}
  // The orange slice reads as the drink's only bright accent.
  c.save();c.translate(145,83);c.rotate(.19);c.scale(.85,1);
  c.fillStyle='#dba447';c.beginPath();c.arc(0,0,30,0,Math.PI*2);c.fill();
  c.fillStyle='#f5d49a';c.beginPath();c.arc(0,0,26,0,Math.PI*2);c.fill();
  c.fillStyle='#eeb05b';c.beginPath();c.arc(0,0,22,0,Math.PI*2);c.fill();
  c.strokeStyle='#f9dc9f';c.lineWidth=2;
  for(let i=0;i<8;i++){const a=i*Math.PI/4;c.beginPath();c.moveTo(Math.cos(a)*4,Math.sin(a)*4);c.lineTo(Math.cos(a)*21,Math.sin(a)*21);c.stroke();}
  c.restore();
  glass();c.strokeStyle='rgba(93,121,113,.53)';c.lineWidth=2.2;c.stroke();
  c.strokeStyle='rgba(255,252,227,.92)';c.lineWidth=3.7;c.beginPath();c.moveTo(60,91);c.lineTo(70,212);c.stroke();
  c.lineWidth=2.3;c.beginPath();c.moveTo(134,97);c.lineTo(126,211);c.stroke();
  c.strokeStyle='rgba(249,247,222,.84)';c.lineWidth=3;c.beginPath();c.ellipse(98,73,43,10,0,0,Math.PI*2);c.stroke();
  c.strokeStyle='rgba(246,246,220,.7)';c.lineWidth=2;c.beginPath();c.ellipse(98,222,31,7,0,0,Math.PI);c.stroke();
  return canvas;
}

export function createOrangeCupCanvas(liquid=.82) {return paintOrangeCup(document.createElement('canvas'),liquid);}
