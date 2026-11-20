import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Color, DoubleSide, Group, Mesh, MeshBasicMaterial, PerspectiveCamera, PlaneGeometry, ShaderMaterial, SRGBColorSpace, Texture } from 'three';
import type { ArtKey } from '../config/art';
import type { GardenProps } from './GardenCanvas';
import { BILLBOARD_TILT, depthCamera, depthProject, depthTrees, terrainHeight } from './depthWorld';
import { objects, RABBIT } from './world';
import { LivingWorld } from './LivingWorld';
import type { MeadowPoint } from './meadowMotion';
import type { JourneyPose } from './journey';

type Textures=Partial<Record<ArtKey,Texture>>;

function Sprite({texture,w,h,opacity=1,color='#ffffff',...props}:{texture?:Texture;w:number;h:number;opacity?:number;color?:string;position?:[number,number,number]}) {
  return texture?<mesh {...props}><planeGeometry args={[w,h]}/><meshBasicMaterial map={texture} transparent opacity={opacity} color={color} depthWrite={false} alphaTest={.025} side={DoubleSide} toneMapped={false}/></mesh>:null;
}
function Ground({texture}:{texture?:Texture}) {
  const geometry=useMemo(()=>{
    const g=new PlaneGeometry(14000,16000,160,180),p=g.attributes.position;
    for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i)+3000;p.setXYZ(i,x,y,terrainHeight(x,y));}
    g.computeVertexNormals();return g;
  },[]);
  const material=useMemo(()=>new ShaderMaterial({uniforms:{paint:{value:texture??null},hasPaint:{value:!!texture},fogColor:{value:new Color('#d1dedb').convertLinearToSRGB()}},
    vertexShader:`varying vec3 world; varying vec3 norm; varying float dist; void main(){world=position;norm=normal;vec4 mv=modelViewMatrix*vec4(position,1.);dist=-mv.z;gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform sampler2D paint;uniform bool hasPaint;uniform vec3 fogColor;varying vec3 world;varying vec3 norm;varying float dist;
    float path(float y){
      float x=0.;
      if(y<70.)x=mix(0.,-100.,smoothstep(-220.,70.,y));
      else if(y<310.)x=mix(-100.,-330.,smoothstep(70.,310.,y));
      else if(y<750.)x=mix(-330.,-650.,smoothstep(310.,750.,y));
      else if(y<1100.)x=mix(-650.,-200.,smoothstep(750.,1100.,y));
      else if(y<1550.)x=mix(-200.,550.,smoothstep(1100.,1550.,y));
      else if(y<1900.)x=mix(550.,300.,smoothstep(1550.,1900.,y));
      else x=mix(300.,-250.,smoothstep(1900.,2350.,y));return x;}
    void main(){
      float grain=hasPaint?dot(texture2D(paint,fract(world.xy/2100.)).rgb,vec3(.3,.4,.3)):.7;
      float dusk=smoothstep(500.,2800.,world.y);
      vec3 color=mix(vec3(.72,.78,.67),vec3(.52,.64,.65),dusk);
      color+=sin(world.x*.003+world.y*.002)*.023+cos(world.y*.005-world.x*.002)*.018;
      color+=(grain-.6)*.11;
      float width=28.+sin(world.y*.008)*8.;
      float trail=1.-smoothstep(width,width+34.,abs(world.x-path(world.y)));
      trail*=.7+.16*sin(world.y*.006);
      color=mix(color,mix(vec3(.86,.85,.74),vec3(.69,.75,.70),dusk),trail);
      color*=.78+dot(normalize(norm),normalize(vec3(-.3,-.4,1.)))*.22;
      float fog=smoothstep(1300.,4400.,dist);color=mix(color,fogColor,fog);
      gl_FragColor=vec4(color,1.-smoothstep(4200.,6500.,dist));
    }`,transparent:true,toneMapped:false}),[texture]);
  useEffect(()=>()=>{geometry.dispose();material.dispose();},[geometry,material]);
  return <mesh geometry={geometry} material={material}/>;
}
function Tree({item,textures,actor,reading,pose}:{item:typeof depthTrees[number];textures:Textures;actor:MeadowPoint;reading:boolean;pose:JourneyPose}) {
  const crown=useRef<Group>(null!),t=useRef(0),alpha=useRef(1);
  const {size}=useThree();
  useFrame((_s,dt)=>{
    const delta=Math.min(dt,.05);
    if(!reading){t.current+=delta;crown.current.rotation.z=Math.sin(t.current*.45+item.y*.0004)*.008;}
    const tree=depthProject(item.x,item.y,pose,size.width,size.height),rabbit=depthProject(actor.x,actor.y,pose,size.width,size.height);
    const overlaps=actor.y>item.y&&Math.abs(tree.x-rabbit.x)<item.w*tree.scale*.43&&rabbit.y>tree.y-item.h*tree.scale&&rabbit.y-80<tree.y;
    const near=Math.hypot(item.x-actor.x,item.y-actor.y)<140;
    const target=overlaps?.23:near?.6:1;
    alpha.current+=(target-alpha.current)*(1-Math.exp(-delta*7));
    crown.current.traverse(child=>{if(child instanceof Mesh)(child.material as MeshBasicMaterial).opacity=alpha.current;});
  });
  return <group position={[item.x,item.y,terrainHeight(item.x,item.y)+1]}>
    <Sprite texture={textures.contact} w={item.w*.7} h={95} opacity={.19}/>
    <group rotation={[BILLBOARD_TILT,0,0]}><group ref={crown} scale={[item.x>0?-1:1,1,1]}><Sprite texture={textures.tree} w={item.w} h={item.h} position={[0,item.h*(.5-.032552),0]}/></group></group>
  </group>;
}

