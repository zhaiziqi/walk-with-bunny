# Walking bunny — local playable study

Open: http://127.0.0.1:5173/?preview=fresh&run=bunny-walk-20261118&bunny=painted#garden

This is the actual garden, controller, camera and mushroom interaction, with an opt-in painted companion. No production deployment was made. Normal visits and production builds ignore the character flag and do not fetch the study images. Temporary progress uses existing tab-local preview storage; a `walk` parameter deliberately disables this character study.

The current playable revision restores the original warm round light. Two short tufts rise from its existing upper edge. The same paint and anchored movement are used in live and reduced-motion views. The walking and mushroom controls below still apply.

## Previous eight-direction study

The artwork, orientation behavior and QA records below describe the superseded character.

### Try it

1. Choose **Begin wandering**. Point into the garden to keep walking; bring the pointer close to the companion to pause. Arrow keys also work.
2. Turn left/right, reverse, and pause. Front shows two eyes, side one, back none. Eight views interpolate in one material; the body remains grounded and the ear tips settle slightly later.
3. **By the mushrooms** is a preview shortcut, not a map change. Take a small step toward the nearest cap and stop; the existing light visitor appears. The small mushroom button replays it afterwards.
4. Open the music panel and close it to return to the exact place. **Entrance** returns to the beginning. **Finale study** opens the separate previously approved close-up prototype.

The mushrooms are later in the real map, after the music/pond areas. This study does not shorten or rearrange the route. Other regions are still reachable but were not visually accepted for the new character in this pass.

### Artwork and implementation

- Existing approved paintings reused unchanged: `../bunny-identity-study-20261118/art/front.png`, `side.png`, `back.png`.
- Added straight-front and straight-back views with the built-in imagegen tool (not CLI): `art/forward.png`, `art/away.png`. Complete prompts: `art/forward.prompt.txt`, `art/away.prompt.txt`.
- Original concept: `../finale-study-20261117/painted-gift-study.png`.
- Five source images provide eight orientations through reflection. Runtime alpha measurements align their painted base and visible height without modifying the source files. One shader interpolates neighboring views. Original floof art remains the trail-fleck texture, so the trail does not produce tiny rabbits.
- `src/scene/paintedBunnyArt.ts`: development gate, asset loading, registration and render material.
- `src/scene/bunnyTurn.ts`: damped orientation and ear response. The actual walker and camera are unchanged.
- `RabbitCompanion.tsx` and `FloofStatic.tsx`: opt-in live/still rendering. Reading freezes live body deformation.
- `src/ui/BunnyWalkPreviewTools.tsx`: local navigation controls. No puzzle/gift unlock shortcut.
- Before-change snapshots are in `baseline/` because this workspace is not a Git repository.

### Verification

Actual browser: 1100×700 desktop viewport, WebGL and still mode. Captures and measurements: `../../qa/bunny-walk-preview-20261118/`.

- Painted character loaded; no captured browser errors/warnings.
- Keyboard movement, side turn and stop checked in the actual scene.
- Mushroom replay captured in 20 actual frames; at the visible-light frame response amount was 0.839. Its acknowledgment remains subtle, not a large new gesture.
- Music panel return retained actor coordinates exactly: (1390.000000, 4139.058641).
- Separate 8-second scripted integration run: 900 sampled frames after warm-up, mean 8.33 ms, p95 10.2 ms, max 13.2 ms, 798 moving samples, **0 duplicated movement frames**. These timings describe this local run, not every device.
- Another run captured 24 frames for turn/reverse/stop review. This is a sparse frame sequence, not a continuous video.
- Reduced-motion mode displayed the same bunny and retained place. Existing static terrain is visibly flatter; full visual parity and a full reduced-motion walk sequence were not verified.
- `npm run build` passed. Existing Three bundle size advisory remains.
- `check-bunny-turn.mjs`: 10 checks (8 solver + 2 runtime preview isolation).
- `check-floof-frame.mjs`: 9 original actual-component/motion assertions passed after the harness gained the new hook import.
- Existing pointer guidance, turn/stop and preview-storage checks passed. Physical trackpad feel was not automated by the browser tool; the established continuous-pointer controller was not altered.

### Review outcome

Applied the approved art direction using frontend-design / design-taste restraint, Impeccable motion and craft review, UI UX Pro Max motion/accessibility guidance, and Huashu comparison/visual-check practice. Existing approved direction was retained; no new palette, site layout or three-option reset. React edits were reviewed for stable hook order, shared asset loading and per-frame refs.

A fresh independent reviewer judged the result ready **at local-sample scope**. Front eyes remain readable; no conspicuous doubled body or size jump appeared in reviewed frames. Limitations: at game scale some broken brushwork is lost, the back reads a little pear shaped, and sparse captures cannot rule out every brief intermediate eye/ear blend. No full-world art acceptance or production readiness claim is made.
