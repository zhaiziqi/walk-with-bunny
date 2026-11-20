# Mushroom listening prototype — 2026-11-02

## Scope

Only the existing five mushrooms were changed. No new scenery, audio, puzzles, collections or progression gates. The soft-turn-stop-v3 locomotion and original business configuration are unchanged.

The fixed index-based response was replaced with a spatial listening model. Real companion displacement engages the nearest cap; filtered speed and hysteresis allow brief pointer corrections without cancelling quiet time. Stillness spreads one finite response by distance from the leading cap. Walking transfers local attention, departure fades all responses, and prolonged stillness settles. Feet, contact shadows and sprite height remain fixed. The shared wind continues underneath the small directed lean and warm light.

A first passage no longer displays the mushroom text notice. After an unhurried response, a small mushroom icon provides optional replay; E/Space still work near the patch. Other encounter controls keep their original behavior. Opening the map freezes the canvas loop; reading already pauses encounter updates. Static/reduced motion stays a non-animated rendering, and restoring WebGL does not replay old pulses.

## Checks

- 15 mushroom behavior checks: nearest cap from both directions, spatial propagation, micro corrections, nearest-cap hysteresis, continuous transfers, fast local passage, departure/return, long idle, reading, teleport protection, replay serials, 30/60/120 FPS, stalled/invalid frames, invalid speed, rooted geometry.
- 7 existing hollow/arch checks, 7 remaining atlas interaction checks, 9 movement/turn/stop checks. Total: 38 behavioral checks, plus content validation.
- TypeScript and production build passed (127 modules). Existing Three chunk warning remains: 882.25 kB.
- A review found and fixed a stalled-frame bug: a frame over 250ms now preserves an engaged encounter instead of treating it as departure. Regression coverage confirms that waiting continues afterwards.

## Actual browser evidence

1280 × 720, local Vite preview. Used native direction keys and ordinary clicks; no injected actor coordinates or progress. Walked from the entrance to the hollow, approached from left and right, moved across the patch, departed to x≈1994, returned to x≈1660, and moved again after switching renderers.

- Left approach selected cap 1; the right side selected cap 3. This differs from the removed fixed index sequence.
- Outside the patch, all warmth values decayed to 0. Returning engaged the patch again without replaying discovery text.
- At fixed position (1563.789251, 4213.768834), natural stillness at 1.10 / 3.10 / 5.02 seconds produced successively broader local responses. The pulse serial stayed `hollow:3` throughout, confirming these samples were driven by movement and resting rather than a new replay click.
- Reading-start/held response snapshots were identical. Closing restored all seven actor/camera/heading values exactly.
- Opening the map during a response froze the response and all seven pose values, including while an arrow key was held. Closing resumed it.
- Reduced-motion and restored WebGL kept position and environmental memories. Returning to WebGL did not replay an old response; real movement resumed it.
- Original four answers, stored envelope, song 02, original draw ID and unlocked gift were unchanged. No progress reset.
- Browser error/warning log was empty.

Evidence: [browser-evidence.json](qa/mushroom-listening-20261102/browser-evidence.json). Actual screenshots include [natural stillness](qa/mushroom-listening-20261102/09-natural-stillness.png), [spread](qa/mushroom-listening-20261102/10-natural-spread.png), [departure](qa/mushroom-listening-20261102/06-departing.png), and [reduced motion](qa/mushroom-listening-20261102/08-reduced-motion.png). The `wave-*` screenshots show deliberate icon replay; they are not labeled natural passage.

## Limits and preview

This turn does not validate physical trackpad feel, pure hover input, FPS under hardware load, audio, mobile, or the complete eight-region route. Birds, pond and chime have not received the proposed new interaction design yet. Static mode deliberately does not play the listening animation. After the motion-toggle button is used, keyboard walking requires focus back on the garden; the browser check explicitly restored that focus.

Local preview: http://localhost:5173/#garden. A deliverable browser tab is left beside the mushrooms. No public deployment. Original documents and reference assets are preserved.

Business content SHA-256: `976aae6cac292789c9c350d99d1264830af0fb6e2ba93cd4cad3a49202d9a84e` (unchanged).
