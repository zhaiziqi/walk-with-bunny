import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, Float32BufferAttribute, PlaneGeometry, ShaderMaterial, Texture, Vector3 } from 'three';
import { groundExtent, paths, regionAtmosphere } from './gardenAtlas';
import { terrainHeight } from './depthWorld';
import type { MeadowPoint } from './meadowMotion';

/** Trails are pigments on the terrain itself, so steep banks cannot clip a separate road mesh. */
function trailPigment() {
 const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=2048;
 const context=canvas.getContext('2d')!;
 const sx=canvas.width/(groundExtent.maxX-groundExtent.minX),sy=canvas.height/(groundExtent.maxY-groundExtent.minY);
 context.fillStyle='#000';context.fillRect(0,0,canvas.width,canvas.height);
 context.lineCap='round';context.lineJoin='round';context.globalCompositeOperation='lighten';
 for(const path of paths){
  for(const [width,alpha,blur] of [[1.45,.2,3],[1.1,.45,1.8],[.65,.9,1]]){
   context.beginPath();path.points.forEach((point,i)=>{const x=(point.x-groundExtent.minX)*sx,y=(point.y-groundExtent.minY)*sy;if(i===0)context.moveTo(x,y);else context.lineTo(x,y);});
   context.lineWidth=path.width*width*Math.sqrt(sx*sy);context.strokeStyle=`rgba(255,255,255,${alpha})`;context.shadowColor=context.strokeStyle;context.shadowBlur=blur;context.stroke();
  }
 }
 const texture=new CanvasTexture(canvas);texture.anisotropy=4;return texture;
}
const vertexShader=`attribute vec3 wash; varying vec3 world; varying vec3 norm; varying vec3 pigment; varying float distanceToEye;
void main(){world=position;norm=normal;pigment=wash;vec4 mv=modelViewMatrix*vec4(position,1.);distanceToEye=-mv.z;gl_Position=projectionMatrix*mv;}`;
const fragmentShader=`uniform sampler2D paint;uniform sampler2D trailMask;uniform bool hasPaint;uniform vec3 fogColor;uniform float time;
varying vec3 world;varying vec3 norm;varying vec3 pigment;varying float distanceToEye;
void main(){
 float grain=hasPaint?dot(texture2D(paint,fract(world.xy/1800.)).rgb,vec3(.3,.4,.3)):.65;
 float wash=sin(world.x*.004+sin(world.y*.003)*1.8)*.022+cos(world.y*.006-world.x*.002)*.016;
 float cloud=sin(world.x*.0018+world.y*.0021-time*.025)*sin(world.y*.0011-time*.019);
 vec3 color=pigment+wash+(grain-.62)*.12;
 vec2 mapUV=vec2((world.x+8000.)/16000.,1.-(world.y+5000.)/21000.);
 float trail=texture2D(trailMask,mapUV).r;
 vec3 trailColor=mix(pigment,vec3(.94,.90,.78),.66)+(grain-.62)*.09;
 color=mix(color,trailColor,trail*.85);
 color*=.83+dot(normalize(norm),normalize(vec3(-.35,-.4,1.)))*.17;
 color-=smoothstep(.25,.9,cloud)*.025;
 float fog=smoothstep(1600.,4900.,distanceToEye);color=mix(color,fogColor,fog);
 gl_FragColor=vec4(color,1.-smoothstep(4300.,6500.,distanceToEye));
}`;
export function AtlasTerrain({texture,actor,reading}:{texture?:Texture;actor:MeadowPoint;reading:boolean}) {
 const time=useRef(0),mask=useMemo(trailPigment,[]);
 const geometry=useMemo(()=>{
  const g=new PlaneGeometry(16000,21000,300,400),p=g.attributes.position,colors:number[]=[];
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i)+5500;p.setXYZ(i,x,y,terrainHeight(x,y));colors.push(...regionAtmosphere(x,y).ground);}
  g.setAttribute('wash',new Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
 },[]);
 const material=useMemo(()=>new ShaderMaterial({uniforms:{paint:{value:texture??null},trailMask:{value:mask},hasPaint:{value:!!texture},fogColor:{value:new Vector3(.88,.89,.82)},time:{value:0}},vertexShader,fragmentShader,transparent:true,toneMapped:false}),[texture,mask]);
 useFrame((_s,dt)=>{if(!reading)time.current+=Math.min(dt,.05);material.uniforms.time.value=time.current;material.uniforms.fogColor.value.set(...regionAtmosphere(actor.x,actor.y).fog);});
 useEffect(()=>()=>{geometry.dispose();material.dispose();mask.dispose();},[geometry,material,mask]);
 return <mesh geometry={geometry} material={material} renderOrder={-1000}/>;
}
