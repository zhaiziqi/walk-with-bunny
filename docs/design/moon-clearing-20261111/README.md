# Moonlit clearing — composition study, 2026-11-11

Status: **concept images for discussion, not runtime screenshots or implemented animation**.
Tool: built-in image_gen. No CLI/API fallback.
Scope: full desktop composition and matched before/after lighting stills. No application code, save data, build, or preview server changed.

## Selected images

- `01-cloud-shadow-v1.png`: cloud shadow covers the door, paper bird and part of the approach.
- `02-moonlight-revealed-v1.png`: the shadow withdraws and the painted light area joins the actor, bird and threshold.
- Both images use the same camera and near-identical geometry; generated edits can have minor brushwork differences.
- The larger-door draft was not selected. The final door was reduced around its existing threshold anchor.
- These are art-direction targets, not a proposal to use one flat image as the entire playable background.

## Intended interaction

The offscreen moon illuminates the clearing as a ground-level cloud shadow withdraws over about two seconds. The small cream actor, nearby folded paper bird, door rim and threshold share the same lighting direction. The existing bird farewell would then play in the clearing. No additional task, text, button, collectible or unlock condition. Door remains closed and retains the existing 0305 flow.

## Visual invariants

Elevated oblique view, no horizon or sky; sparse matte gouache, broad blue-grey/sage fields, creamy light, small furry cream ball without face/limbs/ears, existing closed sage wood and pale-stone arch, one paper bird, two small cropped foliage groups. No moon disk on the ground.

## Review notes

The stills demonstrate composition and a visible lighting change only. Shadow motion, the actor's live lighting, the bird's farewell, camera movement and integration with the surrounding world have not been implemented or browser-tested in this concept step. The revealed frame is intentionally warmer than the shadow frame; the exact warmth remains an art-direction choice for review.

## Source generations

- Draft: `/Users/admin/.codex/generated_images/01a182b7-7195-7990-a8f7-341d47cc8041/exec-6567b172-5a7c-4643-ac33-30850c6013f5.png`
- Selected after: `/Users/admin/.codex/generated_images/01a182b7-7195-7990-a8f7-341d47cc8041/exec-4f657b46-d44b-436a-9130-f3101b9c9427.png`
- Selected before: `/Users/admin/.codex/generated_images/01a182b7-7195-7990-a8f7-341d47cc8041/exec-c739d794-107b-430c-894c-2751be2dcf7c.png`

## Reference roles

- `docs/research/2026-11-01/floof-clearing-concept-v1.png`: prior accepted spatial/style direction.
- `public/art/floof/gift-door-painting-v1.png`: existing door identity.
- User-supplied rabbit in a light shaft: warm/cool lighting and a small subject in quiet space; rabbit anatomy not reproduced.

## Prompts

