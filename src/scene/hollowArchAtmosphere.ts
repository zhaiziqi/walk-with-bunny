/** Local pigment values shared by WebGL and the still-rendered deeper garden. */
export const hollowArchPalette = {
  hollow: [.675, .651, .665], arch: [.540, .606, .700],
  hollowStrength: .30, archStrength: .32,
};
export type HollowArchField = { hollow: number; arch: number; calm: number };
const smooth = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

/** Compact soft washes leave the completed pond and other clearings unchanged. */
export function hollowArchField(x: number, y: number): HollowArchField {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { hollow: 0, arch: 0, calm: 0 };
  const wash = (cx: number, cy: number, rx: number, ry: number) => {
    const radius2 = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    return Math.exp(-2 * radius2) * (1 - smooth((Math.sqrt(radius2) - 1.35) / .5));
  };
  const hollow = wash(1400, 4300, 850, 650);
  const arch = wash(-1100, 5400, 980, 700);
  const turn = wash(190, 4850, 1280, 300);
  return { hollow, arch, calm: Math.max(hollow * .60, arch * .58, turn * .22) };
}

export function hollowArchTint(color: number[], field: HollowArchField) {
  return color.map((value, i) => {
    const hollow = value + (hollowArchPalette.hollow[i] - value) * field.hollow * hollowArchPalette.hollowStrength;
    return hollow + (hollowArchPalette.arch[i] - hollow) * field.arch * hollowArchPalette.archStrength;
  });
}
