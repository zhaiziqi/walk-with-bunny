import type { CSSProperties } from 'react';
import { art } from '../config/art';
import type { ArtKey } from '../config/art';
import type { LoadedArt } from './useAssets';
import type { JourneyPose } from './journey';
import { objects, project, WORLD } from './world';

export function StaticGarden({ images, pose, width, height, bloom, lampOn }: {
  images: LoadedArt; pose: JourneyPose; width: number; height: number; bloom: number; lampOn: boolean;
}) {
  const sprite = (key: ArtKey, x: number, y: number, w: number, h: number, z: number, style: CSSProperties = {}, className = '') => {
    if (!images[key]) return null;
    const p = project(x, y, pose, width, height, z);
    return <img key={`${key}-${x}-${y}`} className={`world-sprite ${className}`} src={art[key]} alt="" draggable={false}
      style={{ left: p.x - w * p.scale / 2, top: p.y - h * p.scale / 2, width: w * p.scale, height: h * p.scale, ...style }}/>;
  };
  return <div className="static-garden dream-static" aria-hidden="true">
    {sprite('environment', 0, 0, WORLD.width, WORLD.height, 0)}
    {!images.environment && <div className="backup-landscape"/>}
    {objects.map(object => <div key={object.id}>
      {sprite('contact', object.x, object.y, object.width * .95, object.width * .2, object.z + .1, {opacity:.7})}
      {object.id === 'lock' && sprite('threshold', object.x - 4, object.y - 17, 130, 70, object.z + .3, {opacity:.7})}
      {sprite(object.art, object.x, object.y + object.height / 2 - object.footInset, object.width, object.height, object.z + 1,
        {filter: object.id === 'puzzle' ? 'sepia(.08) brightness(.92)' : 'brightness(.84) saturate(.85)'}, object.id === 'music' && bloom ? 'static-bloom' : '')}
      {sprite('grass', object.x, object.y + object.width * .045, object.width * .9, object.width * .23, object.z + 3, {opacity:.8,filter:'brightness(.75)'})}
      {lampOn && object.id === 'puzzle' && sprite('glow', object.x, object.y + object.height * .64, object.width * 2, object.width * 2, object.z + 3.5, {opacity:.5})}
    </div>)}
    {sprite('mist', -40, -120, 1500, 450, 42, {opacity:.32})}
    {sprite('foliage', -850, -340, 640, 430, 200)}
    {sprite('foliage', 1000, -546, 512, 344, 170, {transform:'scaleX(-1)'})}
  </div>;
}
