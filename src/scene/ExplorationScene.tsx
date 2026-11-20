import { advanceMoonClearing, createMoonClearing, resumeMoonClearing, inspectMoonClearing, moonObjectTint, type MoonClearingRef } from './moonClearing';
import { OrangeRest } from './OrangeRestScene';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CanvasTexture, DoubleSide, Group, Mesh, MeshBasicMaterial, PerspectiveCamera, SRGBColorSpace, Texture } from 'three';
import type { ArtKey } from '../config/art';
import type { GardenProps } from './GardenCanvas';
import { BILLBOARD_TILT, depthCamera, terrainHeight, landmarkReveal } from './depthWorld';
import { objects } from './world';
import { RabbitCompanion } from './RabbitCompanion';
import { FloofTerrain } from './FloofTerrain';
import { FloofScenery } from './FloofScenery';
import { createFloofArt } from './floofSceneryArt';
import { TrailAwakening } from './TrailAwakening';
import { AtlasEncounters } from './AtlasEncounters';
import { GardenAir } from './GardenAir';
import { advanceGardenClock, gardenWind } from './gardenWind';
import type { GardenClock } from './gardenWind';
import type { MeadowPoint } from './meadowMotion';
import type { JourneyFrameRef } from './journeyFrame';
import { recordMotionFrame } from '../diagnostics/motionMetrics';
import { giftGate } from './giftGate';
import { puzzleDesk, usePuzzleDeskArt } from './puzzleDesk';

type Textures = Partial<Record<ArtKey, Texture>>;
function Sprite({ texture, w, h, opacity = 1, color = '#ffffff', position, materialRef }: {
  texture?: Texture; w: number; h: number; opacity?: number; color?: string; position?: [number, number, number]; materialRef?: React.RefObject<MeshBasicMaterial | null>;
}) {
  return texture ? <mesh position={position}><planeGeometry args={[w, h]}/><meshBasicMaterial ref={materialRef} map={texture} transparent opacity={opacity} color={color} depthWrite={false} alphaTest={.025} side={DoubleSide} toneMapped={false}/></mesh> : null;
}
function Landmark({ object, textures, actor, reading, lampOn, bloom, awake, clock, motion, moonClearing }: {
  object: typeof objects[number]; textures: Textures; actor: MeadowPoint; reading: boolean; lampOn: boolean; bloom: number; awake: boolean; clock: GardenClock; motion?: JourneyFrameRef; moonClearing?: MoonClearingRef;
}) {
  const root = useRef<Group>(null!), ink = useRef<MeshBasicMaterial>(null), contact = useRef<MeshBasicMaterial>(null), castShadow = useRef<MeshBasicMaterial>(null), floorGlow = useRef<MeshBasicMaterial>(null);
  const plant = useRef<Group>(null!), glow = useRef<Mesh>(null!), brightness = useRef(0), pulse = useRef(0), lastBloom = useRef(bloom);
  const reveal = landmarkReveal(object, actor, reading);
  const foot = object.id === 'lock' ? (textures.doorPaint ? giftGate.foot : giftGate.fallbackFoot) : 1 - object.footInset / object.height;
  useFrame((_frame, delta) => {
    const reveal = landmarkReveal(object, !reading && motion ? motion.current.actor : actor, reading);
    root.current.visible = reveal > .01;
    if (ink.current) {
      ink.current.opacity = reveal;
      if (object.id === 'lock') ink.current.color.setRGB(...moonObjectTint(object.x, object.y, moonClearing?.current?.phase ?? 0, 'door'));
    }
    if (contact.current) contact.current.opacity = (object.id === 'lock' ? .46 : .24) * reveal;
    if (castShadow.current) castShadow.current.opacity = .12 * reveal;
    if (floorGlow.current) floorGlow.current.opacity = (awake || lampOn ? .22 : .04) * reveal;
    if (reading) return;
    const dt = Math.min(delta, .05);
    if (bloom !== lastBloom.current) { pulse.current = 1; lastBloom.current = bloom; }
    pulse.current *= Math.exp(-dt * 2.5);
    const wind = gardenWind(clock.current, object.x, object.y, .2);
    plant.current.rotation.z = object.id === 'music' ? wind.lean * .025 + Math.sin(pulse.current * 12) * pulse.current * .06 : 0;
    brightness.current += ((lampOn || awake ? .5 : .12) - brightness.current) * (1 - Math.exp(-dt * 2));
    if (glow.current) (glow.current.material as MeshBasicMaterial).opacity = brightness.current * reveal * (1 + Math.sin(clock.current * .8) * .035);
  });
  return <group ref={root} visible={reveal > .01} position={[object.x, object.y, terrainHeight(object.x, object.y) + 3]}>
    {object.id === 'lock' ? textures.contact && <>
      {/* Both ground layers match FloofStatic; the door's painted foot stays untouched. */}
      <mesh position={[-38, -12, -.2]} rotation={[0, 0, .16]}>
        <planeGeometry args={[304, 80]}/><meshBasicMaterial ref={castShadow} map={textures.contact} color="#607177" transparent opacity={.12 * reveal} depthWrite={false} alphaTest={.005} side={DoubleSide} toneMapped={false}/>
      </mesh>
      <mesh position={[0, 0, .1]}>
        <planeGeometry args={[306, 32]}/><meshBasicMaterial ref={contact} map={textures.contact} color="#607177" transparent opacity={.46 * reveal} depthWrite={false} alphaTest={.005} side={DoubleSide} toneMapped={false}/>
      </mesh>
    </> : <Sprite materialRef={contact} texture={textures.contact} w={object.width * .75} h={38} opacity={.24 * reveal} color="#617476"/>}
    {object.id === 'puzzle' && <Sprite materialRef={floorGlow} texture={textures.glow} w={360} h={250} opacity={(awake || lampOn ? .22 : .04) * reveal} color="#f6dfa3" position={[0, 25, 1]}/>}
    <group rotation={[BILLBOARD_TILT, 0, 0]}>
      <group ref={plant}><Sprite materialRef={ink} texture={object.id === 'lock' ? textures.doorPaint ?? textures.door : textures[object.art]} w={object.width} h={object.height} opacity={reveal} position={[0, object.height * (foot - .5), 0]}/></group>
      {object.id === 'puzzle' && <mesh ref={glow} position={[object.width * (239 / 384 - .5), object.height * (foot - 206 / 512), 2]}><planeGeometry args={[150, 150]}/><meshBasicMaterial map={textures.glow} color="#ffe5a9" transparent opacity={.12} depthWrite={false}/></mesh>}
    </group>
  </group>;
}

