import { content } from './content';
export const art = {
  environment: content.assets.overviewBackground ?? '/assets/garden/dream-garden-v2.webp',
  lantern: content.assets.signalProps ?? '/assets/garden/lantern.webp',
  flower: content.assets.musicFlowers ?? '/assets/garden/flower.webp',
  door: content.assets.giftDoor ?? '/assets/garden/door.webp',
  foliage: content.assets.foregroundPlants ?? '/assets/garden/dream-foreground-v2.webp',
  contact: '/assets/garden/ground-contact.svg',
  grass: '/assets/garden/root-grass.svg',
  threshold: '/assets/garden/threshold.svg',
  mist: '/assets/garden/dream-mist.svg',
  glow: '/assets/garden/dream-glow.svg',
};
export type ArtKey = keyof typeof art;
export const artKeys = Object.keys(art) as ArtKey[];
