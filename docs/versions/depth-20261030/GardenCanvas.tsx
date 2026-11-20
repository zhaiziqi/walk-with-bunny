import { Component, useEffect, useMemo, useRef } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { BufferGeometry, CanvasTexture, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, PerspectiveCamera, PlaneGeometry, RepeatWrapping, SRGBColorSpace, Texture } from 'three';
import gsap from 'gsap';
import type { ArtKey } from '../config/art';
import type { LoadedArt } from './useAssets';
import type { JourneyPose } from './journey';
import { banks, cameraFrame, groundHeight, objects, roadCenter } from './world';

type Props = { images: LoadedArt; pose: JourneyPose; bloom: number; lampOn: boolean; visible: boolean; reading: boolean; onFail: () => void; onReady: () => void };
class CanvasBoundary extends Component<{ children: ReactNode; onFail: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(_error: Error, _info: ErrorInfo) { this.props.onFail(); }
  render() { return this.state.failed ? null : this.props.children; }
}
const fadeDistance: MeshBasicMaterial['onBeforeCompile'] = shader => {
  shader.fragmentShader = shader.fragmentShader.replace('#include <fog_fragment>', `
    #include <fog_fragment>
    #ifdef USE_FOG
      gl_FragColor.a *= 1.0 - smoothstep(1300.0, 2850.0, vFogDepth);
    #endif
  `);
};
function pathGeometry(halfWidth: number, lift: number) {
  const positions: number[] = [], indices: number[] = [];
  for (let i = 0; i <= 200; i++) {
    const z = 1500 - i * 24;
    for (const side of [-1, 1]) {
      const edge = Math.sin(z * .07) * 1.3 + Math.sin(z * .018) * 1.8;
      const x = roadCenter(z) + side * (halfWidth + edge);
      positions.push(x, groundHeight(x, z) + lift, z);
    }
    if (i < 200) { const n = i * 2; indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2); }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('uv', new Float32BufferAttribute(Array.from({length: 201}, (_, i) => [0, i * .12, 1, i * .12]).flat(), 2));
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}
function Scene(props: Props) {
  const { images, pose, bloom, lampOn, onReady, reading } = props;
  const { size, camera, gl } = useThree();
  const flower = useRef<Group>(null!);
  const lantern = useRef<Group>(null!);
  const backdrop = useRef<Mesh>(null!);
  const clouds = useRef<Group>(null!);
  const grasses = useRef<(Group | null)[]>([]);
  const foliage = useRef<(Group | null)[]>([]);
  const glow = useRef<Mesh>(null!);
  const reacting = useRef({ tilt: 0 });
  const elapsed = useRef(0);
  const frameReady = useRef(false);
  const textures = useMemo(() => {
    const result: Partial<Record<ArtKey, Texture>> = {};
    for (const [key, image] of Object.entries(images)) {
      const texture = new Texture(image);
      texture.colorSpace = SRGBColorSpace;
      if (key === 'ground') { texture.wrapS = texture.wrapT = RepeatWrapping; texture.repeat.set(22, 32); texture.anisotropy = 8; }
      texture.needsUpdate = true;
      result[key as ArtKey] = texture;
    }
    return result;
  }, [images]);
  const sand = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#dacdb1'; ctx.fillRect(0, 0, 256, 256);
    let seed = 271;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < 15000; i++) {
      const value = Math.floor(180 + random() * 60);
      ctx.fillStyle = `rgba(${value + 13},${value + 7},${value - 12},${.07 + random() * .18})`;
      ctx.fillRect(random() * 256, random() * 256, 1 + random() * 2, 1 + random() * 2);
    }
    const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace;
    texture.wrapS = texture.wrapT = RepeatWrapping; texture.anisotropy = 8;
    return texture;
  }, []);
  useEffect(() => () => sand.dispose(), [sand]);
  const geometry = useMemo(() => {
    const terrain = new PlaneGeometry(3600, 5400, 120, 180);
    terrain.rotateX(-Math.PI / 2); terrain.translate(0, 0, -900);
    const vertices = terrain.attributes.position;
    const colors: number[] = [];
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i), z = vertices.getZ(i);
      vertices.setY(i, groundHeight(x, z));
      const shade = .87 + Math.sin(x / 270 + z / 440) * .055;
      colors.push(shade, shade + .035, shade + .025);
    }
    terrain.setAttribute('color', new Float32BufferAttribute(colors, 3));
    terrain.computeVertexNormals();
    return { terrain, shoulder: pathGeometry(76, .5), road: pathGeometry(64, .7) };
  }, []);
  useEffect(() => () => { Object.values(textures).forEach(texture => texture.dispose()); }, [textures]);
  useEffect(() => () => { Object.values(geometry).forEach(item => item.dispose()); }, [geometry]);
  useEffect(() => {
    const lose = (event: Event) => { event.preventDefault(); props.onFail(); };
    gl.domElement.addEventListener('webglcontextlost', lose);
    return () => gl.domElement.removeEventListener('webglcontextlost', lose);
  }, [gl, props.onFail]);
  useEffect(() => {
    if (!bloom) return;
    const tween = gsap.timeline().to(reacting.current, { tilt: -.085, duration: .23, ease: 'power2.out' })
      .to(reacting.current, { tilt: .035, duration: .32, ease: 'sine.inOut' })
      .to(reacting.current, { tilt: 0, duration: .65, ease: 'elastic.out(1,.55)' });
    return () => { tween.kill(); };
  }, [bloom]);
  useFrame((_state, delta) => {
    elapsed.current += Math.min(delta, .05);
    const t = elapsed.current;
    const frame = cameraFrame(pose, size.width, size.height);
    const perspective = camera as PerspectiveCamera;
    perspective.position.set(frame.x, frame.y, frame.z);
    perspective.rotation.set(-frame.pitch, 0, 0);
    perspective.fov = frame.fov; perspective.updateProjectionMatrix();
    // Only the distant sky follows the viewer. The path and every prop stay in world space.
    const distance = 7000;
    backdrop.current.position.set(frame.x, frame.y - Math.sin(frame.pitch) * distance + distance * size.height * .14 / frame.focal, frame.z - Math.cos(frame.pitch) * distance);
    backdrop.current.rotation.x = -frame.pitch;
    const coverHeight = distance * size.height / frame.focal;
    const coverWidth = Math.max(coverHeight * 1.5, distance * size.width / frame.focal);
    backdrop.current.scale.set(coverWidth, Math.max(coverHeight, coverWidth / 1.5), 1);
    const wind = Math.sin(t * .55) * .009 + Math.sin(t * .22) * .003;
    flower.current.rotation.z = wind + reacting.current.tilt;
    lantern.current.rotation.z = wind * .3;
    grasses.current.forEach((group, i) => { if (group) group.rotation.z = wind * (1.8 + i * .15); });
    foliage.current.forEach(group => { if (group) group.rotation.z = wind * .35; });
    clouds.current.position.x = Math.sin(t * .025) * 32;
    if (glow.current) glow.current.scale.setScalar(lampOn ? (reading ? 1 : 1 + Math.sin(t * .55) * .025) : 0);
    if (!frameReady.current) { frameReady.current = true; onReady(); }
  });
  const plane = (key: ArtKey, width: number, height: number, x = 0, y = 0, z = 0, opacity = 1) => textures[key] ? (
    <mesh position={[x, y, z]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={textures[key]} transparent opacity={opacity} alphaTest={.01} depthWrite={false} toneMapped={false}/>
    </mesh>
  ) : null;
  return <>
    <fog attach="fog" args={['#c7ddd5', 1200, 3300]}/>
    <mesh ref={backdrop} renderOrder={-1000}>
      <planeGeometry args={[1, 1]}/><meshBasicMaterial map={textures.environment ?? textures.panorama} depthTest={false} depthWrite={false} toneMapped={false} fog={false}/>
    </mesh>
    <mesh geometry={geometry.terrain}><meshBasicMaterial map={textures.ground} color="#c0cbb0" vertexColors toneMapped={false} transparent onBeforeCompile={fadeDistance}/></mesh>
    <mesh geometry={geometry.shoulder}><meshBasicMaterial color="#a8b475" toneMapped={false} transparent onBeforeCompile={fadeDistance}/></mesh>
    <mesh geometry={geometry.road}><meshBasicMaterial map={sand} color="#eee1be" toneMapped={false} transparent onBeforeCompile={fadeDistance}/></mesh>
    <group ref={clouds} position={[0, 0, -3000]}>
      {plane('cloud', 900, 300, -850, 600, 0, .55)}
      {plane('cloud', 750, 250, 700, 550, 0, .4)}
    </group>
    {objects.map((object, index) => <group key={object.id} position={[object.x, object.y, object.z]}>
      <group rotation={[-Math.PI / 2, 0, 0]} position={[0, .9, 3]}>
        {plane('contact', object.width * 1.05, object.width * .42, 0, 0, 0, .85)}
      </group>
      {object.id === 'lock' && <group rotation={[-Math.PI / 2, 0, 0]} position={[-12, 1.1, 22]}>{plane('threshold', 100, 70)}</group>}
      <group rotation={[-.16, 0, 0]}>
        <group ref={object.id === 'music' ? flower : object.id === 'puzzle' ? lantern : undefined}>
          {plane(object.art, object.width, object.height, 0, object.height / 2 - object.footInset)}
        </group>
        <group ref={node => { grasses.current[index] = node; }} position={[0, 0, 3]}>
          {plane('grass', object.width * .9, object.width * .24, 0, object.width * .065)}
        </group>
        {object.id === 'puzzle' && <mesh ref={glow} position={[0, object.height * .6, 1]}>
          <circleGeometry args={[33, 40]}/><meshBasicMaterial color="#ffe7a7" transparent opacity={.065} depthWrite={false}/>
        </mesh>}
      </group>
    </group>)}
    {banks.map((bank, index) => <group key={index} position={[bank.x, bank.y, bank.z]}>
      <group rotation={[-Math.PI / 2, 0, 0]} position={[0, .8, 3]}>{plane('contact', bank.width * .9, bank.width * .3, 0, 0, 0, .5)}</group>
      <group rotation={[-.16, 0, 0]} scale={[bank.flip ? -1 : 1, 1, 1]}>
        <group ref={node => { foliage.current[index] = node; }}>{plane('bank', bank.width, bank.height, 0, bank.height * .475)}</group>
      </group>
    </group>)}
  </>;
}
export default function GardenCanvas(props: Props) {
  return <CanvasBoundary onFail={props.onFail}>
    <Canvas camera={{ position: [0, 215, 1050], near: 8, far: 18000, fov: 43 }}
      dpr={[1, 1.7]} gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      frameloop={props.visible ? 'always' : 'never'} fallback={null} aria-hidden="true">
      <Scene {...props}/>
    </Canvas>
  </CanvasBoundary>;
}
