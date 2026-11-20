# Sleep-mask unwrapping · 2026-11-10

## Interaction and artwork

One click opens the painted box over 3.2 seconds. The lid lifts and moves aside; two independent cream tissue folds uncover the mask; the mask settles onto the paper; a rabbit tag lands to one side. A small crescent and three small stars finish the scene, while the few moving sparks disappear. The final composition stays still. There is no additional task, explanatory copy or automatic name reveal.

The mask and paper are now independently rendered. The newly generated transparent [mask cutout](../public/art/gifts/sleep-mask-cutout-v2.png) preserves the original pink illustration. It was made with the built-in imagegen tool; the source image remains intact. Exact prompt, provenance and alpha bounds: [art record](qa/rest-gift-box-20261110/sleep-mask-cutout-art.md). Tissue folds are native SVG layers in `RestGiftPaper.tsx`; original box and old paper-backed mask remain in the project.

## Behavior checks

- `node scripts/check-split-gift-ui.mjs`: 18 passed. Delayed discovery, double activation including stale handlers, cross-tab found updates, early exit at multiple times, mid-opening reduced-motion change, wrapped revisits, hidden names until tag flip, both image failure fallbacks and independent progress are covered using the actual components/reducer.
- `node scripts/check-gift-entry.mjs`: 7 passed. Final locked gift access and return behavior remain unchanged.
- `sh scripts/project.sh build`: passed; pre-existing bundle-size warning only.

## Actual desktop browser checks

Production `http://127.0.0.1:4198`, 1280 × 720, separate new-walk IDs. Used the supported `#rest` URL to reach the panel, then its real controls and the scene's actual gift target for re-entry. No app state, animation time or local storage was injected.

Verified full opening, readable completion without automatic tag outline, Tab/Enter name reveal, closing at the same scene position, no early progress during opening, cancellation before completion and no delayed discovery afterward, reduced motion starting wrapped then revealing immediately on click, and wrapped re-entry after discovery. Final password, questions and music remained untouched. Captured warnings/errors: none. The first attempted cancellation happened after completion; the log labels it accordingly and a separate fresh walk verified actual early cancellation.

After visual inspection, reduced excessive paper noise and corrected the final fold stacking so the mask's two straps remain visible. Dialog bounds were x=320..960 and y=82.75..637.25 in the 1280 × 720 viewport, without clipping.

Evidence:

- [Actual opening recording](qa/rest-gift-unfold-20261110/opening.gif) — encoded from browser screenshots with recorded timings, not an illustrative mockup.
- [Wrapped](qa/rest-gift-unfold-20261110/01-wrapped.png), [lid lifting](qa/rest-gift-unfold-20261110/02-lid-lift.png), [paper unfolding](qa/rest-gift-unfold-20261110/02-paper-unfold.png), [revealed](qa/rest-gift-unfold-20261110/03-revealed.png), [reduced motion](qa/rest-gift-unfold-20261110/04-reduced-motion.png).
- [Browser observations](qa/rest-gift-unfold-20261110/browser-checks.json), [recording timestamps](qa/rest-gift-unfold-20261110/recording-frames.json).

This was a focused desktop reveal check, not a new full-garden playthrough, hardware trackpad test or mobile acceptance. The live 4198 root dist is updated; the older release archive and public hosting were not changed.