function Rabbit({actor,moving,heading,reading,textures}:{actor:MeadowPoint;moving:boolean;heading:MeadowPoint;reading:boolean;textures:Textures}) {
  const body=useRef<Group>(null!),shadow=useRef<Mesh>(null!),time=useRef(0),idle=useRef(0),pace=useRef(0);
  const facing=useRef(1),turn=useRef(1);
  useFrame((_s,dt)=>{
    if(reading)return;const delta=Math.min(dt,.05);time.current+=delta;
    idle.current=moving?0:idle.current+delta;
    if(Math.abs(heading.x)>.16)facing.current=heading.x>0?-1:1;
    turn.current+=(facing.current-turn.current)*Math.min(1,delta*12);
    if(moving)pace.current+=delta*8.6;
    const step=moving?Math.max(0,Math.sin(pace.current)):0;
    body.current.position.z=step*18;
    const sniff=idle.current>2?Math.sin((idle.current-2)*2.3)*.008:0;
    body.current.scale.set(turn.current,1+(moving?Math.sin(pace.current*2)*.045:sniff),1);
    body.current.rotation.z=moving?-heading.x*.045+Math.sin(pace.current)*.025:Math.sin(time.current*.6)*.006;
    if(shadow.current){const points=shadow.current.geometry.attributes.position;for(let i=0;i<points.count;i++)points.setZ(i,terrainHeight(actor.x+points.getX(i),actor.y+points.getY(i))-terrainHeight(actor.x,actor.y));points.needsUpdate=true;shadow.current.scale.setScalar(1-step*.15);(shadow.current.material as MeshBasicMaterial).opacity=.22-step*.06;}
  });
  return <group position={[actor.x,actor.y,terrainHeight(actor.x,actor.y)+2]}>
    <mesh ref={shadow}><planeGeometry args={[95,45,4,3]}/><meshBasicMaterial map={textures.contact} transparent opacity={.22} depthWrite={false}/></mesh>
    <group rotation={[BILLBOARD_TILT,0,0]}><group ref={body}>
      <Sprite texture={heading.y>.15?(textures.rabbitBack??textures.rabbit):textures.rabbit} w={RABBIT.width} h={RABBIT.height} position={[0,RABBIT.height/2-(heading.y>.15?RABBIT.height*.0345052:RABBIT.footInset),0]}/>
    </group></group>
  </group>;
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
  const reveal=Math.max(0,Math.min(1,(1350-Math.hypot(actor.x-object.x,actor.y-object.y))/550));
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
  const {camera,size,gl}=useThree(),ready=useRef(false);
  const textures=useMemo(()=>{const result:Textures={};for(const [key,image] of Object.entries(images)){const t=new Texture(image);t.colorSpace=SRGBColorSpace;t.needsUpdate=true;t.anisotropy=4;result[key as ArtKey]=t;}return result;},[images]);
  useEffect(()=>()=>Object.values(textures).forEach(t=>t.dispose()),[textures]);
  useEffect(()=>{const lose=(e:Event)=>{e.preventDefault();props.onFail();};gl.domElement.addEventListener('webglcontextlost',lose);return()=>gl.domElement.removeEventListener('webglcontextlost',lose);},[gl,props.onFail]);
  useFrame(()=>{const c=depthCamera(pose,size.width,size.height),cam=camera as PerspectiveCamera;cam.position.set(c.x,c.y,c.z);cam.up.set(0,0,1);cam.lookAt(c.x,c.targetY,c.targetZ);cam.fov=c.fov;cam.far=18000;cam.updateProjectionMatrix();if(!ready.current){ready.current=true;onReady();}});
  return <>
    <fog attach="fog" args={['#d1dedb',1500,4400]}/>
    <Ground texture={textures.meadow}/>
    {depthTrees.map((tree,i)=><Tree key={i} item={tree} textures={textures} actor={actor} reading={reading} pose={pose}/>)}
    {objects.map(object=><Landmark key={object.id} object={object} textures={textures} actor={actor} reading={reading} bloom={props.bloom} lampOn={props.lampOn} discovered={discovered.includes(object.id)}/>)}
    <LivingWorld textures={textures} actor={actor} moving={moving} heading={heading} reading={reading} discovered={discovered} onEvent={props.onWorldEvent}/>
    <Rabbit actor={actor} moving={moving} heading={heading} reading={reading} textures={textures}/>
  </>;
}
