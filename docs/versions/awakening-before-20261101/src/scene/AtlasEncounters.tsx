import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, Group, Mesh, MeshBasicMaterial, Shape } from 'three';
import type { Texture } from 'three';
import type { ArtKey } from '../config/art';
import { BILLBOARD_TILT, terrainHeight } from './depthWorld';
import { advanceAtlasInteraction, atlasEncounterSites, emptyAtlasInteraction, flockFlight, petalFlight, sequencePulse } from './atlasInteraction';
import type { AtlasPulse, AtlasSite } from './atlasInteraction';

type Point = { x: number; y: number };
type Props = { textures: Partial<Record<ArtKey, Texture>>; actor: Point; moving: boolean; heading: Point; reading: boolean; onEvent?: (event: string) => void; pulse?: AtlasPulse };
type SiteProps = Props & { site: AtlasSite };
const random = (index: number) => { const n = Math.sin(index * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
const opacity = (mesh: Mesh | null, value: number) => { if (mesh) (mesh.material as MeshBasicMaterial).opacity = value; };

/** Interaction state persists while distant scenery is culled; reading freezes every clock. */
function useSite({ site, actor, moving, reading, pulse, onEvent }: SiteProps) {
  const root = useRef<Group>(null!);
  const encounter = useRef(emptyAtlasInteraction());
  const time = useRef(0);
  useFrame((_state, delta) => {
    const distance = Math.hypot(actor.x - site.x, actor.y - site.y);
    if (root.current) root.current.visible = distance < 2200 && site.y > actor.y - 1100;
    if (reading) return;
    const previous = encounter.current;
    encounter.current = advanceAtlasInteraction(previous, site, distance, delta, moving, false, pulse);
    if (encounter.current.activations > previous.activations) onEvent?.(site.event);
    time.current += Math.min(delta, .05);
  });
  return { root, encounter, time };
}

function Glow({ texture, color = '#fff1c7', size = 140, strength = .25 }: { texture?: Texture; color?: string; size?: number; strength?: number }) {
  return texture ? <mesh><planeGeometry args={[size, size]}/><meshBasicMaterial map={texture} color={color} transparent opacity={strength} depthWrite={false} side={DoubleSide}/></mesh> : <mesh><circleGeometry args={[size / 3, 32]}/><meshBasicMaterial color={color} transparent opacity={strength * .4} depthWrite={false} side={DoubleSide}/></mesh>;
}

function Orchard(props: SiteProps) {
  const { site, textures, reading, heading } = props, { root, encounter, time } = useSite(props);
  const petals = useRef<(Mesh | null)[]>([]);
  useFrame(() => {
    if (reading || !root.current?.visible) return;
    petals.current.forEach((petal, i) => {
      if (!petal) return;
      const active = encounter.current.age < 8.8;
      const flight = petalFlight(active ? encounter.current.age : (time.current * .18 + i * .29) % 7.8, i % 8);
      petal.visible = active || i < 8;
      petal.position.set(flight.x + (i % 3 - 1) * 88 + heading.x * flight.z * .06, flight.y + Math.floor(i / 8) * 42, flight.z);
      petal.rotation.set(BILLBOARD_TILT, Math.sin(flight.rotation + i) * .7, flight.rotation + i);
      opacity(petal, flight.opacity * (active ? .88 : .45));
    });
  });
  return <group ref={root} position={[site.x, site.y, terrainHeight(site.x, site.y) + 3]} name="atlas-orchard">
    <mesh scale={[1, .64, 1]}><circleGeometry args={[220, 48]}/><meshBasicMaterial color="#e7c4ce" transparent opacity={.1} depthWrite={false}/></mesh>
    {Array.from({ length: 30 }, (_, i) => <mesh key={i} ref={node => { petals.current[i] = node; }} scale={[9 + i % 5, 15 + i % 4, 1]} rotation={[BILLBOARD_TILT, 0, i]}>
      <circleGeometry args={[1, 7]}/><meshBasicMaterial color={['#f6dce4', '#e9b7cc', '#fff0e5'][i % 3]} transparent opacity={.8} depthWrite={false} side={DoubleSide}/>
    </mesh>)}
    {Array.from({ length: 20 }, (_, i) => {
      const x = (random(i + 20) - .5) * 460, y = (random(i + 60) - .5) * 290;
      return <mesh key={`fallen-${i}`} position={[x, y, terrainHeight(site.x + x, site.y + y) - terrainHeight(site.x, site.y) + 1]} rotation={[0, 0, i]} scale={[5 + i % 5, 3 + i % 3, 1]}><circleGeometry args={[1, 6]}/><meshBasicMaterial color="#efcedb" transparent opacity={.55} depthWrite={false}/></mesh>;
    })}
    {textures.flower && [-180, 200].map((x, i) => <group key={x} position={[x, 55, terrainHeight(site.x + x, site.y + 55) - terrainHeight(site.x, site.y)]} rotation={[BILLBOARD_TILT, 0, i * .1]}><mesh position={[0, 42, 0]}><planeGeometry args={[75, 90]}/><meshBasicMaterial map={textures.flower} transparent alphaTest={.02} depthWrite={false}/></mesh></group>)}
  </group>;
}

const lilyPositions = [[-245, 10, 34], [-130, 105, 39], [170, 95, 35], [250, -32, 28], [85, -130, 33], [-90, -100, 30]];
function Pond(props: SiteProps) {
  const { site, reading, actor, moving } = props, { root, encounter, time } = useSite(props);
  const rings = useRef<(Mesh | null)[]>([]), blooms = useRef<(Group | null)[]>([]);
  const rippleAges = useRef([10, 10, 10, 10]), seen = useRef(0), lastRipple = useRef(-10), nextRipple = useRef(0);
  const water = useMemo(() => {
    const shape = new Shape();
    for (let i = 0; i <= 96; i++) {
      const angle = i / 96 * Math.PI * 2, edge = 1 + Math.sin(angle * 5) * .012 + Math.cos(angle * 9) * .009;
      const x = Math.cos(angle) * 380 * edge, y = Math.sin(angle) * 250 * edge;
      if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
    return shape;
  }, []);
  const leaf = useMemo(() => { const shape = new Shape(); shape.moveTo(0, 0); shape.absarc(0, 0, 1, .12, Math.PI * 2 - .22, false); shape.lineTo(0, 0); return shape; }, []);
  useFrame((_state, delta) => {
    if (reading || !root.current?.visible) return;
    const dt = Math.min(delta, .05), activated = encounter.current.activations > seen.current;
    if (activated || (encounter.current.inside && moving && time.current - lastRipple.current > .85)) {
      const i = nextRipple.current++ % 4; rippleAges.current[i] = 0; lastRipple.current = time.current;
      const ring = rings.current[i];
      if (ring) ring.position.set(Math.max(-140, Math.min(140, (actor.x - site.x) * .32)), Math.max(-80, Math.min(80, (actor.y - site.y) * .24)), 2 + i * .15);
    }
    seen.current = encounter.current.activations;
    rings.current.forEach((ring, i) => {
      if (!ring) return;
      rippleAges.current[i] += dt;
      const p = Math.min(1, rippleAges.current[i] / 3.8);
      ring.scale.set(1 + p * 225, .66 + p * 145, 1);
      opacity(ring, Math.sin(p * Math.PI) * .65);
    });
    blooms.current.forEach((bloom, i) => {
      if (!bloom) return;
      const bloomPulse = sequencePulse(encounter.current.age, i, .3);
      bloom.scale.setScalar(1 + bloomPulse * .6);
      bloom.position.z = 4 + Math.sin(time.current * .8 + i) * .6 + bloomPulse * 8;
      bloom.rotation.z = Math.sin(time.current * .3 + i) * .07;
    });
  });
  return <group ref={root} position={[site.x, site.y, terrainHeight(site.x, site.y) + 3]} name="atlas-lily-pond">
    <mesh scale={[1.095, 1.12, 1]}><shapeGeometry args={[water]}/><meshBasicMaterial color="#a5b7a3" transparent opacity={.52} depthWrite={false}/></mesh>
    <mesh position={[0, 0, .4]}><shapeGeometry args={[water]}/><meshBasicMaterial color="#7ea8ad" transparent opacity={.82} depthWrite={false}/></mesh>
    <mesh position={[-15, 15, .6]} scale={[.94, .9, 1]}><shapeGeometry args={[water]}/><meshBasicMaterial color="#a6c9c8" transparent opacity={.36} depthWrite={false}/></mesh>
    <mesh position={[-65, 40, .8]} scale={[185, 55, 1]}><circleGeometry args={[1, 48]}/><meshBasicMaterial color="#e1e9dc" transparent opacity={.15} depthWrite={false}/></mesh>
    {[0, 1, 2, 3].map(i => <mesh key={i} ref={node => { rings.current[i] = node; }}><ringGeometry args={[.985, 1, 80]}/><meshBasicMaterial color="#edf3de" transparent opacity={0} depthWrite={false} side={DoubleSide}/></mesh>)}
    {lilyPositions.map(([x, y, size], i) => <group key={i} position={[x, y, 2]}>
      <mesh scale={[size, size * .8, 1]} rotation={[0, 0, i * 1.8]}><shapeGeometry args={[leaf, 32]}/><meshBasicMaterial color={i % 2 ? '#7b9c85' : '#8fa98a'} transparent opacity={.94} depthWrite={false} side={DoubleSide}/></mesh>
      <group ref={node => { blooms.current[i] = node; }} position={[5, 2, 4]} rotation={[BILLBOARD_TILT * .65, 0, 0]}>
        {[0, 1, 2, 3, 4].map(j => <mesh key={j} position={[Math.sin(j * 1.257) * 8, Math.cos(j * 1.257) * 6, j * .08]} rotation={[0, 0, -j * 1.257]} scale={[6, 13, 1]}><circleGeometry args={[1, 10]}/><meshBasicMaterial color={i % 2 ? '#f3d4df' : '#f3ece0'} transparent opacity={.94} depthWrite={false} side={DoubleSide}/></mesh>)}
        <mesh position={[0, 0, 1]}><circleGeometry args={[4, 12]}/><meshBasicMaterial color="#ddcba0"/></mesh>
      </group>
    </group>)}
  </group>;
}

const mushrooms = [[-175, 40, .85], [-120, -30, 1.1], [-65, 80, .65], [20, 125, .9], [110, 70, 1.2], [175, -15, .78], [220, 55, .64]];
function Hollow(props: SiteProps) {
  const { site, textures, reading } = props, { root, encounter, time } = useSite(props);
  const bodies = useRef<(Group | null)[]>([]), lights = useRef<(Mesh | null)[]>([]);
  const cap = useMemo(() => { const shape = new Shape(); shape.moveTo(-36, 0); shape.bezierCurveTo(-31, 44, 28, 48, 37, 2); shape.quadraticCurveTo(4, -11, -36, 0); return shape; }, []);
  useFrame(() => {
    if (reading || !root.current?.visible) return;
    mushrooms.forEach((_, i) => {
      const pulse = sequencePulse(encounter.current.age, i, .28), body = bodies.current[i], light = lights.current[i];
      if (body) { body.position.y = pulse * 22; body.rotation.z = Math.sin(encounter.current.age * 8 - i) * pulse * .09; body.scale.y = 1 + pulse * .15; }
      opacity(light, .05 + pulse * .65 + Math.sin(time.current * .8 + i) * .015);
    });
  });
  return <group ref={root} position={[site.x, site.y, terrainHeight(site.x, site.y) + 2]} name="atlas-mushroom-hollow">
    {mushrooms.map(([x, y, scale], i) => <group key={i} position={[x, y, terrainHeight(site.x + x, site.y + y) - terrainHeight(site.x, site.y)]} rotation={[BILLBOARD_TILT, 0, 0]} scale={scale}>
      <mesh ref={node => { lights.current[i] = node; }} position={[0, 36, -.5]}><planeGeometry args={[170, 170]}/><meshBasicMaterial map={textures.glow} color="#ede9b9" transparent opacity={.05} depthWrite={false}/></mesh>
      <group ref={node => { bodies.current[i] = node; }}>
        <mesh position={[0, 20, 0]} scale={[7, 23, 1]}><circleGeometry args={[1, 16]}/><meshBasicMaterial color="#d6d6bd"/></mesh>
        <mesh position={[0, 36, .5]}><shapeGeometry args={[cap]}/><meshBasicMaterial color={['#bfa8bd', '#d4b6bc', '#bab9cf'][i % 3]} transparent opacity={.96} side={DoubleSide}/></mesh>
        <mesh position={[0, 36, .7]} scale={[31, 5, 1]}><circleGeometry args={[1, 24]}/><meshBasicMaterial color="#ede3ce" transparent opacity={.78}/></mesh>
        {[[-15, 55, 3], [8, 64, 4], [21, 49, 2.5]].map(([px, py, r], j) => <mesh key={j} position={[px, py, 1]}><circleGeometry args={[r, 9]}/><meshBasicMaterial color="#eee7d7" transparent opacity={.72}/></mesh>)}
      </group>
    </group>)}
    {textures.fern && [-280, 290].map((x, i) => <group key={x} position={[x, 120, terrainHeight(site.x + x, site.y + 120) - terrainHeight(site.x, site.y)]} rotation={[BILLBOARD_TILT, 0, 0]}><mesh position={[0, 70, 0]} scale={[i ? -1 : 1, 1, 1]}><planeGeometry args={[170, 145]}/><meshBasicMaterial map={textures.fern} transparent alphaTest={.02} depthWrite={false} side={DoubleSide}/></mesh></group>)}
  </group>;
}

function Arch(props: SiteProps) {
  const { site, textures, reading } = props, { root, encounter, time } = useSite(props);
  const bell = useRef<Group>(null!), fireflies = useRef<(Group | null)[]>([]);
  useFrame(() => {
    if (reading || !root.current?.visible) return;
    const wake = Math.exp(-encounter.current.age * .28);
    if (bell.current) bell.current.rotation.z = Math.sin(time.current * 2.6) * (.025 + wake * .23);
    fireflies.current.forEach((fly, i) => {
      if (!fly) return;
      const angle = i * 2.39996 + time.current * (.09 + wake * .08), radius = 90 + random(i + 1) * 180;
      fly.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * .5 + 70, 60 + random(i + 37) * 270 + Math.sin(time.current * .8 + i) * (8 + wake * 30));
      fly.scale.setScalar((.55 + (1 + Math.sin(time.current * 1.4 + i)) * .2) * (1 + wake));
    });
  });
  return <group ref={root} position={[site.x, site.y, terrainHeight(site.x, site.y) + 2]} name="atlas-old-arch">
    <group rotation={[BILLBOARD_TILT, 0, 0]}>
      {textures.arch && <mesh position={[0, 630 * (.5 - .05208333), 0]}><planeGeometry args={[420, 630]}/><meshBasicMaterial map={textures.arch} transparent alphaTest={.025} depthWrite={false} side={DoubleSide}/></mesh>}
      <group ref={bell} position={[0, 390, 4]}>
        <mesh position={[0, -26, 0]}><planeGeometry args={[1.8, 52]}/><meshBasicMaterial color="#adaeab"/></mesh>
        <mesh position={[0, -57, .2]} scale={[19, 12, 1]}><circleGeometry args={[1, 24, 0, Math.PI]}/><meshBasicMaterial color="#c7bca1" side={DoubleSide}/></mesh>
        <mesh position={[0, -77, 0]}><planeGeometry args={[1.4, 42]}/><meshBasicMaterial color="#adaeab"/></mesh>
        <mesh position={[0, -105, .1]} rotation={[0, 0, -.08]}><planeGeometry args={[12, 28]}/><meshBasicMaterial color="#e3d9bd" transparent opacity={.92} side={DoubleSide}/></mesh>
      </group>
    </group>
    {Array.from({ length: 22 }, (_, i) => <group key={i} ref={node => { fireflies.current[i] = node; }}><group rotation={[BILLBOARD_TILT, 0, 0]}><Glow texture={textures.glow} size={48} color="#f5e8ad" strength={.5}/><mesh><circleGeometry args={[2.8, 12]}/><meshBasicMaterial color="#fff0be" transparent opacity={.9} depthWrite={false}/></mesh></group></group>)}
  </group>;
}

function Hill(props: SiteProps) {
  const { site, textures, reading } = props, { root, encounter, time } = useSite(props);
  const birds = useRef<(Group | null)[]>([]), wings = useRef<(Group | null)[]>([]);
  const wing = useMemo(() => { const shape = new Shape(); shape.moveTo(0, 0); shape.lineTo(33, 18); shape.lineTo(20, -8); shape.lineTo(0, -4); shape.closePath(); return shape; }, []);
  useFrame(() => {
    if (reading || !root.current?.visible) return;
    birds.current.forEach((bird, i) => {
      if (!bird) return;
      const flight = flockFlight(encounter.current.age, i), flying = encounter.current.age < 9.2;
      const restingX = i * 40 - 120, restingY = i % 2 * 30;
      const p = Math.min(1, Math.max(0, encounter.current.age - i * .16) / 8);
      const ground = terrainHeight(site.x + restingX, site.y + restingY) - terrainHeight(site.x, site.y);
      bird.position.set(flying ? flight.x + restingX - (i * 24 - 48) : restingX, flying ? flight.y + restingY - p * 150 : restingY, ground + (flying ? flight.z : 24));
      bird.rotation.z = flying ? flight.bank : i * .15 - .4;
      if (wings.current[i]) wings.current[i]!.scale.x = flying ? .48 + Math.abs(Math.sin(time.current * 8 + i)) * .52 : .8;
    });
  });
  return <group ref={root} position={[site.x, site.y, terrainHeight(site.x, site.y) + 2]} name="atlas-paperbird-hill">
    <mesh scale={[1, .55, 1]}><circleGeometry args={[175, 48]}/><meshBasicMaterial color="#e7debe" transparent opacity={.12} depthWrite={false}/></mesh>
    {Array.from({ length: 7 }, (_, i) => <group key={i} ref={node => { birds.current[i] = node; }}><group rotation={[BILLBOARD_TILT, 0, 0]}>
      <group ref={node => { wings.current[i] = node; }}>
        {[-1, 1].map(side => <mesh key={side} scale={[side, 1, 1]}><shapeGeometry args={[wing]}/><meshBasicMaterial color={side < 0 ? '#eee7d5' : '#d3d9d6'} transparent opacity={.94} side={DoubleSide}/></mesh>)}
      </group><mesh position={[0, -1, .3]} scale={[2, 8, 1]}><circleGeometry args={[1, 4]}/><meshBasicMaterial color="#b9c4c4"/></mesh>
    </group></group>)}
    {textures.grass && [-200, 205].map(x => <group key={x} position={[x, 75, terrainHeight(site.x + x, site.y + 75) - terrainHeight(site.x, site.y)]} rotation={[BILLBOARD_TILT, 0, 0]}><mesh position={[0, 42, 0]}><planeGeometry args={[130, 90]}/><meshBasicMaterial map={textures.grass} color="#c9c7a9" transparent opacity={.85} depthWrite={false}/></mesh></group>)}
  </group>;
}

function Moon(props: SiteProps) {
  const { site, textures, reading } = props, { root, encounter, time } = useSite(props);
  const rings = useRef<(Mesh | null)[]>([]), halo = useRef<Group>(null!), stars = useRef<(Mesh | null)[]>([]);
  useFrame(() => {
    if (reading || !root.current?.visible) return;
    const wake = Math.exp(-encounter.current.age * .32);
    rings.current.forEach((ring, i) => {
      if (!ring) return;
      const p = Math.max(0, Math.min(1, (encounter.current.age - i * .65) / 5));
      ring.scale.setScalar(.35 + p * 1.25);
      opacity(ring, Math.sin(p * Math.PI) * .66);
    });
    if (halo.current) halo.current.scale.setScalar(1 + wake * .25 + Math.sin(time.current * .45) * .025);
    stars.current.forEach((star, i) => {
      if (!star) return;
      const angle = i * 2.39996 + time.current * .03, radius = 170 + i % 4 * 30;
      star.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * .68, 38 + wake * (55 + i % 5 * 12));
      opacity(star, .18 + wake * .62 + Math.sin(time.current + i) * .08);
    });
  });
  return <group ref={root} position={[site.x, site.y, terrainHeight(site.x, site.y) + 4]} name="atlas-moon-clearing">
    <group ref={halo}><Glow texture={textures.glow} size={680} color="#c3d5ed" strength={.32}/></group>
    <mesh scale={[1, .72, 1]}><ringGeometry args={[185, 187, 96]}/><meshBasicMaterial color="#dce3ef" transparent opacity={.35} depthWrite={false} side={DoubleSide}/></mesh>
    {[0, 1, 2].map(i => <group key={i} scale={[1, .72, 1]}><mesh ref={node => { rings.current[i] = node; }} position={[0, 0, 2 + i * .12]}><ringGeometry args={[190, 193, 96]}/><meshBasicMaterial color="#e8e9ee" transparent opacity={0} depthWrite={false} side={DoubleSide}/></mesh></group>)}
    {Array.from({ length: 16 }, (_, i) => <mesh key={i} ref={node => { stars.current[i] = node; }} rotation={[BILLBOARD_TILT, 0, Math.PI / 4]} scale={[1, 1.4, 1]}><circleGeometry args={[3 + i % 3, 4]}/><meshBasicMaterial color="#e4e7f1" transparent opacity={.3} depthWrite={false} side={DoubleSide}/></mesh>)}
    <group position={[0, 170, 400]} rotation={[BILLBOARD_TILT, 0, 0]}>
      <Glow texture={textures.glow} color="#dbe1eb" size={330} strength={.22}/>
      <mesh scale={[1, 1, 1]}><circleGeometry args={[51, 64]}/><meshBasicMaterial color="#e7e7dd" transparent opacity={.82} depthWrite={false}/></mesh>
      <mesh position={[-12, 8, .1]}><circleGeometry args={[48, 64]}/><meshBasicMaterial color="#d1d9df" transparent opacity={.3} depthWrite={false}/></mesh>
    </group>
  </group>;
}

/** Six fixed landmarks share the atlas controller without introducing interface elements. */
export function AtlasEncounters(props: Props) {
  return <>{atlasEncounterSites.map(site => {
    const Component = { orchard: Orchard, pond: Pond, hollow: Hollow, arch: Arch, hill: Hill, moon: Moon }[site.id];
    return <Component key={site.id} {...props} site={site}/>;
  })}</>;
}
