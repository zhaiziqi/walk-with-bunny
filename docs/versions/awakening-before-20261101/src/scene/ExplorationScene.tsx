import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { DoubleSide, Fog, Group, Mesh, MeshBasicMaterial, PerspectiveCamera, PlaneGeometry, Shape, SRGBColorSpace, Texture } from 'three';
import type { ArtKey } from '../config/art';
import type { GardenProps } from './GardenCanvas';
import { BILLBOARD_TILT, depthCamera, depthProject, depthTrees, terrainHeight } from './depthWorld';
import { objects } from './world';
import { LivingWorld } from './LivingWorld';
import { RabbitCompanion } from './RabbitCompanion';
import { AtlasTerrain } from './AtlasTerrain';
import { AtlasEncounters } from './AtlasEncounters';
import { gardenShrubs, regionAtmosphere } from './gardenAtlas';
import type { MeadowPoint } from './meadowMotion';
import type { JourneyPose } from './journey';

type Textures=Partial<Record<ArtKey,Texture>>;

function Sprite({texture,w,h,opacity=1,color='#ffffff',...props}:{texture?:Texture;w:number;h:number;opacity?:number;color?:string;position?:[number,number,number]}) {
  return texture?<mesh {...props}><planeGeometry args={[w,h]}/><meshBasicMaterial map={texture} transparent opacity={opacity} color={color} depthWrite={false} alphaTest={.025} side={DoubleSide} toneMapped={false}/></mesh>:null;
}
function Tree({item,textures,actor,reading,pose}:{item:typeof depthTrees[number];textures:Textures;actor:MeadowPoint;reading:boolean;pose:JourneyPose}) {
  const root=useRef<Group>(null!),crown=useRef<Group>(null!),t=useRef(0),alpha=useRef(1);
  const {size}=useThree();
  const geometry=useMemo(()=>new PlaneGeometry(item.w,item.h,14,18),[item.w,item.h]);
  const original=useMemo(()=>new Float32Array(geometry.attributes.position.array),[geometry]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  useFrame((_s,dt)=>{
    const delta=Math.min(dt,.05);
    root.current.visible=Math.abs(item.x-actor.x)<3300&&item.y>actor.y-1200&&item.y<actor.y+5100;
    if(!root.current.visible)return;
    if(!reading){t.current+=delta;
      const points=geometry.attributes.position;
      const wind=Math.sin(t.current*.62+item.x*.001+item.y*.0004);
      for(let i=0;i<points.count;i++){const x=original[i*3],y=original[i*3+1],branch=Math.max(0,y/item.h+.5-.22);points.setX(i,x+branch*branch*(wind*11+Math.sin(t.current*.95+y*.008)*3));}points.needsUpdate=true;
    }
    const tree=depthProject(item.x,item.y,pose,size.width,size.height),rabbit=depthProject(actor.x,actor.y,pose,size.width,size.height);
    const overlaps=actor.y>item.y&&Math.abs(tree.x-rabbit.x)<item.w*tree.scale*.43&&rabbit.y>tree.y-item.h*tree.scale&&rabbit.y-80<tree.y;
    const near=Math.hypot(item.x-actor.x,item.y-actor.y)<140;
    const fade=Math.max(0,Math.min(1,(tree.depth-420)/380));
    const target=(overlaps?.23:near?.6:1)*fade;
    alpha.current+=(target-alpha.current)*(1-Math.exp(-delta*7));
    crown.current.traverse(child=>{if(child instanceof Mesh)(child.material as MeshBasicMaterial).opacity=alpha.current;});
  });
  return <group ref={root} position={[item.x,item.y,terrainHeight(item.x,item.y)+1]}>
    <Sprite texture={textures.contact} w={item.w*.7} h={95} opacity={.19}/>
    <group rotation={[BILLBOARD_TILT,0,0]}><group ref={crown} scale={[Math.sin(item.x*.017+item.y*.013)>0?-1:1,1,1]}><mesh geometry={geometry} position={[0,item.h*(.5-item.footInset),0]}><meshBasicMaterial map={textures[item.art]??textures.tree} color={item.tint} transparent alphaTest={.025} depthWrite={false} toneMapped={false}/></mesh></group></group>
  </group>;
}

function Understory({textures,actor,reading}:{textures:Textures;actor:MeadowPoint;reading:boolean}) {
  const roots=useRef<(Group|null)[]>([]),time=useRef(0);
  const grassShape=useMemo(()=>{const shape=new Shape();for(let i=0;i<7;i++){const x=(i-3)*8,h=26+(i*17%31),bend=(i%2?1:-1)*(7+i);shape.moveTo(x-1.2,0);shape.quadraticCurveTo(x+bend*.2,h*.65,x+bend,h);shape.quadraticCurveTo(x+bend*.5,h*.4,x+1.6,0);shape.closePath();}return shape;},[]);
  useFrame((_s,dt)=>{
    if(!reading)time.current+=Math.min(dt,.05);
    gardenShrubs.forEach((plant,i)=>{const root=roots.current[i];if(!root)return;
      const distance=Math.hypot(plant.x-actor.x,plant.y-actor.y);
      root.visible=distance<2400&&plant.y>actor.y-900;
      if(!root.visible||reading)return;
      const touch=Math.max(0,1-distance/110)*(plant.x<actor.x?-.34:.34);
      root.rotation.z=Math.sin(time.current*.62+plant.x*.001+plant.y*.0004)*.035+touch;
    });
  });
  return <>{gardenShrubs.map((plant,i)=>{
    const key=plant.kind==='fern'?'fern':plant.kind==='flower'?'flower':'grass';
    const w=plant.width*(key==='fern'?2.2:key==='grass'?2.8:1.4),h=key==='grass'?w/3.75:w*1.5;
    return <group key={i} position={[plant.x,plant.y,terrainHeight(plant.x,plant.y)+1]}>
      <group rotation={[BILLBOARD_TILT,0,0]}><group ref={node=>{roots.current[i]=node;}}>
        {key==='grass'?<mesh scale={[plant.width/35,plant.height/40,1]}><shapeGeometry args={[grassShape,5]}/><meshBasicMaterial color={i%2?'#b5c6a4':'#8eac98'} transparent opacity={.65} depthWrite={false} side={DoubleSide}/></mesh>:<Sprite texture={textures[key]} w={w} h={h} position={[0,h*(.5-(key==='fern'?.05533854:.07)),0]} opacity={.9}/>}
      </group></group>
    </group>;
  })}</>;
}
function Landmark({object,textures,reading,bloom,lampOn,discovered,actor}:{object:typeof objects[number];textures:Textures;reading:boolean;bloom:number;lampOn:boolean;discovered:boolean;actor:MeadowPoint}) {
  const flowers=useRef<Group>(null!),growth=useRef(0);
  const plant=useRef<Group>(null!),time=useRef(0),pulse=useRef(0),lastBloom=useRef(bloom),light=useRef<Mesh>(null!);
  useFrame((_s,dt)=>{
    if(!reading){time.current+=Math.min(dt,.05);growth.current+=(Number(discovered)-growth.current)*(1-Math.exp(-Math.min(dt,.05)*2));if(flowers.current)flowers.current.scale.setScalar(Math.max(.001,growth.current));}
    if(lastBloom.current!==bloom){lastBloom.current=bloom;pulse.current=1;}
    pulse.current*=Math.exp(-Math.min(dt,.05)*2.5);
    plant.current.rotation.z=object.id==='music'?Math.sin(time.current*.7)*.016+Math.sin(pulse.current*15)*pulse.current*.12:0;
    if(light.current)(light.current.material as MeshBasicMaterial).opacity=(lampOn?.65:discovered?.3:.09)*(1+Math.sin(time.current)*.08);
  });
  const reveal=reading?1:Math.max(0,Math.min(1,(1350-Math.hypot(actor.x-object.x,actor.y-object.y))/550));
  return <group visible={reveal>.01} position={[object.x,object.y,terrainHeight(object.x,object.y)+2]}>
    <Sprite texture={textures.contact} w={object.width} h={55} opacity={.24}/>
    <group ref={flowers}>{[[-85,-32,30],[90,-20,36],[65,55,25]].map(([x,y,w],i)=><group key={i} position={[x,y,terrainHeight(object.x+x,object.y+y)-terrainHeight(object.x,object.y)]} rotation={[BILLBOARD_TILT,0,0]}><Sprite texture={textures.flower} w={w} h={w*1.5} position={[0,w*.65,0]}/></group>)}</group>
    {object.id==='lock'&&<mesh position={[0,-30,1]}><planeGeometry args={[130,90]}/><meshBasicMaterial color="#cecdb8" transparent opacity={.4}/></mesh>}
    <group rotation={[BILLBOARD_TILT,0,0]}>
      <group ref={plant}><Sprite texture={textures[object.art]} opacity={reveal} w={object.width} h={object.height} position={[0,object.height/2-object.footInset,0]}/></group>
      <Sprite texture={textures.grass} w={object.width*.6} h={40} position={[0,7,2]} color="#849b86" opacity={.7}/>
      {object.id==='puzzle'&&<mesh ref={light} position={[0,object.height*.68,3]}><planeGeometry args={[240,240]}/><meshBasicMaterial map={textures.glow} transparent opacity={.09} depthWrite={false}/></mesh>}
    </group>
  </group>;
}
export function ExplorationScene(props:GardenProps) {
  const {images,pose,actor,moving,heading,reading,discovered,onReady}=props;
  const {camera,size,gl,scene}=useThree(),ready=useRef(false);
  const sceneryActor=reading?{x:pose.x,y:pose.y-220}:actor;
  const textures=useMemo(()=>{const result:Textures={};for(const [key,image] of Object.entries(images)){const t=new Texture(image);t.colorSpace=SRGBColorSpace;t.needsUpdate=true;t.anisotropy=4;result[key as ArtKey]=t;}return result;},[images]);
  useEffect(()=>()=>Object.values(textures).forEach(t=>t.dispose()),[textures]);
  useEffect(()=>{const lose=(e:Event)=>{e.preventDefault();props.onFail();};gl.domElement.addEventListener('webglcontextlost',lose);return()=>gl.domElement.removeEventListener('webglcontextlost',lose);},[gl,props.onFail]);
  useFrame(()=>{const c=depthCamera(pose,size.width,size.height),cam=camera as PerspectiveCamera;cam.position.set(c.x,c.y,c.z);cam.up.set(0,0,1);cam.lookAt(c.x,c.targetY,c.targetZ);cam.fov=c.fov;cam.far=18000;cam.updateProjectionMatrix();if(scene.fog instanceof Fog){const c=regionAtmosphere(sceneryActor.x,sceneryActor.y).fog;scene.fog.color.setRGB(...c,SRGBColorSpace);}if(!ready.current){ready.current=true;onReady();}});
  return <>
    <fog attach="fog" args={['#d1dedb',1500,4400]}/>
    <AtlasTerrain texture={textures.meadow} actor={sceneryActor} reading={reading}/>
    {depthTrees.map((tree,i)=><Tree key={i} item={tree} textures={textures} actor={sceneryActor} reading={reading} pose={pose}/>)}
    {objects.map(object=><Landmark key={object.id} object={object} textures={textures} actor={actor} reading={reading} bloom={props.bloom} lampOn={props.lampOn} discovered={discovered.includes(object.id)}/>)}
    <Understory textures={textures} actor={sceneryActor} reading={reading}/>
    <AtlasEncounters textures={textures} actor={sceneryActor} moving={moving} heading={heading} reading={reading} onEvent={props.onWorldEvent} pulse={props.atlasPulse}/>
    <LivingWorld textures={textures} actor={actor} moving={moving} heading={heading} reading={reading} discovered={discovered} onEvent={props.onWorldEvent}/>
    <RabbitCompanion actor={actor} moving={moving} heading={heading} reading={reading} textures={textures}/>
  </>;
}
