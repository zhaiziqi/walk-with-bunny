import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float32BufferAttribute, PlaneGeometry, RepeatWrapping, ShaderMaterial, Texture, Vector2 } from 'three';
import { groundExtent, regionAtmosphere } from './gardenAtlas';
import { terrainHeight } from './depthWorld';
import type { MeadowPoint } from './meadowMotion';
import type { GardenClock } from './gardenWind';
import type { JourneyFrameRef } from './journeyFrame';
import { createFloofBrushTexture } from './floofTerrainPaint';
import { sceneAssetUrl } from '../diagnostics/assetQA';
import { loadLocalImage } from './loadLocalImage';
import { sampleTrailField, trailPalette, trailQuietClearing, trailTextureSoftening } from './trailField';
import { orchardPondField, orchardPondPalette } from './orchardPondAtmosphere';
import { hollowArchField, hollowArchPalette } from './hollowArchAtmosphere';
import { hillMoonField, hillMoonPalette } from './hillMoonAtmosphere';
import type { MoonClearingRef } from './moonClearing';

type Props = { texture?: Texture; actor: MeadowPoint; reading: boolean; clock?: GardenClock; motion?: JourneyFrameRef; moonClearing?: MoonClearingRef };

const vertexShader = `
attribute float dusk;
attribute vec2 trailPaint;
attribute vec3 orchardPaint;
attribute vec3 hollowPaint;
attribute vec3 hillPaint;
varying vec3 ground;
varying vec3 groundNormal;
varying float twilight;
varying float eyeDistance;
varying vec2 trailField;
varying vec3 orchardField;
varying vec3 hollowField;
varying vec3 hillField;
void main() {
  ground = position;
  groundNormal = normal;
  twilight = dusk;
  trailField = trailPaint;
  orchardField = orchardPaint;
  hollowField = hollowPaint;
  hillField = hillPaint;
  vec4 view = modelViewMatrix * vec4(position, 1.);
  eyeDistance = -view.z;
  gl_Position = projectionMatrix * view;
}`;

