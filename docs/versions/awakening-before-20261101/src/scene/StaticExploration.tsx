import { useId, useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { art } from '../config/art';
import type { ArtKey } from '../config/art';
import type { LoadedArt } from './useAssets';
import type { JourneyPose } from './journey';
import type { MeadowPoint } from './meadowMotion';
import { objects, RABBIT } from './world';
import type { Place } from './world';
import { depthFog, depthProject, depthTrees, terrainHeight } from './depthWorld';
import { ecologySites } from './ecology';
import { paths, regions, regionAtmosphere, gardenShrubs, groundExtent } from './gardenAtlas';

type Props = { images: LoadedArt; pose: JourneyPose; width: number; height: number; actor: MeadowPoint; heading: MeadowPoint; discovered: Place[]; lampOn: boolean; reading?: boolean };
type Point = { x: number; y: number; scale: number; depth: number };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rgb = (channels: number[]) => `rgb(${channels.map(n => Math.round(n)).join(',')})`;
const smooth = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
const polygon = (points: Point[]) => points.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
// Keep every world sprite above ground, including the northern edge beyond the moon clearing.
const worldLayer = (y: number, offset = 0) => Math.max(2, Math.round(groundExtent.maxY - y) + 20 + offset);

/** SVG approximates the terrain mesh. Shared projection keeps every clickable foot aligned. */
export function StaticExploration({ images, pose, width, height, actor, heading, discovered, lampOn, reading = false }: Props) {
  const paintId = useId().replaceAll(':', '');
  const project = (x: number, y: number, z = terrainHeight(x, y)) => depthProject(x, y, pose, width, height, z);
  const scenery = reading ? { x: pose.x, y: pose.y - 220 } : actor;
  const atmosphere = regionAtmosphere(scenery.x, scenery.y);
  const ground = useMemo(() => {
    const patches: string[] = [];
    const start = Math.floor((pose.y - 1100) / 140) * 140;
    const rows = Array.from({ length: 38 }, (_, i) => start + i * 140 + Math.max(0, i - 17) ** 2 * 12);
    for (let row = 0; row < rows.length - 1; row++) {
      const y = rows[row], nextY = rows[row + 1];
      for (let x = groundExtent.minX; x < groundExtent.maxX; x += 400) {
        const nextX = x + 400;
        const points = [[x, y], [nextX, y], [nextX, nextY], [x, nextY]].map(([px, py]) => depthProject(px, py, pose, width, height));
        if (points.every(p => p.y < -10) || points.every(p => p.y > height + 300) || points.every(p => p.x < -500) || points.every(p => p.x > width + 500)) continue;
        patches.push(`M${polygon(points)}Z`);
      }
    }
    const trail: { points: string; opacity: number }[] = [];
    for (const path of paths) {
      // Each shared centreline vertex owns one pair of edges; neighbouring quads
      // reuse those exact points so a bend cannot open into a fan of paving slabs.
      const edges = path.points.map((point, i) => {
        const before = path.points[Math.max(0, i - 1)], after = path.points[Math.min(path.points.length - 1, i + 1)];
        const dx = after.x - before.x, dy = after.y - before.y, length = Math.hypot(dx, dy) || 1;
        const half = path.width * .5, nx = -dy / length * half, ny = dx / length * half;
        return [-1, 1].map(side => {
          const x = point.x + nx * side, y = point.y + ny * side;
          return depthProject(x, y, pose, width, height, terrainHeight(x, y) + 2);
        });
      });
      for (let i = 1; i < path.points.length; i++) {
        const a = path.points[i - 1], b = path.points[i];
        if (Math.max(a.y, b.y) < pose.y - 1100 || Math.min(a.y, b.y) > pose.y + 5800) continue;
        const points = [edges[i - 1][0], edges[i - 1][1], edges[i][1], edges[i][0]];
        if (points.every(p => p.y < 0) || points.every(p => p.y > height + 200) || points.every(p => p.x < -20) || points.every(p => p.x > width + 20)) continue;
        trail.push({ points: polygon(points), opacity: Math.max(0, .53 * (1 - depthFog(points[0].depth))) });
      }
    }
    return { surface: patches.join(' '), trail };
  }, [pose.x, pose.y, pose.zoom, width, height]);

  const sprite = (key: ArtKey, x: number, y: number, w: number, h: number, footInset = 0, style: CSSProperties = {}, suffix = '') => {
    if (!images[key]) return null;
    const p = project(x, y, terrainHeight(x, y) + 2);
    if (p.depth < 220 || p.depth > 4600 || p.y < -80 || p.y - h * p.scale > height || p.x + w * p.scale < 0 || p.x - w * p.scale > width) return null;
    return <img key={`${key}-${x}-${y}-${suffix}`} src={art[key]} alt="" draggable={false} style={{
      position: 'absolute', maxWidth: 'none', width: w * p.scale, height: h * p.scale,
      left: p.x - w * p.scale / 2, top: p.y - (h - footInset) * p.scale,
      opacity: 1 - depthFog(p.depth) * .93, zIndex: worldLayer(y), ...style,
    }}/>;
  };
  const shadow = (x: number, y: number, w: number, reveal = 1) => {
    const p = project(x, y, terrainHeight(x, y) + 3);
    if (p.depth < 220 || p.depth > 4300 || p.y < -100 || p.y > height + 100) return null;
    return <ellipse key={`shadow-${x}-${y}`} cx={p.x} cy={p.y} rx={w * p.scale / 2} ry={w * p.scale * .11} fill="#6d8271" opacity={(1 - depthFog(p.depth)) * .13 * reveal}/>;
  };
  const landmarkReveal = (x: number, y: number) => reading ? 1 : Math.max(0, Math.min(1, (1350 - Math.hypot(x - scenery.x, y - scenery.y)) / 550));
  const sceneryFoot = project(scenery.x, scenery.y);
  const pools = [{ ...ecologySites.pond, rx: 106, ry: 65 }, { x: -1200, y: 3200, rx: 380, ry: 245 }];
  const poolRing = (pool: typeof pools[number], fraction = 1, ox = 0, oy = 0) => Array.from({ length: 65 }, (_, i) => {
    const angle = i / 64 * Math.PI * 2, wobble = 1 + Math.sin(angle * 3) * .045 + Math.sin(angle * 7) * .025;
    return project(pool.x + ox + Math.cos(angle) * pool.rx * fraction * wobble, pool.y + oy + Math.sin(angle) * pool.ry * fraction * wobble, terrainHeight(pool.x, pool.y) + 3);
  });
  const detail = (id: string, x: number, y: number, w: number, h: number, child: ReactNode, opacity = 1) => {
    const p = project(x, y);
    if (p.depth < 300 || p.depth > 4100 || p.x + w * p.scale < 0 || p.x - w * p.scale > width || p.y < -80 || p.y - h * p.scale > height) return null;
    return <svg key={id} width={w * p.scale} height={h * p.scale} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', overflow: 'visible', left: p.x - w * p.scale / 2, top: p.y - h * p.scale, opacity: opacity * (1 - depthFog(p.depth)), zIndex: worldLayer(y, 1) }}>{child}</svg>;
  };
  return <div className="static-exploration" aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', isolation: 'isolate' }}>
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
      <defs>
        <linearGradient id={`${paintId}-ground`} gradientUnits="userSpaceOnUse" x1="0" y1={height * .22} x2="0" y2={height}>
          <stop offset="0" stopColor={rgb(atmosphere.fog.map(n => n * 255))}/>
          <stop offset=".46" stopColor={rgb(atmosphere.ground.map((n, i) => lerp(n, atmosphere.fog[i], .34) * 255))}/>
          <stop offset="1" stopColor={rgb(atmosphere.ground.map(n => n * 255))}/>
        </linearGradient>
        <pattern id={`${paintId}-paper`} width="900" height="675" patternUnits="userSpaceOnUse">
          <image href={art.meadow} width="900" height="675" preserveAspectRatio="none"/>
        </pattern>
        <filter id={`${paintId}-path-soften`} x="-2%" y="-2%" width="104%" height="104%"><feGaussianBlur stdDeviation=".85"/></filter>
      </defs>
      <path d={ground.surface} fill={`url(#${paintId}-ground)`}/>
      {images.meadow && <path d={ground.surface} fill={`url(#${paintId}-paper)`} opacity=".14" style={{ mixBlendMode: 'soft-light' }}/>}
      <g filter={`url(#${paintId}-path-soften)`}>
        {ground.trail.map((cell, i) => <polygon key={`path-${i}`} points={cell.points} fill="#dedbc3" stroke="#dedbc3" strokeWidth=".7" strokeLinejoin="round" opacity={cell.opacity}/>)}
      </g>
      {pools.map((pool, index) => {
        const p = project(pool.x, pool.y), opacity = Math.max(0, 1 - depthFog(p.depth));
        if (p.depth < 250 || p.depth > 4200) return null;
        return <g key={`pool-${index}`} opacity={opacity}>
          <polygon points={polygon(poolRing(pool, 1.035))} fill="#8bada0" opacity=".48"/>
          <polygon points={polygon(poolRing(pool))} fill={index ? '#7da8ad' : '#a3bfc0'} opacity=".82"/>
          <polygon points={polygon(poolRing(pool, .98))} fill="none" stroke="#d3dfcc" strokeWidth="1.4" opacity=".5"/>
          {[.24, .43, .70].map((fraction, i) => <polygon key={fraction} points={polygon(poolRing(pool, fraction, i * 24 - 40, -10))} fill="none" stroke="#eceddf" strokeWidth=".8" opacity={.31 - i * .05}/>)}
          {index === 1 && [-.6, -.25, .5].map((offset, i) => {
            const lily = project(pool.x + offset * pool.rx, pool.y + (i % 2 ? -95 : 80), 32);
            return <g key={offset} opacity=".85"><ellipse cx={lily.x} cy={lily.y} rx={22 * lily.scale} ry={9 * lily.scale} fill="#b2cbb5"/><ellipse cx={lily.x + 7 * lily.scale} cy={lily.y - 4 * lily.scale} rx={7 * lily.scale} ry={4 * lily.scale} fill="#f1d9dc"/></g>;
          })}
        </g>;
      })}
      {depthTrees.map(item => shadow(item.x, item.y, item.w * .7))}
      {shadow(-1100, 5400, 330)}
      {objects.map(item => shadow(item.x, item.y, item.width, landmarkReveal(item.x, item.y)))}
      {shadow(actor.x, actor.y, 95)}
    </svg>
    <div style={{ position: 'absolute', inset: '0 0 65%', background: `linear-gradient(rgba(${atmosphere.fog.map(n => Math.round(n * 255)).join(',')},.25), transparent)`, pointerEvents: 'none', zIndex: 1 }}/>
    {/* A separate stacking layer prevents the filtered ground SVG from compositing
        over upright images when the reading camera changes their positions. */}
    <div className="static-upright-world" style={{ position: 'absolute', inset: 0, zIndex: 2, isolation: 'isolate' }}>
    {depthTrees.map(item => {
      const tree = project(item.x, item.y);
      if (tree.depth < 420 || tree.depth > 4400) return null;
      const overlaps = scenery.y > item.y && Math.abs(tree.x - sceneryFoot.x) < item.w * tree.scale * .43 && sceneryFoot.y > tree.y - item.h * tree.scale && sceneryFoot.y - 80 < tree.y;
      const near = Math.hypot(item.x - scenery.x, item.y - scenery.y) < 140;
      const key = images[item.art] ? item.art : 'tree';
      return sprite(key, item.x, item.y, item.w, item.h, item.h * (key === item.art ? item.footInset : .032552), {
        opacity: (overlaps ? .23 : near ? .6 : 1) * (1 - depthFog(tree.depth) * .93) * smooth((tree.depth - 420) / 380),
        transform: Math.sin(item.x * .017 + item.y * .013) > 0 ? 'scaleX(-1)' : undefined,
      });
    })}
    {gardenShrubs.map((item, i) => {
      if (Math.abs(item.y - scenery.y) > 4100) return null;
      if (item.kind === 'mushroom') return detail(`mushroom-${i}`, item.x, item.y, 40, 45,
        <g><path d="M17 43L18 17H24L27 43Z" fill="#e5ddce"/><path d="M3 20C4 1 36 0 38 20Q20 27 3 20Z" fill={i % 3 ? '#bb9fa9' : '#c6b49f'}/><ellipse cx="14" cy="13" rx="2" ry="1.5" fill="#f1e8dc"/><ellipse cx="27" cy="11" rx="2.5" ry="1.7" fill="#f1e8dc"/></g>, .8);
      const key = item.kind === 'fern' && images.fern ? 'fern' : item.kind === 'flower' ? 'flower' : 'grass';
      const shrubWidth = item.width * (key === 'fern' ? 2.2 : 1.3);
      const shrubHeight = key === 'grass' ? item.height : shrubWidth * 1.5;
      return sprite(key, item.x, item.y, shrubWidth, shrubHeight, shrubHeight * (key === 'grass' ? .26 : key === 'fern' ? .05533854 : .04),
        { opacity: (1 - depthFog(project(item.x, item.y).depth)) * .72 }, `shrub-${i}`);
    })}
    {images.arch ? sprite('arch', -1100, 5400, 370, 555, 555 * .05208333) : detail('arch-silhouette', -1100, 5400, 410, 510,
      <g fill="none" strokeLinecap="round"><path d="M66 500V200C66 20 344 20 344 200V500" stroke="#9dada7" strokeWidth="75"/><path d="M66 500V200C66 20 344 20 344 200V500" stroke="#c5ccbd" strokeWidth="48"/><path d="M43 350l51 12M38 230l59 10M67 122l51 30M295 128l51-30M315 247l55-10M316 380l55-5" stroke="#9aa99e" strokeWidth="3" opacity=".65"/><path d="M65 475Q44 310 91 212" stroke="#809c86" strokeWidth="9"/></g>)}
    {[[-750, 5310], [-1390, 5480], [-1500, 5620]].map(([x, y], i) => detail(`arch-stones-${i}`, x, y, 80, 35,
      <path d="M4 29L14 10 40 4 70 12 77 28Q41 35 4 29Z" fill="#aeb9aa" opacity=".8"/>))}
    {[[-85, -80], [95, 30], [170, -45]].map(([dx, dy], i) => detail(`hill-ribbon-${i}`, 1000 + dx, 6800 + dy, 105, 200,
      <g><path d="M45 200Q43 112 51 20" fill="none" stroke="#a69d85" strokeWidth="3"/><path d={`M51 24Q85 ${i % 2 ? 5 : 46} 103 22L100 47Q79 63 51 39Z`} fill={i === 1 ? '#e1c4ca' : '#e8dcc2'} opacity=".8"/><circle cx="51" cy="20" r="3.5" fill="#eeead7"/></g>))}
    {regions.filter(region => region.id === 'moon' || region.id === 'hollow').flatMap(region => Array.from({ length: 12 }, (_, i) => {
      const x = region.x + Math.cos(i * 2.399) * (170 + i * 17), y = region.y + Math.sin(i * 2.399) * (140 + i * 12);
      return detail(`${region.id}-light-${i}`, x, y, 18, 50 + i % 4 * 15,
        <g><circle cx="9" cy="10" r="8" fill="#f6edc9" opacity=".09"/><circle cx="9" cy="10" r="3" fill="#f8edc9" opacity=".68"/></g>);
    }))}
    {objects.map(object => {
      const reveal = landmarkReveal(object.x, object.y);
      const fog = 1 - depthFog(project(object.x, object.y).depth) * .93;
      return <span key={object.id}>
      {sprite(object.art, object.x, object.y, object.width, object.height, object.footInset, { opacity: reveal * fog })}
      {sprite('grass', object.x, object.y, object.width * .6, 40, 12, { opacity: .55 * reveal * fog, zIndex: worldLayer(object.y, 1) })}
      {object.id === 'puzzle' && (lampOn || discovered.includes('puzzle')) && (() => {
        const p = project(object.x, object.y);
        return sprite('glow', object.x, object.y, 240, 240, 120, { top: p.y - object.height * .68 * p.scale - 120 * p.scale, opacity: (lampOn ? .5 : .26) * reveal * fog, zIndex: worldLayer(object.y, 2) });
      })()}
    </span>; })}
    {ecologySites.butterflyTrail.slice(0, 3).map((site, i) => <span key={`perch-${i}`}>
      {sprite('flower', site.x + i * 16, site.y, 30, 45, 3)}
      {(() => {
        const p = project(site.x + i * 16, site.y, terrainHeight(site.x, site.y) + 37);
        if (p.depth < 300 || p.depth > 4100 || p.x < -30 || p.x > width + 30 || p.y < -30 || p.y > height + 30) return null;
        return <svg width={24 * p.scale} height={24 * p.scale} viewBox="0 0 24 24" style={{ position: 'absolute', left: p.x - 12 * p.scale, top: p.y - 12 * p.scale, opacity: 1 - depthFog(p.depth), zIndex: worldLayer(site.y, 1) }}>
          <ellipse cx="7" cy="10" rx="5" ry="8" fill={i === 1 ? '#e8bfca' : '#fff1cd'}/><ellipse cx="17" cy="10" rx="5" ry="8" fill={i === 1 ? '#e8bfca' : '#fff1cd'}/><path d="M12 7v11" stroke="#948d77"/>
        </svg>;
      })()}
    </span>)}
    {sprite(heading.y > .15 && images.rabbitBack ? 'rabbitBack' : 'rabbit', actor.x, actor.y, RABBIT.width, RABBIT.height,
      heading.y > .15 && images.rabbitBack ? RABBIT.height * .0345052 : RABBIT.footInset,
      { transform: heading.x > .12 ? 'scaleX(-1)' : undefined })}
    </div>
  </div>;
}
