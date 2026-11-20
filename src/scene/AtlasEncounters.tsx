import { moonObjectTint, type MoonClearingRef } from './moonClearing';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, DoubleSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
import type { Texture } from 'three';
import type { ArtKey } from '../config/art';
import { BILLBOARD_TILT, terrainHeight } from './depthWorld';
import { advanceAtlasInteraction, atlasEncounterSites, emptyAtlasInteraction } from './atlasInteraction';
import type { AtlasPulse, AtlasSite } from './atlasInteraction';
import { archComposition, archGroundOffset, archMotes, archMotePose, archReveal, chimeArtwork, createArchFallbackCanvas, createChimeCanvas, createMushroomFallbackCanvas, hollowMushrooms, hollowReveal, restoreHollowArchMemory } from './hollowArch';
import { advanceChimeListening, chimeListeningPose, createChimeListening, inspectChimeListening, resumeChimeListening, type ChimeListeningRef } from './chimeListening';
import { advanceMushroomListening, createMushroomListening, listeningMushroomPose, mushroomLightPose, mushroomVertex, inspectMushroomListening, resumeMushroomListening, type MushroomListeningRef } from './mushroomListening';
import type { JourneyFrameRef } from './journeyFrame';
import { gardenWind, type GardenClock } from './gardenWind';
import { createOrchardPetalCanvas, orchardBlossoms, orchardFallenPetals, orchardPetalPose, orchardReveal, restoreOrchardPondMemory } from './orchardPond';
import { createPaperBirdCanvas, hillBirds, restoreHillMoonMemory } from './hillMoon';
import { PondEncounter } from './PondEncounter';
import type { PondListeningRef } from './pondListening';
import { advancePaperGuide, createPaperGuide, paperGuideBirdPose, paperGuideVisibility, resumePaperGuide, inspectPaperGuide, type PaperGuideRef } from './paperGuide';

type Point = { x: number; y: number };
type Props = { textures: Partial<Record<ArtKey, Texture>>; actor: Point; moving: boolean; heading: Point; reading: boolean; onEvent?: (event: string) => void; pulse?: AtlasPulse; motion?: JourneyFrameRef; clock?: GardenClock; memories?: readonly string[]; paperGuide?: PaperGuideRef; pondListening?: PondListeningRef; mushroomListening?: MushroomListeningRef; chimeListening?: ChimeListeningRef; moonClearing?: MoonClearingRef };
type SiteProps = Props & { site: AtlasSite };
const opacity = (mesh: Mesh | null, value: number) => { if (mesh) (mesh.material as MeshBasicMaterial).opacity = value; };

/** Interaction state persists while distant scenery is culled; reading freezes every clock. */
function useSite({ site, actor, moving, reading, pulse, onEvent, motion, memories }: SiteProps) {
  const root = useRef<Group>(null!);
  const encounter = useRef(restoreHillMoonMemory(restoreHollowArchMemory(restoreOrchardPondMemory(emptyAtlasInteraction(), site, actor, memories, pulse), site, actor, memories, pulse), site, actor, memories, pulse));
  const time = useRef(0);
  useFrame((_state, delta) => {
    const liveActor = !reading && motion ? motion.current.actor : actor;
    const liveMoving = !reading && motion ? motion.current.moving : moving;
    const distance = Math.hypot(liveActor.x - site.x, liveActor.y - site.y);
    if (root.current) root.current.visible = distance < 2200 && site.y > liveActor.y - 1100;
    if (reading) return;
    const previous = encounter.current;
    encounter.current = advanceAtlasInteraction(previous, site, distance, delta, liveMoving, false, pulse);
    if (encounter.current.activations > previous.activations) onEvent?.(site.event);
    time.current += Math.min(delta, .05);
  });
  return { root, encounter, time };
}