const fragmentShader = `
uniform sampler2D brush;
uniform sampler2D paintedGround;
uniform float paintReady;
uniform float time;
uniform vec2 companion;
uniform float wake;
uniform float quietTextureReduction;
uniform float trailTextureReduction;
varying vec3 ground;
varying vec3 groundNormal;
varying float twilight;
varying float eyeDistance;
varying vec2 trailField;
varying vec3 orchardField;
varying vec3 hollowField;
varying vec3 hillField;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}
float noise21(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3. - 2. * f);
  return mix(mix(hash21(i), hash21(i + vec2(1., 0.)), f.x),
    mix(hash21(i + vec2(0., 1.)), hash21(i + vec2(1., 1.)), f.x), f.y);
}
float mound(vec2 p, vec2 center, vec2 radius) {
  vec2 q = (p - center) / radius;
  return exp(-dot(q, q));
}
vec3 seamlessPigment(vec2 uv) {
  vec2 q = fract(uv);
  vec2 weight = smoothstep(vec2(0.), vec2(.24), min(q, 1. - q));
  vec3 a = mix(texture2D(paintedGround, q + vec2(.5, .5)).rgb,
    texture2D(paintedGround, q + vec2(0., .5)).rgb, weight.x);
  vec3 b = mix(texture2D(paintedGround, q + vec2(.5, 0.)).rgb,
    texture2D(paintedGround, q).rgb, weight.x);
  return mix(a, b, weight.y);
}

void main() {
  vec2 p = ground.xy;
  // The differently scaled passes share direction but do not reveal a repeating landscape tile.
  float broadBrush = texture2D(brush, p / 1793.).r;
  float dryBrush = texture2D(brush, (p + vec2(729., -541.)) / 603.).r;
  float pigment = (broadBrush - .5) * .45 + (dryBrush - .5) * .22;
  float brokenEdge = (broadBrush - .5) * 420. + (dryBrush - .5) * 170.;
  float slowWash = noise21(p * .0015);
  vec3 sage = mix(vec3(.657, .727, .610), vec3(.520, .625, .630), twilight * .85);
  vec3 blue = mix(vec3(.600, .660, .764), vec3(.471, .543, .664), twilight * .78);
  vec3 underpaint = mix(vec3(.433, .582, .526), vec3(.427, .541, .566), twilight * .75);
  vec3 color = sage + (slowWash - .5) * vec3(.045, .040, .030);

  // Broad bands follow the existing entry banks, rather than drawing a separate beige road.
  float diagonal = p.x * .70 + p.y * .55 + 150. + sin(p.y * .0014) * 105.;
  float slopeBand = 1. - smoothstep(180. + brokenEdge, 360. + brokenEdge, abs(diagonal));
  float entryLimit = 1. - smoothstep(950., 2450., abs(p.y + 750.));
  float eastBank = mound(p, vec2(930., -780.), vec2(490., 610.));
  float westBank = mound(p, vec2(-240., -680.), vec2(510., 285.));
  float bankPaint = max(slopeBand * entryLimit, eastBank * .46);
  color = mix(color, blue, bankPaint * .84);

  // Lower edges of actual landforms carry a soft darker pigment, exposing their overlap.
  float bankShade = mound(p, vec2(-340., -910.), vec2(650., 180.)) * .43
    + mound(p, vec2(1080., -570.), vec2(490., 380.)) * .70;
  color = mix(color, underpaint, bankShade * (1. + broadBrush * .2));
  color += westBank * vec3(.017, .024, .017);
  float lowerShoulder = p.y + 2040. + .32 * p.x + 105. * sin(p.x * .0017);
  float shoulder = (1. - smoothstep(35. + brokenEdge * .3, 150., abs(lowerShoulder)))
    * (1. - smoothstep(-350., 360., p.x));
  color = mix(color, underpaint, shoulder * .32);
  color += vec3(.042, .043, .012) * mound(p, vec2(-400., -1830.), vec2(950., 120.));

  // Later areas remain connected but gradually become lavender and blue through their own washes.
  float later = smoothstep(600., 2300., p.y);
  float laterBank = smoothstep(.49, .75, noise21((p + vec2(640., 810.)) * .0009));
  color = mix(color, blue, laterBank * later * .30);

  float clearing = mound(p, vec2(80., -2050.), vec2(650., 570.));
  float light = mound(p, vec2(320., -1590.), vec2(380., 940.)) * .58
    + mound(p, vec2(-650., 750.), vec2(340., 290.)) * .38;
  color += vec3(.065, .053, .025) * (clearing * .38 + light);
  color = mix(color, vec3(${orchardPondPalette.orchard.join(',')}), orchardField.x * ${orchardPondPalette.warmth});
  color = mix(color, vec3(${orchardPondPalette.pond.join(',')}), orchardField.y * ${orchardPondPalette.coolness});
  color = mix(color, vec3(${hollowArchPalette.hollow.join(',')}), hollowField.x * ${hollowArchPalette.hollowStrength});
  color = mix(color, vec3(${hollowArchPalette.arch.join(',')}), hollowField.y * ${hollowArchPalette.archStrength});
  color = mix(color, vec3(${hillMoonPalette.hill.join(',')}), hillField.x * ${hillMoonPalette.hillStrength});
  color = mix(color, vec3(${hillMoonPalette.moon.join(',')}), hillField.y * ${hillMoonPalette.moonStrength});
  vec3 painted = seamlessPigment(p / vec2(2460., 1640.));
  vec3 variation = painted - vec3(.647, .699, .603);
  vec3 paintVariation = mix(vec3(dot(variation, vec3(.3, .5, .2))), variation, .28);
  float textureCalm = 1. - max(max(max(orchardField.z, hollowField.z), hillField.z), max(trailField.y * quietTextureReduction, trailField.x * trailTextureReduction));
  color += mix(pigment * mix(vec3(.70, .78, .62), vec3(.68, .72, .82), bankPaint), paintVariation * .85, paintReady) * textureCalm;

  // Light falls along the authored route, separate from the blue bank. Meadow
  // colour and paper remain visible through the wash; no hard road is drawn.
  float trailPaper = ${trailPalette.paperBase} + ${trailPalette.paperVariation} * smoothstep(.25, .75, broadBrush);
  color += vec3(${trailPalette.route.join(',')}) * trailField.x * trailPaper;
  color += vec3(${trailPalette.clearing.join(',')}) * trailField.y;

  // A wind front moves across the brushwork. It changes pigment very slightly, never the land height.
  float gustPhase = (time - p.x / 520. - p.y / 850.);
  float phase = mod(gustPhase + 19000., 19.);
  float gust = smoothstep(3., 5., phase) * (1. - smoothstep(6., 8., phase));
  color += vec3(.012, .014, .008) * gust * smoothstep(.47, .64, dryBrush);

  float nearby = exp(-dot((p - companion) / 165., (p - companion) / 165.));
  color += vec3(.010, .012, .006) * nearby * wake * (dryBrush + .2);

  float lighting = .94 + .06 * max(0., dot(normalize(groundNormal), normalize(vec3(-.45, -.25, 1.))));
  color *= lighting;
  // Keep distant pigment in the same colour family; a mist veil must not flatten the focal clearing.
  float far = smoothstep(3900., 7200., eyeDistance);
  color = mix(color, mix(vec3(.70, .76, .71), vec3(.59, .65, .73), twilight), far * .45);
  gl_FragColor = vec4(color, 1.);
}`;

