# Production box layers — dream-light reveal

2026-11-10. Generated with the built-in `image_gen.imagegen`, transparent background true. No CLI fallback, no external image API. All outputs copied from generated-image storage without changing pixels or alpha. Existing assets preserved.

## Assets

- `public/art/gifts/dream-box-base-v1.png`: open ivory box body, sage vertical front ribbon, a few cream tissue folds, empty cavity.
- `public/art/gifts/dream-box-lid-v1.png`: matching independent lid and sage bow.

Both are simplified matte gouache layers derived from the accepted [dream-light storyboard](dream-light-storyboard-v2.png), not replacement product illustrations. They intentionally omit ground, particles, companion, and mask so those can be independently staged.

## Source outputs

- Base: `/Users/admin/.codex/generated_images/01a1c59f-c1b4-7b81-ac4a-e961b5ad8b57/exec-f53abd71-dee8-44db-ad35-949a90427fee.png`
- Lid: `/Users/admin/.codex/generated_images/01a1c59f-c1b4-7b81-ac4a-e961b5ad8b57/exec-1e611548-301a-4d88-ad81-af95c44c3f47.png`

## Base prompt

Reference: accepted storyboard.

Use case: background-extraction / precise-object-edit.
Create a production transparent sprite derived from the approved gift storyboard. The source is ONLY a style and box identity reference: simplified painterly gouache, muted ivory with cool slate-blue shadow planes and sage green ribbon. Output a single OPEN BOX BODY, with no other objects.
The box is front-facing with very mild elevated three-quarter perspective; front long edge almost horizontal, a narrow right side plane, visible open cavity. A small amount of cream tissue makes 2 or 3 broad softly bent shapes inside and just over the side rims. The center cavity is EMPTY and clearly visible, ready for a separately animated eye mask. Its front wall has a clean continuous top edge that can occlude an inserted object. Keep that edge nearly horizontal. One simple sage ribbon stripe runs vertically down the center of the front wall. The top opening is broad and shallow, back rim slightly higher in image than front rim. The box base is not a tall cube.
Very simple brush-painted shapes with subtly ragged edges; broad matte gouache strokes, soft cool gray shadows, restrained paper texture. NOT photorealistic, not intricate folds, no fine stitches, no glossy 3D geometry. It should match the illustrative simplicity of the source, not a retail packaging photo.
Center this one box sprite on a transparent landscape canvas. The complete box with tissue should occupy about 80 percent of canvas width with generous transparent padding above and below. All object edges fully in frame.
True transparent alpha background. NO GROUND, no backdrop, no horizon, no ambient glow, no shadow outside the box, no particles, no little character, no eye mask, no lid, no bow, no text, no border, no extra box. Do not copy the three-panel format. Only one isolated open box body.

## Lid prompt

References in order: generated open box body; accepted storyboard.

Use case: precise-object-edit / background-extraction.
Create a matching independently animated LID for the empty open gift box in reference 1. Reference 2 gives the approved simple painterly style and muted sage bow identity. Output ONLY the one isolated lid and its bow, true transparent background.
The lid must fit precisely onto the rectangular open box in reference 1: front long edge nearly horizontal, front face broad, narrow right side plane visible, very slight elevated view. The same ivory, matte gouache brush strokes, pale sage ribbon and cool slate-gray right-side shadow. Keep its proportions broad and shallow. The front lip of the lid is only a narrow band, no box body beneath it. The lid's top plane is a shallow trapezoid with front edge lower than back edge; not a steep diamond.
Use a loose small sage bow at the center of the top plane, made of only a few broad painterly shapes; a sage ribbon runs front-to-back across the top, then continues down the middle of the short front lip, aligned to the ribbon stripe on the reference box's front. A second ribbon runs across horizontally. Bow is simple, soft and slightly irregular, not glossy silk or intricately folded.
One lid only, no tissue, no box body, no bottom, no contents, no sleep mask, no character, no particles, no scenery, no ground, no shadows outside the lid. Do not make an open box or show a detached second object. Center the complete lid plus bow at about 80 percent of a landscape transparent canvas width, with ample transparent padding. Every edge fully inside frame. Maintain the same perspective and width-to-depth ratio as the reference 1 box opening so a developer can position it over the cavity.
No text, label, border, watermark, photoreal texture, glossy 3D, product catalog rendering. Opaque simplified hand-painted gouache shapes with restrained brush marks and softly irregular edges.

