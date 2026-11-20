import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry, Shape } from 'three';
import type { Texture } from 'three';
import type { ArtKey } from '../config/art';
import type { MeadowPoint } from './meadowMotion';
import type { GardenClock } from './gardenWind';
import { gardenWind } from './gardenWind';
import { BILLBOARD_TILT, terrainHeight } from './depthWorld';
import { advanceTrail, createTrailState, guidePosition, guideVisible, trailPassageBloom, trailSites, trailFlowerOffsets, trailFlowerOpening } from './trailState';
import type { TrailState } from './trailState';
import type { JourneyFrameRef } from './journeyFrame';

type Props = {
  textures: Partial<Record<ArtKey, Texture>>; actor: MeadowPoint; moving: boolean; reading: boolean;
  clock: GardenClock; memories?: readonly string[]; onEvent?: (event: string) => void;
  motion?: JourneyFrameRef;
};
const smooth = (value: number) => { const p = Math.max(0, Math.min(1, value)); return p * p * (3 - 2 * p); };
const petalColors = ['#d6aeb5', '#e3c0c0', '#efdad1', '#d3aab8', '#e3bdc3'];

/** The existing watercolor is deformed above the stem, so opening never scales the roots. */
function RememberingFlower({ x, y, size, texture, contact, clock, state, reading, passage }: {
  x: number; y: number; size: number; texture?: Texture; contact?: Texture; clock: GardenClock;
  state: React.RefObject<TrailState>; reading: boolean; passage?: number;
}) {
  const root = useRef<Group>(null!), bloom = useRef<Mesh>(null!);
  const geometry = useMemo(() => new PlaneGeometry(104 * size, 156 * size, 18, 24), [size]);
  const original = useMemo(() => new Float32Array(geometry.attributes.position.array), [geometry]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(() => {
    if (reading) return;
    const current = state.current, trailBloom = passage !== undefined;
    const awake = trailBloom ? trailPassageBloom(current, passage) : current.flowerOpen;
    root.current.visible = !trailBloom || awake;
    if (!root.current.visible || !bloom.current) return;
    const opening = trailBloom ? 1 : trailFlowerOpening(current);
    const wind = gardenWind(clock.current, x, y, .18), positions = geometry.attributes.position;
    const greeting = current.returned && current.returnAge < 3 ? Math.sin(current.returnAge / 3 * Math.PI) : 0;
    for (let i = 0; i < positions.count; i++) {
      const px = original[i * 3], py = original[i * 3 + 1], height = py / (156 * size) + .5;
      const head = smooth((height - .39) / .18), branch = Math.max(0, height - .08);
      const squeeze = 1 - head * (1 - opening) * .64;
      positions.setXYZ(i, px * squeeze + branch * branch * size * (wind.lean * 7 + greeting * 8), py, original[i * 3 + 2]);
    }
    positions.needsUpdate = true;
    const material = bloom.current.material as MeshBasicMaterial;
    material.opacity = .78 + opening * .22;
  });
  if (!texture) return null;
  return <group ref={root} position={[x, y, terrainHeight(x, y) + 2]} visible={passage === undefined || trailPassageBloom(state.current, passage)}>
    {contact && <mesh><planeGeometry args={[64 * size, 25 * size]}/><meshBasicMaterial map={contact} transparent opacity={.24} depthWrite={false}/></mesh>}
    <group rotation={[BILLBOARD_TILT, 0, 0]}>
      <mesh ref={bloom} geometry={geometry} position={[0, 78 * size - 5.3 * size, 0]}>
        <meshBasicMaterial map={texture} color={passage === undefined ? '#f4eadf' : '#eed9bd'} transparent alphaTest={.025} depthWrite={false} side={DoubleSide} toneMapped={false}/>
      </mesh>
    </group>
  </group>;
}

/** A quiet encounter changes the next clue, and a discovered light remembers the way back. */
export function TrailAwakening({ textures, actor, moving, reading, clock, memories = [], onEvent, motion }: Props) {
  const state = useRef(createTrailState(actor, memories));
  const root = useRef<Group>(null!), guide = useRef<Group>(null!), wings = useRef<(Group | null)[]>([]);
  const passageGroups = useRef<(Group | null)[]>([]), passageFade = useRef(state.current.passages.map(seen => Number(seen)));
  const fallen = useRef<(Mesh | null)[]>([]), lanternFloor = useRef<Mesh>(null!), light = useRef(Number(state.current.lanternAwake));
  const petalShape = useMemo(() => {
    const shape = new Shape(); shape.moveTo(0, 0); shape.bezierCurveTo(-13, 9, -16, 29, -3, 32);
    shape.bezierCurveTo(12, 37, 17, 13, 0, 0); return shape;
  }, []);
  const wingShape = useMemo(() => {
    const shape = new Shape(); shape.moveTo(0, 0); shape.bezierCurveTo(3, 18, 18, 23, 18, 12);
    shape.bezierCurveTo(19, 4, 9, 2, 8, 0); shape.bezierCurveTo(19, -3, 14, -14, 7, -9);
    shape.quadraticCurveTo(2, -7, 0, 0); return shape;
  }, []);
  useFrame((_frame, delta) => {
    if (reading) return;
    const liveActor = motion?.current.actor ?? actor;
    const liveMoving = motion?.current.moving ?? moving;
    const advanced = advanceTrail(state.current, liveActor, liveMoving, delta, false); state.current = advanced.state;
    for (const event of advanced.events) onEvent?.(event);
    const current = state.current, dt = Math.max(0, Math.min(.05, delta));
    root.current.visible = liveActor.y > -2700 && liveActor.y < 2200 && liveActor.x > -2300 && liveActor.x < 1600;
    if (!root.current.visible) return;
    const t = clock.current, point = guidePosition(current), wind = gardenWind(t, point.x, point.y);
    guide.current.visible = guideVisible(current);
    const emerging = smooth((current.bloomAge - .9) / 1.8);
    guide.current.scale.setScalar(.12 + emerging * .88);
    guide.current.position.set(point.x + Math.sin(t * 1.1) * (current.guideFlying ? 2 : 3), point.y,
      terrainHeight(point.x, point.y) + 58 + point.lift + Math.sin(t * 1.7) * 3);
    guide.current.rotation.z = current.guideFlying ? -.15 + wind.lean * .12 : wind.lean * .1;
    wings.current.forEach((wing, i) => {
      if (wing) wing.rotation.y = (i ? 1 : -1) * (.35 + Math.sin(t * (current.guideFlying && liveMoving ? 18 : 7.5)) * .6);
    });
    passageGroups.current.forEach((group, i) => {
      if (!group) return;
      passageFade.current[i] += (Number(current.passages[i]) - passageFade.current[i]) * (1 - Math.exp(-dt * 2));
      group.visible = passageFade.current[i] > .005;
      group.traverse(child => { if (child instanceof Mesh) (child.material as MeshBasicMaterial).opacity = passageFade.current[i] * (current.lanternAwake ? .75 : .45); });
    });
    fallen.current.forEach((petal, i) => {
      if (!petal) return; petal.visible = current.flowerOpen;
      if (!petal.visible) return;
      const p = smooth((current.bloomAge - 1.8 - i * .08) / 3.5), angle = i * 2.39996;
      const x = trailSites.flower.x + Math.cos(angle) * (32 + i * 4) * p - 27 * p;
      const y = trailSites.flower.y + Math.sin(angle) * (20 + i * 3) * p;
      petal.position.set(x, y, terrainHeight(x, y) + 2 + (1 - p) * 82);
      petal.rotation.set((1 - p) * BILLBOARD_TILT, 0, angle + p * 1.2);
      (petal.material as MeshBasicMaterial).opacity = smooth((current.bloomAge - 1.6) / .7) * .7;
    });
    light.current += (Number(current.lanternAwake) - light.current) * (1 - Math.exp(-dt * 1.8));
    if (lanternFloor.current) (lanternFloor.current.material as MeshBasicMaterial).opacity = light.current * .21;
  });
  return <group ref={root} name="remembering-entry-trail">
    <group ref={guide} name="waiting-butterfly" visible={guideVisible(state.current)}>
      <group rotation={[BILLBOARD_TILT, 0, 0]}>
        {[-1, 1].map((side, i) => <group key={side} ref={node => { wings.current[i] = node; }} scale={[side, 1, 1]}>
          <mesh><shapeGeometry args={[wingShape, 12]}/><meshBasicMaterial color={i ? '#e4bb9c' : '#fff0cf'} transparent opacity={.95} side={DoubleSide} depthWrite={false}/></mesh>
          <mesh scale={[.73, .73, 1]} position={[1, 1, .1]}><shapeGeometry args={[wingShape, 12]}/><meshBasicMaterial color="#f4e8d1" transparent opacity={.55} side={DoubleSide} depthWrite={false}/></mesh>
        </group>)}
        <mesh scale={[1.1, 8, 1]}><circleGeometry args={[1, 12]}/><meshBasicMaterial color="#9a8e76"/></mesh>
      </group>
    </group>
    {trailFlowerOffsets.map(([x, y, size], i) => <RememberingFlower key={i}
      x={trailSites.flower.x + x} y={trailSites.flower.y + y} size={size} texture={textures.flower} contact={textures.contact}
      state={state} clock={clock} reading={reading}/>)}
    {trailSites.passages.map((point, i) => <group key={i}>
      <RememberingFlower x={point.x + (i % 2 ? -46 : 46)} y={point.y + 7} size={.22 + (i % 3) * .035}
        texture={textures.flower} contact={textures.contact} state={state} clock={clock} reading={reading} passage={i}/>
      <group ref={node => { passageGroups.current[i] = node; }} visible={state.current.passages[i]}>
        {[0, 1, 2, 3, 4].map(j => {
          const x = point.x + Math.sin(j * 2.4 + i) * (17 + j * 5), y = point.y + Math.cos(j * 2.4 + i) * (11 + j * 4);
          return <mesh key={j} position={[x, y, terrainHeight(x, y) + 2]} rotation={[0, 0, j * 1.1 + i]} scale={[.13, .2, 1]}><shapeGeometry args={[petalShape, 8]}/><meshBasicMaterial color={petalColors[(j + i) % 5]} transparent opacity={.5} depthWrite={false} side={DoubleSide}/></mesh>;
        })}
      </group>
    </group>)}
    {Array.from({ length: 8 }, (_, i) => <mesh key={i} ref={node => { fallen.current[i] = node; }} visible={state.current.flowerOpen} scale={[.17, .23, 1]}><shapeGeometry args={[petalShape, 8]}/><meshBasicMaterial color={petalColors[i % 5]} transparent opacity={.65} depthWrite={false} side={DoubleSide}/></mesh>)}
    {textures.glow && <mesh ref={lanternFloor} position={[trailSites.lantern.x, trailSites.lantern.y, terrainHeight(trailSites.lantern.x, trailSites.lantern.y) + 2]}><planeGeometry args={[410, 310]}/><meshBasicMaterial map={textures.glow} color="#f3d796" transparent opacity={.21 * light.current} depthWrite={false}/></mesh>}
  </group>;
}
