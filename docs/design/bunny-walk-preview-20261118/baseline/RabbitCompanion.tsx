import { moonObjectTint, type MoonClearingRef } from './moonClearing';
import { orangeRestPose, orangeRestVertex, type OrangeRestRef } from './orangeRest';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, Group, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
import type { Texture } from 'three';
import type { ArtKey } from '../config/art';
import { BILLBOARD_TILT, terrainHeight } from './depthWorld';
import type { MeadowPoint, MeadowGuidance } from './meadowMotion';
import type { JourneyFrameRef } from './journeyFrame';
import { advanceFloof, emptyFloof } from './floofMotion';
import { advanceFloofAttention, createFloofAttention, floofAttentionPose, floofAttentionVertex, resumeFloofAttention, type FloofAttentionRef } from './floofAttention';
import type { MushroomListeningRef } from './mushroomListening';
import { createFloofCanvas, floofRandom as rand } from './floofCompanionArt';

export { createFloofCanvas } from './floofCompanionArt';

type Props = {
  actor: MeadowPoint; moving: boolean; heading: MeadowPoint; reading: boolean;
  textures: Partial<Record<ArtKey, Texture>> & { rabbitAtlas?: Texture };
  moonClearing?: MoonClearingRef; orangeRestRef?: OrangeRestRef; floofAttention?: FloofAttentionRef; mushroomListening?: MushroomListeningRef;
  attentionTarget?: MeadowPoint; guidance?: MeadowGuidance; motion?: JourneyFrameRef;
};
const SIZE = 120, SHEET = SIZE * 1.45, CENTER = SHEET * .359;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function floofPaint() {
  const texture = new CanvasTexture(createFloofCanvas()); texture.colorSpace = SRGBColorSpace;
  return texture;
}

function softDisc() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d')!;
  const falloff = context.createRadialGradient(64, 64, 4, 64, 64, 63);
  falloff.addColorStop(0, 'rgba(255,255,255,.8)'); falloff.addColorStop(.36, 'rgba(255,255,255,.48)');
  falloff.addColorStop(.68, 'rgba(255,255,255,.12)'); falloff.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = falloff; context.fillRect(0, 0, 128, 128);
  return new CanvasTexture(canvas);
}

