# Pond reflection and underwater night — 2026-11-04

## Visible interaction

Real shoreline travel brings out a cream rabbit-shaped reflection. It follows about half a second behind the visitor, retains momentum when the visitor reverses, and swims onward once after each real stop. Its changing route reveals a broad, soft-edged painted night sky beneath the existing water. The original ripples remain above it and still push the three petals. Leaving fades the reflection and sky; returning can start another encounter without a button or a new task.

This replaces the previous brief rabbit-ear glimpse visually. The old pond discovery/state fields remain compatible; no saved business progress or storage format changes. The reflection is a transient encounter, not a new collectible.

The first browser pass showed that a 148-world-unit reveal brush was still too small. The final version uses a 200-unit brush with a 70-unit core, a larger reflection, and slightly larger sparse stars. The night layer now renders between the painted pond and its waves. Live and reduced-motion renderers use the same model, silhouette and trail. No new image asset, foreground particle field, text prompt or control was introduced.

## Actual desktop evidence

- [Actual full-viewport recording](qa/pond-dream-20261104/pond-dream-actual.gif), [cropped detail](qa/pond-dream-20261104/pond-dream-detail.gif), [final screenshot](qa/pond-dream-20261104/pond-dream-final.jpg).
- Final recording contains 143 real browser captures at 1280 × 720, with native keyboard travel: right along the bank, stop, reverse left, stop. No actor or application-state injection. GIFs sample these captures at their actual wall-clock intervals; the detail is cropped without enlargement. The full recording is reduced to 960 × 540 for display. Neither is an FPS measurement.
- During the first recorded stop, actor displacement was **0** while the reflection traveled **76.09 world units**. Its trail reached the fixed limit of 18 stamps. [Raw frames/state](qa/pond-dream-20261104/final-sequence.json), [capture metrics](qa/pond-dream-20261104/capture-metrics.json).
- [13 accepted browser checks](qa/pond-dream-20261104/browser-checks.json) passed: departure fade and return, map freeze, an actively swimming reflection freezing during reading, reduced-motion snapshot freeze and live restoration, exact restoration of the seven pre-panel actor/camera/heading values, visible independent coasting, finite trail and unchanged puzzle/song/gift state.
- One initial camera comparison used the camera *inside the music panel* as its baseline. That observation is retained but explicitly excluded. The corrected comparison records the garden camera before opening and after closing and passes exactly.
- [Reduced-motion screenshot](qa/pond-dream-20261104/static-final.jpg), [departed pond](qa/pond-dream-20261104/away-final.jpg). Captured browser errors and warnings were empty: [console](qa/pond-dream-20261104/console.json).

Initial `play-*` frames show the smaller first version. Only `final-*`, `static-final.jpg`, `pond-dream-final.jpg` and the two `pond-dream-*.gif` files show the final visual tuning.

## Code validation

80 targeted checks passed:

- `check-pond-dream.mjs`: 14 — actual approach, delay, reversal momentum, independent coast, differing routes, repeat visits, timing guards, pause, teleport, bounded memory, 30/60/120 Hz, and the enlarged silhouette staying inside the shore.
- `check-pond-dream-integration.mjs`: 10 — outer pond state forwards real movement, freezes/resumes correctly, preserves waves/petals and discovery, and stays bounded over four minutes of travel.
- `check-pond-listening.mjs`: 18 — existing shoreline waves, petals and pause behavior.
- `check-pointer-guidance.mjs`: 38 — unchanged continuous pointer-direction controller.

TypeScript and production build pass (140 modules). The existing Three.js bundle-size advisory remains. A mistyped initial test filename (`check-pointer-follow.mjs`) did not run; the actual existing `check-pointer-guidance.mjs` was then run successfully. This was a command correction, not a product test failure.

## Delivery and limits

4198 serves the final root build. The 4197 local desktop package was refreshed; all **52** built files match `dist` by SHA-256 and both local servers return the final index. [Package evidence](qa/pond-dream-20261104/package-evidence.json). The dated pond-dream archive contains the same refreshed package; earlier archives are retained.

Only three existing scene integration files and three new pond files changed. The controller, UI/business files and content are unchanged against the pre-work backup. Business content SHA-256 remains `976aae6cac292789c9c350d99d1264830af0fb6e2ba93cd4cad3a49202d9a84e`. [Source scope](qa/pond-dream-20261104/source-scope.json). Backup: `docs/versions/before-pond-dream-20261104.tar.gz`.

No public deployment or progress reset. Desktop pond interaction was tested, not a fresh complete game playthrough. Physical touchpad feel, mobile, real GPU failure and performance/FPS were not retested. No audio was added.
