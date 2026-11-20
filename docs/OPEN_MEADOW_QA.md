# Open meadow · desktop M1 · 2026-11-01

This report records the open-meadow revision and its current acceptance boundary. Original handoff files, reference images/video, historical screenshots, and birthday rules are preserved. This is still a finite eight-region garden; no M2–M5 completion, mobile acceptance, deployment, or full Wayfinder equivalence is claimed.

## Direction and implemented visual changes

- Keep all eight regions and twelve connecting paths. Reduce the shared rendered layout to **12 trees and 57 low plants**. The low-plant count refers to `gardenShrubs`; the existing 24 small responsive entrance tufts are separate. These are atlas totals, not objects visible in every frame.
- Let open slopes, stretches of quiet ground, a distant silhouette, and the next bend separate discoveries. Give each view a clear subject; preserve lantern, pink flower, small door, and their original interactions. Richness should come from travel and environmental response rather than filling each screen.
- Retain the watercolor assets, bright entrance progressing toward dusk, terrain depth, common wind, drifting air, rooted leaf response, and existing discoveries. This revision changes placement and framing without replacing the established art with new reference-site assets.
- Trees fade across the last 950 world units before the 3,500-unit forward limit. Static tree images and their shadows use the same horizon envelope and side/rear culling, so the fallback does not restore distant clutter.
- Preserve the previous dense world layout in `docs/versions/tree-dense-20261101/`. The recorded old fern contact case remains an explicit regression fixture even though that plant has been removed from the current composition.

The implementation counts above were read from the current exported `depthTrees`, `gardenShrubs`, `regions`, and `paths`. They establish scope, not visual acceptance.

## Reference principles

The sources below inform design decisions. The application to this birthday garden is our interpretation, not a claim that the references prescribe this exact layout or interaction.

