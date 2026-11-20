import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { BufferAttribute, BufferGeometry, ShaderMaterial } from 'three';
import { createAirSeeds, airPosition } from './airMotion';
import { groundExtent } from './gardenAtlas';
import { terrainHeight } from './depthWorld';
import type { MeadowPoint } from './meadowMotion';
import type { GardenClock } from './gardenWind';
import type { JourneyFrameRef } from './journeyFrame';

type Props = { clock: GardenClock; actor: MeadowPoint; moving: boolean; heading: MeadowPoint; reading: boolean; motion?: JourneyFrameRef };
const vertexShader = `
attribute float moteSize; attribute float leaf; attribute float glint; attribute float opacity; attribute float angle;
uniform float resolutionY; varying float vLeaf; varying float vGlint; varying float vOpacity; varying float vAngle;
void main(){
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.);
  float depth = -viewPosition.z;
  gl_Position = projectionMatrix * viewPosition;
  gl_PointSize = clamp(moteSize * projectionMatrix[1][1] * resolutionY * .5 / max(1.,depth), 1.1, 20.);
  vLeaf = leaf; vGlint = glint * (1.-smoothstep(2100.,4000.,depth)); vAngle = angle;
  vOpacity = opacity * smoothstep(240.,650.,depth) * (1.-smoothstep(2400.,4900.,depth));
  if(depth < 1.) vOpacity=0.;
}`;
const fragmentShader = `
varying float vLeaf; varying float vGlint; varying float vOpacity; varying float vAngle;
void main(){
  vec2 point = gl_PointCoord * 2.-1.;
  float cs=cos(vAngle),sn=sin(vAngle);
  point=mat2(cs,-sn,sn,cs)*point;
  float radius = length(point * mix(vec2(1.),vec2(1.85,.85),vLeaf));
  float soft = exp(-radius*radius*4.5)*(1.-smoothstep(.6,1.,radius));
  float core = (1.-smoothstep(.08,mix(.46,.58,vGlint),radius))*mix(.62,.94,vGlint);
  float alpha = max(soft*mix(.55,.72,vGlint),core)*vOpacity;
  vec3 color = mix(vec3(1.,.98,.87),vec3(.97,.82,.72),vLeaf);
  gl_FragColor = vec4(color,alpha);
}`;

/** One bounded point cloud inhabits the landscape at three readable depths. */
export function GardenAir({ clock, actor, moving, heading, reading, motion }: Props) {
  const { size, gl } = useThree(), wake = useRef(0);
  const data = useMemo(() => {
    const seeds = createAirSeeds(groundExtent);
    // A mote's drifting orbit clears nearby hills, rather than cutting into them.
    const floors = seeds.map(seed => Math.max(...[-115,0,115].flatMap(dx => [-75,0,75].map(dy => terrainHeight(seed.x+dx,seed.y+dy)))));
    const geometry = new BufferGeometry();
    geometry.setAttribute('position',new BufferAttribute(new Float32Array(seeds.length*3),3));
    geometry.setAttribute('moteSize',new BufferAttribute(new Float32Array(seeds.map(seed => seed.size)),1));
    geometry.setAttribute('leaf',new BufferAttribute(new Float32Array(seeds.map(seed => Number(seed.leaf))),1));
    geometry.setAttribute('glint',new BufferAttribute(new Float32Array(seeds.map(seed => Number(seed.glint))),1));
    geometry.setAttribute('opacity',new BufferAttribute(new Float32Array(seeds.length),1));
    geometry.setAttribute('angle',new BufferAttribute(new Float32Array(seeds.length),1));
    return { seeds, floors, geometry };
  },[]);
  const material = useMemo(() => new ShaderMaterial({ vertexShader, fragmentShader,
    uniforms:{ resolutionY:{ value:720 } }, transparent:true, depthWrite:false, toneMapped:false,
  }),[]);
  useEffect(() => () => { data.geometry.dispose(); material.dispose(); },[data,material]);
  useFrame((_state,dt) => {
    material.uniforms.resolutionY.value=size.height*gl.getPixelRatio();
    if(reading)return;
    const liveActor = motion?.current.actor ?? actor;
    const liveMoving = motion?.current.moving ?? moving;
    const liveHeading = motion?.current.heading ?? heading;
    wake.current += ((liveMoving?1:0)-wake.current)*(1-Math.exp(-Math.min(dt,.05)*3.2));
    const positions=data.geometry.attributes.position, opacities=data.geometry.attributes.opacity, angles=data.geometry.attributes.angle;
    data.seeds.forEach((seed,i) => {
      const p=airPosition(seed,clock.current,liveActor,liveHeading,wake.current);
      positions.setXYZ(i,p.x,p.y,data.floors[i]+p.lift); opacities.setX(i,p.opacity); angles.setX(i,p.angle);
    });
    positions.needsUpdate=true;opacities.needsUpdate=true;angles.needsUpdate=true;
  });
  return <points geometry={data.geometry} material={material} frustumCulled={false} name="windborne-garden-pollen"/>;
}
