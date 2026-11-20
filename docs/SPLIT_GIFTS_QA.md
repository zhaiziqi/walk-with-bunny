# Gifts along the route — updated 2026-11-10

## Closed gift box correction — 2026-11-10

The user's correction supersedes the original cloth parcel and exposed-on-return mask below. The stool now always carries a small **closed paper gift box**, including when `sleepMaskFound` is already saved. Clicking the world box opens its close-up; clicking the box lifts its painted lid over 900 ms, then reveals the mask. No visible instruction or item name was added; the optional rabbit paper tag still hides the name.

`RestGift` now keeps `wrapped / opening / revealed` as presentation state for each visit, independently of saved discovery. Only a completed opening records a first discovery. Closing during the animation cancels it without granting a new discovery; reduced motion reveals immediately after the explicit click. Reloads, re-entry and cross-tab saved updates cannot reveal the contents automatically. Both scene renderers use only the closed-box texture and fixed geometry. The optional stop, final 0305 lock and passport holder remain independent.

The new built-in imagegen asset is `public/art/gifts/rest-gift-box-v1.png`; old assets remain. [Prompt and production record](qa/rest-gift-box-20261110/art.md). The close-up clips the same painting along the lid seam, rather than replacing it with a different illustration during opening.

Validation: production build and 40 focused checks passed (split UI 13, entry 7, trail gift state 9, orange rest 11). Actual desktop browser checks covered an already-discovered save, keyboard opening, exact seven-field position/heading return, reduced-motion opening, cancellation before discovery, discovery persistence and closed-box refresh. Both live and still world views were inspected; console warnings/errors were empty. [Browser observations](qa/rest-gift-box-20261110/browser-checks.json).

- [Closed box close-up](qa/rest-gift-box-20261110/01-closed-box.png)
- [Mask after opening](qa/rest-gift-box-20261110/02-revealed-mask.png)
- [Lid opening](qa/rest-gift-box-20261110/03-opening.png)
- [Box still on the stool after discovery](qa/rest-gift-box-20261110/04-stool-box.png)
- [Still-renderer parity](qa/rest-gift-box-20261110/05-still-scene.png)

Root dist and the running 4198 preview are updated. Isolated 4199 QA was shut down; existing user saves were not reset. This round did not repeat a full garden walk, physical-trackpad testing, mobile checks or public deployment. The older release package remains unchanged.

## Original split-gift implementation — 2026-11-09

## Agreed arrangement

The sleep mask is an optional midway discovery at the existing orange-juice rest stop after the pond, before the hollow. A cloth parcel sits on the small stool. Clicking it opens a quiet parcel view; explicitly untying it reveals only the sleep mask. Its name remains behind the rabbit paper tag. There is no gift number or announcement of another gift.

The final password parcel now contains only the passport holder. The original four questions still produce 0305, and the final lock still requires the correct code. Missing the optional midway parcel does not block any later step. Both gifts can be viewed again.

## Implementation

- `sleepMaskFound` is an independent, monotonic v2 saved flag. Existing saves without the field default to false, even if the final gift was previously unlocked. Cross-tab rebase, failed writes and preview isolation preserve the new discovery.
- `#rest` uses the existing App panel/history/focus/return controller. Looking at the still-wrapped parcel does not record a discovery. Explicit unwrapping saves before the short presentation transition; closing early cannot leave a delayed state write.
- The live and still renderers share parcel placement and artwork size. The opened mask replaces the parcel on the stool, without changing the glass/sipping interaction or the movement controller. The target is available within 350 world units and remains keyboard focusable when nearby.
- Three separate transparent watercolor assets were generated with the built-in imagegen tool from the existing art direction: `public/art/gifts/rest-parcel-v1.png`, `sleep-mask-v1.png`, `passport-holder-v1.png`. Original artwork and reference files remain. These are illustrative representations, not product photographs.

## Verification

116 focused checks passed: trail gift state 9; cross-tab 17; gift progress 13; gift geometry 6; gift entry 7; orange rest 11; puzzle 18; music 15; temporary preview 12; split-gift UI 8. TypeScript and production build passed. Existing nonfatal test-harness import.meta and Three.js bundle-size advisories remain.

11 actual desktop-browser observations passed, using UI travel, clicks, keyboard, reload and the reduced-motion control; no actor-position or app-state injection. [Recorded assertions](qa/split-gifts-20261109/browser-checks.json) cover independent discovery, hidden-name flip, seven-field exact return, reload, still-renderer target, direct gift URL guard, wrong code rejection, optional-stop independence, passport-only final reveal and empty runtime errors/warnings. Final-lock checks used isolated localhost port 4199 so they did not unlock the normal 4198 preview.

- [Parcel on the route](qa/split-gifts-20261109/01-rest-stop.png)
- [Wrapped parcel](qa/split-gifts-20261109/02-wrapped.png)
- [Midway sleep mask](qa/split-gifts-20261109/03-sleep-mask.png)
- [Returned to the same place](qa/split-gifts-20261109/04-opened-at-rest.png)
- [Reduced-motion scene](qa/split-gifts-20261109/05-static-rest.png)
- [Final passport holder](qa/split-gifts-20261109/06-final-passport.png)

## Delivery and limits

Root dist and http://127.0.0.1:4198/ are updated. The older release directory was not rebuilt; no public deployment. This round tested the changed flow and related regressions, not a fresh end-to-end four-question/music playthrough. Physical trackpad, mobile layout and speaker output were not re-tested. Existing nine songs, original questions, final code, orange sipping, route layout and continuous-pointer movement are preserved.
