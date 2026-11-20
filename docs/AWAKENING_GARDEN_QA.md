# Awakening garden — desktop QA

2026-11-01. Local preview: http://localhost:5173/. This report covers the English, rabbit locomotion and first trail iteration. Historical QA files remain unchanged.

## Implemented

- English throughout `src/` and `index.html`, including hidden labels, configuration copy and placeholder content. Locally hosted Cormorant Garamond, with OFL and source record. It is a stylistic alternative, not a verified copy of Wayfinder's font.
- Original rabbit atlas: four directions × planted / crouch / airborne, aligned from measured alpha bounds at a common pixel scale. Source PNG and two prompts preserved. Runtime WebP is 325,606 bytes. Cream/deep-green alpha inspection shows no rectangular matte.
- Distance-driven gait, contact phase, short frame transitions, turning before travel, slower movement near the pointer, in-place landing. Camera has a free zone and direction lead. Pointer release and keyboard release stop actor/camera coordinates immediately.
- Mouse hold/drag, held arrows/WASD, and wheel requests share one steering integrator. A browser-found wheel reversal bug was fixed by adding the required turn duration before the walking impulse.
- Optional butterfly guide, stopping near a flower opens it, real passage leaves a few petals, and visiting the lantern leaves its light on. State survives reading, returning to the invitation, re-entry, and the reduced-motion renderer within the same loaded page.
- Map only names/revisits visited regions. Region entry is recorded while walking as well as while stopped. Music shortcut remains independent.
- Shared wind clock across trees, grass, flower and guide. Reading freezes environmental motion. Procedural wind/chimes are opt-in via Sound off/on; song-selection content is not used as ambience.
- Static fallback renders the final flower/perch/petal/lantern memories without new event triggers or animation.

## Actual browser checks

In-app browser, 1280 × 720, Vite on port 5173. Native pointer/keyboard/scroll interactions; DOM data attributes were read only for evidence.

1. English invitation rendered with the loaded local font. Entering removes the large heading.
2. Held pointer from the entry moved both axes to (-222.877848, 99.350501). After release, actor and camera coordinates stayed exactly unchanged across subsequent observations.
3. Continuing by mouse reached (-377.990867, 390.930803). A near-pointer 1s hold moved about52world units, versus about390world units on the initial far-pointer 2s hold. The test includes different turns and does not claim a controlled speed benchmark.
4. Stopping near the flower produced `trail-flower-open`. Reaching (-497.593783, 730.986938) produced `trail-lantern-awake`. Real passage and a completed guide perch also appeared in the event set.
5. Opening the signal panel and closing it restored exact actor X/Y, camera X/Y and heading X/Y. Panel stayed readable and the scene remained stable while reading.
6. Actual diagonal drag changed both axes and heading; held Down moved the rabbit back along the route. Key release left `moving=false`.
7. Map showed only entry and lantern after those visits. Returning to the invitation and re-entering preserved the same event list; map return to the visited lantern worked.
8. Reduce motion preserved world coordinates and switched to the static renderer; open flowers, guide perch, petals and lamp state were visible. Switching back kept discoveries.
9. Choose a song opened the English music panel from the path; close restored the exploration location. Full song drawing remains a later milestone.
10. Sound button changed from off to on with no console error. Actual loudness/timbre and hidden-tab suspension were not audibly verified.
11. After the wheel fix, a down-wheel ended at Y646.737481 and a single up-wheel ended at Y585.799824, with `moving=false`. Both directions now advance after turning; see [wheel-fixed.json](qa/awakening-garden/wheel-fixed.json).
12. Final browser warning/error log was empty. Local font load check returned true and `document.documentElement.lang` was `en`.
13. Source scan found no Han characters in `src/` or `index.html`; original handoff/reference files remain unchanged.

Raw observed coordinates: [browser-checks.json](qa/awakening-garden/browser-checks.json). Screenshots in [qa/awakening-garden](qa/awakening-garden/).

## Automated checks

- TypeScript and production build pass.
- Content invariants and English string tree pass.
- 12 motion checks, 8 rabbit animation checks, 7 trail/memory/wind checks and 7 pond-boundary checks pass.
- Additional existing ecology, atlas and projection checks were run by the implementation agent and passed.
- Build still reports the known Three.js chunk-size warning (894.91kB raw /242.81kB gzip). No performance benchmark was run.

## Limits, without overstating completion

The entry-to-lantern centreline is still about1,223world units, roughly5.1seconds at maximum uninterrupted speed. Optional stopping and returning add experiences, but this is not yet a naturally paced60–90second sequence. The current iteration improves the causal chain and movement; it does not claim parity with Wayfinder/Bellwoods or a complete generative ecosystem.

The rabbit has12 painted poses, not a full skeleton or a high-frame-count animation. Switching to static mode can remove up to48world units of visual foot-lock offset while saved actor/camera coordinates remain exact. A full animation/performance audit, all eight areas re-tested with this controller, other browsers, audio listening and mobile validation are not completed in this round. Environmental memories are session-local and reset on a fresh page load. M2–M5 business interactions remain pending; fixed puzzle/music/gift rules are preserved. No deployment was made.

## Final composition adjustment

The screenshot review showed two foreground trees crossing the lantern view. Their anchors were moved outward to (-1080,-90) and (-1330,350), then checked again in the actual browser. The final route images are `02-trail-final.jpg` and `04-lantern-final.jpg`; earlier numbered images remain as intermediate QA evidence. TypeScript and production build passed again after this placement change.
