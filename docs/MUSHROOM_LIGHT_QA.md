# Mushroom light — 2026-11-04

## Visible change

The nearest mushroom lifts one edge. One warm light leaves the cap, follows a short curved path towards the companion, waits for 0.7 seconds, then returns. Two neighbouring caps answer afterwards, with the smallest last. The existing five illustrations, their planted roots, the companion and the rest of the garden are retained.

The old greeting hid its core behind the cap and reduced the response to 18–22% as soon as the companion moved. It also consumed the first visit at animation start. The new sequence keeps its amplitude during nearby walking and marks the first greeting seen only at its visible peak. Leaving before that peak permits a full greeting on return. After the finite sequence, ordinary passing acknowledgements remain available; idle waiting does not loop the story. Reading freezes the sequence. Reduced motion uses the same state and light pose.

## Evidence

- Production build and TypeScript passed. Existing Three.js chunk-size advisory remains.
- Mushroom regression: 25/25. Pond: 18/18. Hollow/arch: 7/7. Pointer guidance: 38/38.
- Actual browser: 1280 × 720, `http://127.0.0.1:4198/#garden`. Used normal keyboard travel from the pond to the mushrooms, stopped nearby, and captured the automatic first response. No actor-position or application-state injection.
- 11/11 recorded browser observations: one visible light, cap exit and pause, finite return, delayed neighbouring replies, first-visit timing, reading freeze, reduced-motion snapshot and freeze, unchanged actor/camera on mode switching, response maintained during real walking, and no captured errors/warnings.
- Actual recording: [mushroom-peek-actual.gif](qa/mushroom-light-20261104/mushroom-peek-actual.gif). Captured frames and wall-clock timestamps are retained in `qa/mushroom-light-20261104/capture.json`. GIF uses a shared palette and sampled capture intervals; it is not an application FPS measurement.
- Actual stills: [peek](qa/mushroom-light-20261104/peek-040.jpg), [static peek](qa/mushroom-light-20261104/static-peak.jpg).
- Browser data: [assertions](qa/mushroom-light-20261104/assertions.json), [reading/static](qa/mushroom-light-20261104/browser-checks.json), [walking](qa/mushroom-light-20261104/walking-check.json).

The final static-only appearance alignment was built and checked in the browser after the recording. The live animation in the recording matches the final live code. `releases/desktop-preview` was repackaged from the final build; 4198 serves the current root `dist`, 4197 serves the packaged build. Both remain local previews.

## Scope and limits

No changes to movement control, pond behavior, puzzles, songs, gift rules or storage format. Business configuration SHA-256 remains `976aae6cac292789c9c350d99d1264830af0fb6e2ba93cd4cad3a49202d9a84e`. No save reset or public deployment. This round checks desktop visuals and keyboard interaction; it does not claim new physical-touchpad or mobile validation. Source backup: `docs/versions/before-mushroom-light-20261104.tar.gz`.
