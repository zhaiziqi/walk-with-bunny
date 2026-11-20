import { useEffect, useRef } from 'react';
import { restGiftArtwork, restGiftAvailable, restGiftProjection } from './restGift';
import type { JourneyFrameRef } from './journeyFrame';
import '../styles/rest-gift.css';

type Props = { motion: JourneyFrameRef; width: number; height: number; active: boolean; found: boolean; onOpen: () => void };
export function RestGiftTarget({motion,width,height,active,found,onOpen}: Props) {
  const button=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    let frame=0;
    const place=()=>{
      const node=button.current;if(!node)return;
      const point=restGiftProjection(motion.current.pose,width,height);
      const art=restGiftArtwork();
      const onScreen=point.x>24&&point.x<width-24&&point.y>55&&point.y<height-55;
      node.hidden=!active||!restGiftAvailable(motion.current.actor)||!onScreen;
      node.tabIndex=node.hidden?-1:0;
      node.style.left=`${point.x}px`;node.style.top=`${point.y}px`;
      node.style.width=`${Math.max(48,art.width*point.scale)}px`;
      node.style.height=`${Math.max(44,art.height*point.scale)}px`;
      frame=requestAnimationFrame(place);
    };
    place();return()=>cancelAnimationFrame(frame);
  },[motion,width,height,active]);
  return <button ref={button} hidden id="rest-gift-target" data-world-object className="rest-gift-target"
    aria-label={found?'Open the little gift box again':'Open the little gift box'} onClick={()=>{
      if(active&&restGiftAvailable(motion.current.actor))onOpen();
    }}><span aria-hidden="true"/></button>;
}
