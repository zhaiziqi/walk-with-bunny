# Authored trail pigment · 2026-11-02

This records the shared terrain-field implementation and its automated checks. Live visual acceptance belongs to the desktop walkthrough; a passing build does not establish that the path is sufficiently visible or aesthetically finished.

## Change

The active Floof terrain previously painted a diagonal blue bank independently of the atlas paths. At the first flower latitude, the blue band's centre is about 458 world units east of the flower. There was no shared route pigment between the later regions.

- `src/scene/trailField.ts` indexes all 587 existing curve segments in fixed world-space buckets. Seven main paths receive a softly feathered light wash. Five side paths have 0.32 of that strength. Their junctions use a maximum rather than additive brightness.
- `FloofTerrain.tsx` samples the field once while building the terrain mesh, stores it as vertex attributes, and retains fine brush texture in the shader. No path searches occur during WebGL animation frames.
- `FloofStatic.tsx` uses the same indexed sampler on view changes. Its route remains tied to the same ground coordinates and projection; it is still an approximation of the live shader.
- The small clearing under the first flower at `(350, -1110)` receives slightly calmer light and less texture contrast. The field is local and does not change the flower's interaction.
- The existing blue banks, ground palette, terrain heights, vegetation counts, objects, business rules, movement, and discoveries are unchanged.

The wash uses meadow colour, broad feathering, slow pigment variation, and existing paper grain. It introduces no road geometry, arrows, labels, collision, or path-following constraint.

## Verification

`scripts/check-trail-field.mjs`: six groups passed.

- First flower and authored bends receive the route wash; the unrelated blue-bank centre does not become a false route.
- Every sampled point of all seven primary and five secondary paths remains connected. Side paths retain their quieter hierarchy and junctions do not sum into bright discs.
- 2,346 positions, including offsets on both sides of curves, agree with an exhaustive full-atlas segment search.
- Bucket boundaries are continuous; invalid or remote input returns finite, safe values.
- The first-flower texture clearing is local. Each query visits at most 37 of the 587 segments. Sampling all 53,265 terrain vertices took 9.1 ms in one local Node run. This is an informational CPU sample, not a browser FPS measurement.
- After review of actual bend and music-arrival screenshots, the route field also reduces pigment contrast by at most 20% on the main path and 6.4% on secondary paths. It does not change hue, wash brightness, route width, or texture away from the route. The static renderer projects the same field into a softened texture mask. A regression checks this locality/hierarchy and preservation of the first flower's 58% reduction. The follow-up's visual result still needs a new live screenshot; the screenshots motivating it are not evidence of its final appearance.

`sh scripts/project.sh build` passed TypeScript and the production build. The existing Three.js chunk-size warning remains (882.25 kB minified in this build).

No original reference or art files were changed. Desktop screenshot comparison, natural traversal, return, and reduced-motion appearance still require the parent walkthrough; they are not claimed by these tests.
