## 2026-11-11 — Explicit E actions no longer disappear during settling

Reproduced the visible button's dead period in the production browser: the first click generated `arch:1`, then another click at response age 1.82 seconds generated `arch:2` but only advanced the original response to 2.23 seconds. The old model consumed all new manual pulses throughout its 8.5-second animation, including its almost invisible tail. Separately, the keyboard handler rejected E whenever the advertised encounter button had focus.

Manual actions now re-energize the response during its settling period. The previous angle and angular velocity are carried into the fresh swing through a 0.45-second cubic handover, avoiding a snap to rest. A double-click in the first 0.4 seconds is coalesced while the paper is visibly lifting, so rapid input cannot stall or amplify the motion without bound. Explicit pushes retain full response strength; automatic revisits remain softer. Focused encounter-button E works while Space/Enter remain native button actions and other controls retain their keys.

Validation: 18 chime-listening checks, 10 sound-hook checks, 7 atlas interaction checks, 7 hollow/arch checks, 45 pointer/App checks and production build passed. New tests cover visible response during the former dead period, angle/velocity continuity, repeated input bounds, and E on the actual App button handler.

Actual 1280×720 browser: walked to the arch using ordinary key input; after rebuilding/reloading, clicked the E badge, clicked it again while active, then pressed E with the button focused. Recorded pulses arch:1/2/3, renewed response ages 0.21/0.28/0.04 seconds, full strength, and three eventual note events. All swings settled; no captured warning/error. This verifies click and key activation, not physical speaker output (sound stayed off). Current 4198 build updated. User progress and movement rules retained; mobile and a complete garden run were not repeated.

Evidence: [before fix](qa/chime-replay-20261111/before-fix.json), [real input/animation capture](qa/chime-replay-20261111/capture.json), [after fix](qa/chime-replay-20261111/after-fix.json), [actual cropped recording](qa/chime-replay-20261111/chime-response.gif), [full viewport response](qa/chime-replay-20261111/repeat-response.jpg). The GIF crops real browser screenshots without enlargement, using recorded wall-clock intervals; it is not an FPS measurement.

# Wind chime, pond secret and guide discovery — 2026-11-04

## 2026-11-06 — More forgiving manual wind-chime interaction

- Shared manual/prompt radius increased from 340 to 640 world units. E and the visible button remain available while walking at the arch. The natural approach/pass response keeps its existing distances and ongoing swings are not restarted abruptly.
- 32 focused checks passed: chime listening 15, chime sound 10, atlas interaction 7. TypeScript and production build passed (existing Three.js bundle-size advisory only).
- Actual browser travel on port 4198: no prompt at approximately 732 units; prompt visible and E triggered at approximately 587 units, outside the former 340-unit limit. Response age 0.18 s and paper angle 0.383 rad were recorded.
- A second browser check used wheel movement and E: moving was true before and after the press, the pulse advanced from arch:1 to arch:2, and a new swing started. No browser warnings or errors were captured. Physical touchpad input and speaker output were not retested.
- Evidence: [range screenshot](qa/chime-range-20261106/nearby-E.png), [range data](qa/chime-range-20261106/nearby-E.json), [moving E data](qa/chime-range-20261106/moving-E.json). Root dist/4198 updated; the older release package was not rebuilt.


## Visible changes

The wind chime responds to an actual approach or passage: its paper tag moves first, then the bell follows, with a finite damped swing. The bell's first return schedules one gentle note only when ambient sound is enabled. A revisit is softer. Stationary mounting, map jumps and small jitter do not manufacture an encounter. Existing replay remains optional; no new prompt or task was added.

After approaching the pond and resting for about three seconds, two faint, uneven rabbit ears briefly appear in the light's reflection. Walking dissolves them. A completed glimpse occurs once per session; an interrupted early glimpse can be seen later. Browser inspection found the southern-bank companion obscured the initial reflection, so the shared live/static reflection center now sits 80 world units farther into the water. Shore wave origins remain unchanged.

The user clarified that the missing bird meant the leading paper bird. Two observations were distinguished: in the current completed route it was still perched by the gift door, behind the companion; separately, continuous travel past the hill could miss its old mandatory 0.9-second pause trigger. The guide now also recognizes 0.28 seconds of deliberate forward approach. It flies ahead of an already-moving player, retaining its existing stop, wait, return and farewell behavior. No second follower was added. The guide remains session state; refreshing restarts its encounter state without resetting saved business progress.

## Verification

- TypeScript and production build passed. The existing Three.js bundle-size advisory remains.
- 144 targeted checks passed: chime listening 12, sound integration 10, pond secret 10, existing pond 18, hollow/arch 7, paper guide 21, farewell 14, pointer guidance 38, floof attention 14. The secret tests include the actual southern-bank projection and the guide tests include continuous approach at 30/60/120 Hz.
- Actual browser at 1280 × 720 on `http://127.0.0.1:4198/#garden`, using native keyboard travel and ordinary controls. No actor-position or application-state injection.
- [18 recorded observations](qa/chime-pond-secret-20261104/assertions.json) passed: continuous guide discovery without stopping, paper-before-bell sequencing, finite swing and one note event, reading/static freezes, restoration of the pre-panel position, finite pond reveal, walking interruption and retry eligibility, empty runtime errors/warnings, package hashes and unchanged business configuration.
- The guide first met the continuously walking player at 903 ms in the approach recording, with `moving=true` and `quiet=0`. Wind chime and pond responses were triggered by actual travel, not replay controls. The chime replay was subsequently used for pause/static checks.
- Audio was opt-in in the page; note events and actual hook scheduling were checked. Physical speaker output was not independently recorded or auditioned.

## Actual recordings

- [Guiding bird, continuous approach](qa/chime-pond-secret-20261104/bird-approach-actual.gif); [the earlier completed bird found at the door](qa/chime-pond-secret-20261104/bird-found.jpg).
- [Wind chime, full viewport](qa/chime-pond-secret-20261104/chime-actual.gif); [detail](qa/chime-pond-secret-20261104/chime-detail.gif).
- [Pond secret, full viewport](qa/chime-pond-secret-20261104/pond-secret-actual.gif); [detail](qa/chime-pond-secret-20261104/pond-secret-detail.gif).
- [Guide capture](qa/chime-pond-secret-20261104/bird-approach-capture.json), [chime capture](qa/chime-pond-secret-20261104/chime-capture.json), [final pond capture](qa/chime-pond-secret-20261104/pond-final-capture.json), [chime pause checks](qa/chime-pond-secret-20261104/chime-checks.json), [pond pause/interruption checks](qa/chime-pond-secret-20261104/pond-checks.json).

GIFs use genuine browser frames and their sampled wall-clock intervals. Details crop those same frames without enlargement. These recordings are not FPS measurements. Initial `pond-*.jpg` frames document the occlusion issue; only `pond-final-*` frames show the final reflection placement.

## Delivery and limits

4198 serves the updated root production build. The 4197 local package was refreshed; all 52 built files match `dist`. No public deployment or save reset occurred. Movement controller, puzzles, nine songs, gift rules and storage format are unchanged. Business SHA-256 remains `976aae6cac292789c9c350d99d1264830af0fb6e2ba93cd4cad3a49202d9a84e`.

This round covers these desktop interactions, not a new complete game playthrough. Physical touchpad feel and mobile behavior were not retested. Source backup: `docs/versions/before-chime-pond-secret-20261104.tar.gz`.