function usePaintedPetal() {
  const texture = useMemo(() => {
    const t = new CanvasTexture(createOrchardPetalCanvas()); t.colorSpace = SRGBColorSpace; return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function Orchard(props: SiteProps) {
  const { site, textures, reading, actor, motion, clock } = props, { root, encounter, time } = useSite(props);
  const petals = useRef<(Mesh | null)[]>([]), stems = useRef<(Group | null)[]>([]);
  const petalTexture = usePaintedPetal(), reveal = useRef(orchardReveal(actor));
  useFrame(() => {
    if (reading) return;
    const liveActor = motion?.current.actor ?? actor;
    reveal.current = orchardReveal(liveActor);
    root.current.visible = reveal.current > .005;
    if (!root.current.visible) return;
    const t = clock?.current ?? time.current, wind = gardenWind(t, site.x, site.y, .15);
    root.current.traverse(node => {
      if (node instanceof Mesh) {
        const material = node.material as MeshBasicMaterial;
        if (material.userData.baseOpacity !== undefined) material.opacity = material.userData.baseOpacity * reveal.current;
      }
    });
    petals.current.forEach((petal, i) => {
      if (!petal) return;
      const flight = orchardPetalPose(t, i, encounter.current.age, wind);
      petal.visible = flight.visible;
      petal.position.set(flight.x, flight.y, terrainHeight(site.x + flight.x, site.y + flight.y) - terrainHeight(site.x, site.y) + flight.z);
      petal.rotation.set(BILLBOARD_TILT, flight.tilt, flight.rotation);
      opacity(petal, flight.opacity * reveal.current);
    });
    stems.current.forEach((stem, i) => {
      if (!stem) return;
      const plant = orchardBlossoms[i], breeze = gardenWind(t, plant.x, plant.y, plant.phase);
      // The group origin stays at the planted foot; only the upper silhouette bends.
      stem.rotation.z = breeze.lean * .027;
    });
  });
  return <group ref={root} position={[site.x, site.y, terrainHeight(site.x, site.y) + 3]} name="atlas-orchard" visible={reveal.current > .005}>
    {textures.glow && <mesh scale={[1, .7, 1]}><planeGeometry args={[520, 410]}/><meshBasicMaterial map={textures.glow} color="#d7b5bf" transparent opacity={.065} userData={{ baseOpacity: .065 }} depthWrite={false}/></mesh>}
    {Array.from({ length: 14 }, (_, i) => <mesh key={i} ref={node => { petals.current[i] = node; }} scale={[17 + i % 4 * 2, 27 + i % 3 * 3, 1]}>
      <planeGeometry args={[1, 1]}/><meshBasicMaterial map={petalTexture} color={['#f2ced7', '#e2adbf', '#f7e7d7'][i % 3]} transparent opacity={0} depthWrite={false} side={DoubleSide} toneMapped={false}/>
    </mesh>)}
    {orchardFallenPetals.map((petal, i) => <mesh key={`fallen-${i}`} position={[petal.x - site.x, petal.y - site.y, terrainHeight(petal.x, petal.y) - terrainHeight(site.x, site.y) + 1]} rotation={[0, 0, petal.rotation]}>
      <planeGeometry args={[petal.w, petal.h]}/><meshBasicMaterial map={petalTexture} color={petal.color} transparent opacity={.67 * reveal.current} userData={{ baseOpacity: .67 }} depthWrite={false} side={DoubleSide} toneMapped={false}/>
    </mesh>)}
    {textures.flower && orchardBlossoms.map((plant, i) => <group key={plant.x} position={[plant.x - site.x, plant.y - site.y, terrainHeight(plant.x, plant.y) - terrainHeight(site.x, site.y)]}>
      {textures.contact && <mesh><planeGeometry args={[plant.w * .55, 17]}/><meshBasicMaterial map={textures.contact} color="#657c75" transparent opacity={.15 * reveal.current} userData={{ baseOpacity: .15 }} depthWrite={false}/></mesh>}
      <group rotation={[BILLBOARD_TILT, 0, 0]}><group ref={node => { stems.current[i] = node; }}><mesh position={[0, plant.h * .46, 0]}>
        <planeGeometry args={[plant.w, plant.h]}/><meshBasicMaterial map={textures.flower} transparent opacity={reveal.current} userData={{ baseOpacity: 1 }} alphaTest={.02} depthWrite={false} side={DoubleSide} toneMapped={false}/>
      </mesh></group></group>
    </group>)}
  </group>;
}


function useCanvasSheet(create: () => HTMLCanvasElement) {
  const texture = useMemo(() => { const sheet = new CanvasTexture(create()); sheet.colorSpace = SRGBColorSpace; sheet.anisotropy = 4; return sheet; }, [create]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
function revealPaint(root: Group, reveal: number) {
  root.traverse(node => {
    if (!(node instanceof Mesh)) return;
    const material = node.material as MeshBasicMaterial;
    if (material.userData.baseOpacity !== undefined) material.opacity = material.userData.baseOpacity * reveal;
  });
}

// A compact source of light under the cap; the broad scene glow has too little
// central opacity to remain legible at the mushroom's small on-screen size.
function createMushroomLanternCanvas() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 96;
  const c = canvas.getContext('2d')!, gradient = c.createRadialGradient(48, 48, 0, 48, 48, 48);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(.38, 'rgba(255,255,255,.84)');
  gradient.addColorStop(.70, 'rgba(255,255,255,.22)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = gradient; c.fillRect(0, 0, 96, 96); return canvas;
}

function Hollow(props: SiteProps) {
  const { site, textures, reading, motion, actor, clock, memories, pulse, onEvent } = props;
  const root = useRef<Group>(null!), time = useRef(0), inspectionTime = useRef(0), initialized = useRef(false);
  const local = useRef<MushroomListeningRef['current']>(null), listening = props.mushroomListening ?? local;
  const lights = useRef<(Mesh | null)[]>([]), hiddenLights = useRef<(Mesh | null)[]>([]), cores = useRef<(Mesh | null)[]>([]), halos = useRef<(Mesh | null)[]>([]);
  const fallback = useCanvasSheet(createMushroomFallbackCanvas), revealed = hollowReveal(actor);
  const paintedMeshes = useRef<(Mesh | null)[]>([]);
  const lantern = useCanvasSheet(createMushroomLanternCanvas);
  const shapes = useMemo(() => hollowMushrooms.map(mushroom => {
    const geometry = new PlaneGeometry(mushroom.w, mushroom.h, 16, 24);
    geometry.translate(0, mushroom.h * (mushroom.foot - .5), 0);
    const positions = geometry.attributes.position;
    const original = Array.from({ length: positions.count }, (_, i) => ({
      x: positions.getX(i) / mushroom.w * (mushroom.flip ? -1 : 1), y: positions.getY(i) / mushroom.h,
    }));
    return { geometry, original };
  }), []);
  useEffect(() => () => shapes.forEach(shape => shape.geometry.dispose()), [shapes]);
  if (!initialized.current) {
    const live = motion?.current.actor ?? actor;
    listening.current = listening.current ? resumeMushroomListening(listening.current, live)
      : createMushroomListening(live, memories?.includes(site.event), pulse?.id === site.id ? pulse.serial : -1);
    initialized.current = true;
  }
  useFrame(({ gl }, delta) => {
    if (reading) return;
    const liveActor = motion ? motion.current.actor : actor;
    const previous = listening.current!;
    listening.current = advanceMushroomListening(previous, liveActor, delta, {
      speed: motion?.current.speed, replaySerial: pulse?.id === site.id ? pulse.serial : undefined,
    });
    if (!previous.discovered && listening.current.discovered) onEvent?.(site.event);
    if (previous.quiet < 8 && listening.current.quiet >= 8 && listening.current.engaged) onEvent?.('mushroom-listened');
    time.current += Math.min(delta, .05);
    const state = listening.current;
    if (time.current - inspectionTime.current >= .12) {
      inspectionTime.current = time.current;
      gl.domElement.dataset.mushroomState = JSON.stringify(inspectMushroomListening(state));
    }
    const alpha = hollowReveal(liveActor);
    root.current.visible = alpha > .005;
    if (!root.current.visible) return;
    revealPaint(root.current, alpha);
    const t = clock?.current ?? time.current;
    hollowMushrooms.forEach((mushroom, i) => {
      const wind = gardenWind(t, mushroom.x, mushroom.y, mushroom.phase);
      const response = listeningMushroomPose(state, i, wind.lean), shape = shapes[i];
      const positions = shape.geometry.attributes.position;
      shape.original.forEach((original, vertex) => {
        const p = mushroomVertex(original.x, original.y, response);
        positions.setXY(vertex, p.x * mushroom.w, p.y * mushroom.h);
      });
      positions.needsUpdate = true;
      opacity(lights.current[i], response.glow * alpha);
      const open = Math.min(1, response.capLift / .15);
      const hidden = hiddenLights.current[i], core = cores.current[i];
      if (hidden) { hidden.position.y = .40 * mushroom.h;
        opacity(hidden, response.warmth * (.18 + open * .7) * alpha); }
      const visitor = mushroomLightPose(state, i), halo = halos.current[i];
      for (const light of [core, halo]) {
        if (!light) continue;
        light.position.set(visitor.x * mushroom.w, visitor.y * mushroom.h, visitor.travel > .32 ? .5 : -.25);
        light.scale.setScalar(visitor.radius);
        opacity(light, visitor.opacity * alpha * (light === halo ? .38 : 1));
      }
      const paint = paintedMeshes.current[i];
      if (paint) (paint.material as MeshBasicMaterial).color.setRGB(1 + response.warmth * .025, 1 + response.warmth * .012, 1 - response.warmth * .025);
    });
  });
  return <group ref={root} position={[site.x, site.y, terrainHeight(site.x, site.y) + 3]} name="atlas-mushroom-hollow" visible={revealed > .005}>
    {hollowMushrooms.map((mushroom, i) => <group key={i} position={[mushroom.x - site.x, mushroom.y - site.y, terrainHeight(mushroom.x, mushroom.y) - terrainHeight(site.x, site.y)]}>
      {textures.contact && <mesh><planeGeometry args={[mushroom.w * .70, 25]}/><meshBasicMaterial map={textures.contact} color="#617574" transparent opacity={.19 * revealed} userData={{ baseOpacity: .19 }} depthWrite={false} toneMapped={false}/></mesh>}
      {textures.glow && <mesh ref={node => { lights.current[i] = node; }} position={[0, 0, .6]}><planeGeometry args={[mushroom.w * 1.25, mushroom.w * .7]}/><meshBasicMaterial map={textures.glow} color="#e3d8bf" transparent opacity={.012 * revealed} depthWrite={false} toneMapped={false}/></mesh>}
      <group rotation={[BILLBOARD_TILT, 0, 0]}>
        {textures.glow && <>
          <mesh ref={node => { hiddenLights.current[i] = node; }} position={[0, mushroom.h * .40, -.35]}><planeGeometry args={[mushroom.w * .55, mushroom.h * .20]}/><meshBasicMaterial map={lantern} color="#ffe9b0" transparent opacity={0} depthWrite={false} toneMapped={false}/></mesh>
          <mesh ref={node => { halos.current[i] = node; }}><planeGeometry args={[6.4, 6.4]}/><meshBasicMaterial map={lantern} color="#ffdd9d" transparent opacity={0} depthWrite={false} toneMapped={false}/></mesh>
          <mesh ref={node => { cores.current[i] = node; }}><planeGeometry args={[2.7, 2.7]}/><meshBasicMaterial map={lantern} color="#fff7d7" transparent opacity={0} depthWrite={false} toneMapped={false}/></mesh>
        </>}
        <mesh ref={node => { paintedMeshes.current[i] = node; }} geometry={shapes[i].geometry}>
          <meshBasicMaterial map={textures.mushroomPaint ?? fallback} transparent opacity={revealed} userData={{ baseOpacity: 1 }} alphaTest={.015} depthWrite={false} side={DoubleSide} toneMapped={false}/>
        </mesh>
      </group>
    </group>)}
  </group>;
}

const createChimeBell = () => createChimeCanvas('bell');
const createChimePaper = () => createChimeCanvas('paper');

function Arch(props: SiteProps) {
  const { site, textures, reading, actor, motion, clock, memories, pulse, onEvent } = props;
  const root = useRef<Group>(null!), initialized = useRef(false), inspectionTime = useRef(-1);
  const local = useRef<ChimeListeningRef['current']>(null), listening = props.chimeListening ?? local;
  if (!initialized.current) {
    const live = motion?.current.actor ?? actor;
    listening.current = listening.current ? resumeChimeListening(listening.current, live)
      : createChimeListening(live, memories?.includes(site.event), pulse?.id === site.id ? pulse.serial : -1);
    initialized.current = true;
  }
  const bell = useRef<Group>(null!), paper = useRef<Group>(null!), flies = useRef<(Group | null)[]>([]), cores = useRef<(Mesh | null)[]>([]);
  const fallback = useCanvasSheet(createArchFallbackCanvas), chime = useCanvasSheet(createChimeBell), paperSheet = useCanvasSheet(createChimePaper);
  const groundedArch = useMemo(() => {
    // Twenty vertical rows place one row exactly at the measured .95 foot anchor.
    const geometry = new PlaneGeometry(archComposition.w, archComposition.h, 10, 20);
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), y = positions.getY(i);
      const height = y + archComposition.h * (archComposition.foot - .5);
      const delta = archGroundOffset(archComposition.x + x, height);
      // Convert pure world-Z settlement into the billboard's local basis.
      // The rotated Y components cancel, so this never slides the painted foot along the bank.
      positions.setXYZ(i, x, y + delta * Math.sin(BILLBOARD_TILT), delta * Math.cos(BILLBOARD_TILT));
    }
    positions.needsUpdate = true; return geometry;
  }, []);
  useEffect(() => () => groundedArch.dispose(), [groundedArch]);
  const revealed = archReveal(actor);
  const initialPose = chimeListeningPose(listening.current!);
  useFrame(({ gl }, delta) => {
    if (reading) return;
    const liveActor = motion?.current.actor ?? actor, before = listening.current!;
    const t = clock?.current ?? before.time, wind = gardenWind(t, site.x, site.y, .5);
    listening.current = advanceChimeListening(before, liveActor, delta, {
      speed: motion?.current.speed, replaySerial: pulse?.id === site.id ? pulse.serial : undefined, windLean: wind.lean,
    });
    const current = listening.current;
    if (!before.discovered && current.discovered) onEvent?.(site.event);
    if (current.noteSerial > before.noteSerial) onEvent?.(`chime-note-${current.noteSerial}`);
    if (current.time - inspectionTime.current > .12) {
      gl.domElement.dataset.chimeListening = JSON.stringify(inspectChimeListening(current));
      inspectionTime.current = current.time;
    }
    const alpha = archReveal(liveActor);
    root.current.visible = alpha > .005;
    if (!root.current.visible) return;
    revealPaint(root.current, alpha);
    const pose = chimeListeningPose(current);
    if (bell.current) bell.current.rotation.z = pose.bellAngle;
    if (paper.current) paper.current.rotation.z = pose.paperAngle;
    flies.current.forEach((fly, i) => {
      if (!fly) return;
      const p = archMotePose(t, i, pose.responseAge);
      fly.position.set(p.x - site.x, p.y - site.y, terrainHeight(p.x, p.y) - terrainHeight(site.x, site.y) + p.z);
      opacity(cores.current[i], p.opacity * alpha);
    });
  });
  return <group ref={root} position={[site.x, site.y, terrainHeight(site.x, site.y) + 3]} name="atlas-old-arch" visible={revealed > .005}>
    {textures.contact && [-1, 1].map(side => <mesh key={side} position={[side * archComposition.w * .33, 0, terrainHeight(site.x + side * archComposition.w * .33, site.y) - terrainHeight(site.x, site.y)]}>
      <planeGeometry args={[100, 55]}/><meshBasicMaterial map={textures.contact} color="#596b77" transparent opacity={.22 * revealed} userData={{ baseOpacity: .22 }} depthWrite={false} toneMapped={false}/>
    </mesh>)}
    <group rotation={[BILLBOARD_TILT, 0, 0]}>
      <mesh geometry={groundedArch} position={[0, archComposition.h * (archComposition.foot - .5), 0]}>
        <meshBasicMaterial map={textures.archPaint ?? fallback} transparent opacity={revealed} userData={{ baseOpacity: 1 }} alphaTest={.015} depthWrite={false} side={DoubleSide} toneMapped={false}/>
      </mesh>
      <group ref={bell} position={[0, archComposition.chimeHeight, 4]} rotation={[0, 0, initialPose.bellAngle]}>
        <mesh position={[0, -archComposition.chimeH * (.5 - archComposition.chimeTop), 0]}>
          <planeGeometry args={[archComposition.chimeW, archComposition.chimeH]}/><meshBasicMaterial map={chime} transparent opacity={.94 * revealed} userData={{ baseOpacity: .94 }} depthWrite={false} side={DoubleSide} toneMapped={false}/>
        </mesh>
        <group ref={paper} position={[0, archComposition.chimeH * (archComposition.chimeTop - chimeArtwork.paperPivot / chimeArtwork.height), .05]} rotation={[0, 0, initialPose.paperAngle]}>
          <mesh position={[0, archComposition.chimeH * (chimeArtwork.paperPivot / chimeArtwork.height - .5), 0]}>
            <planeGeometry args={[archComposition.chimeW, archComposition.chimeH]}/><meshBasicMaterial map={paperSheet} transparent opacity={.94 * revealed} userData={{ baseOpacity: .94 }} depthWrite={false} side={DoubleSide} toneMapped={false}/>
          </mesh>
        </group>
      </group>
    </group>
    {archMotes.map((mote, i) => <group key={i} ref={node => { flies.current[i] = node; }} position={[mote.x - site.x, mote.y - site.y, terrainHeight(mote.x, mote.y) - terrainHeight(site.x, site.y) + mote.z]}>
      <group rotation={[BILLBOARD_TILT, 0, 0]}><mesh ref={node => { cores.current[i] = node; }}>
        <circleGeometry args={[mote.size * .5, 12]}/><meshBasicMaterial color="#fff0d2" transparent opacity={.35 * revealed} depthWrite={false} toneMapped={false}/>
      </mesh></group>
    </group>)}
  </group>;
}

const createBirdBody = () => createPaperBirdCanvas('body');
const createBirdLeftWing = () => createPaperBirdCanvas('leftWing');
const createBirdRightWing = () => createPaperBirdCanvas('rightWing');

function Hill(props: SiteProps) {
  const { site, textures, reading, actor, motion, clock, onEvent } = props;
  const root = useRef<Group>(null!), birdGroups = useRef<(Group | null)[]>([]), inspectionTime = useRef(-1);
  const localGuide = useRef<PaperGuideRef['current']>(null), guide = props.paperGuide ?? localGuide;
  const initialized = useRef(false);
  if (!initialized.current) {
    const point = motion?.current.actor ?? actor;
    guide.current = guide.current ? resumePaperGuide(guide.current, point) : createPaperGuide(point);
    initialized.current = true;
  }
  const birds = useRef<(Group | null)[]>([]), rolls = useRef<(Group | null)[]>([]);
  const leftWings = useRef<(Group | null)[]>([]), rightWings = useRef<(Group | null)[]>([]), shadows = useRef<(Mesh | null)[]>([]);
  const body = useCanvasSheet(createBirdBody), left = useCanvasSheet(createBirdLeftWing), right = useCanvasSheet(createBirdRightWing);
  const base = terrainHeight(site.x, site.y);
  useFrame(({ gl }, delta) => {
    if (reading) return;
    const liveActor = motion?.current.actor ?? actor, before = guide.current!;
    guide.current = advancePaperGuide(before, liveActor, delta, { speed: motion?.current.speed, moonlightReady: (props.moonClearing?.current?.phase ?? 1) >= .92 });
    const current = guide.current, t = current.time;
    if (!before.met && current.met) onEvent?.('paper-flock');
    if (current.perch > before.perch) onEvent?.(`paper-guide-perch-${current.perch}`);
    if (current.time - inspectionTime.current >= .12) {
      inspectionTime.current = current.time;
      gl.domElement.dataset.paperGuide = JSON.stringify(inspectPaperGuide(current, t));
    }
    let anyVisible = false;
    hillBirds.forEach((perch, i) => {
      const point = paperGuideBirdPose(current, i, t);
      const wind = gardenWind(clock?.current ?? t, point.x, point.y, perch.phase);
      const pose = paperGuideBirdPose(current, i, t, wind.lean), bird = birds.current[i];
      const alpha = paperGuideVisibility(liveActor, pose) * pose.opacity, group = birdGroups.current[i];
      if (group) { group.visible = alpha > .005; if (group.visible) revealPaint(group, alpha); }
      anyVisible ||= alpha > .005;
      if (bird) {
        bird.position.set(pose.x - site.x, pose.y - site.y, terrainHeight(pose.x, pose.y) - base + pose.lift);
        const tint = moonObjectTint(pose.x, pose.y, props.moonClearing?.current?.phase ?? 0, 'bird');
        bird.traverse(node => { if (node instanceof Mesh) (node.material as MeshBasicMaterial).color.setRGB(...tint); });
      }
      if (rolls.current[i]) rolls.current[i]!.rotation.z = pose.bank + pose.farewellLean;
      if (leftWings.current[i]) leftWings.current[i]!.rotation.y = pose.leftWingAngle;
      if (rightWings.current[i]) rightWings.current[i]!.rotation.y = -pose.rightWingAngle;
      const shadow = shadows.current[i];
      if (shadow) {
        shadow.position.set(pose.x - site.x, pose.y - site.y, terrainHeight(pose.x, pose.y) - base + .2);
        shadow.scale.set(1 + (pose.lift - 4) * .002, 1 + (pose.lift - 4) * .003, 1);
        opacity(shadow, .16 * Math.max(.12, 1 - pose.lift / 260) * alpha);
      }
    });
    root.current.visible = anyVisible;
  });
  return <group ref={root} position={[site.x, site.y, base + 3]} name="atlas-paperbird-hill">
    {hillBirds.map((bird, i) => {
      const point = paperGuideBirdPose(guide.current, i, guide.current?.time ?? 0);
      const revealed = paperGuideVisibility(actor, point) * point.opacity;
      const tint = moonObjectTint(point.x, point.y, props.moonClearing?.current?.phase ?? 0, 'bird');
      return <group key={i} ref={node => { birdGroups.current[i] = node; }} visible={revealed > .005}>
      {textures.contact && <mesh ref={node => { shadows.current[i] = node; }} position={[point.x - site.x, point.y - site.y, terrainHeight(point.x, point.y) - base + .2]}>
        <planeGeometry args={[bird.w * .65, 22]}/><meshBasicMaterial map={textures.contact} color="#687b7c" transparent opacity={.16 * revealed} depthWrite={false} toneMapped={false}/>
      </mesh>}
      <group ref={node => { birds.current[i] = node; }} position={[point.x - site.x, point.y - site.y, terrainHeight(point.x, point.y) - base + point.lift]}>
        <group rotation={[BILLBOARD_TILT, 0, 0]}><group ref={node => { rolls.current[i] = node; }} rotation={[0, 0, point.bank + point.farewellLean]} scale={[bird.flip ? -1 : 1, 1, 1]}>
          {/* Both wings hinge at the same painted shoulder; the resting foot is the origin. */}
          {[-1, 1].map(side => <group key={side} ref={node => { (side < 0 ? leftWings : rightWings).current[i] = node; }} rotation={[0, -side * (side < 0 ? point.leftWingAngle : point.rightWingAngle), 0]} position={[0, bird.h * (bird.foot - 126 / 224), 0]}>
            <mesh position={[0, bird.h * (126 / 224 - .5), 0]}>
              <planeGeometry args={[bird.w, bird.h]}/><meshBasicMaterial map={side < 0 ? left : right} color={tint} transparent opacity={revealed} userData={{ baseOpacity: 1 }} alphaTest={.01} depthWrite={false} side={DoubleSide} toneMapped={false}/>
            </mesh>
          </group>)}
          <mesh position={[0, bird.h * (bird.foot - .5), .2]}>
            <planeGeometry args={[bird.w, bird.h]}/><meshBasicMaterial map={body} color={tint} transparent opacity={revealed} userData={{ baseOpacity: 1 }} alphaTest={.01} depthWrite={false} side={DoubleSide} toneMapped={false}/>
          </mesh>
        </group></group>
      </group>
    </group>; })}
  </group>;
}

// The moon is offscreen. Its shared world-space light lives in FloofTerrain;
// ExplorationScene advances the persistent arrival before every consumer renders.
function Moon() { return null; }

/** Six fixed landmarks share the atlas controller without introducing interface elements. */
export function AtlasEncounters(props: Props) {
  return <>{atlasEncounterSites.map(site => {
    const Component = { orchard: Orchard, pond: PondEncounter, hollow: Hollow, arch: Arch, hill: Hill, moon: Moon }[site.id];
    return <Component key={site.id} {...props} site={site}/>;
  })}</>;
}
