import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, DoubleSide, ShaderMaterial, Vector2, Vector4 } from 'three';
import { pondFootprint, pondReveal } from './orchardPond';
import { DREAM_TRAIL_LIMIT, type PondDreamState } from './pondDream';
import { createPondNightCanvas, pondDreamPaint, pondDreamTrailStrength } from './pondDreamArt';

type Point = { x: number; y: number };
type Props = { stateRef: { current: { dream?: PondDreamState } | null }; site: Point; actor: Point; reading: boolean };
const vertex = `varying vec2 vWater;varying vec2 vUv;
void main(){vWater=position.xy;vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragment = `
varying vec2 vWater; varying vec2 vUv;
uniform sampler2D uNight;
uniform vec4 uTrail[${DREAM_TRAIL_LIMIT}];
uniform vec2 uReflection;
uniform float uPresence,uPlay,uTime,uReveal;
void main(){
  float wiggle=sin(vWater.y*.055+vWater.x*.018)*3.+sin(vWater.x*.083-vWater.y*.026)*1.7;
  float shore=1.-smoothstep(.83,.95,length(vWater/vec2(380.,250.))+wiggle*.0018);
  vec2 p=vWater-uReflection;
  float mask=.48*(1.-smoothstep(${pondDreamPaint.brushCore.toFixed(1)},${pondDreamPaint.brushRadius.toFixed(1)},length(p)+wiggle));
  for(int i=0;i<${DREAM_TRAIL_LIMIT};i++){
    float brush=(1.-smoothstep(${pondDreamPaint.brushCore.toFixed(1)},${pondDreamPaint.brushRadius.toFixed(1)},length(vWater-uTrail[i].xy)+wiggle))*uTrail[i].z;
    mask=max(mask,brush);
  }
  float nightAlpha=clamp(mask*uPlay*.91*shore*uPresence,0.,1.);
  p.x+=sin(p.y*.12+uTime*.9)*2.2;
  float angle=atan(p.y,p.x),radius=length(p/vec2(46.,39.));
  float fluff=.90+sin(angle*17.+.4)*.025+sin(angle*29.)*.018;
  float body=1.-smoothstep(fluff,fluff+.16,radius);
  for(int i=0;i<2;i++){
    vec2 offset=i==0?vec2(-16.,43.):vec2(16.,45.);
    float turn=i==0?-.17:.20,c=cos(turn),s=sin(turn);
    vec2 e=p-offset;e=vec2(e.x*c+e.y*s,-e.x*s+e.y*c)/vec2(13.,28.);
    body=max(body,(1.-smoothstep(.8,1.06,length(e)))*(.25+uPlay*.75));
  }
  float streak=.88+.12*sin(p.y*.31+uTime*.7);
  float halo=exp(-dot(p/vec2(72.,81.),p/vec2(72.,81.))*1.8)*.18;
  float bodyAlpha=clamp(max(body*.90*streak,halo)*shore*uPresence,0.,1.);
  vec3 night=pow(texture2D(uNight,vUv).rgb,vec3(2.2));
  vec3 cream=pow(vec3(1.,.9647,.8471),vec3(2.2));
  float alpha=bodyAlpha+nightAlpha*(1.-bodyAlpha);
  vec3 color=(night*nightAlpha*(1.-bodyAlpha)+cream*bodyAlpha)/max(.0001,alpha);
  gl_FragColor=vec4(color,alpha*uReveal);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** A continuous GPU reveal follows the model, not a prerecorded animation.
 * Parent owns all movement and pause state; this child only paints it. */
export function PondDreamLayer({ stateRef, site, actor, reading }: Props) {
  const night = useMemo(() => new CanvasTexture(createPondNightCanvas()), []);
  const material = useMemo(() => new ShaderMaterial({ transparent: true, depthWrite: false, side: DoubleSide, toneMapped: false,
    vertexShader: vertex, fragmentShader: fragment,
    uniforms: { uNight: { value: night }, uTrail: { value: Array.from({ length: DREAM_TRAIL_LIMIT }, () => new Vector4()) },
      uReflection: { value: new Vector2() }, uPresence: { value: 0 }, uPlay: { value: 0 }, uTime: { value: 0 }, uReveal: { value: pondReveal(actor) } },
  }), [night]);
  const update = (state: PondDreamState | undefined) => {
    if (!state) { material.uniforms.uPresence.value = 0; return; }
    const u = material.uniforms;
    u.uReflection.value.set(state.reflection.x - site.x, state.reflection.y - site.y);
    u.uPresence.value = state.presence; u.uPlay.value = state.playfulness; u.uTime.value = state.time;
    u.uReveal.value = pondReveal(state.actor);
    for (let i = 0; i < DREAM_TRAIL_LIMIT; i++) {
      const stamp = state.trail[i];
      u.uTrail.value[i].set(stamp ? stamp.x - site.x : 0, stamp ? stamp.y - site.y : 0,
        stamp ? pondDreamTrailStrength(stamp.age, stamp.strength) : 0, 0);
    }
  };
  // A renderer handoff shows its stored frame immediately, even while reading.
  useMemo(() => { update(stateRef.current?.dream); }, [material]);
  useFrame(() => { if (!reading) update(stateRef.current?.dream); });
  useEffect(() => () => { material.dispose(); night.dispose(); }, [material, night]);
  return <mesh material={material} position={[0, 0, 3.5]} renderOrder={-1.5} name="pond-underwater-night">
    <planeGeometry args={[pondFootprint.width, pondFootprint.height]}/>
  </mesh>;
}
