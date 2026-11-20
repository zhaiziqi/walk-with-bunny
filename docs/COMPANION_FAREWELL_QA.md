# Companion response and paper-bird farewell — 2026-11-04

## Visible changes

When the mushroom light peeks out and pauses near the companion, the furry silhouette gently leans toward its actual position and puffs up, then relaxes as the light returns. The planted foot, actor and camera are not displaced. Starting to walk blends the reply away without taking over control. No additional buttons, text, props or art were added.

The guiding paper bird completes its existing route and lands before the gift door. It waits for the companion to come closer, tilts in acknowledgement, folds its wings, extends the door-side wing and settles. This finite 4.2-second farewell happens once per session. It does not open the gift or change puzzle progress. A browser-discovered boundary case was fixed: when the player stops with the bird less than 2 world units from its final perch and below speed 5, the final landing completes instead of remaining fractionally short forever. Intermediate perches and flight control retain their prior behavior.

Both responses share their session state with the static renderer. Reading pauses them; reduced motion preserves the current pose. Live and static paper-bird wings now use the same stored flight phase, with independently posed wings.

## Verification

- TypeScript and final production build passed. Existing Three.js chunk-size advisory remains.
- Automated checks: floof attention 14/14; actual companion-frame integration 9/9; paper guide 18/18; farewell 14/14; mushrooms 25/25; pointer guidance 38/38. Total: 118 checks across these suites. The final landing regression includes the observed 1.153 and 0.353 world-unit residuals and a >2 no-snap case.
- Actual browser: 1280 × 720 at `http://127.0.0.1:4198/#garden`. Normal keyboard travel reached the mushroom clearing and followed the paper bird through the hill to the gift door. No actor-position or application-state injection.
- [16/16 recorded browser observations](qa/companion-farewell-20261104/assertions.json) passed: finite response, fixed actor, reading freeze and exact return, static snapshots, final landing and waiting, bow and asymmetric wing gesture, planted bird, locked gift, and no farewell replay after leaving and returning. Captured runtime errors and warnings were empty.
- The final bird recording was captured after the landing fix. Orb recordings precede that bird-only fix; the orb implementation in them matches the final build.

## Actual recordings

- [Companion response, full viewport](qa/companion-farewell-20261104/floof-response-actual.gif); [detail](qa/companion-farewell-20261104/floof-response-detail.gif).
- [Paper-bird farewell, full viewport](qa/companion-farewell-20261104/paper-farewell-actual.gif); [detail including the door](qa/companion-farewell-20261104/paper-farewell-detail.gif).
- [Orb capture timestamps and state](qa/companion-farewell-20261104/response-capture.json), [orb pause/static observations](qa/companion-farewell-20261104/response-checks.json), [final bird capture](qa/companion-farewell-20261104/farewell-final-capture.json), [final bird observations](qa/companion-farewell-20261104/bird-final-checks.json).

GIFs use genuine browser frames, a shared palette and sampled wall-clock intervals. Detail versions crop the same frames without enlarging them. These recordings are not application FPS measurements. Earlier diagnostic bird frames are retained separately and are not the final demonstration.

## Delivery and limits

The root production build is served on 4198. `releases/desktop-preview` is refreshed from the final build and served on 4197. Both are local previews; no public deployment or save reset.

Movement controller, puzzle, nine songs, gift rules and storage format are unchanged. Business configuration SHA-256: `976aae6cac292789c9c350d99d1264830af0fb6e2ba93cd4cad3a49202d9a84e`. This round checks desktop visuals and keyboard interaction; physical-touchpad feel and mobile behavior were not newly tested. Source backup: `docs/versions/before-companion-farewell-20261104.tar.gz`.
