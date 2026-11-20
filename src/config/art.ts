import { content } from './content';
export const art = {
  environment: content.assets.overviewBackground ?? '/assets/garden/quiet-garden.webp',
  lantern: content.assets.signalProps ?? '/assets/garden/quiet-lantern.webp',
  flower: content.assets.musicFlowers ?? '/assets/garden/quiet-flower.webp',
  door: content.assets.giftDoor ?? '/assets/garden/quiet-door.webp',
  rabbit: '/assets/garden/quiet-rabbit.webp',
  rabbitBack: '/assets/garden/living-rabbit-back.webp',
  rabbitAtlas: '/assets/garden/rabbit-atlas-v2.webp',
  rabbitDiagonalAtlas: '/assets/garden/rabbit-diagonal-v1.webp',
  meadow: '/assets/garden/walk-meadow-v2.webp',
  meadowFrame: '/assets/garden/meadow-frame-v1.png',
  tree: '/assets/garden/walk-tree.webp',
  willow: '/assets/garden/atlas-willow.webp',
  blossom: '/assets/garden/atlas-blossom.webp',
  fern: '/assets/garden/atlas-fern.webp',
  arch: '/assets/garden/atlas-arch.webp',
  clearing: '/assets/garden/quiet-clearing.svg',
  contact: '/assets/garden/ground-contact.svg',
  grass: '/assets/garden/root-grass.svg',
  mist: '/assets/garden/dream-mist.svg',
  glow: '/assets/garden/dream-glow.svg',
  pondPaint: '/art/floof/pond-painting-v1.png',
  mushroomPaint: '/art/floof/mushroom-painting-v1.png',
  archPaint: '/art/floof/arch-painting-v1.png',
  doorPaint: '/art/floof/gift-door-painting-v1.png',
};
export type ArtKey = keyof typeof art;
export const artKeys = Object.keys(art) as ArtKey[];