### First composition
```text
Use case: stylized-concept.
Create ONE original landscape 16:9 desktop game scene concept, an exact art-direction view of the final small door clearing in a quiet exploration garden. This image is the AFTER state, with a cloud shadow having moved away. Full bleed illustration, no UI, no text, no borders.

Reference roles, in order:
1. Accepted floof clearing concept: preserve its elevated oblique top-down ground view, broad imperfect dry-gouache strokes, small cream furry ball and abundant open ground.
2. Existing gift door artwork: preserve this small closed rounded pale grey-pink stone arch, grey sage vertical wood planks and tiny brass knob. Integrate its foot with the painted ground. This is a modest standalone door, not a monumental portal.
3. User's little rabbit in a shaft of light: reference ONLY for the warm cream / cool blue split lighting and tiny character against quiet darker space. Do not reproduce the rabbit anatomy or that scene.
These are reference inputs, not a request to collage them.

Scene: a continuous gently sloping ground plane that fills the entire frame, viewed from above at a softly oblique angle, without a horizon, sky or scenery vista. An extremely restrained matte gouache game painting, with two or three coherent large painted colour masses. Dusk has arrived here: predominantly muted slate blue, dusty blue-grey and sage, with a lighter creamy celadon moonlit clearing. Clear value hierarchy, delicate uneven pigment, selected broad brush marks, quiet areas allowed to stay quiet. Air and depth through overlaps and value, not decorative clutter.

Composition: the small door sits in the upper half, a little right of centre (about 61 percent across, with its foot at 51 percent down), roughly 28 percent of frame height and 12 percent of frame width. One SMALL irregular cream cotton floof, without face, eyes, paws or ears, stands below and to the left of it (about 45 percent across, 68 percent down), around 7 percent of frame height. One very small folded ivory paper bird with two simple wings is between the floof and the threshold, about 2 percent of frame width. The door, floof and bird must feel grounded in the SAME space. A deep desaturated indigo leaf cluster is cropped into the extreme lower-left corner, occupying under 10 percent of the frame; a much smaller slate-sage leaf silhouette is partly cropped at the upper-right edge. Most of the screen remains open walkable ground. Do not add other props.

Key light: moon is OUTSIDE the frame, above upper-left. A broad slanted irregular patch of moonlight has been revealed on the ground, running diagonally from above-left of the door, across the threshold, towards the floof at lower-left. Around the actor its width is 3–4 floof diameters. Treat it as a painted lighter surface with visibly irregular dry-brush boundaries; it is NOT a spotlight cone in air, NOT a glowing path, NOT a bright line, NOT a uniformly feathered digital gradient. The cloud-shadow edge has receded to the right of the door and actor, leaving their connecting patch clearly lighter. Soft long blue-grey shadows extend in a consistent down-right direction from the door and floof. The door catches creamy light on its left stone rim and the threshold; the floof is cream on the lit upper-left side and pale dusty-blue on its shaded lower-right side. Brightest focal point remains the tiny floof. The paper bird is just catching the same light. Keep sufficient contrast so the light/shadow boundary reads at thumbnail size, while colours remain soft and matte.

Style: sophisticated simple hand-painted interactive art, gently surreal and intimate, naive simplified forms with tactile brushwork, subtle playful tenderness. No photorealism, no 3D or shiny toy rendering, no detailed grass carpet, no dense trees, no floral framing, no stars or particle clutter. No moon disk, celestial circle, halo ring, sun, sky clouds, mountain, water, house, wall, stairs, furniture, extra animals, text, map, buttons or symbols. Door stays closed, no interior revealed. Not a landscape postcard. Never fill the open space with texture objects.
```

### Selected door-scale correction
```text
Use case: precise-object-edit.
Edit this existing moonlit game concept with ONE targeted composition correction. Preserve its 16:9 frame, camera, entire painterly ground, broad diagonal light patch, palette, corner foliage, fluffy cream ball and tiny paper bird EXACTLY as they are.
Reduce ONLY the closed stone-framed green door to 75 percent of its current width and height, scaling around the existing bottom-centre foot point, so the door stays planted at the same threshold location. The door should now occupy about 30–32 percent of frame height instead of 42 percent. Keep its design, pale stone arch, vertical grey-sage wood, tiny brass knob, closed state, and warm left rim / cool right rim. Update its contact and cast shadow to the new smaller size. Fill the region formerly occupied by the larger door with the SAME surrounding painted ground, respecting the existing moonlight and cloud-shadow shapes. Do not resize or move the floof, bird, leaf corners or light patch. No new objects, no stars, no text, no UI. Everything except the door size and its physically necessary grounding repair remains unchanged.
```

### Matching shadow-covered state
```text
Use case: lighting-weather.
Create the BEFORE state of this EXACT scene, as a precise paired lighting comparison. This is not a new composition.
LOCK all pixels' geometry as much as possible: same 16:9 camera, exact closed small door size and location, stone blocks and brass knob; exact cream floof size, silhouette and location; exact folded paper bird, ground brush patterns, leaf corners, sparse grass marks, existing palette. Never move, add, delete or redesign an object.
Only change the cloud-shadow coverage and lighting produced by it.
In the supplied AFTER image the cream-sage moonlit patch connects the small floof to the door. In this BEFORE image, one large soft-edged dusty blue/slate-indigo CLOUD SHADOW has slid across that patch from the upper-right, covering the door, bird, and ground between the bird and floof. The irregular shadow boundary should run diagonally from roughly 17 percent across the top to roughly 38 percent across the bottom: most of the actor-to-door clearing is under quiet blue-grey shade, while a narrow pale cream-celadon area remains to the far left. This should look like the same painted ground under cloud cover, not newly painted terrain.
The floof is self-luminous: retain its small warm cream centre, with a more noticeable pale blue shaded right side; do not turn it grey. The door is visible and legible in cool dusk, its previously warm rim now muted. The bird remains a small recognizable pale paper silhouette. Existing cast shadows become softer/lower contrast naturally while the overhead light is obscured. Maintain tactile matte dry-gouache pigment and quiet large colour fields; no smooth digital overlay look, no opaque clouds in the scene, no sky, no moon, no fog wall, no particles, no text/UI.
The only intended BEFORE/AFTER difference is the position of this coherent cloud-shadow boundary and the resulting illumination. All objects and the camera remain fixed. Full bleed original illustration.
```

