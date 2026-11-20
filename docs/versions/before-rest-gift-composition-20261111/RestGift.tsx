import { useEffect, useRef, useState } from 'react';
import { GiftKeepsake, GiftParcel } from './GiftObjects';
import { RestGiftCompanion, RestGiftLight } from './RestGiftLight';
import { restGift } from '../scene/restGift';
import type { StorageStatus } from '../lib/storage';
import '../styles/rest-gift.css';

type Props = {found: boolean; onDiscover: () => void; onReturn: () => void; reduced: boolean; storageStatus: StorageStatus};
export const REST_GIFT_OPEN_MS = 5200;
export function RestGift({found,onDiscover,onReturn,reduced,storageStatus}: Props) {
  // Saved discovery and the presentation of this visit are deliberately separate.
  const [phase,setPhase]=useState<'wrapped'|'opening'|'revealed'>('wrapped');
  const [imageFailed,setImageFailed]=useState(false);
  const [loadedLayers,setLoadedLayers]=useState(0);
  const artReady=imageFailed||loadedLayers===3;
  const opening=phase==='opening';
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const reveal=useRef<HTMLDivElement>(null);
  const started=useRef(false);
  const finished=useRef(false);
  const mounted=useRef(true);
  const latest=useRef({found,onDiscover});
  latest.current={found,onDiscover};
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;if(timer.current)clearTimeout(timer.current);};},[]);
  const finish=()=>{
    if(!mounted.current||finished.current)return;
    finished.current=true;
    if(timer.current)clearTimeout(timer.current);
    timer.current=null;
    if(!latest.current.found)latest.current.onDiscover();
    setPhase('revealed');
  };
  useEffect(()=>{
    if(phase==='revealed')reveal.current?.focus({preventScroll:true});
  },[phase]);
  useEffect(()=>{if(reduced&&phase==='opening')finish();},[reduced,phase]);
  const open=()=>{
    if(started.current||!artReady)return;
    started.current=true;
    if(reduced){finish();return;}
    setPhase('opening');
    timer.current=setTimeout(finish,REST_GIFT_OPEN_MS);
  };
  return <div className={`rest-gift ${phase!=='wrapped'?'is-unwrapping':''} ${reduced?'rest-gift-quiet':''}`} data-rest-gift-phase={phase}>
    <div className={`rest-gift-stage ${artReady?'is-art-ready':''}`} aria-busy={opening||!artReady}>
      <div className="rest-dream-ground-light" aria-hidden="true"/>
      <div className="rest-dream-contact" aria-hidden="true"/>
      {imageFailed ? <div className="rest-dream-fallback"><GiftParcel opening={phase!=='wrapped'} reduced={reduced}/></div> : <>
        <img className="rest-dream-base rest-dream-inside" src={restGift.dreamBaseArt} alt="" aria-hidden="true" onError={()=>setImageFailed(true)}/>
        <img className="rest-dream-base rest-dream-front" src={restGift.dreamBaseArt} alt="" aria-hidden="true" onLoad={()=>setLoadedLayers(value=>value|1)} onError={()=>setImageFailed(true)}/>
        <div className="rest-dream-lid" aria-hidden="true"><img src={restGift.dreamLidArt} alt="" onLoad={()=>setLoadedLayers(value=>value|2)} onError={()=>setImageFailed(true)}/></div>
      </>}
      <div className="rest-dream-seam" aria-hidden="true"/>
      <RestGiftCompanion/>
      {phase!=='wrapped'&&<>
        <div ref={reveal} tabIndex={-1} className="rest-gift-result" aria-label="Your keepsake" aria-hidden={opening||undefined} inert={opening||undefined}>
          <GiftKeepsake kind="sleep-mask" imageSrc={restGift.revealArt}/>
        </div>
        <RestGiftLight/>
      </>}
      <button type="button" className="rest-gift-wrap" aria-label="Open the little gift box" hidden={phase==='revealed'} disabled={phase!=='wrapped'||!artReady} onClick={open}><span aria-hidden="true"/></button>
    </div>
    <div className="rest-gift-footer"><button type="button" onClick={onReturn}>Back to the garden <span aria-hidden="true">↗</span></button></div>
    {found&&storageStatus==='memory'&&<p className="gift-storage" role="status">This keepsake is yours for this visit. This browser cannot save it for next time.</p>}
  </div>;
}