/** The approved painted clearing extends through world coordinates; it is never a camera-facing background. */
export function FloofTerrain({ actor, reading, clock, motion }: Props) {
  const time = useRef(0);
  const previous = useRef({ ...actor });
  const wake = useRef(0);
  const brush = useMemo(createFloofBrushTexture, []);
  const geometry = useMemo(() => {
    const width = groundExtent.maxX - groundExtent.minX;
    const height = groundExtent.maxY - groundExtent.minY;
    const geometry = new PlaneGeometry(width, height, 200, 264);
    const position = geometry.attributes.position;
    const dusk: number[] = [];
    const trailPaint: number[] = [];
    const orchardPaint: number[] = [];
    const hollowPaint: number[] = [];
    const hillPaint: number[] = [];
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i) + (groundExtent.minX + groundExtent.maxX) / 2;
      const y = position.getY(i) + (groundExtent.minY + groundExtent.maxY) / 2;
      position.setXYZ(i, x, y, terrainHeight(x, y));
      dusk.push(regionAtmosphere(x, y).dusk);
      const trail = sampleTrailField(x, y);
      trailPaint.push(trail.wash, trail.quiet);
      const field = orchardPondField(x, y);
      orchardPaint.push(field.warm, field.cool, field.calm);
      const deeper = hollowArchField(x, y);
      hollowPaint.push(deeper.hollow, deeper.arch, deeper.calm);
      const last = hillMoonField(x, y);
      hillPaint.push(last.hill, last.moon, last.calm);
    }
    geometry.setAttribute('dusk', new Float32BufferAttribute(dusk, 1));
    geometry.setAttribute('trailPaint', new Float32BufferAttribute(trailPaint, 2));
    geometry.setAttribute('orchardPaint', new Float32BufferAttribute(orchardPaint, 3));
    geometry.setAttribute('hollowPaint', new Float32BufferAttribute(hollowPaint, 3));
    geometry.setAttribute('hillPaint', new Float32BufferAttribute(hillPaint, 3));
    geometry.computeVertexNormals();
    return geometry;
  }, []);
  const material = useMemo(() => new ShaderMaterial({
    // A complete local texture is bound even before the optional painted image
    // arrives. Missing artwork therefore cannot leave an incomplete sampler.
    uniforms: { brush: { value: brush }, paintedGround: { value: brush }, paintReady: { value: 0 }, time: { value: 0 }, companion: { value: new Vector2() }, wake: { value: 0 }, quietTextureReduction: { value: trailQuietClearing.textureReduction }, trailTextureReduction: { value: trailTextureSoftening } },
    vertexShader, fragmentShader, toneMapped: false,
  }), [brush]);
  useEffect(() => {
    let active = true;
    let texture: Texture | undefined;
    const request = loadLocalImage(sceneAssetUrl('/art/floof/painted-ground-material-v1.png'));
    void request.promise.then(image => {
      if (!active || !image) return;
      texture = new Texture(image);
      texture.wrapS = texture.wrapT = RepeatWrapping; texture.anisotropy = 8;
      texture.needsUpdate = true;
      material.uniforms.paintedGround.value = texture;
      material.uniforms.paintReady.value = 1;
    });
    return () => {
      active = false; request.cancel(); texture?.dispose();
      material.uniforms.paintedGround.value = brush;
      material.uniforms.paintReady.value = 0;
    };
  }, [material, brush]);
  useFrame((_frame, delta) => {
    if (reading) return;
    const liveActor = motion?.current.actor ?? actor;
    const dt = Math.max(0, Math.min(delta, .05));
    time.current = clock?.current ?? time.current + dt;
    const travelled = Math.hypot(liveActor.x - previous.current.x, liveActor.y - previous.current.y);
    const moving = travelled > .01 && travelled < 100;
    wake.current += (Number(moving) - wake.current) * (1 - Math.exp(-dt * 2.2));
    material.uniforms.time.value = time.current;
    material.uniforms.companion.value.set(liveActor.x, liveActor.y);
    material.uniforms.wake.value = wake.current;
    previous.current = { ...liveActor };
  });
  useEffect(() => () => { geometry.dispose(); material.dispose(); brush.dispose(); }, [geometry, material, brush]);
  return <mesh name="painted-floof-ground" geometry={geometry} material={material} renderOrder={-1000}/>;
}