function PuzzleDesk({ textures, actor, reading, motion }: {
  textures: Textures; actor: MeadowPoint; reading: boolean; motion?: JourneyFrameRef;
}) {
  const art = usePuzzleDeskArt();
  const texture = useMemo(() => {
    const texture = new Texture(art);
    texture.colorSpace = SRGBColorSpace; texture.anisotropy = 4; texture.needsUpdate = true;
    return texture;
  }, [art]);
  useEffect(() => () => texture.dispose(), [texture]);
  const root = useRef<Group>(null!), ink = useRef<MeshBasicMaterial>(null), contact = useRef<MeshBasicMaterial>(null);
  const reveal = landmarkReveal(puzzleDesk, actor, reading);
  useFrame(() => {
    const alpha = landmarkReveal(puzzleDesk, !reading && motion ? motion.current.actor : actor, reading);
    root.current.visible = alpha > .01;
    if (ink.current) ink.current.opacity = alpha;
    if (contact.current) contact.current.opacity = .10 * alpha;
  });
  return <group ref={root} visible={reveal > .01} position={[puzzleDesk.x, puzzleDesk.y, terrainHeight(puzzleDesk.x, puzzleDesk.y) + 3]}>
    <Sprite materialRef={contact} texture={textures.contact} w={puzzleDesk.width * .78} h={30} opacity={.10 * reveal} color="#617476"/>
    <group rotation={[BILLBOARD_TILT, 0, 0]}>
      <Sprite materialRef={ink} texture={texture} w={puzzleDesk.width} h={puzzleDesk.height} opacity={reveal} position={[0, puzzleDesk.height * (puzzleDesk.foot - .5), 0]}/>
    </group>
  </group>;
}
/** One continuous painted space from the invitation onward. */
export function ExplorationScene(props: GardenProps) {
  const { images, pose, actor, moving, heading, reading, onReady } = props;
  const { camera, size, gl } = useThree(), ready = useRef(false), clock = useRef(0);
  const localMoon = useRef<MoonClearingRef['current']>(null), moon = props.moonClearing ?? localMoon;
  const moonInitialized = useRef(false);
  if (!moonInitialized.current) {
    const point = props.motion?.current.actor ?? actor;
    moon.current = moon.current ? resumeMoonClearing(moon.current, point) : createMoonClearing(point, props.trailEvents?.includes('moon-ring'));
    moonInitialized.current = true;
  }
  const moonInspection = useRef(-1);
  useFrame(() => { props.onMotionFrame?.(); }, -3);
  useFrame((_frame, dt) => {
    if (reading) return;
    const before = moon.current!;
    moon.current = advanceMoonClearing(before, props.motion?.current.actor ?? actor, dt);
    if (!before.completed && moon.current.completed) props.onWorldEvent?.('moon-ring');
    if (Math.abs(moon.current.age - moonInspection.current) >= .10 || moon.current.age < 0 || before.completed !== moon.current.completed) {
      moonInspection.current = moon.current.age;
      gl.domElement.dataset.moonClearing = JSON.stringify(inspectMoonClearing(moon.current));
    }
  }, -1.5);
  useFrame((_frame, dt) => { clock.current = advanceGardenClock(clock.current, dt, reading); }, -1);
  useFrame((_frame, dt) => { const sample = props.motion?.current; recordMotionFrame(dt, !reading && sample ? sample.actor : actor, !reading && sample ? sample.moving : moving, gl.info.render.calls); });
  const textures = useMemo(() => {
    const result: Textures = {};
    const painted = createFloofArt();
    for (const [key, image] of Object.entries(images)) {
      if (key === 'flower' || key === 'lantern' || key === 'door') continue;
      const t = new Texture(image); t.colorSpace = SRGBColorSpace; t.needsUpdate = true; result[key as ArtKey] = t;
    }
    for (const key of ['flower', 'lantern', 'door'] as const) {
      const t = new CanvasTexture(painted[key]); t.colorSpace = SRGBColorSpace; t.anisotropy = 4; result[key] = t;
    }
    return result;
  }, [images]);
  useEffect(() => () => Object.values(textures).forEach(t => t.dispose()), [textures]);
  useEffect(() => {
    const lose = (e: Event) => { e.preventDefault(); props.onFail(); };
    gl.domElement.addEventListener('webglcontextlost', lose);
    return () => gl.domElement.removeEventListener('webglcontextlost', lose);
  }, [gl, props.onFail]);
  useFrame(() => {
    const c = depthCamera(props.motion?.current.pose ?? pose, size.width, size.height), cam = camera as PerspectiveCamera;
    cam.position.set(c.x, c.y, c.z); cam.up.set(0, 0, 1); cam.lookAt(c.x, c.targetY, c.targetZ);
    cam.fov = c.fov; cam.far = 18000; cam.updateProjectionMatrix();
    if (!ready.current) { ready.current = true; onReady(); }
  }, -2);
  return <>
    <FloofTerrain moonClearing={moon} motion={props.motion} actor={actor} reading={reading} clock={clock}/>
    <FloofScenery motion={props.motion} actor={actor} moving={moving} heading={heading} reading={reading} clock={clock}/>
    {objects.map(object => <Landmark moonClearing={moon} motion={props.motion} key={object.id} object={object} textures={textures} actor={actor} reading={reading} lampOn={props.lampOn} bloom={props.bloom} awake={props.trailEvents?.includes('trail-lantern-awake') ?? false} clock={clock}/>)}
    <PuzzleDesk textures={textures} actor={actor} reading={reading} motion={props.motion}/>
    <TrailAwakening motion={props.motion} textures={textures} actor={actor} moving={moving} reading={reading} clock={clock} memories={props.trailEvents} onEvent={props.onWorldEvent}/>
    <GardenAir motion={props.motion} clock={clock} actor={actor} moving={moving} heading={heading} reading={reading}/>
    <AtlasEncounters moonClearing={moon} chimeListening={props.chimeListening} paperGuide={props.paperGuide} pondListening={props.pondListening} mushroomListening={props.mushroomListening} memories={props.trailEvents} clock={clock} motion={props.motion} textures={textures} actor={actor} moving={moving} heading={heading} reading={reading} onEvent={props.onWorldEvent} pulse={props.atlasPulse}/>
    {props.orangeRestRef && <OrangeRest rest={props.orangeRestRef} motion={props.motion} actor={actor} reading={reading}/>}
    <RabbitCompanion moonClearing={moon} orangeRestRef={props.orangeRestRef} mushroomListening={props.mushroomListening} floofAttention={props.floofAttention} mistGreeting={props.mistGreeting} motion={props.motion} actor={actor} moving={moving} heading={heading} reading={reading} textures={textures} guidance={props.guidance}/>
  </>;
}
