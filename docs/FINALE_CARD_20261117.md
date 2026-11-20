# Final birthday card — local design preview

2026-11-17. Scope: the final passport-holder reveal only. This is a local preview; the public Vercel deployment has not been replaced.

## Design

- Replace the tall, numbered product presentation with a horizontal folded greeting card. Keep `Happy birthday.` as the only main message.
- Group the small sage keepsake and a cream rabbit in a single painted vignette. A subtle paper fold, warm paper grain and a pale blue wash connect the two halves; the garden stays visible around the card.
- Keep the gift name concealed. The rabbit tag now physically folds upward on click/Enter; clicking again closes it. No extra puzzle or progress requirement was added.
- Retain the accessible `scene-title`, focus trap, close/return controls, static fallback, reduced-motion behavior and original save system.
- Password remains `0305`. The midway gift is still the sleep mask; the final gift remains the passport holder.

## Local preview

`http://127.0.0.1:4198/?walk=finale-card-20261117#gift`

The dedicated QA walk was unlocked through the actual password field. It does not modify the user's ordinary save. A browser without that QA save will see the password lock: enter `0305` to inspect this screen. Existing server on 4198 serves the new production build. No server was stopped or deployment made.

## Validation

- `pnpm build`: passed TypeScript and Vite. Existing Three.js chunk-size warning remains.
- `node scripts/check-gift-entry.mjs`: 7 passed.
- `node scripts/check-split-gift-ui.mjs`: 19 passed, with the single final illustration expectation updated to the new asset. Covers hidden names, image-error fallback and separation from the eye-mask discovery.
- Actual browser: fresh `#gift` resolves to `#lock`; `0000` rejected; `0305` opens the card; initial focus is `scene-title`; name hidden until mouse activation; Enter closes the tag; Escape and Back to the garden return to the scene; the normal saved revisit still goes through Open again.
- Actual reduced-motion toggle: card animation `none`, tag transition `0s`, reveal remains usable. Restored normal motion after checking.
- Default 1280×720 capture: card 740×455; scrollHeight equals clientHeight (453).
- Short desktop 1280×540: card 740×381, fully within viewport; all controls visible; scrollHeight equals clientHeight (379). Temporary viewport override reset.
- Console warnings/errors: empty in the production-preview tab.
- Did not repeat the full garden walkthrough, physical trackpad/audio review, or public deployment checks. This is not a new aesthetic approval on the user's behalf.

Actual screenshots:

- `qa/finale-card-20261117/01-card-closed.jpg`
- `qa/finale-card-20261117/02-card-open.jpg`
- `qa/finale-card-20261117/03-short-desktop.jpg`

Previous source files: `versions/before-finale-card-20261117/`. Existing gift art and release archives remain intact.

## Generated artwork

Mode: built-in imagegen, transparent image edit/reference, one generation. No CLI fallback, new dependencies, paid asset purchases or external image services.

Saved asset: `/Users/admin/Desktop/birthday-garden/public/art/gifts/passport-bunny-v2.png` (1536×1024 PNG with alpha, approximately 1.8 MB). Loaded only by the final gift component. Source generated file preserved at `/Users/admin/.codex/generated_images/01a182b7-7195-7990-a8f7-341d47cc8041/exec-07248adc-3f44-4452-8a90-6079cacf1cdf.png`.

Reference: `/Users/admin/Desktop/birthday-garden/public/art/gifts/passport-holder-v1.png`.

Exact prompt:

> Create a new original watercolor/gouache illustration asset for a small, intimate birthday greeting card in an airy secret-garden website. Use the reference only to preserve the sage green passport holder's plain cover, rounded corners and cream stitching; NOT its large product-photography presentation. Composition: a small closed sage passport holder rests at a relaxed slight angle on a very modest fold of cream tissue, and a tiny fluffy rounded ivory bunny with small pink-lined ears nestles affectionately beside its lower left edge, paws gently resting on the corner. Rabbit is about one third the holder's height, subtle brown dot eyes, peach blush, very gentle and soft. This is an understated storybook vignette, warm, quietly whimsical, handmade, beautiful negative space, low contrast gouache brushwork and subtle paper grain visible in the painted objects, dusty sage, creamy white and hints of powder blue. Make the holder feel painted rather than photoreal leather. Both objects share a small soft contact shadow. Landscape asset, composition fully visible and centered within margins; the holder and bunny together fill about 75% of width. No words, lettering, logos, passport emblems, borders, furniture, landscape, flowers, extra gifts, stars, sparkles or floating decoration. Truly transparent background with clean soft painted edges, not a white rectangle, not a checkerboard, no black halo. The final website will provide its own paper and atmospheric background.
