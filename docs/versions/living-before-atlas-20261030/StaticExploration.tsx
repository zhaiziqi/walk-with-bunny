import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { art } from '../config/art';
import type { ArtKey } from '../config/art';
import type { LoadedArt } from './useAssets';
import type { JourneyPose } from './journey';
import type { MeadowPoint } from './meadowMotion';
import { objects, RABBIT } from './world';
import type { Place } from './world';
import { depthFog, depthProject, depthTrees, pathX, terrainHeight } from './depthWorld';
import { ecologySites } from './ecology';

type Props = { images: LoadedArt; pose: JourneyPose; width: number; height: number; actor: MeadowPoint; heading: MeadowPoint; discovered: Place[]; lampOn: boolean };
type Point = { x: number; y: number; scale: number; depth: number };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rgb = (channels: number[]) => `rgb(${channels.map(n => Math.round(n)).join(',')})`;
const polygon = (points: Point[]) => points.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');

/** SVG approximates the terrain mesh. Shared projection keeps every clickable foot aligned. */
export function StaticExploration({ images, pose, width, height, actor, heading, discovered, lampOn }: Props) {
  const project = (x: number, y: number, z = terrainHeight(x, y)) => depthProject(x, y, pose, width, height, z);
  const ground = useMemo(() => {
    const strips: { points: string; color: string }[] = [];
    const start = Math.floor((pose.y - 1100) / 140) * 140;
    const rows = Array.from({ length: 38 }, (_, i) => start + i * 140 + Math.max(0, i - 17) ** 2 * 12);
    for (let row = 0; row < rows.length - 1; row++) {
      const y = rows[row], nextY = rows[row + 1];
      for (let column = -10; column < 10; column++) {
        const x = column * 560, nextX = x + 560;
        const points = [[x, y], [nextX, y], [nextX, nextY], [x, nextY]].map(([px, py]) => depthProject(px, py, pose, width, height));
        if (points.every(p => p.y < -10) || points.every(p => p.y > height + 300) || points.every(p => p.x < -500) || points.every(p => p.x > width + 500)) continue;
        const depth = points.reduce((sum, p) => sum + p.depth, 0) / 4;
        const dusk = Math.max(0, Math.min(1, (y - 500) / 2300));
        const fog = Math.max(0, Math.min(1, (depth - 1300) / 3100));
        const wash = Math.sin(x * .003 + y * .002) * 3 + Math.cos(y * .005 - x * .002) * 2;
        const near = [185, 198, 171].map((n, i) => lerp(n, [133, 163, 166][i], dusk) + wash);
        strips.push({ points: polygon(points), color: rgb(near.map((n, i) => lerp(n, [209, 222, 219][i], fog))) });
      }
    }
    const trail: { points: string; opacity: number }[] = [];
    for (let y = start; y < start + 7000; y += 70) {
      const half = 30 + Math.sin(y * .008) * 8, nextHalf = 30 + Math.sin((y + 70) * .008) * 8;
      const points = [[pathX(y) - half, y], [pathX(y) + half, y], [pathX(y + 70) + nextHalf, y + 70], [pathX(y + 70) - nextHalf, y + 70]]
        .map(([x, py]) => depthProject(x, py, pose, width, height, terrainHeight(x, py) + 2));
      if (points.every(p => p.y < 0) || points.every(p => p.y > height + 200)) continue;
      trail.push({ points: polygon(points), opacity: Math.max(0, .66 * (1 - depthFog(points[0].depth))) });
    }
    return { strips, trail };
  }, [pose.x, pose.y, pose.zoom, width, height]);

  const sprite = (key: ArtKey, x: number, y: number, w: number, h: number, footInset = 0, style: CSSProperties = {}, suffix = '') => {
    if (!images[key]) return null;
    const p = project(x, y, terrainHeight(x, y) + 2);
    if (p.depth < 100 || p.y - h * p.scale > height || p.x + w * p.scale < 0 || p.x - w * p.scale > width) return null;
    return <img key={`${key}-${x}-${y}-${suffix}`} src={art[key]} alt="" draggable={false} style={{
      position: 'absolute', maxWidth: 'none', width: w * p.scale, height: h * p.scale,
      left: p.x - w * p.scale / 2, top: p.y - (h - footInset) * p.scale,
      opacity: 1 - depthFog(p.depth) * .93, zIndex: Math.round(10000 - y), ...style,
    }}/>;
  };
  const shadow = (x: number, y: number, w: number, reveal = 1) => {
    const p = project(x, y, terrainHeight(x, y) + 3);
    if (p.depth < 100) return null;
    return <ellipse key={`shadow-${x}-${y}`} cx={p.x} cy={p.y} rx={w * p.scale / 2} ry={w * p.scale * .11} fill="#6d8271" opacity={(1 - depthFog(p.depth)) * .13 * reveal}/>;
  };
  const landmarkReveal = (x: number, y: number) => Math.max(0, Math.min(1, (1350 - Math.hypot(x - actor.x, y - actor.y)) / 550));
  const actorFoot = project(actor.x, actor.y);
  const pond = ecologySites.pond;
  const poolPoints = Array.from({ length: 50 }, (_, i) => {
    const a = i / 49 * Math.PI * 2, wobble = 1 + Math.sin(a * 3) * .045 + Math.sin(a * 7) * .025;
    return project(pond.x + Math.cos(a) * 106 * wobble, pond.y + Math.sin(a) * 65 * wobble, terrainHeight(pond.x, pond.y) + 3);
  });
  const poolOpacity = Math.max(0, 1 - depthFog(project(pond.x, pond.y).depth));
  return <div className="static-exploration" aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
      {ground.strips.map((cell, i) => <polygon key={i} points={cell.points} fill={cell.color} stroke={cell.color} strokeWidth=".6"/>)}
      {ground.trail.map((cell, i) => <polygon key={`path-${i}`} points={cell.points} fill="#dedbc3" opacity={cell.opacity}/>)}
      <polygon points={polygon(poolPoints)} fill="#9fbabd" stroke="#c2cfbf" strokeWidth="4" opacity={poolOpacity * .8}/>
      {depthTrees.map(item => shadow(item.x, item.y, item.w * .7))}
      {objects.map(item => shadow(item.x, item.y, item.width, landmarkReveal(item.x, item.y)))}
      {shadow(actor.x, actor.y, 95)}
    </svg>
    {depthTrees.map(item => {
      const tree = project(item.x, item.y);
      const overlaps = actor.y > item.y && Math.abs(tree.x - actorFoot.x) < item.w * tree.scale * .43 && actorFoot.y > tree.y - item.h * tree.scale && actorFoot.y - 80 < tree.y;
      const near = Math.hypot(item.x - actor.x, item.y - actor.y) < 140;
      return sprite('tree', item.x, item.y, item.w, item.h, item.h * .032552, {
        opacity: (overlaps ? .23 : near ? .6 : 1) * (1 - depthFog(tree.depth) * .93),
        transform: item.x > 0 ? 'scaleX(-1)' : undefined,
      });
    })}
    {objects.map(object => {
      const reveal = landmarkReveal(object.x, object.y);
      const fog = 1 - depthFog(project(object.x, object.y).depth) * .93;
      return <span key={object.id}>
      {sprite(object.art, object.x, object.y, object.width, object.height, object.footInset, { opacity: reveal * fog })}
      {sprite('grass', object.x, object.y, object.width * .6, 40, 12, { opacity: .55 * reveal * fog, zIndex: Math.round(10001 - object.y) })}
      {object.id === 'puzzle' && (lampOn || discovered.includes('puzzle')) && (() => {
        const p = project(object.x, object.y);
        return sprite('glow', object.x, object.y, 240, 240, 120, { top: p.y - object.height * .68 * p.scale - 120 * p.scale, opacity: (lampOn ? .5 : .26) * reveal * fog, zIndex: Math.round(10002 - object.y) });
      })()}
    </span>; })}
    {ecologySites.butterflyTrail.slice(0, 3).map((site, i) => <span key={`perch-${i}`}>
      {sprite('flower', site.x + i * 16, site.y, 30, 45, 3)}
      {(() => {
        const p = project(site.x + i * 16, site.y, terrainHeight(site.x, site.y) + 37);
        return <svg width={24 * p.scale} height={24 * p.scale} viewBox="0 0 24 24" style={{ position: 'absolute', left: p.x - 12 * p.scale, top: p.y - 12 * p.scale, opacity: 1 - depthFog(p.depth), zIndex: Math.round(10001 - site.y) }}>
          <ellipse cx="7" cy="10" rx="5" ry="8" fill={i === 1 ? '#e8bfca' : '#fff1cd'}/><ellipse cx="17" cy="10" rx="5" ry="8" fill={i === 1 ? '#e8bfca' : '#fff1cd'}/><path d="M12 7v11" stroke="#948d77"/>
        </svg>;
      })()}
    </span>)}
    {sprite(heading.y > .15 && images.rabbitBack ? 'rabbitBack' : 'rabbit', actor.x, actor.y, RABBIT.width, RABBIT.height,
      heading.y > .15 && images.rabbitBack ? RABBIT.height * .0345052 : RABBIT.footInset,
      { transform: heading.x > .12 ? 'scaleX(-1)' : undefined })}
  </div>;
}
