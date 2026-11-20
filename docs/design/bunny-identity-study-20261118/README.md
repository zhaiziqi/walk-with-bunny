# One character, near and far

User approved preparing a character comparison first: a cream fluffy light-being with subtle rabbit features, consistent across distant movement, turning and the final close-up. This study does not replace game assets or deploy anything.

Preview: http://127.0.0.1:5173/docs/design/bunny-identity-study-20261118/index.html

## Identity
- Preserve the approved concept's asymmetrical oval/pear body, pale cream pigment, two short unequal ears and tiny matte ochre eyes.
- Three-quarter face: two eyes. Side view: one eye. Rear view: no visible eyes.
- No mouth, nose, limbs, tail, clothes or regular featherlike fur clumps.
- Small and close views use the EXACT SAME front PNG at different CSS sizes; there is no substitute simplified distant design.
- Side and rear are newly derived painted views, not an implemented eight-direction animation system.

## Scale
Approximate visible width: 72px in the garden panel; 140–150px side/rear; 280px close-up. Garden scale comes from a read-only calculation using the current RabbitCompanion sprite and depth camera, not a new gameplay measurement. The board is a design comparison, not a screenshot of implemented gameplay.

## Art provenance
Built-in image generation, no image generation CLI. Front is copied unchanged from `../finale-preview-20261118/art/bunny-reference-v4.png`; its extraction prompt is adjacent there as `bunny-reference-v4.prompt.txt`. New identity-preserving views and full prompts are `art/side.png`, `art/side.prompt.txt`, `art/back.png`, `art/back.prompt.txt`. Original composition reference: `../finale-study-20261117/painted-gift-study.png`.

## Next integration boundary
Only after identity review: prepare matching turn intermediates, anchor feet/ears consistently, use the new art throughout garden and both gift scenes, preserve movement inertia and stop behavior, then browser-test scale and turning. No production integration or movement behavior was changed for this deliverable.

## Browser review
At 1200×800, all four displayed images loaded, no horizontal overflow, and no captured browser errors/warnings. The small and large front views resolve to the exact same `art/front.png`. Actual rendered board saved at `../../qa/bunny-identity-study-20261118/character-comparison.png`. Display sizes include transparent margins; quoted visible-character widths remain approximate. This review verifies the board, not game movement or animated turning.
