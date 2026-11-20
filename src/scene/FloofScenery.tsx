import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, DoubleSide, Group, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
import type { Texture } from 'three';
import { BILLBOARD_TILT, terrainHeight } from './depthWorld';
import { gardenWind } from './gardenWind';
import type { GardenClock } from './gardenWind';
import type { MeadowPoint } from './meadowMotion';
import type { JourneyFrameRef } from './journeyFrame';
import { advanceLeafBend, canopyContact } from './plantResponse';
import { createFloofArt } from './floofSceneryArt';
import { useFloofPaintedLeaves } from './floofPaintedLeaves';
import { floofPlants } from './floofSceneryData';
import type { FloofPlant } from './floofSceneryData';

export { createFloofArt } from './floofSceneryArt';
export { floofPlants } from './floofSceneryData';
export type { FloofPlant } from './floofSceneryData';

type Props = { actor: MeadowPoint; heading: MeadowPoint; moving: boolean; reading: boolean; clock: GardenClock; motion?: JourneyFrameRef };

function contactArt() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!, gradient = ctx.createRadialGradient(64, 64, 2, 64, 64, 63);
  gradient.addColorStop(0, 'rgba(55,77,79,.33)'); gradient.addColorStop(.5, 'rgba(55,77,79,.15)'); gradient.addColorStop(1, 'rgba(55,77,79,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
  return new CanvasTexture(canvas);
}

function PaintedPlant({ plant, texture, painted, shadow, actor, heading, moving, reading, clock, motion }: Props & { plant: FloofPlant; texture: Texture; painted: boolean; shadow: Texture }) {
  const root = useRef<Group>(null!);
  const previous = useRef({ ...actor }), bend = useRef({ value: 0, velocity: 0 });
  const geometry = useMemo(() => new PlaneGeometry(plant.w, plant.h, 12, 16), [plant.w, plant.h]);
  const original = useMemo(() => new Float32Array(geometry.attributes.position.array), [geometry]);
  const material = useMemo(() => new MeshBasicMaterial({ map: texture, color: painted ? '#ffffff' : plant.tint, transparent: true,
    alphaTest: painted ? .26 : .20, depthWrite: true, side: DoubleSide, toneMapped: false }), [texture, plant.tint, painted]);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  useFrame((_state, delta) => {
    const liveActor = !reading && motion ? motion.current.actor : actor;
    const liveHeading = !reading && motion ? motion.current.heading : heading;
    const liveMoving = !reading && motion ? motion.current.moving : moving;
    const distance = Math.hypot(plant.x - liveActor.x, plant.y - liveActor.y);
    root.current.visible = distance < 3300 && plant.y > liveActor.y - 1650;
    if (reading) { previous.current = { ...liveActor }; return; }
    if (!root.current.visible) { previous.current = { ...liveActor }; return; }
    const dt = Math.min(delta, .05), wind = gardenWind(clock.current, plant.x, plant.y, .13);
    const contact = canopyContact(plant, plant.w, plant.h, previous.current, liveActor);
    const away = plant.x < liveActor.x ? -1 : 1;
    bend.current = advanceLeafBend(bend.current, contact * (away * .23 + (liveMoving ? liveHeading.x * .16 : 0)), dt);
    previous.current = { ...liveActor };
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const x = original[i * 3], y = original[i * 3 + 1];
      const height = Math.max(0, (y / plant.h + .5 - .055) / .945);
      const flex = height * height, side = x / plant.w;
      const flutter = Math.sin(clock.current * 1.25 + side * 7.1 + height * 3) * wind.flutter;
      position.setX(i, x + flex * plant.h * (wind.lean * .024 + flutter * .012 + bend.current.value * .17));
      position.setY(i, y - flex * Math.abs(bend.current.value) * plant.h * .025);
    }
    position.needsUpdate = true;
  });
  return <group ref={root} position={[plant.x, plant.y, terrainHeight(plant.x, plant.y) + 2]}>
    <mesh position={[0, 1, 0]}><planeGeometry args={[plant.w * .65, Math.max(25, plant.w * .21)]}/><meshBasicMaterial map={shadow} transparent opacity={plant.small ? .25 : .55} depthWrite={false} toneMapped={false}/></mesh>
    <group rotation={[BILLBOARD_TILT, 0, 0]} scale={[plant.flip ? -1 : 1, 1, 1]}>
      <mesh geometry={geometry} material={material} position={[0, plant.h * .46, 0]}/>
    </group>
  </group>;
}

/** Sparse painted silhouettes make distinct overlapping clearings, without a wall of trees. */
export function FloofScenery(props: Props) {
  const painted = useFloofPaintedLeaves();
  const texture = useMemo(() => {
    const texture = new CanvasTexture(createFloofArt().leaf); texture.colorSpace = SRGBColorSpace; texture.anisotropy = 4; return texture;
  }, []);
  const paintedTextures = useMemo(() => {
    if (!painted) return null;
    const make = (canvas: HTMLCanvasElement) => {
      const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace; texture.anisotropy = 4; return texture;
    };
    return { blue: make(painted.blue), sage: make(painted.sage) };
  }, [painted]);
  const shadow = useMemo(contactArt, []);
  useEffect(() => () => { texture.dispose(); shadow.dispose(); }, [texture, shadow]);
  useEffect(() => () => { paintedTextures?.blue.dispose(); paintedTextures?.sage.dispose(); }, [paintedTextures]);
  return <group name="painted-floof-scenery">{floofPlants.map((plant, i) => <PaintedPlant key={i} plant={plant}
    texture={!plant.small && paintedTextures ? paintedTextures[plant.paint ?? 'sage'] : texture}
    painted={!plant.small && !!paintedTextures} shadow={shadow} {...props}/>)}</group>;
}
