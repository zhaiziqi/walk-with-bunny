# New walk entry — 2026-11-10

## How to present a clean experience

Open **http://127.0.0.1:4198/?walk=new#garden** when starting a demonstration. Each opening creates a separate, empty walk at the entrance. The current root preview must be running; `START_GARDEN.command` starts it if necessary.

- **Refresh:** resumes the questions, envelope, selected song and gifts for the current walk.
- **The entrance:** moves back to the entrance without erasing progress.
- **Start a new walk:** opens a new tab with empty progress. Available at the bottom of Map, and on the welcome screen when progress exists.

Keep the reusable `?walk=new` link for future demonstrations. Once opened, the address changes to a unique `?walk=<id>` link for that particular walk; refreshing or reopening that specific address resumes it on the same browser. These are local preview URLs, not a public deployment.

## Implementation

`walkProgress.ts` normalizes the new entry to a UUID and clears the previous hash/history location before App navigation initializes. New walks use one independent localStorage key each (`birthday-garden:walk:v1:<id>`). Normal v2/v1 saves are never read, overwritten or removed by a new walk. Existing development-only temporary previews retain their behavior.

`useProgress` uses the selected walk's store for load, dispatch rebase, mount synchronization and storage events. Other walks and ordinary saved tabs cannot supply solved questions or unlock gifts. Malformed explicit walk IDs create isolated new walks; storage/history failures stay in memory instead of falling through to an old save. A newly opened tab also starts environmental discovery and the camera at the entrance.

No reset action or destructive clear-storage control was added. The unobtrusive new-walk link opens a separate tab, leaving the previous walk available. Existing Return-to-beginning wording was clarified to **The entrance**; welcome action becomes **Continue wandering** when business progress exists.

## Verification

118 focused checks passed: new walk 19, normal cross-tab 17, development preview 12, gift progress 13, music progress 15, puzzle progress 18, trail gift 9, gift entry 7, map guidance 8. TypeScript and production build passed. The existing large Three.js bundle advisory remains.

Actual 1280×720 desktop-browser checks used the production build on port 4198:

1. Clicked Map → Start a new walk; received a different tab/UUID at the entrance with all business state empty.
2. Walked to the lantern desk with keyboard input, clicked the desk, and observed question 1 with all four digit slots empty.
3. Answered the first question, refreshed, and observed the same walk ID, the first digit kept and question 2 awaiting input.
4. Returned to the entrance, used its Start a new walk link, and observed another distinct ID with zero answers again.
5. Reloaded the original normal tab: its recorded business fields were unchanged, including the previously found sleep mask.
6. Visited the test walk's protected gift URL: it showed the password lock, not the gift reveal.

Warnings/errors captured from all three tested tabs were empty. [Observations](qa/new-walk-20261110/browser-checks.json).

- [Map entry](qa/new-walk-20261110/01-map-new-walk.png)
- [Fresh welcome](qa/new-walk-20261110/02-fresh-entrance.png)
- [First question with empty slots](qa/new-walk-20261110/03-first-question-empty.png)
- [Resume and new-walk choices](qa/new-walk-20261110/04-resume-or-new.png)
- [Untouched entry left ready for the user](qa/new-walk-20261110/05-ready-to-show.png)

Root dist and running 4198 preview updated. No user save was reset, no public deployment, and the older release archive was not rebuilt. This round did not repeat the full music/gift playthrough, real trackpad testing or mobile layout testing.
