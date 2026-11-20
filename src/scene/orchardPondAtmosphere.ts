/** Local pigment values, shared by the animated meadow and its still rendering. */
export const orchardPondPalette = {
  orchard: [.735, .730, .668], pond: [.555, .660, .657], warmth: .32, coolness: .30,
};
export type OrchardPondField = { warm: number; cool: number; calm: number };
export function orchardPondField(x: number, y: number): OrchardPondField {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { warm: 0, cool: 0, calm: 0 };
  const wash = (cx: number, cy: number, rx: number, ry: number) => Math.exp(-2 * (((x-cx)/rx)**2 + ((y-cy)/ry)**2));
  const warm = wash(900, 2100, 780, 650), cool = wash(-1050, 3090, 1000, 760);
  const passage = wash(-10, 2650, 1180, 460);
  return { warm, cool, calm: Math.max(warm * .58, cool * .62, passage * .28) };
}
export function orchardPondTint(color: number[], field: OrchardPondField) {
  return color.map((value, i) => {
    const warm = value + (orchardPondPalette.orchard[i] - value) * field.warm * orchardPondPalette.warmth;
    return warm + (orchardPondPalette.pond[i] - warm) * field.cool * orchardPondPalette.coolness;
  });
}
