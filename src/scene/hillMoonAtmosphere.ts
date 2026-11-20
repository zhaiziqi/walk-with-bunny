import { moonClearingField } from './moonClearing';
import { paths } from './gardenAtlas';

/** Shared late-garden washes: quiet paper beneath the birds, cooler pigment by the small door. */
export const hillMoonPalette = {
  hill: [.674, .658, .704], moon: [.488, .566, .688],
  hillStrength: .34, moonStrength: .40,
};
export type HillMoonField = { hill: number; moon: number; calm: number };
const smooth = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

/** Soft finite support leaves the earlier clearings untouched, with no hard colour boundary. */
export function hillMoonField(x: number, y: number): HillMoonField {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { hill: 0, moon: 0, calm: 0 };
  const wash = (cx: number, cy: number, rx: number, ry: number, falloff = 2) => {
    const radius2 = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    return Math.exp(-falloff * radius2) * (1 - smooth((Math.sqrt(radius2) - 1.3) / .5));
  };
  const hill = wash(1000, 6800, 900, 700);
  const moon = wash(-200, 8500, 1050, 800);
  // A slightly wider quiet layer keeps the tiny birds and doorway readable
  // while retaining the underlying broad grass colour and terrain shading.
  const hillQuiet = wash(1000, 6800, 900, 700, 1.25);
  const moonQuiet = wash(-200, 8500, 1050, 800, 1.25);
  const passage = wash(580, 7720, 800, 570);
  return { hill, moon, calm: Math.max(hillQuiet * .66, moonQuiet * .76, passage * .28) };
}

export function hillMoonTint(color: number[], field: HillMoonField) {
  return color.map((value, i) => {
    const hill = value + (hillMoonPalette.hill[i] - value) * field.hill * hillMoonPalette.hillStrength;
    return hill + (hillMoonPalette.moon[i] - hill) * field.moon * hillMoonPalette.moonStrength;
  });
}

/** Only the final clearing receives this restrained blue-grey/sage underpainting. */
export const moonClearingPalette = {
  sage: [.595, .665, .625],
  bank: [.390, .485, .558],
  farBank: [.480, .565, .621],
  shadow: [.365, .445, .530],
  ivory: [.871, .883, .817],
  path: [.820, .818, .715],
  groundStrength: .76,
  bankStrength: .94,
  shadowStrength: .27,
  lightStrength: .32,
};

/** A softly wandering wash edge stays inside the final field, with no hard oval of flat paint. */
export function moonClearingPaintCoverage(x: number, y: number) {
  const coverage = moonClearingField(x, y, 0).coverage;
  const warped = moonClearingField(x + Math.sin(y * .0021) * 145 + Math.sin(x * .0034) * 50,
    y + Math.sin(x * .0018 + y * .0011) * 105, 0).coverage;
  return coverage * (.52 + .48 * warped);
}

/** Broad landform values and one softly broken edge replace the all-over texture. */
export function moonClearingGroundShape(x: number, y: number) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { bank: 0, edge: 0, farBank: 0, threshold: 0 };
  // The near bank turns away from the threshold, leaving a walkable pocket of light.
  // All marks are attached to world coordinates; none follow the camera or visitor.
  const slope = x + 760 - .38 * (y - 8500) - Math.sin((y - 8500) * .003) * 115
    + Math.sin(y * .018 + x * .012) * 12;
  return {
    bank: 1 - smooth((slope + 95) / 170),
    edge: Math.exp(-(((slope + 55) / 44) ** 2)),
    farBank: smooth((y - 8930 + .32 * (x + 200)) / 220),
    threshold: Math.exp(-(((x + 200) / 185) ** 2) - (((y - 8490) / 72) ** 2)),
  };
}

/** The painted crest is crisp; its walkable bank is a broad, gentle shoulder. */
export function moonClearingBankHeight(x: number, y: number) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return 0;
  const slope = x + 760 - .38 * (y - 8500) - Math.sin((y - 8500) * .003) * 115;
  return 80 * (1 - smooth((slope + 310) / 600));
}

const finalPath = paths.find(path => path.id === 'hill-moon')!.points;
export const moonTrailBounds = { minX: -1500, minY: 7200, width: 3100, height: 1400 };
/** A worn strip follows the guide's actual route and ends against the door sill. */
export function moonClearingTrail(x: number, y: number) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || y < 7230 || y > 8580) return 0;
  let nearest = Infinity;
  for (let i = 1; i < finalPath.length; i++) {
    const a = finalPath[i - 1], b = finalPath[i], dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy)));
    nearest = Math.min(nearest, Math.hypot(x - a.x - dx * t, y - a.y - dy * t));
  }
  const edge = Math.sin(x * .021 + y * .017) * 7 + Math.cos(y * .031) * 5;
  const width = 38 + 8 * Math.sin(y * .009);
  return (1 - smooth((nearest + edge - width) / 38)) * smooth((y - 7230) / 260)
    * (1 - smooth((y - 8500) / 80));
}

/** The still clearing has fine paper grain; broken brushwork belongs to the banks. */
export function moonClearingTextureCalm(x: number, y: number) {
  const shape = moonClearingGroundShape(x, y);
  return moonClearingPaintCoverage(x, y) * (.78 - shape.bank * .08 - shape.edge * .14);
}

/** Same authored contours in the perspective shader and reduced-motion renderer. */
export const moonGroundShapeGLSL = `
vec4 sampleMoonGround(vec2 p) {
  float slope = p.x + 760. - .38 * (p.y - 8500.) - sin((p.y - 8500.) * .003) * 115.
    + sin(p.y * .018 + p.x * .012) * 12.;
  float bank = 1. - smoothstep(-95.,75.,slope);
  float edge = exp(-pow((slope + 55.) / 44.,2.));
  float farBank = smoothstep(0.,220.,p.y - 8930. + .32 * (p.x + 200.));
  float threshold = exp(-pow((p.x + 200.) / 185.,2.) - pow((p.y - 8490.) / 72.,2.));
  return vec4(bank,edge,farBank,threshold);
}`;

/** CPU counterpart of the ground shader, also used by the reduced-motion renderer. */
export function moonClearingTint(color: number[], x: number, y: number, phase = 0) {
  const field = moonClearingField(x, y, phase);
  const trail = moonClearingTrail(x, y);
  if (!field.coverage && !trail) return color;
  const shape = moonClearingGroundShape(x, y), palette = moonClearingPalette;
  const paintCoverage = moonClearingPaintCoverage(x, y);
  return color.map((value, i) => {
    const far = palette.sage[i] + (palette.farBank[i] - palette.sage[i]) * shape.farBank * .65;
    const bank = far + (palette.bank[i] - far) * shape.bank * palette.bankStrength;
    const underpaint = value + (bank - value) * paintCoverage * palette.groundStrength;
    const crest = underpaint + [.065, .080, .050][i] * shape.edge * paintCoverage;
    const ground = crest + (palette.path[i] - crest) * trail * .72;
    const shadow = ground + (palette.shadow[i] - ground) * field.shadow * palette.shadowStrength;
    const lit = shadow + (palette.ivory[i] - shadow) * field.light * palette.lightStrength * (1 - shape.bank * .55);
    return lit + (palette.ivory[i] - lit) * shape.threshold * paintCoverage * .13;
  });
}
