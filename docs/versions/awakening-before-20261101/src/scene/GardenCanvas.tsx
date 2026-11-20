import { Component, useEffect, useMemo, useRef } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Group, Mesh, PerspectiveCamera, SRGBColorSpace, Texture } from 'three';
import gsap from 'gsap';
import type { ArtKey } from '../config/art';
import type { LoadedArt } from './useAssets';
import type { JourneyPose } from './journey';
import { cameraFrame, objects, RABBIT, backdropFrame, objectVisibility } from './world';
import type { Place } from './world';
import type { MeadowPoint } from './meadowMotion';
import { MeadowLayers } from './MeadowLayers';
import { ExplorationScene } from './ExplorationScene';

export type GardenProps = { images: LoadedArt; pose: JourneyPose; bloom: number; lampOn: boolean; visible: boolean; reading: boolean; entered:boolean; actor:MeadowPoint; moving:boolean; heading:MeadowPoint; discovered:Place[]; atlasPulse?: {id:string;serial:number}|null; onWorldEvent?: (event:string)=>void; onFail: () => void; onReady: () => void };
class CanvasBoundary extends Component<{ children: ReactNode; onFail: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(_error: Error, _info: ErrorInfo) { this.props.onFail(); }
  render() { return this.state.failed ? null : this.props.children; }
}
function Scene(props: GardenProps) {
  const { images, pose, bloom, lampOn, onReady, reading, entered, actor, moving, heading, discovered } = props;
  const { size, camera, gl } = useThree();
  const flower = useRef<Group>(null!), lantern = useRef<Group>(null!), mist = useRef<Group>(null!);
  const rabbit = useRef<Group>(null!);
  const rabbitBody=useRef<Group>(null!), facing=useRef(1);
  const glow = useRef<Mesh>(null!);
  const reacting = useRef({ tilt: 0 }), elapsed = useRef(0), frameReady = useRef(false);
  const textures = useMemo(() => {
    const result: Partial<Record<ArtKey, Texture>> = {};
    for (const [key, image] of Object.entries(images)) {
      const texture = new Texture(image); texture.colorSpace = SRGBColorSpace;
      texture.needsUpdate = true; texture.anisotropy = 4; result[key as ArtKey] = texture;
    }
    return result;
  }, [images]);
  useEffect(() => () => Object.values(textures).forEach(texture => texture.dispose()), [textures]);
  useEffect(() => {
    const lose = (event: Event) => { event.preventDefault(); props.onFail(); };
    gl.domElement.addEventListener('webglcontextlost', lose);
    return () => gl.domElement.removeEventListener('webglcontextlost', lose);
  }, [gl, props.onFail]);
  useEffect(() => {
    if (!bloom) return;
    const tween = gsap.timeline().to(reacting.current, { tilt: -.065, duration: .25 })
      .to(reacting.current, { tilt: .025, duration: .35 }).to(reacting.current, { tilt: 0, duration: .75, ease: 'elastic.out(1,.55)' });
    return () => { tween.kill(); };
  }, [bloom]);
  useFrame((_state, delta) => {
    elapsed.current += Math.min(delta, .05);
    const t = elapsed.current, frame = cameraFrame(pose, size.width, size.height);
    const cam = camera as PerspectiveCamera;
    cam.position.set(frame.x, frame.y, frame.z); cam.rotation.set(0, 0, 0); cam.up.set(0,1,0);
    cam.fov = frame.fov; cam.updateProjectionMatrix();
    const wind = Math.sin(t * .38) * .007 + Math.sin(t * .17) * .002;
    flower.current.rotation.z = wind + reacting.current.tilt;
    lantern.current.rotation.z = wind * .35;
    if (rabbitBody.current) {
      if(heading.x>.12) facing.current=-1; else if(heading.x<-.12) facing.current=1;
      const walking=entered&&moving&&!reading;
      rabbitBody.current.position.y=walking?Math.abs(Math.sin(t*8.5))*12:0;
      rabbitBody.current.scale.set(entered?facing.current:1,walking?1+Math.sin(t*17)*.025:1+Math.sin(t*.7)*.003,1);
      rabbitBody.current.rotation.z=walking?Math.sin(t*8.5)*.035:0;
    }
    mist.current.position.x = Math.sin(t * .035) * 30;
    if (glow.current) glow.current.scale.setScalar(reading ? 1 : 1 + Math.sin(t * .55) * .014);
    if (!frameReady.current) { frameReady.current = true; onReady(); }
  });
  const rabbitAnchor=entered?{...RABBIT,...actor}:RABBIT;
  const rabbitVisible = objectVisibility(rabbitAnchor, pose, size.width, size.height);
  const backdrop = backdropFrame(pose, size.width, size.height);
  const plane = (key: ArtKey, width: number, height: number, x = 0, y = 0, z = 0, opacity = 1, color = '#ffffff', order=0) => textures[key] ? <mesh position={[x, y, z]} renderOrder={order}>
    <planeGeometry args={[width, height]}/><meshBasicMaterial map={textures[key]} color={color} transparent opacity={opacity} depthWrite={false} depthTest={false} toneMapped={false}/>
  </mesh> : null;
  return <>
    {plane('environment', backdrop.width, backdrop.height, backdrop.x, backdrop.y, 0)}
    {entered&&<MeadowLayers textures={textures} actor={actor} moving={moving} discovered={discovered} reading={reading}/>}
    {objects.map(object => {
      const visibility = objectVisibility(object, pose, size.width, size.height);
      const layer = (...args: Parameters<typeof plane>) => { args[6] = (args[6] ?? 1) * visibility; args[8]=args[0]==='clearing'||args[0]==='contact'?20:5000-object.y+(args[5]??0)*.01; return plane(...args); };
      return <group key={object.id} position={[object.x, object.y, object.z]}>
      {layer('clearing', 560, 137, 0, -28, .05, .9)}
      {layer('contact', object.width * .95, object.width * .2, 0, 0, .1, .18)}
      <group ref={object.id === 'music' ? flower : object.id === 'puzzle' ? lantern : undefined}>
        {layer(object.art, object.width, object.height, 0, object.height / 2 - object.footInset, 1, 1)}
      </group>
      {layer('grass', object.width * .55, object.width * .14, 0, object.width * .02, 3, .22, '#aab7b4')}
      {object.id === 'puzzle' && (lampOn||discovered.includes('puzzle')) && textures.glow && <mesh ref={glow} position={[0, object.height * .64, 3.5]} renderOrder={5001-object.y}>
        <planeGeometry args={[object.width * 2, object.width * 2]}/><meshBasicMaterial map={textures.glow} transparent opacity={(lampOn?.35:.18) * visibility} depthWrite={false} depthTest={false} toneMapped={false}/>
      </mesh>}
    </group>; })}
    <group ref={mist}>{plane('mist', 1800, 380, 160, -80, 42, .08,'#ffffff',9500)}</group>
    <group position={[rabbitAnchor.x, rabbitAnchor.y, RABBIT.z]} ref={rabbit}>
      {!entered&&plane('clearing', 280, 68, 0, -15, .05, .7 * rabbitVisible,'#ffffff',20)}
      {plane('contact', 95, 14, 0, -1, .1, .19 * rabbitVisible,'#ffffff',20)}
      <group ref={rabbitBody}>{plane('rabbit', RABBIT.width, RABBIT.height, 0, RABBIT.height / 2 - RABBIT.footInset, 1, rabbitVisible,'#ffffff',5000-rabbitAnchor.y)}</group>
    </group>
  </>;
}
export default function GardenCanvas(props: GardenProps) {
  return <CanvasBoundary onFail={props.onFail}>
    <Canvas camera={{ position: [0, 0, 1600], near: 1, far: 4000, fov: 35 }} dpr={[1, 1.7]}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }} frameloop={props.visible ? 'always' : 'never'} fallback={null} aria-hidden="true">
      {props.entered?<ExplorationScene {...props}/>:<Scene {...props}/>}
    </Canvas>
  </CanvasBoundary>;
}
