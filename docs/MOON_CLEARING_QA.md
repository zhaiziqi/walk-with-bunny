# Moonlit final clearing — 2026-11-11

## Scope and implementation

Only the final-door environment and the existing guide bird's final gesture changed. The old floating moon disk, separate ground decal/motes and Touch the moonlight button are removed in both renderers. A shared world-space field holds a cloud shadow, which retreats over 2.4 seconds after a real approach. Door and bird receive the same cool shadow tint; the original cream floof remains self-lit. Blue-grey/sage landform values, softened local brush density and two repositioned plants frame the destination.

The existing guide retains its route and waits for the visitor. Its final bow/fold is followed by a 2.7-second departure, making the entire farewell 6.5 seconds. Departure is gated until the cloud has almost cleared. Both systems preserve their snapshot during reading and reduced motion; a renderer remount rebases movement evidence without losing progress or inventing a fresh arrival. Same-session revisits do not replay. Environmental states are session-local as before; reloading may replay a later real arrival.

No business progression, puzzle answers (0305), gift contents, song configuration or pointer-direction controller was changed. User saves and reference assets were retained. No new generated art was used as a background. Existing isolated test walk: `?walk=moon-clearing-20261111#garden`.

## Verified

- TypeScript and production build pass. Existing Three.js bundle-size advisory remains.
- 60 focused checks pass: moon clearing 16, guide route 21, farewell 17, final-door geometry 6.
- Actual 1280×720 desktop WebGL browser: followed the guide from the hill to all seven perches, entered the clearing by native movement, stopped, recorded cloud clearance and full farewell. Final guide opacity=0 and farewellAge=6.5; moon phase=1.
- The existing gift icon opens the four-digit lock; giftUnlocked=false throughout. Opening the panel and pressing movement keys keeps actor and environmental snapshots unchanged. Closing returns to the same actor/camera position.
- Map revisit retains completed light/farewell. Reduced-motion toggle retains completed phase and departed bird, then restores WebGL without replay.
- Browser captured errors/warnings: none. Final delivered module index-DRwaCYf9.js loaded successfully.
- Final preview tab is left at the doorway after a reload: cloud phase=0 and unarmed, ready to respond to a real step. This is an isolated walk, not a reset of the user's original save.

## Actual evidence

[Before/after, identical camera](qa/moon-clearing-20261111/before-after.jpg) — actor(-120,8360), camera(-120,8580), zoom1, 1280×720 in both. Old and new production WebGL screenshots, no repainting.

[Cloud arrival recording](qa/moon-clearing-20261111/cloud-arrival.gif) and [paper-bird farewell recording](qa/moon-clearing-20261111/paper-bird-farewell.gif) are sampled actual browser frames. GIFs use original sampling intervals, resized to800×450, with palette compression and a closing hold; they are not performance recordings. Raw JPGs/timestamps, before/after states and browser checks are in the same evidence directory.

## Limits and remaining visual gap

The approach uses the existing distance fade plus the new cloud shadow. The foreground plant provides depth and leaves the floof clear, but **the stronger physical leaf-over-door reveal discussed in planning is not achieved in the verified approach**. A tested tighter placement covered the floof; the final layout prioritizes a clear walking destination. This remains a concrete composition improvement for another pass, not a completed claim.

The static renderer preserves projection and light state but has simpler texture than WebGL. Mid-animation pause/remount behavior is covered by deterministic tests; browser toggling was checked after completion. Sound was off. This pass did not redo physical trackpad feel, mobile, full puzzle/music/gift completion, broad performance measurement or public deployment. The existing packaged release archive was not updated; root dist and the running4198 preview were updated.
