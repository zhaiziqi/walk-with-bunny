import { useEffect, useMemo, useState } from 'react';
import { loadLocalImage } from './loadLocalImage';
import { restGift } from './restGift';
import { sceneAssetUrl } from '../diagnostics/assetQA';

function fallback() {
  const canvas=document.createElement('canvas'); canvas.width=360; canvas.height=240;
  const c=canvas.getContext('2d')!;
  c.fillStyle='#6e786421'; c.beginPath();c.ellipse(180,202,115,14,0,0,Math.PI*2);c.fill();
  c.lineJoin='round'; c.strokeStyle='#a7b29c';c.lineWidth=2;
  c.fillStyle='#ddd5bd';c.beginPath();c.moveTo(55,114);c.lineTo(180,153);c.lineTo(304,111);c.lineTo(304,167);c.lineTo(180,208);c.lineTo(55,168);c.closePath();c.fill();c.stroke();
  c.fillStyle='#f3ecda';c.beginPath();c.moveTo(50,94);c.lineTo(171,55);c.lineTo(309,99);c.lineTo(309,115);c.lineTo(180,158);c.lineTo(50,116);c.closePath();c.fill();c.stroke();
  c.beginPath();c.moveTo(50,94);c.lineTo(180,137);c.lineTo(309,99);c.moveTo(180,137);c.lineTo(180,158);c.stroke();
  c.strokeStyle='#98aa97';c.lineWidth=9;c.beginPath();c.moveTo(110,75);c.lineTo(246,120);c.lineTo(246,186);c.moveTo(238,76);c.lineTo(114,116);c.lineTo(114,186);c.stroke();
  c.lineWidth=5;c.beginPath();c.moveTo(177,97);c.bezierCurveTo(99,86,126,44,177,97);c.bezierCurveTo(226,40,253,90,177,97);c.lineTo(153,120);c.moveTo(180,99);c.lineTo(206,120);c.stroke();
  return canvas;
}
export function useRestGiftArt() {
  const source=restGift.wrappedArt;
  const backup=useMemo(()=>fallback(),[]);
  const [loaded,setLoaded]=useState<{source:string;image:HTMLImageElement}|null>(null);
  useEffect(()=>{
    let alive=true;const request=loadLocalImage(sceneAssetUrl(source));
    void request.promise.then(image=>{if(alive&&image)setLoaded({source,image});});
    return()=>{alive=false;request.cancel();};
  },[source]);
  return loaded?.source===source?loaded.image:backup;
}
