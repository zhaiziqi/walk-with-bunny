# Desktop natural exploration check · 2026-11-02

This pass improves the existing approved gouache meadow and cream companion. It does not redesign the artwork, add scenery, alter movement tuning, or change the four-question / music / gift rules. The original documents and references are untouched.

## Changes supported by the walkthrough

- The visible blue bank previously suggested a different direction from the authored route. All seven main legs now share a soft world-space light wash with `gardenAtlas.paths`; the five side routes use a quieter trace. The blue bank remains a landform. Main-path texture contrast is locally reduced by at most 20%; side-route reduction is at most 6.4%.
- The first flower has a small, quieter patch of pigment beneath it. Its closed bud is easier to distinguish, and its preliminary opening continues smoothly into full bloom. The optional 1.35-second pause, guide behavior and remembered trail remain unchanged.
- Wheel input over a world-object button no longer gets mistaken for panel interaction.
- Movement keys work when closing a panel returns focus to its world object. Beginning a keyboard walk transfers focus to the scene with `preventScroll`, so walking beyond that object's render range does not strand focus on the document. Actual UI controls, inputs and dialogs retain their normal behavior.
- The static renderer shares the same path field and texture-softening mask. No per-animation-frame exhaustive path search is added; WebGL samples once when building the mesh.

## Actual desktop browser walkthrough

1280 × 720, local `http://localhost:5173/#garden`, WebGL. Used real browser keyboard holds, native scroll, and clicks. No injected coordinates, synthetic page events, map teleport, progress reset or scripted discoveries were used to reach the destinations below. The keyboard route approximated the existing curves and sometimes cut across open meadow; this is not a claim that a first-time visitor will discover every turn unaided.

| Reached stop | Actual actor position, rounded | Observed result |
| --- | --- | --- |
| First flower | 307, -1180 | Stopped, flower opened, butterfly became visible |
| Bend | -74, -376 | Butterfly advanced between perches |
| Puzzle arrival | -555, 616 | World object became clickable; continued approach woke the lantern |
| Music | 750, 1881 | Petal response; existing saved piece remained unchanged |
| Pond | -975, 2955 | Bank constrained walking; water/lily response occurred |
| Hollow | 1276, 4112 | Mushroom response occurred |
| Chime | -1013, 5233 | Stillness triggered the chime encounter |
| Hill | 963, 6493 | Stillness triggered paper wings |
| Gift | -186, 8324 | Small door accessible; stillness triggered moon ring |
| Reverse walk to hill | 942, 6999 | Walked back from the door with real direction changes and stopped |

The final visited set included all eight regions. Opening and closing puzzle, music and gift content restored all seven observed actor/camera/heading values exactly. First-flower and end-of-route pauses also remained exactly stationary across separate observations. All four questions remained unanswered; the existing draw ID, piece 2 and unlocked gift were preserved. This is preservation of existing user state, not a new end-to-end unlock test.

The world-object wheel issue and lost keyboard focus were first reproduced, then checked after the fixes. After closing music, an uninterrupted Up segment followed by Left continued beyond the disappearing button with focus remaining on `journey-surface`. The browser log capture returned no warnings or errors during this walkthrough.

Raw observations: [evidence.json](qa/natural-trail-20261102/evidence.json). Screenshot directory: `qa/natural-trail-20261102/`.

Final first-segment screenshots, after the route texture adjustment: [entrance](qa/natural-trail-20261102/13-final-entry.png), [bend](qa/natural-trail-20261102/14-final-bend.png), [puzzle arrival](qa/natural-trail-20261102/15-final-puzzle.png). A second real walk from the puzzle back to the first flower ended at `(209, -1022)` with its previously opened flowers preserved: [first-segment return](qa/natural-trail-20261102/16-first-trail-return.png). This was a separate pass after using Return to the beginning; it is not a full gift-to-entrance reverse traversal.

## Automated checks

69 checks passed:

- Pointer and actual hook lifecycle: 31, including pure wheel over objects, panel/UI blocking, restored landmark focus, and the second movement segment after the object disappears.
- Turn/stop dynamics: 9. Existing constants unchanged.
- Body/frame synchronization: 7.
- First trail geometry/reveal: 5.
- Shared path field: 6, including 2,346 exhaustive-reference sample comparisons and local texture-softening boundaries.
- Trail awakening/memory: 11, including continuity across the flower-opening threshold.

TypeScript and production build passed. The existing Three bundle size warning remains. Sampling-time measurements in `TRAIL_FIELD_QA.md` are CPU helper observations, not browser FPS measurements.

## Limits and next visual work

- No physical trackpad-only hover verification or new FPS benchmark was performed. Keyboard/scroll success does not establish the user's physical trackpad feel.
- This is route and input refinement, not final visual acceptance. The later pond, mushrooms, chime, paper birds and moon still use simpler shapes than the painted foreground plants. Region identity and material consistency need another art pass.
- Reduce motion was actually checked at the moon: it preserves the position and the gift door, and shares the path field, but still omits the six secondary encounter scenes. It is not visual parity with WebGL.
- Nine real song titles and actual gift photos are still absent. No real music playback/listening test, mobile check, public deployment or offline hardware test was performed.
- The return-to-beginning control was used after the reverse-walk check; that control is not represented as a complete natural reverse traversal of every region.

Before-change backup: `versions/before-natural-trail-20261102.tar.gz`. The original port 5173 preview process remains running.