| Source | Principle supported by the source | Application here |
| --- | --- | --- |
| [NFB — Wayfinder](https://collection.nfb.ca/interactive/wayfinder) | Exploration creates a cause-and-effect relationship with the landscape: discoveries reveal poetry and bring nearby plants and animals to life. | Preserve small optional discoveries and visible local consequences. A pause, a passing rabbit, or a return can change a place; a dense background alone does not supply this relationship. |
| [Communication Arts — Wayfinder, responses by creator Matt DesLauriers](https://www.commarts.com/webpicks/wayfinder) | Illustration, composition, procedural assembly, and fluid motion are designed as one coherent experience. | Review the rabbit, camera, foliage, terrain, and spacing together. Keep authored landmarks and visual pauses; do not treat additional decorative assets as a substitute for coordinated motion. |
| [Matt DesLauriers — Bellwoods](https://mattdesl.svbtle.com/bellwoods) | The creator describes damped camera movement over rolling terrain, subtle wind and contact responses, and removing nonessential elements to create an emotional experience. | Prioritize continuous, gentle control and responsive surroundings. Keep the meadow spacious, the UI brief, and individual reactions legible. |

Source review on 2026-11-01: the creator interview and Bellwoods article were read directly. The NFB page timed out on direct retrieval; its indexed official-page text and the user's supplied description supported the principle above. No reference artwork or code was copied into this revision. In particular, the Bellwoods article identifies its source as available for educational reading rather than reuse.

## Direct pointer start — repaired timing, feel still under review

Desired desktop behavior: moving the mouse or trackpad pointer directly over the garden dismisses the introduction and guides the rabbit. The user should not have to click **Follow the rabbit** first or keep the button pressed. The optional entry button remains available; clicks on objects and controls retain their normal function.

The first actual user result was: the title dismisses, but the rabbit does not walk. After the timing repair below, the user confirmed **the rabbit can walk, but movement is intermittent**. Basic no-press movement now works on their device. A subsequent patch removes cancellation while passing over world-object hitboxes (click still stops and opens), and changes the grace/fade to 300 + 260 ms. Continuous trackpad feel after this final patch is not yet accepted.

The actual hook was reproduced in a mocked lifecycle host: an event sampled at 116 ms is followed by a callback executing at 120 ms whose rendering timestamp is 112 ms. Previously the fresh intent was cleared on its first frame. Input expiry and movement integration now share `performance.now()`. The regression failed before the patch and passes afterward, including continuous zero-button events, movement, exact rest, and a mousemove-only stream. This is a deterministic event-sequence regression, not automated physical trackpad input.

## Current browser evidence

| Check | Current result / evidence |
| --- | --- |
| Browser, viewport, renderer, tested revision | In-app Chromium, 1280×720, WebGL; open-meadow layout with the timing repair |
| Move an unpressed pointer from the introduction; title dismisses and actor coordinates change | User confirms movement after timing repair, but reports intermittent walking; final feel remains pending |
| Continue through a bend using horizontal, vertical, and diagonal pointer movement | Genuine unpressed pointer simulation is unavailable in the browser tool. Actual horizontal and vertical walking checked with keyboard input; this does not verify hover feel |
| Stop moving the pointer; rabbit settles and holds position | Pointer expiry checked in the actual-hook regression. Browser keyboard release showed `moving=false` and stationary coordinates |
| Resume, turn back, and naturally return along the route | Keyboard walking reached the bend then signal garden, reversed from y=736.417 to y=524.577. Full natural return to the entrance was not rerun in this revision |
| Open content, interact, close, and restore the prior view without unintended movement | Passed at signal garden. Actor (-633.244600, 524.577426), camera (-633.563892, 758.172853), heading and zoom all restored exactly; wheel input during reading did not move actor |
| Idle scenery continues moving while actor/camera remain still | Actor remained (0, -1800), camera (0, -1580), moving=false across entry idle captures. Images differ over y=127–720 (mean RGB difference ~1.16/255), consistent with visible canopy/air/ground motion; this is not a frame-rate benchmark |
| Compare entrance, first bend, and signal garden composition | Captured actual walkthrough. Open foreground, separated silhouettes, continuous path; no cropped gift door at these stops |
| Static fallback retains sparse composition and horizon fade | Toggled Reduce motion at signal garden. Same sparse tree positions, fading silhouettes and contact shadows; scene is intentionally simpler and flatter than WebGL. Saved 05-static-signal.png, then restored WebGL |
| Final console and build checks | No warning/error entries in checked browser tab. Production build passes; existing Three chunk size warning remains (894.95 kB minified) |

If the available browser automation cannot produce genuine unpressed pointer movement, record that limitation and the separate device result. Keyboard or scroll success must not be reported as verification of the direct-pointer fix.

## Actual screenshot files

| View | Path | Capture status |
| --- | --- | --- |
| Open entrance | `docs/qa/open-meadow/01-open-entry.png` | Saved, 1280×720 |
| First bend / during exploration | `docs/qa/open-meadow/02-first-bend.png` | Saved, 1280×720 |
| Signal garden / destination | `docs/qa/open-meadow/03-signal-garden.png` | Saved, 1280×720 |
| Signal content panel | `docs/qa/open-meadow/04-signal-panel.png` | Saved, 1280×720 |

Screenshots can establish the displayed composition but do not prove movement, stopping, or return. Keep those observations in the browser-evidence table with the tested revision. Historical screenshots remain historical evidence.

## Final code checks

- `sh scripts/project.sh build`: TypeScript and Vite production build pass. Existing large Three chunk warning remains; no bundle-size change is claimed.
- `scripts/check-pointer-guidance.mjs`: 20 groups pass after the final input changes. Includes zero movementX/Y, real hook callback/event clock skew, passing over world objects, click-to-stop, 300 ms short-stroke gaps maintaining >99% intent and >90% walking speed, and exact stop by 560 ms.
- `scripts/check-living-motion.mjs`: 18 groups pass after the clock repair (not changed by the final input buffer patch).
- `scripts/check-plant-response.mjs`: 5 groups pass; the removed fern's historical geometry is a fixed fixture.
- `scripts/check-depth-world.mjs`: 7 groups pass / 144 projected points compared with Three.
- `scripts/check-first-trail.mjs`: 5 groups pass; entrance criterion checks sparse framing rather than requiring groves.
- `scripts/check-garden-atlas.mjs`: 9 groups pass; eight regions and twelve paths retained; density guard now prevents renewed crowding.
- `scripts/check-content.mjs`: fixed rules and English content pass.

Commands use the bundled Node via the project launcher or its absolute runtime path. Actual walkthrough snapshots are in `docs/qa/open-meadow/walkthrough.json`. A brief isolated key press at invitation entry produced negligible motion during scene startup; the subsequent 3.5-second key press and route traversal produced clear movement. This evidence is retained rather than presented as a pure-hover success.

A read-only performance audit found per-frame React scene reconciliation and a 240,000-triangle ground mesh at DPR up to 1.7. These are possible optimization targets, not demonstrated causes of the reported input pauses; no unmeasured performance improvement is claimed.

Audio listening, frame-rate benchmarking, mobile checks, and deployment are outside this revision's recorded acceptance. Overall visual quality and final trackpad feel remain subject to user review.
