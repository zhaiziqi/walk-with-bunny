# Final gift: reference and composition review

17 November 2026. Design study only. The current page, production deployment and saved progress are unchanged. `painted-gift-study.png` is a narrative illustration study, not a browser screenshot, approved UI comp or shipping asset.

## Verdict

The local folded card is orderly but misses the user's stated direction. Its large, detailed passport holder, tissue and cast shadow make the gift the subject; the added realistic rabbit acts as a product prop. Replacing dense scenery with this quieter product layout did not solve the underlying composition problem.

The user's reference showing a very small bunny in a large blue ocean was reopened. Its scale relationship, broad painted fields and incongruous small action are the useful reference. The requested dark-doorway image was present in the conversation but its original filesystem path no longer exists; it was not re-inspected locally. The artist's publisher emphasizes humor and surrealism as well as cuteness: https://publishing.parco.jp/books/detail/?id=516 . This is a reason to author a small character-led action, not merely add a bunny to a still life.

## What the two skills contribute

- `impeccable`: Experience mode; emotional continuity, specificity, focal hierarchy, source and actual-render review. A local reveal inherits the existing world; it must not become a new visual identity exercise.
- `design-taste-frontend`: coherent materials, deliberate visual weight, legible controls, purposeful motion and real rendered evidence. Its commercial-site product hero, stock-photo and full-page templates do not apply to this personal garden. The user's existing palette and character decisions take precedence.

## Priority issues

1. **P1: The gift has replaced the character as the subject.** The stitched, dimensional object overwhelms the small rabbit; this composition could sell many unrelated products. Repaint the object with the same broad gouache marks as the world, reduce its visual weight, and let the established light-being react to it. Keep the passport-holder silhouette readable without a material showcase. Suggested work: shape, quieter, polish.
2. **P1: The card layout interrupts the ending.** The hard rectangular card, vertical fold and left-title/right-product split detach the reveal from the journey. Preserve the controlled reveal and return actions, but give the moment one coherent painted setting and a single small action. Suggested work: shape, animate, polish.

## Concrete proposed moment

After the existing four-digit lock succeeds, navigation recedes and a warm patch of light holds the small wrapped gift and the established fluffy light-being. The already familiar paper bird lands beside it, catches a loose tissue corner and draws it away; the gift becomes visible. The light-being leans toward it and settles. `Happy birthday.` arrives after the action. The brief shared event, rather than a product zoom, supplies the ending's surprise.

Proposed sequence: 0–0.6 s settle/focus; 0.6–1.1 s bird lands and catches paper; 1.1–2.1 s tissue slides and reveals the object; 2.1–2.7 s light-being reacts; 2.7–3.3 s birthday line and return control settle. No new password, mandatory second unlock, long blessing, confetti or repeated particle loop. Reduced motion goes directly to the complete scene. Name remains optional behind the small paper tag.

The field should blend into the garden rather than form another large opaque blue rectangle. The final composition is not approved: character/gift size and a clear comfortable return control need to be settled in a true page comp before implementation.

## Illustration study

Built-in imagegen, one generation, original narrative gouache study. `prompt.txt` records the exact prompt. Image saved as `painted-gift-study.png` (1536 × 1024). This tests the bird/paper/character relationship and shared light, not interface layout.

What it demonstrates: gift and figures share a painted material; the paper bird has a reason to be there; tissue connects their actions; background is an environment rather than a white product cutout.

What must not be copied literally: the new eyes and ear tufts are not approved replacements for the existing light-being; the brushwork is coarser than the site's current background; the subjects fill too much of this standalone illustration for a full desktop viewport. Preserve the existing character in the eventual implementation, soften the background texture, and test the scene at actual size. Do not ship this flattened image as an animation substitute.

## Independent assessment and evidence

Assessment A read the rubric, screenshot, reference and source without detector results. Assessment B independently ran the detector and checked source invariants. Parent inspected a fresh browser tab at 1280 × 720; it matched `docs/qa/finale-card-20261117/01-card-closed.jpg`, with the birthday heading focused. No full-flow, audio or physical trackpad retest was needed for this read-only design study.

Heuristic assessment for this Experience surface: status 3/4; match 2/4; control 3/4; consistency 2/4; prevention n/a (no risky input on revealed screen); recognition 2/4; efficiency n/a; aesthetics 2/4; recovery 3/4; help n/a. Total 17/28. This score is a usability/context diagnosis, not a vote overriding the user's taste.

Strengths: restrained color family, low cognitive load (four visible actions), and optional tag discovery. First-time visitors may not recognize the tag as interactive. The main emotional weakness is the end-of-journey shift into a merchandise presentation.

Detector: `impeccable detect --json src/ui/GiftDoor.tsx src/ui/GiftObjects.tsx`, exit 0, `[]`; zero findings and no false positives. This does not establish aesthetic quality. Manual source review found nominal navigation contrast around 3.47:1 and revealed tag text around 4.40:1, to darken and confirm in the eventual rendered revision. Password 0305, midway sleep-mask separation, hidden name, focus management and reduced-motion support remain in source.

No ignore file. No mutable browser overlay was injected (CUA evaluation is read-only). No server was created or stopped. No source, CSS, gameplay or deployment was edited. Existing skill context reported project setup drift; it was not repaired as a side effect of this design study.

## Next decision

Evaluate the illustration's relationship and light before choosing the final UI framing. The open question is whether the character-led unwrapping feels closer to the supplied references, or is still too sweet/storybook-like. User preferences, scene scope, desktop priority and game rules are already settled and need not be requested again.
