import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, Group, Mesh, MeshBasicMaterial, Shape } from 'three';
import type { Texture } from 'three';
import type { ArtKey } from '../config/art';
import type { Place } from './world';
import type { MeadowPoint } from './meadowMotion';
import { BILLBOARD_TILT, pathX, terrainHeight } from './depthWorld';
import { advanceEncounter, ecologySites, emptyEncounter, walkedThrough } from './ecology';
import { gardenWind } from './gardenWind';
import type { GardenClock } from './gardenWind';
import { advanceLeafBend, canopyContact, firstTrailGrass } from './plantResponse';

type Textures = Partial<Record<ArtKey, Texture>>;
type EcologyEvent = 'butterfly-flight' | 'pond-ripple' | 'seeds-rise' | 'stones-awake';
type EventHandler = (event: EcologyEvent) => void;
type Props = { clock: GardenClock; textures: Textures; actor: MeadowPoint; moving: boolean; heading: MeadowPoint; reading: boolean; discovered: Place[]; onEvent?: EventHandler };

const seed = (n: number) => { const value = Math.sin(n * 127.1 + 311.7) * 43758.5453; return value - Math.floor(value); };
const patches = [...firstTrailGrass(), ...Array.from({ length: 24 }, (_, i) => {
  const bends = [80, 190, 360, 550, 700, 1050, 1400, 1650, 2000, 2300, 2600, 2850];
  const y = bends[Math.floor(i / 2)] + (seed(i + 73) - .5) * 110;
  const side = i % 2 ? 1 : -1;
  return { x: pathX(y) + side * (70 + seed(i + 9) * 150), y, width: 20 + seed(i + 33) * 25, phase: seed(i + 812) * 6.28, count: 3 + i % 3 };
})];

/** The pivot stays at the root while the blade tips respond to shared wind and passing feet. */
function GrassPatch({ item, actor, moving, heading, reading, clock }: { item: typeof patches[number] } & Pick<Props, 'actor' | 'moving' | 'heading' | 'reading' | 'clock'>) {
  const stems = useRef<(Group | null)[]>([]), root = useRef<Group>(null!);
  const lean = useRef({ value: 0, velocity: 0 }), previous = useRef({ ...actor });
  const blades = useMemo(() => Array.from({ length: item.count }, (_, i) => {
    const height = 35 + seed(item.phase + i * 17) * 25;
    const bend = (seed(item.phase + i * 31) - .5) * height * .45;
    const shape = new Shape();
    shape.moveTo(-1.6, 0);
    shape.quadraticCurveTo(-2 + bend * .2, height * .55, bend, height);
    shape.quadraticCurveTo(3 + bend * .45, height * .43, 1.4, 0);
    shape.closePath();
    return { shape, x: (i / Math.max(1, item.count - 1) - .5) * item.width, phase: i * .7 };
  }), [item]);
  useFrame((_state, delta) => {
    if (reading) { previous.current = { ...actor }; return; }
    const dt = Math.min(delta, .05);
    const distance = Math.hypot(actor.x - item.x, actor.y - item.y);
    root.current.visible = distance < 2000 && item.y > actor.y - 800;
    if (!root.current.visible) { previous.current = { ...actor }; lean.current = { value: 0, velocity: 0 }; return; }
    const travelled = Math.hypot(actor.x - previous.current.x, actor.y - previous.current.y);
    const speed = dt > 0 && travelled < 180 ? Math.min(1, travelled / dt / 240) : 0;
    const contact = canopyContact(item, item.width + 24, 100, previous.current, actor);
    const away = actor.x > item.x ? 1 : -1;
    const brush = contact * (away * (.22 + (moving ? speed * .58 : 0)) - (moving ? heading.x * speed * .15 : 0));
    lean.current = advanceLeafBend(lean.current, brush, dt);
    previous.current = { ...actor };
    stems.current.forEach((stem, i) => {
      if (stem) stem.rotation.z = gardenWind(clock.current, item.x + i * 8, item.y, .08 + i * .055).lean * .22 + lean.current.value * (.85 + i / item.count * .25);
    });
  });
  return <group ref={root} position={[item.x, item.y, terrainHeight(item.x, item.y) + 2]} rotation={[BILLBOARD_TILT, 0, 0]}>
    {blades.map((blade, i) => <group key={i} ref={node => { stems.current[i] = node; }} position={[blade.x, 0, i * .12]}>
      <mesh><shapeGeometry args={[blade.shape, 6]}/><meshBasicMaterial color={['#98ae98', '#b2bc99', '#8fa79b'][i % 3]} transparent opacity={.76} depthWrite={false} side={DoubleSide}/></mesh>
    </group>)}
  </group>;
}

