# Independent sleep-mask cutout — 2026-11-10

## Asset and method

- Workspace asset: `public/art/gifts/sleep-mask-cutout-v2.png`.
- Edit source: `public/art/gifts/sleep-mask-v1.png`, inspected before generation and preserved unchanged.
- Built-in `image_gen` edit with `transparent_background: true`. No CLI fallback, crop, post-processing or source-code changes.
- Original generated file: `/Users/admin/.codex/generated_images/01a1bf88-0077-7613-a370-3bc9c8e62e69/exec-85f7c52c-3d78-41f0-8f88-3a625fc43534.png`.

## Concise prompt

Remove all ivory tissue paper from the existing illustration. Preserve the same single dusty blush pink sleep mask, its gathered elastic strap on both sides, original shape/perspective, padded curves, stitching and watercolor/gouache texture. Isolate on genuine transparent alpha, including the holes inside the strap. Keep the entire object visible with clean transparent margins. Remove any surface, background, external shadow or halo. Add no text, labels, decoration or other objects.

## Inspection and layout

- Actual file: **1754 × 897**, RGBA PNG, **833,306 bytes**.
- Visually checked: no underlying tissue paper; complete mask and both straps remain visible; no added lettering or objects.
- Nonzero-alpha bbox, right/bottom exclusive: **[73, 39, 1692, 859]**. Includes faint generated pixels.
- Practical silhouette at alpha ≥ 16: **[283, 207, 1468, 715]**; at alpha ≥ 64: **[283, 207, 1467, 714]**.
- Practical footprint: about **67.5%** of canvas width, **56.5%** of canvas height; bottom anchor **0.7960** (714 / 897).
- About **74.2%** of pixels are fully transparent. The paper can now be animated as a separate layer underneath this object.
- Full read-only PNG measurements: [sleep-mask-cutout-metadata.json](sleep-mask-cutout-metadata.json).
