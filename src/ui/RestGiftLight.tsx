import { useEffect, useId, useRef, type CSSProperties } from 'react';
import { createFloofCanvas } from '../scene/floofCompanionArt';

// Finite, staggered paths share one source inside the box. They never loop.
const motes = Array.from({ length: 23 }, (_, i) => ({
  x: 506 + Math.sin(i * 2.4) * 48,
  y: 367 + Math.cos(i * 1.7) * 8,
  dx: 32 + (i % 6) * 24 + Math.sin(i) * 22,
  dy: -116 - (i % 7) * 23,
  radius: i % 6 === 0 ? 5.2 : 1.7 + (i % 4) * .6,
  delay: .62 + (i % 9) * .12,
  duration: 2.6 + (i % 5) * .18,
}));

export function RestGiftLight() {
  const id = useId().replace(/:/g, '');
  return <svg className="rest-dream-lights" viewBox="0 0 1000 620" fill="none" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id={`${id}-glow`}><stop stopColor="#fff4cc" stopOpacity=".95"/><stop offset=".35" stopColor="#f4d799" stopOpacity=".6"/><stop offset="1" stopColor="#edc57e" stopOpacity="0"/></radialGradient>
      <radialGradient id={`${id}-mote`}><stop stopColor="#fff9db"/><stop offset=".3" stopColor="#ffe3a6" stopOpacity=".94"/><stop offset="1" stopColor="#f8d197" stopOpacity="0"/></radialGradient>
    </defs>
    <ellipse className="rest-dream-bloom" cx="522" cy="366" rx="191" ry="152" fill={`url(#${id}-glow)`}/>
    {motes.map((m, i) => <g key={i} className={`rest-dream-mote ${i === 7 || i === 16 ? 'is-star' : ''}`} style={{ '--dx': `${m.dx}px`, '--dy': `${m.dy}px`, '--delay': `${m.delay}s`, '--duration': `${m.duration}s` } as CSSProperties}>
      <circle cx={m.x} cy={m.y} r={m.radius * 4} fill={`url(#${id}-mote)`}/>
      {i === 7 || i === 16 ? <path d={`M${m.x} ${m.y-11}q1.5 9 9 11q-7.5 1.2-9 11q-1.1-9.8-9-11q7.9-2 9-11Z`} fill="#ffedbf"/> : <circle cx={m.x} cy={m.y} r={m.radius} fill="#ffedc7" fillOpacity=".9"/>}
    </g>)}
  </svg>;
}

/** Reuse the actual garden traveller, rather than introducing a second mascot. */
export function RestGiftCompanion() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const context = ref.current?.getContext?.('2d');
    if (context) context.drawImage(createFloofCanvas(), 0, 0, 256, 256);
  }, []);
  return <div className="rest-dream-companion" aria-hidden="true"><span/><canvas ref={ref} width="256" height="256"/></div>;
}
