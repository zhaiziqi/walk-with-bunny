import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, Group, MeshBasicMaterial, PlaneGeometry, Shape } from 'three';
import type { Texture } from 'three';
import type { ArtKey } from '../config/art';
import { gardenShrubs } from './gardenAtlas';
import type { GardenShrub } from './gardenAtlas';
import { BILLBOARD_TILT, terrainHeight } from './depthWorld';
import { gardenWind } from './gardenWind';
import type { GardenClock } from './gardenWind';
import type { MeadowPoint } from './meadowMotion';
import { advanceLeafBend, canopyContact, shrubDimensions } from './plantResponse';

type Props = { textures: Partial<Record<ArtKey, Texture>>; actor: MeadowPoint; moving: boolean; heading: MeadowPoint; reading: boolean; clock: GardenClock };

function FlexiblePlant({ plant, index, textures, actor, moving, heading, reading, clock }: Props & { plant: GardenShrub; index: number }) {
  const root = useRef<Group>(null!), bend = useRef({ value: 0, velocity: 0 }), previous = useRef({ ...actor });
  const { art, width, height, footInset } = shrubDimensions(plant);
  const dimensions = useMemo(() => new PlaneGeometry(width, height, 8, 12), [width, height]);
  const grassShape = useMemo(() => {
    const shape = new Shape();
    for (let i = 0; i < 7; i++) {
      const x = (i - 3) * width / 10, h = height * (.6 + (i * 17 % 31) / 70), lean = (i % 2 ? 1 : -1) * (3 + i);
      shape.moveTo(x - 1.2, 0); shape.quadraticCurveTo(x + lean * .2, h * .65, x + lean, h); shape.quadraticCurveTo(x + lean * .5, h * .4, x + 1.6, 0); shape.closePath();
    }
    return shape;
  }, [width, height]);
  const uniforms = useMemo(() => ({ plantBend: { value: 0 }, plantWind: { value: 0 }, plantFlutter: { value: 0 }, plantTime: { value: 0 }, plantHeight: { value: height }, plantOffset: { value: art === 'grass' ? 0 : height * (.5 - footInset) }, plantWidth: { value: width }, plantPhase: { value: plant.phase } }), [art, height, width, footInset, plant.phase]);
  const material = useMemo(() => {
    const material = new MeshBasicMaterial({ map: art === 'grass' ? null : (textures[art] ?? null), transparent: true, opacity: art === 'grass' ? .74 : .94, color: art === 'grass' ? (index % 2 ? '#a4bc92' : '#7f9d89') : art === 'fern' ? (index % 3 ? '#9cad99' : '#bdcbb3') : '#ffffff', depthWrite: false, alphaTest: .025, side: DoubleSide, toneMapped: false });
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
        uniform float plantBend; uniform float plantWind; uniform float plantFlutter; uniform float plantTime;
        uniform float plantHeight; uniform float plantOffset; uniform float plantWidth; uniform float plantPhase;`);
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        float rootHeight = position.y + plantOffset;
        float flex = pow(clamp((rootHeight / plantHeight - .10) / .90, 0., 1.), 2.);
        float side = position.x / max(1., plantWidth);
        float frond = sin(side * 8. + rootHeight / plantHeight * 4. + plantPhase);
        float ripple = sin(plantTime * 1.4 + side * 3.1 + rootHeight * .025 + plantPhase);
        transformed.x += flex * (plantBend * plantHeight * (.23 + frond * .035) + plantWind * plantHeight * .075 + ripple * plantFlutter * plantHeight * .035);
        transformed.y -= flex * abs(plantBend) * plantHeight * .055;
        transformed.z += flex * plantBend * plantHeight * .035 * sin(side * 5. + plantPhase);`);
    };
    material.customProgramCacheKey = () => 'rooted-understory-v1';
    return material;
  }, [art, index, textures, uniforms]);
  useEffect(() => () => { dimensions.dispose(); material.dispose(); }, [dimensions, material]);
  useFrame((_state, delta) => {
    const dt = Math.min(delta, .05), distance = Math.hypot(plant.x - actor.x, plant.y - actor.y);
    root.current.visible = distance < 2400 && plant.y > actor.y - 900;
    if (reading) { previous.current = { ...actor }; return; }
    if (!root.current.visible) { previous.current = { ...actor }; bend.current = { value: 0, velocity: 0 }; return; }
    const travelled = Math.hypot(actor.x - previous.current.x, actor.y - previous.current.y);
    const speed = dt > 0 && travelled < 180 ? Math.min(1, travelled / dt / 240) : 0;
    const contact = canopyContact(plant, width, height, previous.current, actor);
    const away = plant.x < actor.x ? -1 : 1;
    // The body gently holds leaves aside; real motion adds a stronger sweep in its direction.
    const target = contact * (away * (.20 + (moving ? speed * .52 : 0)) + (moving ? heading.x * speed * .25 : 0));
    bend.current = advanceLeafBend(bend.current, target, dt);
    previous.current = { ...actor };
    const wind = gardenWind(clock.current, plant.x, plant.y, .05);
    uniforms.plantBend.value = bend.current.value;
    uniforms.plantWind.value = wind.lean;
    uniforms.plantFlutter.value = wind.flutter;
    uniforms.plantTime.value = clock.current;
  });
  return <group ref={root} position={[plant.x, plant.y, terrainHeight(plant.x, plant.y) + 1]}>
    {art !== 'grass' && textures.contact && <mesh><planeGeometry args={[width * .95, width * .36]}/><meshBasicMaterial map={textures.contact} transparent opacity={.19} color="#667f6d" depthWrite={false}/></mesh>}
    <group rotation={[BILLBOARD_TILT, 0, 0]}>
      {art === 'grass' ? <mesh material={material}><shapeGeometry args={[grassShape, 7]}/></mesh> : <mesh geometry={dimensions} material={material} position={[0, height * (.5 - footInset), 0]}/>}
    </group>
  </group>;
}

/** Rooted watercolour leaves respond to the same breeze and the rabbit's real passage. */
export function ResponsiveUnderstory(props: Props) {
  return <>{gardenShrubs.map((plant, index) => <FlexiblePlant key={index} plant={plant} index={index} {...props}/>)}</>;
}
