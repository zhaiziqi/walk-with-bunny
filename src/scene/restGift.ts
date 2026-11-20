import { orangeRest } from './orangeRest';
import { BILLBOARD_TILT, depthProject, terrainHeight } from './depthWorld';
import type { JourneyPose } from './journey';

/** The route always shows a closed box; the contents belong only to its reveal. */
export const restGift = {
  x: 120, y: 63, width: 132, height: 88, foot: .847, radius: 350,
  wrappedArt: '/art/gifts/rest-gift-box-v1.png',
  openedArt: '/art/gifts/sleep-mask-v1.png',
  revealArt: '/art/gifts/dream-mask-v1.png',
  dreamBaseArt: '/art/gifts/dream-box-base-v1.png',
  dreamLidArt: '/art/gifts/dream-box-lid-v1.png',
} as const;
export const restGiftPlace = { x: orangeRest.x + restGift.x, y: orangeRest.y };
export const restGiftHome: JourneyPose = { x: orangeRest.x, y: orangeRest.y + 220, zoom: 1 };
export function restGiftAvailable(actor: {x: number; y: number}) {
  return Number.isFinite(actor.x) && Number.isFinite(actor.y)
    && Math.hypot(actor.x-restGiftPlace.x,actor.y-restGiftPlace.y) < restGift.radius;
}
export function restGiftArtwork() {
  return {width: restGift.width,height: restGift.height,foot: restGift.foot};
}
export function restGiftProjection(pose: JourneyPose, width: number, height: number) {
  const art=restGiftArtwork();
  const h = restGift.y + art.height*(art.foot-.5);
  return depthProject(restGiftPlace.x, orangeRest.y + h*Math.cos(BILLBOARD_TILT), pose, width, height,
    terrainHeight(orangeRest.x, orangeRest.y) + 3 + h*Math.sin(BILLBOARD_TILT));
}
