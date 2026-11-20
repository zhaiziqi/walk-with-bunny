import type { CSSProperties } from 'react';
import { art } from '../config/art';
import type { ArtKey } from '../config/art';
import type { LoadedArt } from './useAssets';
import type { JourneyPose } from './journey';
import { objects, project, RABBIT, backdropFrame, objectVisibility } from './world';

export function StaticGarden({ images, pose, width, height, bloom, lampOn }: {
  images: LoadedArt; pose: JourneyPose; width: number; height: number; bloom: number; lampOn: boolean;
}) {
  const sprite = (key: ArtKey, x: number, y: number, w: number, h: number, z: number, style: CSSProperties = {}, className = '') => {
    if (!images[key]) return null;
    const p = project(x, y, pose, width, height, z);
    return <img key={`${key}-${x}-${y}`} className={`world-sprite ${className}`} src={art[key]} alt="" draggable={false}
      style={{ left: p.x - w * p.scale / 2, top: p.y - h * p.scale / 2, width: w * p.scale, height: h * p.scale, ...style }}/>;
  };
  const backdrop = backdropFrame(pose, width, height);
  return <div className="static-garden dream-static" aria-hidden="true">
    {sprite('environment', backdrop.x, backdrop.y, backdrop.width, backdrop.height, 0)}
    {!images.environment && <div className="backup-landscape"/>}
    {objects.map(object => <div key={object.id} style={{opacity:objectVisibility(object, pose, width, height)}}>
      {sprite('clearing', object.x, object.y - 28, 560, 137, object.z + .05, {opacity:.9})}
      {sprite('contact', object.x, object.y, object.width * .95, object.width * .2, object.z + .1, {opacity:.18})}
      {sprite(object.art, object.x, object.y + object.height / 2 - object.footInset, object.width, object.height, object.z + 1,
        {}, object.id === 'music' && bloom ? 'static-bloom' : '')}
      {sprite('grass', object.x, object.y + object.width * .02, object.width * .55, object.width * .14, object.z + 3, {opacity:.22})}
      {lampOn && object.id === 'puzzle' && sprite('glow', object.x, object.y + object.height * .64, object.width * 2, object.width * 2, object.z + 3.5, {opacity:.35})}
    </div>)}
    {sprite('mist', 160, -80, 1800, 380, 42, {opacity:.1})}
    <div style={{opacity:objectVisibility(RABBIT, pose, width, height)}}>
    {sprite('clearing', RABBIT.x, RABBIT.y - 15, 280, 68, RABBIT.z + .05, {opacity:.7})}
    {sprite('contact', RABBIT.x, RABBIT.y - 1, 95, 14, RABBIT.z + .1, {opacity:.14})}
    {sprite('rabbit', RABBIT.x, RABBIT.y + RABBIT.height / 2 - RABBIT.footInset, RABBIT.width, RABBIT.height, RABBIT.z + 1)}
    </div>
  </div>;
}
