# Moon clearing composition — 2026-11-12

## Delivered scope

The final-door clearing now has an authored blue-grey near bank, a quieter sage centre, a distant shoulder, and a soft ivory threshold wash. The original foliage has been repositioned to frame the view. No new art assets or gameplay steps were added.

The near and far shoulders use the shared terrain height field. Door contact and cast shadows sit on that ground. WebGL and the reduced-motion renderer share the same colour contours and plant coordinates; their rendering detail is intentionally not identical.

The original 2.4-second moonlight response, paper-guide farewell, puzzle code, song collection, gift requirements, and pointer controller were retained.

## Verification

- Production build completed; current main bundle: `index-BFBbLuti.js`, scene bundle: `GardenCanvas-DtnKqrV3.js`. Existing large Three.js chunk advisory remains.
- TypeScript check passed.
- `scripts/check-moon-clearing.mjs`: 16/16 passed.
- `scripts/check-gift-gate.mjs`: 6/6 passed.
- Actual browser keyboard walk: approach, pause, east/west movement, leave, and return. Moon phase reached 1 and did not replay on return.
- A west-side foreground occlusion was found and corrected. At actor (-1043.690265, 8265.933440), the light is now visible above the foreground leaves.
- Clicking the door gift icon still opens the four-digit lock, with the gift locked. Closing it restores all five actor/camera position values exactly.
- Reduced-motion mode retains the current location and completed moon response. Restoring WebGL does not replay it.
- Earlier in this pass, the hill-to-door guide completed its seven perches and farewell. This guide behaviour was not modified by the final composition adjustments.
- Browser console readback after the final walk returned no warnings or errors.
- Preview server returned HTTP 200 at `http://127.0.0.1:4198/`.

## Actual evidence

Directory: `docs/qa/moon-composition-20261112/`.

- `compare-before.jpg` / `compare-after.jpg`: old and final source builds, identical actor/camera position and zoom; both moon phase 0. Saved JSON confirms equality. The old build was temporarily served for capture, then removed from `dist`.
- `01-approach-final.jpg`, `02-pause-accepted.jpg`, `03-leaving-accepted.jpg`, `04-return-accepted.jpg`: final-build walk views.
- `sidepath-clear.jpg`: corrected west-side visibility.
- `static-final.jpg`: final reduced-motion view.
- `moon-walk.gif`: 69 actual browser captures encoded in timestamp order, approximately 14 seconds. This is a sampled demonstration, not a frame-rate measurement.
- `browser-checks.json`: final browser observations.

Intermediate screenshots in the same directory document iteration and are not the delivered appearance.

## Preview and limits

The retained preview tab is at the final door in the isolated walk `moon-composition-20261112`. The tab's current history entry preserves the camera when refreshed. Opening that URL in another tab begins at the entrance; the URL does not encode a door teleport.

This pass did not re-test a physical trackpad, mobile layouts, sound playback, or the complete puzzle/music/gift completion flow. No public deployment was performed. Existing user progress and original reference files were not cleared.

Pre-change source snapshot: `docs/versions/before-moon-composition-20261112.tar.gz`.
