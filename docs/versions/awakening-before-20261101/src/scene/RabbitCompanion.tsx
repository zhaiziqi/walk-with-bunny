import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh, MeshBasicMaterial, PlaneGeometry, Texture } from 'three';
import type { ArtKey } from '../config/art';
import { BILLBOARD_TILT, terrainHeight } from './depthWorld';
import { RABBIT } from './world';
import type { MeadowPoint } from './meadowMotion';

type Props={actor:MeadowPoint;moving:boolean;heading:MeadowPoint;reading:boolean;textures:Partial<Record<ArtKey,Texture>>};
/** The foot is a world point; hops lift in world Z, and only the painted body billboards. */
export function RabbitCompanion({actor,moving,heading,reading,textures}:Props) {
 const lift=useRef<Group>(null!),body=useRef<Group>(null!),shadow=useRef<Mesh>(null!);
 const trail=useRef<(Mesh|null)[]>([]),prints=useRef(Array.from({length:10},()=>({x:0,y:0,age:8,angle:0})));
 const last=useRef({...actor}),distance=useRef(0),printIndex=useRef(0),time=useRef(0),idle=useRef(0),pace=useRef(0),strength=useRef(0);
 const facing=useRef(1),geometry=useMemo(()=>new PlaneGeometry(RABBIT.width,RABBIT.height,10,18),[]);
 const original=useMemo(()=>new Float32Array(geometry.attributes.position.array),[geometry]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 useFrame((_s,dt)=>{
  if(reading)return;const delta=Math.min(dt,.05);time.current+=delta;idle.current=moving?0:idle.current+delta;
  const travel=Math.hypot(actor.x-last.current.x,actor.y-last.current.y);last.current={...actor};
  strength.current+=(Number(moving)-strength.current)*(1-Math.exp(-delta*14));
  pace.current+=delta*(moving?10.5:3.5);const hop=Math.pow(Math.max(0,Math.sin(pace.current)),1.1)*strength.current;
  lift.current.position.z=hop*23;
  if(Math.abs(heading.x)>.24)facing.current=heading.x>0?-1:1;
  const rest=Math.sin(idle.current*1.5)*.008;
  body.current.scale.set(facing.current*(1+Math.cos(pace.current*2)*.022*strength.current),1+Math.sin(pace.current*2)*.035*strength.current+rest,1);
  body.current.rotation.z=-heading.x*.04*strength.current+Math.sin(time.current*.65)*.006;
  // Separate high vertices give soft ears a delayed follow-through; lower body stays grounded.
  const vertices=geometry.attributes.position;
  for(let i=0;i<vertices.count;i++){
    const x=original[i*3],y=original[i*3+1],ear=Math.max(0,(y/RABBIT.height+.5-.56)/.44);
    const twitch=idle.current>3&&Math.sin(idle.current*.5)>.9?Math.sin(time.current*13)*2.2:0;
    vertices.setXYZ(i,x+ear*ear*(Math.sin(pace.current-1)*5*strength.current+Math.sin(time.current*1.2+x*.025)*1.2+twitch),y,0);
  }vertices.needsUpdate=true;
  shadow.current.scale.setScalar(1-hop*.18);(shadow.current.material as MeshBasicMaterial).opacity=.25-hop*.08;
  if(moving&&travel<80){distance.current+=travel;if(distance.current>48){distance.current=0;const i=printIndex.current++%prints.current.length;prints.current[i]={x:actor.x,y:actor.y,age:0,angle:Math.atan2(heading.y,heading.x)-Math.PI/2};}}
  prints.current.forEach((p,i)=>{p.age+=delta;const mesh=trail.current[i];if(!mesh)return;mesh.visible=p.age<3.8;if(!mesh.visible)return;mesh.position.set(p.x,p.y,terrainHeight(p.x,p.y)+2);mesh.rotation.z=p.angle;(mesh.material as MeshBasicMaterial).opacity=.13*Math.max(0,1-p.age/3.8);});
 });
 const back=heading.y>.15,footInset=back?RABBIT.height*.0345052:RABBIT.footInset;
 return <>
  {prints.current.map((_,i)=><mesh key={i} ref={node=>{trail.current[i]=node;}} visible={false}><planeGeometry args={[35,22]}/><meshBasicMaterial map={textures.contact} color="#b6b393" transparent opacity={0} depthWrite={false}/></mesh>)}
  <group position={[actor.x,actor.y,terrainHeight(actor.x,actor.y)+2]}>
   <mesh ref={shadow}><planeGeometry args={[95,45]}/><meshBasicMaterial map={textures.contact} transparent opacity={.25} depthWrite={false}/></mesh>
   <group ref={lift}><group rotation={[BILLBOARD_TILT,0,0]}><group ref={body}>
    <mesh geometry={geometry} position={[0,RABBIT.height/2-footInset,0]}><meshBasicMaterial map={back?(textures.rabbitBack??textures.rabbit):textures.rabbit} transparent alphaTest={.025} depthWrite={false} toneMapped={false}/></mesh>
   </group></group></group>
  </group>
 </>;
}
