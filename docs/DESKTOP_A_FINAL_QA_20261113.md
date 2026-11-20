# Approved A — desktop completion check, 2026-11-13

Status: **desktop rehearsal completed**. The approved A composition was retained. No new application changes were needed in this pass; this report and its evidence are the deliverables.

This supersedes the visual scope of the November 12 moon-route report. The bright final-path paint and new blue bank from that iteration are not part of approved A. See `VISUAL_STUDY_QA_20261113.md` for the A adoption and backup.

## Build and automated checks

- Tested the existing built A application at `http://127.0.0.1:4198/`, not the separate comparison site on port 4199.
- The A promotion build and TypeScript check had already passed; the unchanged application was not rebuilt for this rehearsal.
- **310 distinct named cases passed across 23 existing scripts**, all exit code 0. Full names, counts and logs: `qa/desktop-A-final-20261113/automated-checks.json`.
- Coverage includes isolated new walks, puzzle/envelope state, music draws, split gifts, password gating, return positions, navigation, sustained pointer movement and environmental interactions.
- Music/gift progress test harnesses emitted the existing esbuild CommonJS `import.meta` warning. Assertions passed; this is not a browser runtime error.
- No warning or error was captured in either the rehearsal tab or final fresh tab. See `final-preview.json` in the evidence directory.

## Actual browser walkthrough

Evidence: `qa/desktop-A-final-20261113/`. Rehearsal walk: `e80579e5-21a6-40cc-b89f-e700c979f3f7`.

Used real keyboard movement and UI clicks throughout the map. No actor teleportation, controller injection or saved-progress injection was used. This verifies keyboard navigation and UI behaviour, not physical trackpad feel.

Desktop checks used 1280×720 and 1280×800. At capture 17 the browser pane briefly became 319px wide; that image is not desktop layout evidence. Capture 18 repeats the pond inspection at 1280×800. Temporary viewport override was reset before finishing.

1. **Fresh start:** zero questions, no envelope/song/eye mask, locked final gift, actor `(0,-1800)`. Clicked Begin wandering and walked to the lantern. The first flower responded to stopping, then the guide hint changed. Captures 01–05.
2. **Questions:** wrong answer `1` to Python was rejected without adding a digit. Correct `0` survived refresh; question 2 appeared with the remaining digits empty. Solved TCP `3`, XOR `0`, binary `5`. Four solved questions did not automatically store the envelope. Clicked Keep the note; the envelope became stored while the final gift stayed locked. Captures 06–10.
3. **Music:** walked to the flowers. First draw was Secret (6); copying produced `Could you play “Secret” (No. 06) for me?`. Chose another, obtaining Lu Xiao Yu (7). Refresh preserved the second draw and its draw ID. Closed the panel and returned to the exact prior position. Captures 12–15.
4. **Pond:** walked to the south shore and paused; the rabbit reflection appeared in the water. Continued around the shore and exited toward the rest stop. Captures 16–18. The recorded pond state confirms discovery and the reflection encounter.
5. **Orange juice:** cup control appeared after moving to `(341.329805,3887.917222)`. Clicking started the lean/sip sequence, request count 1. Opening the parcel interrupted further observation of the sip; a complete sip cycle is not claimed. The cup deliberately requires close approach (55 world units around its drink spot), whereas the parcel can be opened from farther away. No broken visible control was observed. Captures 19–21.
6. **Midway eye mask:** the wrapped box opened first, then the mask appeared. Its name remained hidden until the rabbit tag was turned over. Final gift remained locked. Closing restored the same actor and camera. Captures 22–24.
7. **Mushrooms:** approaching and pausing engaged the encounter; recorded state includes `performed=true`, ordered response `[0,1,2]`, opening/warmth and the subsequent `mushroom-listened` event. Captures 25–26 are snapshots, not a full animation recording.
8. **Chime:** from `(-767.684070,5305.748024)`, about 345 world units from the arch, the visible prompt worked with both E and click. `atlasPulse` advanced `arch:1` then `arch:2`; response age/angle changed and `noteSerial` became 1. Captures 27–29. Audio was off, so audibility is not claimed.
9. **Guide bird:** approached the hill normally; the leader was met and visibly waited ahead. Walked through the route, reaching perches 1–7. At the door, arrival reached phase 1. After returning from the gift panel, farewell finished (`farewellAge=6.5`, `departureProgress=1`, `departed=true`, opacity 0). Captures 30–33 and 38.
10. **Final lock:** clicked the door icon. `0000` showed Not quite and kept `giftUnlocked=false`. Opened the envelope and read `0 3 0 5`; submitted `0305`, then the passport-holder finale appeared. Only the passport holder appears here; the eye mask is not repeated. Its name stayed behind the rabbit tag until clicked. Captures 34–37.
11. **Refresh and revisit:** completion refresh preserved questions, envelope, second song, eye mask, unlocked final gift and position. Your gift opened the already-opened parcel screen with Open again / Try the code again, rather than silently treating the visitor as a new player. Captures 39–40.
12. **New walk:** used Map → Start a new walk in a new tab. It created a different UUID with every achievement empty, final gift locked, and the entrance visible. The rehearsal's saved record was not erased. Final clean-entry screenshot: `41-clean-entry.jpg`; readback: `final-preview.json`.

## Return-position and layout audit

Independent read-only audit of `browser-evidence.json` compared these entry/return pairs: 04→11, 12→15, 21→24, 33→37. All seven values (actor X/Y, camera X/Y/zoom, heading X/Y) match exactly at six decimal places.

All observed content panels fit the desktop viewport. The eye-mask dialog's `scrollHeight=476` versus `clientHeight=414` is its deliberately overflowing soft background: bottom extension `15% × 414 = 62.1px`, with `overflow:visible`. The close button, rabbit tag and Back to the garden footer were visibly available; no content clipping was observed.

Transient encounters/visited regions reset on full reload; saved business progress and position persist. The temporary static renderer immediately after reload returned to WebGL once assets loaded. These are not recorded as progress loss or persistent rendering failures.

## Preview and limits

**Reusable fresh start:** `http://127.0.0.1:4198/?walk=new#garden`.

Each opening creates a new independent walk and changes the address to that walk's UUID. Refreshing the resulting UUID address resumes it. To demonstrate from the beginning again, use the reusable link or Map → Start a new walk. The local preview server must remain running.

The retained clean tab is `http://127.0.0.1:4198/?walk=bf2aa3bc-2571-4cea-862e-afa2175be7eb#garden`.

No public deployment, mobile acceptance, physical trackpad test, audio listening audit or FPS benchmark is claimed. The nine songs are draw/copy requests for a later performance, not supplied audio recordings. This pass establishes functional desktop flow and observed layout; it is not a new aesthetic approval on the user's behalf.