/** The ground anchor follows position exactly; only the soft body has inertia. */
export function RabbitCompanion({ actor, moving, heading, reading, guidance, motion, floofAttention, mushroomListening, orangeRestRef, moonClearing }: Props) {
  const anchor = useRef<Group>(null!);
  const localAttention = useRef<FloofAttentionRef['current']>(null), attention = floofAttention ?? localAttention;
  const attentionInitialized = useRef(false), inspectionTime = useRef(0);
  if (!attentionInitialized.current) {
    const live = motion?.current.actor ?? actor;
    attention.current = attention.current ? resumeFloofAttention(attention.current, live) : createFloofAttention(live);
    attentionInitialized.current = true;
  }
  const body = useRef<Mesh>(null!), shadow = useRef<Mesh>(null!), glow = useRef<Mesh>(null!);
  const tufts = useRef<(Group | null)[]>([]);
  const flecks = useRef(Array.from({ length: 6 }, () => ({ x: 0, y: 0, age: 10, size: 0 })));
  const last = useRef({ ...actor }), shape = useRef(emptyFloof()), initialized = useRef(false);
  const initialAnchor = useRef<[number, number, number]>([actor.x, actor.y, terrainHeight(actor.x, actor.y) + 3]);
  const clock = useRef(0), distance = useRef(0), fleckIndex = useRef(0);
  const art = useMemo(floofPaint, []), soft = useMemo(softDisc, []);
  const geometry = useMemo(() => new PlaneGeometry(SHEET, SHEET, 18, 18), []);
  const shadowGeometry = useMemo(() => new PlaneGeometry(146, 90, 8, 6), []);
  const original = useMemo(() => new Float32Array(geometry.attributes.position.array), [geometry]);
  useEffect(() => () => { art.dispose(); soft.dispose(); geometry.dispose(); shadowGeometry.dispose(); }, [art, soft, geometry, shadowGeometry]);

  useFrame(({ gl }, delta) => {
    // The controller advances this sample before drawing. React may publish UI
    // snapshots less often, so neither the anchor nor its gait waits for a commit.
    const sample = reading ? undefined : motion?.current;
    const currentActor = sample?.actor ?? actor, currentHeading = sample?.heading ?? heading;
    const currentGuidance = sample?.guidance ?? guidance, currentMoving = !reading && (sample?.moving ?? moving);
    const foot = terrainHeight(currentActor.x, currentActor.y);
    (body.current.material as MeshBasicMaterial).color.setRGB(...moonObjectTint(currentActor.x, currentActor.y, moonClearing?.current?.phase ?? 0, 'floof'));
    anchor.current.position.set(currentActor.x, currentActor.y, foot + 3);
    if (reading && initialized.current) { last.current = { ...currentActor }; return; }
    const dt = clamp(Number.isFinite(delta) ? delta : 0, 0, .05); if (!dt) return;
    const travel = Math.hypot(currentActor.x - last.current.x, currentActor.y - last.current.y), jump = travel > 80;
    last.current = { ...currentActor };
    if (!reading) clock.current += dt;
    shape.current = advanceFloof(shape.current, { travel, dt, speed: sample?.speed, moving: currentMoving, headingX: currentHeading.x, intent: currentGuidance?.active ? currentGuidance.strength : 0 });
    attention.current = advanceFloofAttention(attention.current!, currentActor, delta, {
      mushrooms: mushroomListening?.current, moving: currentMoving, speed: sample?.speed, paused: reading,
    });
    const response = floofAttentionPose(attention.current);
    const sip = orangeRestPose(orangeRestRef?.current, currentActor);
    const m = shape.current, time = clock.current;
    if (time - inspectionTime.current >= .12) {
      inspectionTime.current = time;
      gl.domElement.dataset.floofAttention = JSON.stringify(response);
    }
    const quietBreath = Math.sin(time * 1.45) * .009 * (1 - m.speed / 240);
    const stretch = m.stretch + quietBreath;
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = original[i * 3], y = original[i * 3 + 1], height = Math.max(0, y + CENTER);
      const top = clamp(height / SIZE, 0, 1.1);
      // Deformation is zero at the foot; the tuft leans slightly behind its movement.
      const softSway = Math.sin(time * 1.1 + top * 3.2) * .55 * top * top;
      const point = floofAttentionVertex((x * (1 - stretch * .4) + m.bend * top * top + softSway) / SIZE,
        (y + CENTER + height * stretch) / SIZE, response);
      const drinking = orangeRestVertex(point.x, point.y, sip);
      positions.setXYZ(i, drinking.x * SIZE, drinking.y * SIZE - CENTER, 0);
    }
    positions.needsUpdate = true;
    shadow.current.scale.set(1 + Math.max(0, -stretch) * .6, 1 + Math.max(0, -stretch) * .4, 1);
    (shadow.current.material as MeshBasicMaterial).opacity = .40 - Math.max(0, stretch) * .22;
    const contact = shadowGeometry.attributes.position;
    for (let i = 0; i < contact.count; i++) contact.setZ(i, terrainHeight(currentActor.x + 7 + contact.getX(i), currentActor.y - 4 + contact.getY(i)) - foot + 1);
    contact.needsUpdate = true;
    (glow.current.material as MeshBasicMaterial).opacity = .065 + Math.sin(time * 1.1) * .009 + response.amount * .025;
    if (jump) { distance.current = 0; flecks.current.forEach(f => { f.age = 10; }); }
    else if (currentMoving) distance.current += travel;
    if (distance.current > 54 && currentMoving) {
      distance.current %= 54;
      const index = fleckIndex.current++ % flecks.current.length, seed = fleckIndex.current;
      flecks.current[index] = { x: currentActor.x - currentHeading.x * 27 + (rand(seed) - .5) * 14,
        y: currentActor.y - currentHeading.y * 27 + (rand(seed + 9) - .5) * 14, age: 0, size: 6 + rand(seed + 27) * 5 };
    }
    flecks.current.forEach((fleck, i) => {
      const node = tufts.current[i]; if (!node) return;
      if (!reading) fleck.age += dt;
      node.visible = fleck.age < 2.2;
      if (!node.visible) return;
      const p = fleck.age / 2.2;
      node.position.set(fleck.x + Math.sin(time + i) * p * 4, fleck.y + p * 5, terrainHeight(fleck.x, fleck.y) + 4 + Math.sin(p * Math.PI) * 8);
      node.scale.setScalar(fleck.size * (1 - p * .5));
      const material = (node.children[0] as Mesh).material as MeshBasicMaterial;
      material.opacity = (1 - p) ** 1.4 * .48;
    });
    initialized.current = true;
  });

  return <>
    {flecks.current.map((_, i) => <group key={i} ref={node => { tufts.current[i] = node; }} visible={false} rotation={[BILLBOARD_TILT, 0, 0]}>
      <mesh><planeGeometry args={[1.45, 1.45]}/><meshBasicMaterial map={art} transparent alphaTest={.015} depthWrite={false} toneMapped={false}/></mesh>
    </group>)}
    <group ref={anchor} name="little-floof" position={initialAnchor.current}>
      <mesh ref={shadow} geometry={shadowGeometry} position={[7, -4, 0]}><meshBasicMaterial map={soft} color="#3d6472" transparent opacity={.40} depthWrite={false} toneMapped={false}/></mesh>
      <group rotation={[BILLBOARD_TILT, 0, 0]}>
        <mesh ref={glow} position={[0, CENTER, -.5]}><planeGeometry args={[SIZE * 1.8, SIZE * 1.8]}/><meshBasicMaterial map={soft} color="#fff1d1" transparent opacity={.065} depthWrite={false} toneMapped={false}/></mesh>
        <mesh ref={body} geometry={geometry} position={[0, CENTER, 0]}><meshBasicMaterial map={art} transparent alphaTest={.012} depthWrite={false} toneMapped={false}/></mesh>
      </group>
    </group>
  </>;
}
