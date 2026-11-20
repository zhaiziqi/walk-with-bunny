import { restGift, restGiftArtwork } from './restGift';
import { useRestGiftArt } from './restGiftArt';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, DoubleSide, Group, Mesh, MeshBasicMaterial, SRGBColorSpace, Texture } from 'three';
import { BILLBOARD_TILT, terrainHeight } from './depthWorld';
import { advanceOrangeRest, inspectOrangeRest, orangeRest, type OrangeRestPoint, type OrangeRestRef } from './orangeRest';
import { createOrangeCupCanvas, orangeCupArt, orangeRestReveal, paintOrangeCup, useOrangeRestArt } from './orangeRestArt';
import type { JourneyFrameRef } from './journeyFrame';

export type OrangeRestProps={actor:OrangeRestPoint;motion?:JourneyFrameRef;reading:boolean;rest:OrangeRestRef};

/** The only owner of the live sip clock; actor and camera are read-only. */
export function OrangeRest({actor,motion,reading,rest}:OrangeRestProps){
  const root=useRef<Group>(null!);
  const artwork=useOrangeRestArt();
  const parcelArt=useRestGiftArt(), parcelSize=restGiftArtwork();
  const parcelTexture=useMemo(()=>{const t=new Texture(parcelArt);t.needsUpdate=true;t.colorSpace=SRGBColorSpace;t.anisotropy=4;return t;},[parcelArt]);
  useEffect(()=>()=>parcelTexture.dispose(),[parcelTexture]);
  const tableTexture=useMemo(()=>{const t=new Texture(artwork);t.needsUpdate=true;t.colorSpace=SRGBColorSpace;t.anisotropy=4;return t;},[artwork]);
  const cupCanvas=useMemo(()=>createOrangeCupCanvas(rest.current.liquid),[rest]);
  const cupTexture=useMemo(()=>{const t=new CanvasTexture(cupCanvas);t.colorSpace=SRGBColorSpace;t.anisotropy=4;return t;},[cupCanvas]);
  const paintedLevel=useRef(rest.current.liquid),inspection=useRef(0);
  useEffect(()=>()=>tableTexture.dispose(),[tableTexture]);
  useEffect(()=>()=>cupTexture.dispose(),[cupTexture]);
  useFrame(({gl},delta)=>{
    const live=reading?actor:motion?.current.actor??actor;
    rest.current=advanceOrangeRest(rest.current,live,delta,{paused:reading,speed:motion?.current.speed});
    if(Math.abs(paintedLevel.current-rest.current.liquid)>.001){
      paintOrangeCup(cupCanvas,rest.current.liquid);cupTexture.needsUpdate=true;paintedLevel.current=rest.current.liquid;
    }
    const reveal=orangeRestReveal(live);
    root.current.visible=reveal>.005;
    root.current.traverse(object=>{if(object instanceof Mesh)(object.material as MeshBasicMaterial).opacity=reveal;});
    inspection.current+=Math.min(delta,.05);
    if(inspection.current>.1){gl.domElement.dataset.orangeRest=JSON.stringify(inspectOrangeRest(rest.current));inspection.current=0;}
  });
  return <group ref={root} name="orange-rest" position={[orangeRest.x,orangeRest.y,terrainHeight(orangeRest.x,orangeRest.y)+3]} visible={orangeRestReveal(actor)>.005}>
    <group rotation={[BILLBOARD_TILT,0,0]}>
      <mesh position={[0,orangeRest.height*(orangeRest.foot-.5),0]}>
        <planeGeometry args={[orangeRest.width,orangeRest.height]}/>
        <meshBasicMaterial map={tableTexture} transparent alphaTest={.015} depthWrite={false} side={DoubleSide} toneMapped={false}/>
      </mesh>
      <mesh position={[orangeRest.cup.x,orangeRest.cup.y+orangeCupArt.height*(orangeCupArt.foot-.5),.5]}>
        <planeGeometry args={[orangeCupArt.width,orangeCupArt.height]}/>
        <meshBasicMaterial map={cupTexture} transparent alphaTest={.01} depthWrite={false} side={DoubleSide} toneMapped={false}/>
      </mesh>
      <mesh position={[restGift.x,restGift.y+parcelSize.height*(parcelSize.foot-.5),1]}>
        <planeGeometry args={[parcelSize.width,parcelSize.height]}/>
        <meshBasicMaterial map={parcelTexture} transparent alphaTest={.01} depthWrite={false} side={DoubleSide} toneMapped={false}/>
      </mesh>
    </group>
  </group>;
}