function Pond({ actor, moving, reading, onEvent }: Pick<Props, 'actor' | 'moving' | 'reading' | 'onEvent'>) {
  const site = ecologySites.pond;
  const previousActor=useRef({...actor}),heard=useRef(false);
  const surface = useMemo(() => {
    const shape = new Shape();
    for (let i = 0; i <= 64; i++) {
      const angle = i / 64 * Math.PI * 2;
      const wobble = 1 + Math.sin(angle * 3) * .045 + Math.sin(angle * 7) * .025;
      const x = Math.cos(angle) * 106 * wobble, y = Math.sin(angle) * 65 * wobble;
      if (!i) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
    return shape;
  }, []);
  const rings = useRef<(Mesh | null)[]>([]), ages = useRef([9, 9, 9]), next = useRef(0), encounter = useRef(emptyEncounter()), clock = useRef(0), lastRipple = useRef(-10);
  useFrame((_state, delta) => {
    if (reading) return;
    const dt = Math.min(delta, .05); clock.current += dt;
    const distance = Math.hypot(actor.x - site.x, actor.y - site.y);
    const previous = encounter.current;
    encounter.current = advanceEncounter(previous, distance, site.radius, dt, moving, false);
    const contact=walkedThrough(previousActor.current,actor,site,moving);previousActor.current={...actor};
    if (contact && clock.current - lastRipple.current > .72) {
      ages.current[next.current++ % 3] = 0; lastRipple.current = clock.current;
      if (!heard.current) { heard.current=true;onEvent?.('pond-ripple'); }
    }
    ages.current.forEach((age, i) => {
      ages.current[i] = age + dt;
      const mesh = rings.current[i]; if (!mesh) return;
      const p = Math.min(1, ages.current[i] / 2.7);
      mesh.scale.setScalar(.08 + p * .92);
      (mesh.material as MeshBasicMaterial).opacity = Math.sin(p * Math.PI) * .42;
    });
  });
  return <group position={[site.x, site.y, terrainHeight(site.x, site.y) + 3]} name="listening-pool">
    <mesh scale={[1.1, 1.1, 1]}><shapeGeometry args={[surface]}/><meshBasicMaterial color="#c2cfbf" transparent opacity={.7} depthWrite={false}/></mesh>
    <mesh position={[0, 0, .5]}><shapeGeometry args={[surface]}/><meshBasicMaterial color="#9fbabd" transparent opacity={.68} depthWrite={false}/></mesh>
    <mesh position={[-18, 12, 1]} scale={[.64, .36, 1]}><circleGeometry args={[63, 48]}/><meshBasicMaterial color="#e9eddd" transparent opacity={.24} depthWrite={false}/></mesh>
    {ages.current.map((_, i) => <group key={i} scale={[1, .62, 1]} position={[0, 0, 2 + i * .1]}>
      <mesh ref={node => { rings.current[i] = node; }}><ringGeometry args={[97, 99, 64]}/><meshBasicMaterial color="#f6f5e5" transparent opacity={0} depthWrite={false} side={DoubleSide}/></mesh>
    </group>)}
  </group>;
}

function SeedHeads({ actor, moving, reading, onEvent }: Pick<Props, 'actor' | 'moving' | 'reading' | 'onEvent'>) {
  const site = ecologySites.seeds, flight = useRef(20), encounter = useRef(emptyEncounter()), drifting = useRef<(Group | null)[]>([]), age = useRef(0);
  const previousActor=useRef({...actor}),brushed=useRef(false);
  useFrame((_state, delta) => {
    if (reading) return;
    const dt = Math.min(delta, .05); age.current += dt;
    const next = advanceEncounter(encounter.current, Math.hypot(actor.x - site.x, actor.y - site.y), site.radius, dt, moving, false);
    const contact=walkedThrough(previousActor.current,actor,{...site,radius:68},moving);previousActor.current={...actor};
    if (contact&&!brushed.current) { brushed.current=true;flight.current = 0; onEvent?.('seeds-rise'); }
    if(!next.inside)brushed.current=false;
    encounter.current = next; flight.current += dt;
    drifting.current.forEach((group, i) => {
      if (!group) return;
      const t = Math.max(0, flight.current - i * .19), p = Math.min(1, t / 5.4);
      group.visible = t < 5.4;
      group.position.set(p * (100 + i * 16) + Math.sin(age.current + i) * p * 14, p * 62 + i * 3, 45 + p * (85 + i * 6));
      group.rotation.z = p * .5 + Math.sin(age.current + i) * .1;
    });
  });
  return <group position={[site.x, site.y, terrainHeight(site.x, site.y) + 2]} name="dandelion-patch">
    {[[-18, 3, 38], [0, 0, 51], [15, 9, 43]].map(([x, y, height], i) => <group key={i} position={[x, y, 0]} rotation={[BILLBOARD_TILT, 0, i * .11 - .1]}>
      <mesh position={[0, height / 2, 0]}><planeGeometry args={[1.3, height]}/><meshBasicMaterial color="#9baf96"/></mesh>
      <mesh position={[0, height, .1]}><circleGeometry args={[7, 14]}/><meshBasicMaterial color="#f6f2da" transparent opacity={.85}/></mesh>
      <mesh position={[0, height, .2]}><circleGeometry args={[2.2, 10]}/><meshBasicMaterial color="#c0bca0"/></mesh>
    </group>)}
    {Array.from({ length: 7 }, (_, i) => <group key={i} ref={node => { drifting.current[i] = node; }} visible={false}>
      <group rotation={[BILLBOARD_TILT, 0, 0]}>
        <mesh position={[0, -3, 0]}><planeGeometry args={[.7, 7]}/><meshBasicMaterial color="#b4ad92" transparent opacity={.7}/></mesh>
        <mesh scale={[1, .6, 1]}><circleGeometry args={[4, 9]}/><meshBasicMaterial color="#fff9e6" transparent opacity={.87} side={DoubleSide}/></mesh>
      </group>
    </group>)}
  </group>;
}

function ListeningStones({ textures, actor, moving, reading, onEvent }: Pick<Props, 'textures' | 'actor' | 'moving' | 'reading' | 'onEvent'>) {
  const site = ecologySites.stones, encounter = useRef(emptyEncounter()), light = useRef<Mesh>(null!), time = useRef(0);
  const awakened = useRef(false);
  useFrame((_state, delta) => {
    if (reading) return;
    const dt = Math.min(delta, .05); time.current += dt;
    encounter.current = advanceEncounter(encounter.current, Math.hypot(actor.x - site.x, actor.y - site.y), site.radius, dt, moving, false);
    if (encounter.current.dwell > 1.4 && !awakened.current) { awakened.current = true; onEvent?.('stones-awake'); }
    if (!encounter.current.inside) awakened.current = false;
    if (light.current) {
      const target = Math.max(0, Math.min(1, (encounter.current.dwell - 1.4) / 1.4)) * (.14 + Math.sin(time.current * 1.2) * .025);
      const material = light.current.material as MeshBasicMaterial;
      material.opacity += (target - material.opacity) * (1 - Math.exp(-dt * 3));
    }
  });
  return <group position={[site.x, site.y, terrainHeight(site.x, site.y) + 3]} name="three-listening-stones">
    {[[-25, 0, 16], [0, 18, 12], [22, 2, 13]].map(([x, y, size], i) => <mesh key={i} position={[x, y, 1]} scale={[1, .7, .3]} rotation={[0, 0, i * .4]}>
      <sphereGeometry args={[size, 9, 5]}/><meshBasicMaterial color={['#c6c4b2', '#b6bcae', '#d6cbbb'][i]}/>
    </mesh>)}
    {textures.glow && <mesh ref={light} position={[0, 8, 3]}><planeGeometry args={[180, 150]}/><meshBasicMaterial map={textures.glow} transparent opacity={0} depthWrite={false}/></mesh>}
  </group>;
}

/** Encounters inhabit the garden. There is no pointer-following decoration or collectible HUD. */
export function LivingWorld({ textures, actor, moving, heading, reading, onEvent, clock }: Props) {
  return <>
    {patches.map((item, i) => <GrassPatch key={i} item={item} actor={actor} moving={moving} heading={heading} reading={reading} clock={clock}/>)}
    <Pond actor={actor} moving={moving} reading={reading} onEvent={onEvent}/>
    <SeedHeads actor={actor} moving={moving} reading={reading} onEvent={onEvent}/>
    <ListeningStones textures={textures} actor={actor} moving={moving} reading={reading} onEvent={onEvent}/>
  </>;
}
