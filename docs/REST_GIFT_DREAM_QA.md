## 2026-11-11 — Compact, feathered composition

Replaced the large opaque rectangular gift panel with a 700-pixel desktop composition and a feathered painted wash that blends into the garden. Removed unused upper stage space, reduced the floof relative to the box, tilted the mask slightly, and attached the rabbit tag visually to the box corner. The warm ground glow now reaches zero alpha before its element edges, removing the clipped horizontal band. Artwork, finite opening sequence and gift progression rules are unchanged.

Validation: 19/19 split-gift checks, 7/7 final gift-entry checks and production build passed. Actual 1280×720 desktop checks covered the world gift-box entry, mouse opening, the revealed composition, mouse and Tab/Enter tag flipping, all 23 motes fading to zero, and exact return of seven actor/camera/heading values. Captured warnings/errors were empty. Final dialog layout bounds are 700×414 at (290,153), with no visible rectangular card background. Saved user progress was not reset.

Actual screenshots: [closed box](qa/rest-gift-composition-20261111/01-wrapped.jpg), [opening light](qa/rest-gift-composition-20261111/02-opening-light.jpg), [revealed](qa/rest-gift-composition-20261111/03-revealed.jpg). [Browser observations](qa/rest-gift-composition-20261111/browser-checks.json). The `frames/` capture is only an opening excerpt (320–3305 ms), not a complete recording; the revealed screenshot was taken after completion.

This was a visual refinement and focused desktop interaction check. Mobile, hardware input feel, reduced-motion browser behavior and the full garden route were not rechecked in this pass. The existing behavior tests still cover reduced motion and cancellation. Port 4198 serves the new build; release archive and public hosting remain unchanged. The older screenshots below document the superseded large panel.

# Dream-light sleep-mask reveal · 2026-11-10

Implemented the approved [three-frame concept](design/gift-reveal-concepts-20261110/dream-light-storyboard-v2.png) as a continuous desktop interaction, not a sequence of replacement screenshots.

## Result

The midway gift uses a slate-blue/sage painted stage, an ivory box and a simplified rose mask. Click the closed box (or use Enter/Space): the lid lifts and travels behind the box, a finite stream of 23 warm light marks rises from inside, then the mask becomes visible as the glow subsides. Only two marks are star-shaped; light fades rather than looping. The box base stays fixed and its front wall occludes the contents. The existing garden floof is reused, with a brief lean and warm illumination. The rabbit paper tag remains optional and hides the gift name until flipped.

The full reveal completes in 5.2 seconds. Clicking cannot retrigger it. Completion records only the independent sleep-mask discovery; puzzle, envelope, music draw and final 0305 lock remain unchanged. Closing early cancels completion. Every revisit starts closed, including saved discoveries. Reduced motion waits for the click, then displays the final composition immediately with no particle animation.

A real revisit check caught a transient first paint where the lid appeared before the box body. Both visible painted layers now have to load before the whole stage fades in and opening becomes available; image failure enables the existing fallback. No new storage keys or progress resets were added.

## Artwork

Four new images were made with the built-in imagegen tool. Original/reference assets remain intact. Box body, lid and mask have genuine alpha and independent positioning; the ground is opaque. The concept's ocean/beam references informed spacious color fields and local illumination. The implementation uses the existing faceless floof artwork rather than adding a new rabbit character.

- [Box art prompts and source records](design/gift-reveal-concepts-20261110/production-box-art.md)
- [Mask and ground prompts](design/gift-reveal-concepts-20261110/production-mask-ground-art.md)
- Files: `public/art/gifts/dream-box-base-v1.png`, `dream-box-lid-v1.png`, `dream-mask-v1.png`, `dream-ground-v1.png`.

## Checks

- 19/19 split-gift component/lifecycle checks passed. Includes both load orders, duplicate load events, pre-load activation protection, fallback assets, delayed discovery, repeated clicks, early exit, reduced motion before and during opening, saved revisits, cross-tab discovery updates, hidden names, focus availability, and no leftover completion timer.
- 7/7 final gift-entry checks passed.
- TypeScript and Vite production build passed. Existing Three chunk-size advisory remains.
- Actual IAB desktop, 1280 × 720, production port 4198, independent new-walk saves: mouse opening, Enter opening, full animation, Tab/Enter paper-tag reveal, seven actor/camera/heading fields identical after return, early close at 753 ms and no discovery over 52 seconds later, static mode's immediate visible result, and closed re-entry with normal motion restored. Reduced-mode discovery left 0 questions, no envelope, no song draw and final gift locked.
- Final panel bounds were 900 × 620.76 at (190, 49.62), without scroll overflow. Painted images loaded. Captured console warnings/errors were empty.

## Actual browser evidence

- [Opening GIF](qa/rest-gift-dream-20261110/opening.gif): encoded from real browser screenshots and recorded intervals, 960 × 540. The source frames are in `final/` and timing metadata is in `recording-final.json`.
- [Closed](qa/rest-gift-dream-20261110/01-wrapped.jpg), [lid and light](qa/rest-gift-dream-20261110/02-lid-and-light.jpg), [mask emerging](qa/rest-gift-dream-20261110/02-mask-emerging.jpg), [revealed](qa/rest-gift-dream-20261110/03-revealed.jpg), [reduced motion](qa/rest-gift-dream-20261110/04-reduced-motion.jpg).
- [Browser observations](qa/rest-gift-dream-20261110/browser-checks.json).

This was focused desktop reveal QA. Mobile, hardware trackpad feel, a full garden playthrough and FPS profiling were not repeated. Root `dist` is updated and the existing 4198 preview service remains running; the previous release archive and public hosting were not changed.

