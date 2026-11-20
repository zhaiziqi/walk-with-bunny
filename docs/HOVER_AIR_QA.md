# Desktop pointer guidance and living air · 2026-11-01

This report covers the no-press desktop input and environmental motion update. It does not replace the historical route and business-rule reports.

## Implemented

- Ordinary mouse/trackpad pointer motion guides the rabbit after entering. No button press is required. Clicking is reserved for controls and objects; touch/pen retain the hold gesture.
- Initial user testing confirmed no-press movement works, but stopping and turning felt uneven. The final revision adds 180 ms of input grace followed by a 260 ms smooth taper, adaptive pointer smoothing, and a non-zero first animation step. After pointer motion stops, movement expires within 440 ms. Controls, leaving the surface, hiding the tab, and loss of focus cancel immediately.
- Removed the old 75-degree hard stop in locomotion. Ordinary corners retain a stride; a reversal decelerates and turns more quickly at low speed. Actual zero input still stops exactly. Final touchpad feel has not yet been reconfirmed by the user.
- Fixed-world pollen and occasional seeds drift while the rabbit rests. A minority of near motes have a larger soft light core; distant motes remain faint. The entire atlas has 2,418 seeded motes in one point-cloud draw call, not that many visible on screen.
- Tree branches, rooted upper leaves, ground dapples, and slow cloud light share the wind clock. Rabbit passage parts nearby leaves and air. Twenty-four small grass tufts cover the current entrance route without adding large decorative objects.
- Content reading freezes the new air/plant motion. The open map makes the journey surface inert. English copy, existing art, original references, fixed puzzle/song/gift rules, and the static fallback are retained.

## Actual browser evidence

Desktop in-app browser, 1280 × 720, WebGL renderer, local Vite server.

1. Verified the new English hint and accessibility instructions render.
2. Used real keyboard and scroll input to move on the entrance path; read rendered actor/camera attributes. Idle samples remained identical while screenshots changed in tree crowns and ground/air regions.
3. Inspected the air visually. Its initial version was too faint; the final version increases only a minority of near light motes, preserving sparse composition.
4. Opened the music panel, scrolled while reading, activated **Touch the flower**, and closed with **Wander on**. The button displayed its response; position, camera, zoom and heading returned exactly.
5. Opened the map and verified the garden region was removed from the accessible interactive surface. Returning to the visited entrance through the map worked.
6. After the final controller revision, reloaded the page, repeated keyboard walking and the music-panel round trip. Final actor position `(55.735180, -1565.947103)`, camera `(55.395477, -1324.909400)`, zoom `1`, heading `(0, 1)` matched before/after the panel exactly.
7. Fresh final-page console contained no warnings or errors. A new grass-material warning (`map: undefined`) found during integration was fixed before this reload.

Saved evidence:

- `qa/hover-air/06-final-garden.png`: final actual garden screenshot.
- `qa/hover-air/03-music-panel.png`: content panel.
- `qa/hover-air/04-living-path.png` and `05-living-path-later.png`: idle environment frames with unchanged actor/camera state.
- `qa/hover-air/browser-checks.json`: rendered UI state samples; early scroll samples include a still-active impulse and are not all settled endpoints.
- `qa/hover-air/idle-frame-difference.json`: image differences for the two idle frames. This confirms visible change, not aesthetic quality or frame rate.
- `qa/hover-air/final-console.json`: logs since the final reload.

## Code/build checks

- TypeScript and production build passed. The existing Three chunk warning remains: approximately 895 kB before gzip.
- `check-pointer-guidance.mjs`: 13 groups, including no-button input, fresh intent after restoring, control cancellation, micro-stroke continuity, jitter smoothing, deliberate reversal, exact expiry and 30/60/120 Hz consistency.
- `check-living-motion.mjs`: 18 groups, including continuous quarter turns, compact reversal, perspective direction, camera lag, wheel reversal and exact explicit stop.
- `check-rabbit-animation.mjs`: 13 groups covering gait, eight directions, landing, restart and bounded head/body turning.
- `check-garden-air.mjs`: 5 groups covering deterministic fixed-world points, entrance visibility, idle drift/reading clock, local reaction and bounded continuous motion.
- `check-plant-response.mjs`: 5 groups covering the previously missed fern, actual swept contact, fixed roots, frame-independent recovery and first-route coverage.
- `check-first-trail.mjs`: 5 groups covering route extent, ridge clearance, initial framing and fog.
- `check-content.mjs`: English content and fixed birthday rules passed.

## Limits

The available browser automation cannot generate pure no-button pointer movement. It was not replaced with synthetic browser events or scripted scene coordinates. The user confirmed the initial no-press input on their actual device; the later smoothing correction is covered by deterministic checks and ordinary browser regression, with final touchpad feel still awaiting use. No claim of full Wayfinder equivalence is made. The garden remains a finite 2.5D illustration scene. No phone, audio listening, performance benchmark, deployment, or M2–M5 business completion is claimed.
