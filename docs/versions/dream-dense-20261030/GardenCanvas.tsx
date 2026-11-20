import { Component, useEffect, useMemo, useRef } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Group, Mesh, PerspectiveCamera, SRGBColorSpace, Texture } from 'three';
import gsap from 'gsap';
import type { ArtKey } from '../config/art';
import type { LoadedArt } from './useAssets';
import type { JourneyPose } from './journey';
import { cameraFrame, objects, WORLD } from './world';

type Props = { images: LoadedArt; pose: JourneyPose; bloom: number; lampOn: boolean; visible: boolean; reading: boolean; onFail: () => void; onReady: () => void };
class CanvasBoundary extends Component<{ children: ReactNode; onFail: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(_error: Error, _info: ErrorInfo) { this.props.onFail(); }
  render() { return this.state.failed ? null : this.props.children; }
}
function Scene(props: Props) {
  const { images, pose, bloom, lampOn, onReady, reading } = props;
  const { size, camera, gl } = useThree();
  const flower = useRef<Group>(null!), lantern = useRef<Group>(null!), mist = useRef<Group>(null!);
  const front = useRef<(Group | null)[]>([]), motes = useRef<(Mesh | null)[]>([]);
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
    cam.position.set(frame.x, frame.y, frame.z); cam.rotation.set(0, 0, 0);
    cam.fov = frame.fov; cam.updateProjectionMatrix();
    const wind = Math.sin(t * .38) * .007 + Math.sin(t * .17) * .002;
    flower.current.rotation.z = wind + reacting.current.tilt;
    lantern.current.rotation.z = wind * .35;
    front.current.forEach(group => { if (group) group.rotation.z = wind * .6; });
    mist.current.position.x = Math.sin(t * .035) * 30;
    motes.current.forEach((mesh, i) => {
      if (!mesh) return;
      mesh.position.y = -390 + (i * 113 % 810) + Math.sin(t * .18 + i) * 15;
      mesh.position.x = -1050 + (i * 179 % 2110) + Math.sin(t * .13 + i * 2) * 11;
      mesh.scale.setScalar(.7 + Math.sin(t * .7 + i) * .25);
    });
    if (glow.current) glow.current.scale.setScalar(lampOn ? (reading ? 1.8 : 1.8 + Math.sin(t * .55) * .025) : 1);
    if (!frameReady.current) { frameReady.current = true; onReady(); }
  });
  const plane = (key: ArtKey, width: number, height: number, x = 0, y = 0, z = 0, opacity = 1, color = '#ffffff') => textures[key] ? <mesh position={[x, y, z]}>
    <planeGeometry args={[width, height]}/><meshBasicMaterial map={textures[key]} color={color} transparent opacity={opacity} depthWrite={false} toneMapped={false}/>
  </mesh> : null;
  return <>
    {plane('environment', WORLD.width, WORLD.height, 0, 0, 0)}
    {objects.map(object => <group key={object.id} position={[object.x, object.y, object.z]}>
      {plane('contact', object.width * .95, object.width * .2, 0, 0, .1, .7)}
      {object.id === 'lock' && plane('threshold', 130, 70, -4, -17, .3, .7, '#b4b6c3')}
      <group ref={object.id === 'music' ? flower : object.id === 'puzzle' ? lantern : undefined}>
        {plane(object.art, object.width, object.height, 0, object.height / 2 - object.footInset, 1, 1, object.id === 'puzzle' ? '#ead8bb' : '#d1c4d5')}
      </group>
      {plane('grass', object.width * .9, object.width * .23, 0, object.width * .045, 3, .82, '#a0afab')}
      {object.id === 'puzzle' && <mesh ref={glow} position={[0, object.height * .64, 3.5]}>
        <planeGeometry args={[object.width * 1.3, object.width * 1.3]}/><meshBasicMaterial map={textures.glow} transparent opacity={.35} depthWrite={false} toneMapped={false}/>
      </mesh>}
    </group>)}
    <group ref={mist}>{plane('mist', 1500, 450, -40, -120, 42, .38)}{plane('mist', 1200, 350, 200, 260, 25, .32)}</group>
    <group position={[-850, -520, 200]} ref={node => { front.current[0] = node; }}>{plane('foliage', 640, 430, 0, 180)}</group>
    <group position={[1000, -690, 170]} scale={[-.8, .8, 1]} ref={node => { front.current[1] = node; }}>{plane('foliage', 640, 430, 0, 180)}</group>
    {Array.from({length: 24}, (_, i) => <mesh key={i} ref={node => { motes.current[i] = node; }} position={[0, 0, 50 + i % 3 * 30]}>
      <planeGeometry args={[i % 4 ? 6 : 10, i % 4 ? 6 : 10]}/><meshBasicMaterial map={textures.glow} transparent opacity={.55} depthWrite={false} toneMapped={false}/>
    </mesh>)}
  </>;
}
export default function GardenCanvas(props: Props) {
  return <CanvasBoundary onFail={props.onFail}>
    <Canvas camera={{ position: [0, 0, 1600], near: 1, far: 4000, fov: 35 }} dpr={[1, 1.7]}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }} frameloop={props.visible ? 'always' : 'never'} fallback={null} aria-hidden="true">
      <Scene {...props}/>
    </Canvas>
  </CanvasBoundary>;
}
