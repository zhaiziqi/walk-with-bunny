import type { CSSProperties } from 'react';
import { art } from '../config/art';
import type { ArtKey } from '../config/art';
import type { LoadedArt } from './useAssets';
import type { JourneyPose } from './journey';
import { objects, project, RABBIT, backdropFrame, objectVisibility } from './world';
import type { Place } from './world';
import type { MeadowPoint } from './meadowMotion';
import { meadowWidth, meadowHeight, trees } from './meadowWorld';

export function StaticGarden({ images, pose, width, height, bloom, lampOn, entered, actor, heading, discovered }: {
  images: LoadedArt; pose: JourneyPose; width: number; height: number; bloom: number; lampOn: boolean; entered:boolean;actor:MeadowPoint;heading:MeadowPoint;discovered:Place[];
}) {
  const sprite = (key: ArtKey, x: number, y: number, w: number, h: number, z: number, style: CSSProperties = {}, className = '') => {
    if (!images[key]) return null;
    const p = project(x, y, pose, width, height, z);
    return <img key={`${key}-${x}-${y}`} className={`world-sprite ${className}`} src={art[key]} alt="" draggable={false}
      style={{ left: p.x - w * p.scale / 2, top: p.y - h * p.scale / 2, width: w * p.scale, height: h * p.scale, zIndex:Math.round(5000-y), ...style }}/>;
  };
  const backdrop = backdropFrame(pose, width, height);
  const rabbitAnchor=entered?{...RABBIT,...actor}:RABBIT;
  return <div className="static-garden dream-static" aria-hidden="true">
    {sprite('environment', backdrop.x, backdrop.y, backdrop.width, backdrop.height, 0,{zIndex:0})}
    {entered&&sprite('meadow',0,0,meadowWidth,meadowHeight,.2,{zIndex:1,opacity:.94})}
    {entered&&trees.map((item,i)=><div key={i}>
      {sprite('contact',item.x,item.y,item.width*.75,32,8,{opacity:.15,zIndex:15})}
      {sprite('tree',item.x,item.y+item.height*(.5-.032552),item.width,item.height,8,{opacity:.9,zIndex:Math.round(5000-item.y)})}
    </div>)}
    {!images.environment && <div className="backup-landscape"/>}
    {objects.map(object => <div key={object.id} style={{opacity:objectVisibility(object, pose, width, height)}}>
      {sprite('clearing', object.x, object.y - 28, 560, 137, object.z + .05, {opacity:.9,zIndex:20})}
      {sprite('contact', object.x, object.y, object.width * .95, object.width * .2, object.z + .1, {opacity:.18,zIndex:20})}
      {sprite(object.art, object.x, object.y + object.height / 2 - object.footInset, object.width, object.height, object.z + 1,
        {zIndex:Math.round(5000-object.y)}, object.id === 'music' && bloom ? 'static-bloom' : '')}
      {sprite('grass', object.x, object.y + object.width * .02, object.width * .55, object.width * .14, object.z + 3, {opacity:.22,zIndex:Math.round(5001-object.y)})}
      {(lampOn||discovered.includes('puzzle')) && object.id === 'puzzle' && sprite('glow', object.x, object.y + object.height * .64, object.width * 2, object.width * 2, object.z + 3.5, {opacity:lampOn?.35:.18,zIndex:Math.round(5002-object.y)})}
      {entered&&discovered.includes(object.id)&&[-100,100].map((x,i)=>sprite('flower',object.x+x,object.y+5,34,51,object.z+1,{zIndex:Math.round(5010-object.y+i)}))}
    </div>)}
    {sprite('mist', 160, -80, 1800, 380, 42, {opacity:.08,zIndex:9500})}
    <div style={{opacity:objectVisibility(rabbitAnchor, pose, width, height)}}>
    {!entered&&sprite('clearing', rabbitAnchor.x, rabbitAnchor.y - 15, 280, 68, RABBIT.z + .05, {opacity:.7,zIndex:20})}
    {sprite('contact', rabbitAnchor.x, rabbitAnchor.y - 1, 95, 14, RABBIT.z + .1, {opacity:.19,zIndex:20})}
    {sprite('rabbit', rabbitAnchor.x, rabbitAnchor.y + RABBIT.height / 2 - RABBIT.footInset, RABBIT.width, RABBIT.height, RABBIT.z + 1,{zIndex:Math.round(5000-rabbitAnchor.y),transform:entered&&heading.x>.12?'scaleX(-1)':undefined})}
    </div>
  </div>;
}
