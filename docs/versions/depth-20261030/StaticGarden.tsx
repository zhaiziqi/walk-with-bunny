import { useId } from 'react';
import type { CSSProperties } from 'react';
import { art } from '../config/art';
import type { ArtKey } from '../config/art';
import type { LoadedArt } from './useAssets';
import type { JourneyPose } from './journey';
import { banks, cameraFrame, groundHeight, objects, project, roadCenter } from './world';
import '../styles/static-depth.css';

type GroundPoint = { x: number; y: number; depth: number };
const polygonPoints = (points: GroundPoint[]) => points.map(point => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');

/** The non-WebGL view uses the same world anchors and perspective as the canvas. */
export function StaticGarden({ images, pose, width, height, bloom, lampOn }: {
  images: LoadedArt; pose: JourneyPose; width: number; height: number; bloom: number; lampOn: boolean;
}) {
  const id = useId().replaceAll(':', '');
  const frame = cameraFrame(pose, width, height);
  const at = (x: number, z: number, lift = 0) => project(x, groundHeight(x, z) + lift, pose, width, height, z);
  const sprite = (key: ArtKey, position: CSSProperties, className = '') => images[key]
    ? <img className={`world-sprite ${className}`} src={art[key]} alt="" draggable={false} style={position}/>
    : null;

  // World-fixed rows keep the ground in place while the camera moves through it.
  const rows: { z: number; near: number }[] = [];
  const nearLimit = frame.z - 35;
  for (let z = -3100; z < nearLimit; z += 90) rows.push({ z, near: Math.min(z + 90, nearLimit) });
  const terrain = rows.flatMap(({ z, near }) => {
    const cells = [];
    for (let x = -1800; x < 1800; x += 180) {
      const points = [at(x, z), at(x + 180, z), at(x + 180, near), at(x, near)];
      const shade = 48 + Math.sin((x + 90) / 360 + (z + 45) / 420) * 2.4;
      cells.push(<polygon key={`${x}:${z}`} points={polygonPoints(points)} fill={`hsl(91 29% ${shade}%)`}/>);
    }
    return cells;
  });
  const road = rows.map(({ z, near }) => {
    const strip = (halfWidth: number) => polygonPoints([
      at(roadCenter(z) - halfWidth, z, .7), at(roadCenter(z) + halfWidth, z, .7),
      at(roadCenter(near) + halfWidth, near, .7), at(roadCenter(near) - halfWidth, near, .7),
    ]);
    return <g key={z}>
      <polygon points={strip(76)} fill="#a7b77b"/>
      <polygon points={strip(64)} fill="#dbd4a5"/>
      <polygon points={strip(51)} fill="#e1d9b0" opacity=".5"/>
    </g>;
  });
  const layers = [
    ...objects.map(object => ({ kind: 'object' as const, key: object.id, data: object, point: project(object.x, object.y, pose, width, height, object.z) })),
    ...banks.map((bank, index) => ({ kind: 'bank' as const, key: `bank-${index}`, data: bank, point: project(bank.x, bank.y, pose, width, height, bank.z) })),
  ].filter(layer => layer.point.depth >= 25).sort((a, b) => b.point.depth - a.point.depth);
  const backdrop = images.environment ? 'environment' : images.panorama ? 'panorama' : null;
  const horizon = height / 2 - Math.tan(frame.pitch) * frame.focal;

  return <div className="static-garden depth-garden" aria-hidden="true">
    {backdrop && <img className="depth-backdrop" src={art[backdrop]} alt="" draggable={false}/>}
    <svg className="depth-terrain" width={width} height={height} viewBox={`0 0 ${Math.max(1, width)} ${Math.max(1, height)}`}>
      <defs>
        <linearGradient id={`${id}-ground`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#b6c99a"/><stop offset="1" stopColor="#73944f"/>
        </linearGradient>
        <linearGradient id={`${id}-haze`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#c4d5ad" stopOpacity=".65"/><stop offset="1" stopColor="#c4d5ad" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={`M0 ${horizon} Q${width * .25} ${horizon - 12} ${width * .5} ${horizon + 6} T${width} ${horizon} V${height} H0Z`} fill={`url(#${id}-ground)`}/>
      <g stroke="none">{terrain}{road}</g>
      <rect x="0" y={horizon - 2} width={width} height={height * .22} fill={`url(#${id}-haze)`}/>
    </svg>
    {layers.map(layer => {
      const { point } = layer;
      const style = { left: point.x, top: point.y, transform: `scale(${point.scale})` };
      if (layer.kind === 'bank') {
        const bank = layer.data;
        return <div key={layer.key} className="depth-anchor" style={style}>
          <span className="depth-contact" style={{ width: bank.width * .7, height: bank.height * .1, left: -bank.width * .35, top: -bank.height * .025 }}/>
          {sprite('bank', { width: bank.width, height: bank.height, left: -bank.width / 2, top: -bank.height * .975, transform: bank.flip ? 'scaleX(-1)' : undefined })}
        </div>;
      }
      const object = layer.data;
      const grassHeight = object.width * .24;
      return <div key={layer.key} className="depth-anchor" style={style}>
        {object.id === 'lock' && sprite('threshold', { width: object.width * 1.5, height: object.width * .65, left: -object.width * .75, top: -object.width * .08 })}
        <span className="depth-contact" style={{ width: object.width * .7, height: object.width * .13, left: -object.width * .35, top: -object.width * .045 }}/>
        {sprite('contact', { width: object.width * .95, height: object.width * .2, left: -object.width * .475, top: -object.width * .1 })}
        {sprite(object.art, {
          left: -object.width / 2, top: -object.height + object.footInset,
          width: object.width, height: object.height,
          transformOrigin: `50% ${object.height - object.footInset}px`,
        }, object.id === 'music' && bloom ? 'static-bloom' : '')}
        {sprite('grass', { width: object.width * .9, height: grassHeight, left: -object.width * .45, top: -grassHeight * .68 })}
        {lampOn && object.id === 'puzzle' && <span className="depth-lamp-glow" style={{ width: object.width * .32, height: object.width * .32, left: -object.width * .16, top: -object.height * .69 }}/>} 
      </div>;
    })}
  </div>;
}
