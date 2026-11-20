# Orange juice rest stop — 2026-11-05

One optional orange-juice stop sits after the pond, before the mushroom hollow, at world (440, 3890). The glass is directly visible. It has no memory exposition, separate panel, score, collectible, or progression gate.

## Implemented

- Original generated watercolor low table and stool; a separate painted glass allows the actual liquid level to change.
- Walk to the front-left edge and click the glass. The planted floof leans toward the straw, takes one sip, and relaxes over 2.4 seconds. Liquid changes from .82 to .56.
- Walking away cancels the gesture smoothly without restoring the liquid. Repeated clicks cannot drain the whole glass or refill it.
- A nearby leaf silhouette was moved left so it no longer conceals the actor at the table.
- The glass target follows the render-frame projection; no change to the continuous pointer movement controller.
- The amount drunk survives panels, map, walking away and renderer switches in the current page session. A page refresh starts a full glass; this optional encounter is not added to saved puzzle progress.
- Reduced motion shows the consumed state immediately. Switching renderer mid-sip releases the unfinished pose while retaining the partial liquid.

## Verified

- TypeScript and production build passed (145 modules). Existing Three.js chunk-size notice remains.
- 11 orange-rest model checks, 38 pointer-guidance checks, 14 pond-dream checks passed: 63 total.
- Nine actual browser checks passed at 1280 × 800: untouched full glass; visible sip with unchanged actor coordinates; exact map pause; leave/cancel and hidden remote target; reading return; mid-sip static switch; explicit static sip; restoration to WebGL; no console warnings/errors.
- Browser frames captured the actual .82 → .56 liquid transition and grounded body response. GIF is a crop of those frames, not concept artwork.
- Content configuration SHA-256 remains `976aae6cac292789c9c350d99d1264830af0fb6e2ba93cd4cad3a49202d9a84e`.

## Evidence

- `qa/orange-rest-20261105/browser-checks.json`
- `qa/orange-rest-20261105/final-sequence.json`
- `qa/orange-rest-20261105/orange-sip-detail.gif`
- `qa/orange-rest-20261105/orange-rest-actual.jpg`
- `qa/orange-rest-20261105/static-sip.png`
- `qa/orange-rest-20261105/console.json`

Desktop native keyboard and click input were tested. Physical trackpad feel, mobile layouts, and a complete new end-to-end puzzle/music/gift run were not retested this round. No public deployment or audio was added. The existing preview on port 4198 serves the updated root `dist`; the earlier packaged release was not replaced.

## Original art provenance

Built-in image generation was used for `public/art/rest/orange-table-v1.png` (RGBA). The glass and variable liquid are original code-painted canvas artwork. The generated table was inspected, copied into the project, and integrated into both renderers.

Exact generation prompt:

> Use case: stylized-concept. Production game sprite with a genuinely transparent background. Paint one small low round pale warm-ivory wooden outdoor tea table, with a single tiny matching low round stool on its right. Quiet elegant gouache and watercolor, subtle handmade irregular edges, matte chalky paint, delicate soft sage gray shadows under table legs. View from a slightly elevated 3/4 perspective, see elliptical tabletop and short legs, front-facing game prop. Deliberately simple, graceful and slightly weathered, NOT detailed realism, NOT glossy 3D, NOT vector. Table occupies left 2/3, stool right 1/3, their feet share baseline. Very low table, height only half its diameter, suitable for a tiny furry orb character. Tabletop completely empty: no glass, no cup, no drinks, no food, no flowers, no cloth. No character, no landscape, no ground patch, no background, no label, no text. Muted cream/sage palette. Entire object inside image with minimal transparent margin. Render as a landscape 3:2 isolated asset.
