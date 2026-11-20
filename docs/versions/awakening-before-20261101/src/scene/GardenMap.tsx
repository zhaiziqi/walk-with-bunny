import { paths, regions, playBounds } from './gardenAtlas';
import type { GardenRegion, RegionId } from './gardenAtlas';
import type { MeadowPoint } from './meadowMotion';
const position=(x:number,y:number)=>({x:30+(y-playBounds.minY)/(playBounds.maxY-playBounds.minY)*460,y:26+(x-playBounds.minX)/(playBounds.maxX-playBounds.minX)*138});
export function GardenMap({actor,visited,travel,onClose}:{actor:MeadowPoint;visited:RegionId[];travel:(region:GardenRegion)=>void;onClose:()=>void}) {
 const rabbit=position(actor.x,actor.y);
 return <nav className="garden-map" aria-label="小兔的地图">
  <div className="map-caption"><span>小兔的地图 <small>可以绕路，也可以再回来</small></span><button aria-label="收起地图" onClick={onClose}>×</button></div>
  <svg viewBox="0 0 520 190" aria-hidden="true">
   {paths.map((path,i)=><polyline key={path.id} points={path.points.map(p=>{const a=position(p.x,p.y);return `${a.x},${a.y}`;}).join(' ')} fill="none" stroke={i>6?'#adb5a3':'#a2a899'} strokeWidth={i>6?1:1.8} strokeDasharray={i>6?'3 5':undefined} opacity=".65"/>)}
   {regions.map(region=>{const p=position(region.x,region.y);return <circle key={region.id} cx={p.x} cy={p.y} r={visited.includes(region.id)?5:3} fill={region.color} stroke="#88988d" strokeWidth=".8"/>;})}
   <circle cx={rabbit.x} cy={rabbit.y} r="7" fill="none" stroke="#986d77" strokeWidth="1.5"/>
   <circle cx={rabbit.x} cy={rabbit.y} r="2" fill="#986d77"/>
  </svg>
  <div className="map-places">{regions.map((region,i)=><button key={region.id} onClick={()=>travel(region)}><small>{String(i+1).padStart(2,'0')} {visited.includes(region.id)?'· 已走过':''}</small>{region.name}</button>)}</div>
 </nav>;
}
