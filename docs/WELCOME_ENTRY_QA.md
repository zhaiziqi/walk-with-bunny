# Stable welcome entry · 2026-11-10

The welcome invitation previously disappeared on pointer movement before the user could reach Begin wandering. The scene input surface and controller now require `entered=true`; the welcome region also blocks scene input. Begin/Continue remains a normal button, with keyboard activation and focus transferred to the newly active surface on the next animation frame. Returning to the entrance stops movement and focuses Begin.

After entry, continuous directional pointer walking, turning and stopping parameters remain unchanged. Header content shortcuts explicitly position the camera when opened from the inactive welcome screen. Puzzle, music, gift rules and all existing saves remain unchanged.

## Verification

- `scripts/check-pointer-guidance.mjs`: 41 checks passed. Includes actual hook handlers for pointer/mouse/wheel/arrows/touch before entry, both frame drivers, continuous pointing after explicit entry, and clearing old hover/key/wheel input when returning to the entrance. Actual App entry conditions, inert/tab-index/ARIA attributes and Begin focus timing are tested through extracted source expressions/handlers.
- `scripts/check-gift-entry.mjs`: 7 checks passed, including welcome shortcuts, preserved return position and locked gift entry.
- `scripts/check-walk-progress.mjs`: 19 isolated-walk checks passed; fresh starts, refresh resume and original-save isolation remain intact.
- `sh scripts/project.sh build`: passed. Existing bundle-size advisory remains nonfatal.
- Production browser at `127.0.0.1:4198`, separate empty walk, 1280 × 720: heading click, arrow and scroll leave the invitation visible and actor/camera unchanged; Begin click enters and focuses the scene; arrow walking changes position; The entrance restores the welcome; Enter activates Begin; no subsequent input leaves the actor stationary; homepage music shortcut opens; closing restores the entry position; refresh shows the stable welcome. Captured warnings/errors: none.

Browser observations: [browser-checks.json](qa/welcome-entry-20261110/browser-checks.json). Actual screenshot: [stable-welcome.png](qa/welcome-entry-20261110/stable-welcome.png).

The browser tool cannot issue a pure unpressed trackpad hover gesture. Hover event behavior was covered by deterministic tests of the actual controller, not claimed as a physical-trackpad retest. No mobile, full-garden playthrough or performance benchmark was performed for this focused fix. Current root `dist` is served on 4198; the older release package and public hosting were not changed.
