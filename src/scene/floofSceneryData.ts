/** Shared world-space layout. Safe to import without the WebGL renderer. */
export type FloofPlant = { x: number; y: number; w: number; h: number; tint: string; small?: boolean; flip?: boolean; paint?: 'blue' | 'sage' };
export const floofPlants: FloofPlant[] = [
  { x: -840, y: -2350, w: 1200, h: 800, tint: '#476b89', paint: 'blue' },
  { x: -540, y: -590, w: 340, h: 245, tint: '#77978d', flip: true },
  { x: -1180, y: 280, w: 540, h: 420, tint: '#587d91', flip: true },
  { x: 440, y: 650, w: 430, h: 300, tint: '#7f9d91' },
  { x: 1550, y: 1750, w: 520, h: 350, tint: '#758d96', flip: true },
  // The same two silhouettes frame the bend; the near bank uncovers the water as we pass.
  { x: -620, y: 3030, w: 390, h: 320, tint: '#77988e' },
  { x: -1760, y: 3210, w: 570, h: 350, tint: '#567989' },
  { x: -160, y: 3450, w: 410, h: 360, tint: '#738e95', flip: true },
  // A lower side bank leaves the hollow's small mushrooms in the open.
  { x: 1990, y: 4220, w: 450, h: 330, tint: '#5d788b' },
  // Staggered near/far silhouettes reveal the arch around the eastern turn.
  // Both remain clear of the primary path and the returning western side path.
  { x: -1740, y: 5350, w: 450, h: 330, tint: '#627b92', flip: true },
  { x: -300, y: 5180, w: 390, h: 285, tint: '#8296a1' },
  // Small birds get an open hilltop; the eastern bank sits outside the returning path.
  { x: 1740, y: 6740, w: 440, h: 310, tint: '#697e99' },
  // Small original silhouettes frame the final clearing.
  { x: -1090, y: 8430, w: 480, h: 340, tint: '#576e91', paint: 'blue', flip: true },
  { x: 510, y: 8810, w: 360, h: 250, tint: '#8091a8' },
  // Grounded small strokes form occasional clusters; they do not border the entire route.
  { x: 170, y: -2020, w: 64, h: 28, tint: '#94a98a', small: true },
  { x: 660, y: -1510, w: 85, h: 38, tint: '#9aad8b', small: true, flip: true },
  { x: 290, y: -1180, w: 55, h: 27, tint: '#95a581', small: true },
  { x: -150, y: -730, w: 68, h: 28, tint: '#91a68d', small: true },
  { x: -425, y: -130, w: 79, h: 31, tint: '#9aaf95', small: true, flip: true },
  { x: -840, y: 480, w: 58, h: 27, tint: '#97ad90', small: true },
];
