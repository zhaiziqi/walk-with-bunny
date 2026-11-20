import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, DoubleSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry, ShaderMaterial, SRGBColorSpace, Vector4 } from 'three';
import type { Texture } from 'three';
import type { ArtKey } from '../config/art';
import type { AtlasSite } from './atlasInteraction';
import type { JourneyFrameRef } from './journeyFrame';
import { terrainHeight } from './depthWorld';
import { gardenWind, type GardenClock } from './gardenWind';
import { PondDreamLayer } from './PondDreamLayer';
import { createOrchardPetalCanvas, createPondFallbackCanvas, pondDriftPetals, pondFootprint, pondGlimpse, pondReveal } from './orchardPond';
import { advancePondListening, createPondListening, inspectPondListening, pondPetalPose, pondRipplePose, resumePondListening, type PondListeningRef } from './pondListening';

type Point = { x: number; y: number };
type Props = { site: AtlasSite; textures: Partial<Record<ArtKey, Texture>>; actor: Point; reading: boolean;
  motion?: JourneyFrameRef; clock?: GardenClock; memories?: readonly string[];
  pondListening?: PondListeningRef; onEvent?: (event: string) => void };

// All four wave fronts share the same ground sheet. The soft shoreline mask
// keeps each response in the painted water, including approaches from the side.
const waterVertex = `varying vec2 vWater;
void main(){vWater=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const waterFragment = `
varying vec2 vWater;
uniform vec4 uRings[4];
uniform float uAlpha[4];
uniform float uReveal;
void main(){
  float shore=1.0-smoothstep(.86,.97,length(vWater/vec2(380.,250.)));
  float waves=0.;
  for(int i=0;i<4;i++){
    vec2 q=(vWater-uRings[i].xy)/max(uRings[i].zw,vec2(1.));
    float radius=length(q);
    float edge=abs(radius-1.);
    float width=max(fwidth(radius)*1.2,.012);
    float broken=.70+.30*sin(atan(q.y,q.x)*3.+float(i)*1.7);
    waves+=(1.-smoothstep(width,width*2.8,edge))*uAlpha[i]*broken*1.6;
  }
  gl_FragColor=vec4(vec3(.94,.93,.82),min(.62,waves)*shore*uReveal);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function PondEncounter({ site, textures, actor, reading, motion, clock, memories, pondListening, onEvent }: Props) {
  const local = useRef<PondListeningRef['current']>(null), listening = pondListening ?? local;
  const initialized = useRef(false);
  if (!initialized.current) {
    const live = motion?.current.actor ?? actor;
    listening.current = listening.current ? resumePondListening(listening.current, live) : createPondListening(live, memories?.includes(site.event));
    initialized.current = true;
  }
  const surfaceOffset = (x: number, y: number) => terrainHeight(x, y) - terrainHeight(site.x, site.y) + 2.8;
  const root = useRef<Group>(null!), surface = useRef<MeshBasicMaterial>(null!), shimmer = useRef<MeshBasicMaterial>(null!);
  const petals = useRef<(Mesh | null)[]>([]), inspection = useRef(-1);
  const fallback = useMemo(() => { const t = new CanvasTexture(createPondFallbackCanvas()); t.colorSpace = SRGBColorSpace; return t; }, []);
  const petalTexture = useMemo(() => { const t = new CanvasTexture(createOrchardPetalCanvas()); t.colorSpace = SRGBColorSpace; return t; }, []);
  const geometry = useMemo(() => {
    const sheet = new PlaneGeometry(pondFootprint.width, pondFootprint.height, 40, 32);
    const positions = sheet.attributes.position, base = terrainHeight(site.x, site.y);
    for (let i = 0; i < positions.count; i++) positions.setZ(i, terrainHeight(site.x + positions.getX(i), site.y + positions.getY(i)) - base + .4);
    return sheet;
  }, [site.x, site.y]);
  const water = useMemo(() => {
    const snapshot = listening.current!;
    return new ShaderMaterial({
    transparent: true, depthWrite: false, side: DoubleSide, toneMapped: false,
    vertexShader: waterVertex, fragmentShader: waterFragment,
    uniforms: { uRings: { value: snapshot.ripples.map(r => { const p = pondRipplePose(r); return new Vector4(r.x - site.x, r.y - site.y, p.radiusX, p.radiusY); }) },
      uAlpha: { value: snapshot.ripples.map(r => pondRipplePose(r).opacity) },
      uReveal: { value: pondReveal(actor) } },
    });
  }, []);
  useEffect(() => () => { fallback.dispose(); petalTexture.dispose(); geometry.dispose(); water.dispose(); }, [fallback, petalTexture, geometry, water]);
  useFrame((_frame, delta) => {
    if (reading) return;
    const live = motion?.current.actor ?? actor, before = listening.current!;
    listening.current = advancePondListening(before, live, delta, { speed: motion?.current.speed });
    const state = listening.current, t = clock?.current ?? state.time;
    if (!before.discovered && state.discovered) onEvent?.(site.event);
    const reveal = pondReveal(live), glimpse = pondGlimpse(live);
    root.current.visible = Math.max(reveal, glimpse) > .005;
    if (surface.current) surface.current.opacity = reveal;
    const wind = gardenWind(t, site.x, site.y, .35);
    if (shimmer.current) shimmer.current.opacity = glimpse * (1 - reveal) * .16 + reveal * (.035 + wind.gust * .012);
    water.uniforms.uReveal.value = reveal;
    state.ripples.forEach((ripple, i) => {
      const pose = pondRipplePose(ripple);
      water.uniforms.uRings.value[i].set(ripple.x - site.x, ripple.y - site.y, pose.radiusX, pose.radiusY);
      water.uniforms.uAlpha.value[i] = pose.opacity;
    });
    pondDriftPetals.forEach((_petal, i) => {
      const mesh = petals.current[i]; if (!mesh) return;
      const pose = pondPetalPose(state, i, t, wind.lean);
      mesh.position.set(pose.x - site.x, pose.y - site.y, surfaceOffset(pose.x, pose.y) + i * .1 + pose.lift);
      mesh.rotation.set(pose.tilt, 0, pose.rotation);
      (mesh.material as MeshBasicMaterial).opacity = .84 * reveal;
    });
    if (state.time - inspection.current > .12) {
      inspection.current = state.time;
      _frame.gl.domElement.dataset.pondListening = JSON.stringify(inspectPondListening(state));
    }
  });
  return <group ref={root} position={[site.x, site.y, terrainHeight(site.x, site.y) + 3]} name="atlas-lily-pond">
    <mesh geometry={geometry} renderOrder={-2}><meshBasicMaterial ref={surface} map={textures.pondPaint ?? fallback} transparent opacity={pondReveal(actor)} depthWrite={false} alphaTest={.003} side={DoubleSide} toneMapped={false}/></mesh>
    {textures.glow && <mesh position={[-60, 30, 1]} scale={[1, .32, 1]} renderOrder={-1}><planeGeometry args={[400, 230]}/><meshBasicMaterial ref={shimmer} map={textures.glow} color="#e6ebd9" transparent opacity={.04 * pondReveal(actor)} depthWrite={false} toneMapped={false}/></mesh>}
    <mesh material={water} position={[0, 0, 2]} renderOrder={-1}><planeGeometry args={[pondFootprint.width, pondFootprint.height]}/></mesh>
    <PondDreamLayer stateRef={listening} site={site} actor={actor} reading={reading}/>
    {pondDriftPetals.map((petal, i) => {
      const pose = pondPetalPose(listening.current, i, 0);
      return <mesh key={i} ref={node => { petals.current[i] = node; }} position={[pose.x - site.x, pose.y - site.y, surfaceOffset(pose.x, pose.y) + i * .1 + pose.lift]} rotation={[pose.tilt, 0, pose.rotation]}>
        <planeGeometry args={[petal.w, petal.h]}/><meshBasicMaterial map={petalTexture} color={petal.color} transparent opacity={.84 * pondReveal(actor)} depthWrite={false} side={DoubleSide} toneMapped={false}/>
      </mesh>;
    })}
  </group>;
}
