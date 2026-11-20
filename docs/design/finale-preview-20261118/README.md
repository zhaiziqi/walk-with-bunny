# A little unwrapping — independent ending study

Local preview: http://127.0.0.1:5173/docs/design/finale-preview-20261118/index.html

Start the existing Vite development server with `npm run dev -- --port 5173` if needed. Click **Play the scene**. Four inspection controls select 0.0, 2.7, 4.2 and 6.0 seconds. This page is a review prototype, not the published garden.

## What changed from the November 17 prototype

- Painted environment with the approved oblique warm light, without the former whitening overlay.
- Matching raster layers: the folio and underpaper form one fixed group; cover tissue is a separate deformable mesh. The cover does not translate into a detached rectangle.
- A side-profile paper bird catches the actual painted corner, pulls, releases and lands. The paper stays beside and beneath the gift.
- The companion now follows the user-selected original concept: two tiny ochre eyes, short unequal ears, a gently leaning cream silhouette and quiet dry-brush fur. This correction supersedes the earlier faceless-ball interpretation.
- Contact shadows, smaller late greeting, hidden-name paper tag. No gift name until the tag is turned.

## Saved artifacts

- Reference: `../finale-study-20261117/painted-gift-study.png`
- Previous working prototype: `../finale-preview-20261117/index.html`
- Art: `art/ground.png`, `art/gift-v2.png`, `art/paper.png`, `art/bunny-reference-v4.png`, `art/bird-v2.png`.
- Full generation/edit prompts: matching `art/*.prompt.txt`. All raster assets were created with the built-in image generation tool using the approved local study as reference; no CLI image generation was used. Earlier variants are retained for comparison.
- Actual browser frames: `../../qa/finale-preview-20261118/{01-wrapped,02-pulling,03-settling,04-after}.png`.
- Same 1200×800 old-preview comparison: `../../qa/finale-preview-20261118/00-old-preview.png`.
- Short desktop with open tag: `../../qa/finale-preview-20261118/05-short-desktop.png` (1200×650).

## Verification performed

- `node --check docs/design/finale-preview-20261118/preview.js`
- `node --test docs/design/finale-preview-20261118/motion.test.mjs`
- Deterministic/clamped motion, fixed fold root, 231 bird-to-paper anchor samples, phase continuity, final landing and paper hem contact.
- Actual browser: start-to-finish playback, replay, pause, four keyframe controls, hidden-name tag opening, replay clearing the name, still mode, short-desktop name/return-link separation, return to garden and browser back.
- Browser error/warning log empty at final preview inspection.

## Boundaries

No production source, puzzle/music/gift rules, deployment or saved-progress implementation was changed. This study does not read or write game saves. The return link navigates to the existing local garden; integrating position restoration, the lock transition, revisit behavior and replay into the live finale remains a separate integration step.

The paper uses a hand-authored 2D texture deformation, not a physical cloth simulation. The bird currently uses one painted side pose with path/rotation changes, not individually animated feathers/wings. Frame rate was not instrumented, full-game regression and mobile acceptance were not performed for this isolated study. Visual approval belongs to the user.

## Character correction after user review
The user rejected the faceless feathery v3 and explicitly preferred the character in the original painted study. Re-extracted that character with the built-in image generation tool, preserving eyes, ears, muted cream pigment and asymmetric outline. Source and prompt: `art/bunny-reference-v4.png`, `art/bunny-reference-v4.prompt.txt`. Only the local ending preview character and its sprite bounds were changed; production is untouched.

Character-corrected actual browser captures: `../../qa/finale-preview-20261118/06-reference-bunny.png` (resting scene) and `07-reference-bunny-pull.png` (pulling). Inspected at 1200×800; original aspect retained, no captured browser errors. Older 01–05 captures document the preceding character, not the corrected design.
