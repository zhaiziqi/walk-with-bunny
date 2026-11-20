# Final gift — local motion study

17 November 2026. Review prototype, not a production replacement.

Open with the existing Vite server:
http://127.0.0.1:5173/docs/design/finale-preview-20261117/index.html

Click **Play the ending**. The strip below the painting supports pause, replay,
scrubbing, Before / Unwrapping / After, and Still mode. This strip is for design
review and would not appear in the game. The bunny tag can reveal the gift name.

## Intent

The paper bird helps unwrap a small gift beside the existing cream light-being.
The composition uses the established painted ground, one soft patch of light,
and a small group of objects. The gift stays on the ground; it does not enlarge
into a product card. The reference direction is the user's quiet, playful
illustrations and the scale relationship of a small character in broad space.

The existing light-being and paper bird are reused, without adding a face or a
new rabbit design. The only new raster layers are the sage folio and ivory paper.

## Sequence — 4.8 seconds

| Time | Visible action |
| --- | --- |
| 0–0.5 | A short pause with the present covered. |
| 0.5–1.3 | The bird approaches the paper corner. |
| 1.3–1.6 | Its beak catches the corner and holds. |
| 1.6–3.1 | The bird draws the paper aside, revealing the stationary gift. |
| 3.1–3.8 | The bird releases it; the paper settles lower and the light-being leans closer. |
| 3.8–4.5 | The small birthday greeting appears. |
| 4.5–4.8 | The ending rests. The optional bunny tag remains available. |

The tissue is a painted layer transformed in canvas, not a cloth simulation.
During the pull the beak and paper tip share an anchor. After release the bird
continues independently. This makes the basic cause and effect reviewable while
leaving room to refine fold deformation if the direction is selected.

## Boundaries

- All prototype files are contained in this directory; screenshots are in
  `../../qa/finale-preview-20261117/`.
- No production component, save record, puzzle, lock, route, or deployment was
  changed by this study. The prototype intentionally does not run the password
  flow. The real ending would still follow the final lock.
- The Vercel site remains unchanged. This link requires the local Vite server.
- There is no new sound in this study. Mobile, full-game regression and final
  production integration are outside this preview.

## Skills and material

- **impeccable**: craft-floor and animation guidance used for the hierarchy,
  restrained material treatment, anticipation/contact/release, and still mode.
- **design-taste-frontend**: motion, typography, spacing and review guidance used
  for the composition and controls. Commercial landing-page and stock-photo
  conventions do not apply to this established illustrated game.
- **imagegen**: two original transparent layers; prompts are beside their PNGs
  in `art/`, also embedded as PNG prompt metadata. These are local design assets.
- Existing ground: `/art/gifts/dream-ground-v1.png` and
  `/art/floof/painted-ground-material-v1.png`.
- Existing character generators: `src/scene/floofCompanionArt.ts` and
  `src/scene/hillMoon.ts`.

## Checks and limits

Actual browser checks covered 1280 × 720 and 1280 × 540: initial / middle / final
states, full playback and replay, a stable pause at 0.26 seconds, tag opening and
keyboard closing, Still mode, and restoring viewport size/pixel density. The
short-screen tag overlap and a canvas backing-bitmap mismatch found during
review were corrected. Captured browser error/warning logs were empty.

Pure timeline checks passed for 151 beak/paper contact samples, independent
post-release motion, final pose and time clamping. JavaScript syntax checks
passed. Copy lint reported 0 failures and 0 warnings.

The static design scan raised two warnings: small preview helper text was
increased to 12px; Arial is retained only in the technical review controls. The
scene retains its existing Garden/Cormorant typography. The skill context check
also reported existing project setup/documentation drift, which this component
study did not attempt to repair.

Browser checks used the available computer-use interface. A full skill browser
gate, frame-rate measurement, continuous video capture and OS-level reduced-
motion emulation were not run; the explicit Still mode was checked. Screenshots
prove composition and states, not smoothness of every frame. Artistic acceptance
and any decision to replace the live ending remain with the user.

Independent final review found the paper scale, release anchoring and short-
screen overlap fixes resolved, with no additional required fixes for handing
over this local study. That review used source and captured states, not an
independent continuous-animation or performance test.
