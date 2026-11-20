import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh, MeshBasicMaterial } from 'three';
import type { Texture } from 'three';
import type { ArtKey } from '../config/art';
import type { MeadowPoint } from './meadowMotion';
import { meadowWidth, meadowHeight, sprouts, trees } from './meadowWorld';
import { objects } from './world';
import type { Place } from './world';

type Textures = Partial<Record<ArtKey,Texture>>;
type Props = {textures:Textures; actor:MeadowPoint; moving:boolean; discovered:Place[]; reading:boolean};

function Sprite({texture,w,h,x=0,y=0,z=4,opacity=1,order=1}: {
  texture?:Texture;w:number;h:number;x?:number;y?:number;z?:number;opacity?:number;order?:number;
}) {
  return texture ? <mesh position={[x,y,z]} renderOrder={order}>
    <planeGeometry args={[w,h]}/><meshBasicMaterial map={texture} transparent opacity={opacity} depthWrite={false} depthTest={false} toneMapped={false}/>
  </mesh> : null;
}

function Tree({item,textures,actor}: {item:typeof trees[number];textures:Textures;actor:MeadowPoint}) {
  const crown=useRef<Group>(null!);
  useFrame(({clock})=>{
    crown.current.rotation.z=Math.sin(clock.elapsedTime*.32+item.x*.002)*.004;
    // A nearby trunk can be passed in front of or behind; no screen-fixed decoration.
  });
  const order=5000-item.y;
  const nearby=Math.hypot(actor.x-item.x,actor.y-item.y)<110;
  return <group position={[item.x,item.y,4]}>
    <Sprite texture={textures.contact} w={item.width*.75} h={32} opacity={.15} order={15}/>
    <group ref={crown}>
      <Sprite texture={textures.tree} w={item.width} h={item.height} y={item.height*(.5-.032552)} opacity={nearby?.68:.9} order={order}/>
    </group>
  </group>;
}

function Sprout({item,textures,actor}: {item:typeof sprouts[number];textures:Textures;actor:MeadowPoint}) {
  const group=useRef<Group>(null!);
  useFrame(({clock})=>{
    const distance=Math.hypot(actor.x-item.x,actor.y-item.y);
    const brush=Math.max(0,1-distance/110)*.22*Math.sign(item.x-actor.x);
    group.current.rotation.z=Math.sin(clock.elapsedTime*.38+item.phase)*.025+brush;
  });
  return <group ref={group} position={[item.x,item.y,3]}>
    <Sprite texture={textures.grass} w={item.width} h={item.width*.5} y={item.width*.2} opacity={.28} order={5000-item.y}/>
  </group>;
}

function Awakened({place,textures}: {place:Place;textures:Textures}) {
  const root=useRef<Group>(null!), wings=useRef<Group>(null!);
  const age=useRef(0);
  const object=objects.find(item=>item.id===place)!;
  useFrame((_state,dt)=>{
    age.current+=Math.min(dt,.05);
    root.current.scale.setScalar(Math.min(1,age.current*1.6));
    wings.current.position.set(Math.sin(age.current*.5)*60,85+Math.sin(age.current*.7)*20,0);
    wings.current.scale.x=.65+Math.sin(age.current*7)*.3;
  });
  return <group position={[object.x,object.y,4]} ref={root}>
    {[[-100,-24,39],[100,-28,34],[70,45,28]].map(([x,y,w],i)=><Sprite key={i} texture={textures.flower} w={w} h={w*1.5} x={x} y={y+w*.65} opacity={.85} order={5000-object.y-y}/>)}
    <group ref={wings}>
      {[-1,1].map(side=><mesh key={side} position={[side*4,0,20]} rotation={[0,0,side*-.35]} scale={[3.6,6,1]} renderOrder={9000}>
        <circleGeometry args={[1,12]}/><meshBasicMaterial color="#fff0cc" transparent opacity={.8} depthTest={false} depthWrite={false} toneMapped={false}/>
      </mesh>)}
    </group>
  </group>;
}

export function MeadowLayers({textures,actor,moving,discovered,reading}:Props) {
  const ground=useRef<Mesh>(null!);
  const elapsed=useRef(0), previousFoot=useRef({...actor}), nextFoot=useRef(0);
  const tracks=useRef(Array.from({length:14},()=>({x:0,y:0,age:10})));
  const trackMeshes=useRef<(Group|null)[]>([]);
  useFrame((_state,dt)=>{
    const delta=Math.min(dt,.05); elapsed.current+=delta;
    if(ground.current) (ground.current.material as MeshBasicMaterial).opacity=Math.min(.94,elapsed.current*.85);
    if(moving&&!reading&&Math.hypot(actor.x-previousFoot.current.x,actor.y-previousFoot.current.y)>44) {
      const slot=tracks.current[nextFoot.current++%tracks.current.length];
      Object.assign(slot,{x:actor.x,y:actor.y,age:0}); previousFoot.current={...actor};
    }
    tracks.current.forEach((track,i)=>{
      track.age+=delta; const mesh=trackMeshes.current[i]; if(!mesh)return;
      mesh.position.set(track.x,track.y,8);
      mesh.children.forEach(child=>((child as Mesh).material as MeshBasicMaterial).opacity=Math.max(0,1-track.age/2.8)*.16);
    });
  });
  return <>
    {textures.meadow&&<mesh ref={ground} position={[0,0,.2]} renderOrder={1}>
      <planeGeometry args={[meadowWidth,meadowHeight]}/><meshBasicMaterial map={textures.meadow} transparent opacity={0} depthTest={false} depthWrite={false} toneMapped={false}/>
    </mesh>}
    {tracks.current.map((_,i)=><group key={i} ref={node=>{trackMeshes.current[i]=node;}}>
      {[-1,1].map(side=><mesh key={side} position={[side*5,side*4,0]} scale={[2.5,4,1]} renderOrder={30}>
        <circleGeometry args={[1,12]}/><meshBasicMaterial color="#89977c" transparent opacity={0} depthTest={false} depthWrite={false}/>
      </mesh>)}
    </group>)}
    {sprouts.map((item,i)=><Sprout key={i} item={item} textures={textures} actor={actor}/>)}
    {trees.map((item,i)=><Tree key={i} item={item} textures={textures} actor={actor}/>)}
    {discovered.map(place=><Awakened key={place} place={place} textures={textures}/>)}
  </>;
}
