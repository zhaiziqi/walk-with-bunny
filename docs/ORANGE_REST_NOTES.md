# Orange juice rest stop

Implementation notes · 2026-11-05

## Placement and interaction

One optional resting place sits beside the main path between the pond and the mushroom hollow. Its world anchor is `(440, 3890)`, approximately 165 world units from the path centre. The composition contains a low round table, a small stool and one visible glass of orange juice. It adds no region, map objective, collectible or explanatory memory panel.

The companion approaches the left/front edge of the table. A local, accessible hit target covers the glass; its label is available to assistive technology without adding visible text. The activation area is centred at `(290, 3875)` with a 55-unit radius. The existing continuous pointer walking remains in charge of locomotion: hovering over the world object allows approach, and clicking stops walking before the sip begins.

A sip lasts about 2.4 seconds: 0.45 seconds leaning in, 1.15 seconds drinking, and 0.8 seconds returning to rest. Only the upper body deforms; the authoritative character position and planted foot remain unchanged. The juice level drops from `0.82` to `0.56` and stays there. Repeating the gesture does not drain or refill the glass. Walking away cancels the gesture and preserves the amount already drunk.

## Rendering and state

- `src/scene/orangeRest.ts` owns the pure interaction model and shared coordinates.
- `OrangeRestScene.tsx` advances the live sip clock once per frame and updates the painted liquid.
- `OrangeRestTarget.tsx` projects the glass hit target from the current render-frame camera pose. The target becomes hidden and leaves keyboard navigation when unavailable or off screen.
- `RabbitCompanion.tsx` and `FloofStatic.tsx` share the upper-body deformation and liquid state.
- The App-owned ref preserves the current glass across content panels, map use and renderer changes. Reading pauses the sip; switching to a still renderer releases an unfinished pose while retaining the partial liquid level. In still/reduced-motion mode an explicit sip immediately displays the consumed state.

The stop is **session-only**: refreshing starts with a full glass. It does not alter puzzle answers, the `0305` envelope/lock flow, song selection or gift rules.

## Asset provenance

The table-and-stool illustration at `public/art/rest/orange-table-v1.png` is an original asset generated with the built-in image-generation tool. Its retained alpha is used by both renderers. A small code-drawn table fallback is available if the image fails to load.

Prompt description, rather than a verbatim tool transcript: a low round table and small stool only, painted in a soft watercolor/gouache treatment suitable for the existing quiet garden, with a transparent background. No drink, text or character is baked into this table artwork.

The glass, straw, orange slice and variable liquid are drawn separately in `src/scene/orangeRestArt.ts`. Keeping the drink separate allows the liquid to visibly fall without swapping the furniture artwork. Glass dimensions are shared with its click target.

## Scope and evidence

This pass targets the desktop experience. It introduces no new mobile interaction design and does not change the established walking controller. These notes describe source implementation and asset provenance; they do not claim browser, physical-trackpad, mobile or visual acceptance. Actual captures and verification are maintained separately in `docs/qa/orange-rest-20261105/`.
