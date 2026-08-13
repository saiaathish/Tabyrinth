# Portal Transition Build Log

## Baseline

- Repository: `/Users/saiaathishkarthik/Desktop/Tabyrinth`
- Baseline branch: `codex/prd-completion`
- Baseline commit: `3c81227 fix: preserve rollback safety`
- Baseline status: dirty before this transition; existing user changes preserved
- Baseline typecheck: PASS
- Baseline lint: PASS
- Baseline tests: PASS — 11 files, 67 tests
- Baseline build: PASS — Vite production build
- Existing Quest UI: Context Room/popup implementation; not Portal Fold
- Arcade: automated source/tests present; real Chrome behavior UNVERIFIED
- AO CLI: unavailable in checkout/PATH; fallback isolated-worker evidence recorded in `docs/AO_BUILD_LOG.md`

## PRD gate

- Existing `TABYRINTH_PRD.md` updated in place.
- `git diff --check`: PASS after rewrite.
- Portal Fold primary product: PASS.
- Real implementation gate: NOT STARTED before PRD rewrite; Portal Fold and Side Panel remain missing.

## Current automated gate

- Historical checkpoint: PASS — 18 files, 105 tests (superseded by the authoritative gate below)
- Typecheck: PASS
- Lint: PASS
- Build: PASS — Portal, Side Panel, and service worker bundles emitted
- Diff-check: PASS
- Manifest: Side Panel permission and `sidepanel.html` default path present
- Real Chrome Fold/Unseal and service-worker revival: `UNVERIFIED`
- Browser attempt: in-app browser connected, but unpacked local MV3 extension loading/Chrome extension tab control was unavailable; no live Fold/Unseal claim made.
- Latest source audit: Begin Quest creates and persists the active-tab root; known-opener descendants persist through service-worker events; Side Panel reads persisted graph state. Focused Portal tests: 8 passed. Full Vitest worker run encountered host worker startup/termination errors; this is not treated as a full-suite PASS.
- Historical checkpoint: full suite PASS — 18 files, 105 tests. Typecheck/lint/build/diff-check PASS. Side Panel now sends the persisted graph and active node to Fold; unrelated tabs without known openers are ignored. The Side Panel sender authorization regression is covered.
- Historical checkpoint: `portal.html` renders durable Portal metadata and an accessible `UNSEAL BRANCH` action with partial-restore status. Side Panel trail is derived from persisted ancestry rather than demo nodes. Full automated gate was PASS — 18 files, 105 tests; typecheck/lint/build/diff-check PASS. Manifest entry gate PASS: toolbar action has no popup and opens `sidepanel.html`.
- Flagship entry alignment: toolbar action now opens the MV3 Side Panel directly; obsolete popup is no longer the default action surface. Portal tab bindings persist in session storage and are cleared on successful restore or manual Portal close.
- Latest Chrome attempt: Chrome backend connected and exposed existing tabs, but `chrome://extensions/` was not claimable; no unpacked-extension install or live Fold/Unseal interaction was performed. Live browser gate remains `UNVERIFIED`.
- Historical checkpoint: Portal titles derive from the branch-root title/hostname plus page count. Exact title generation is covered by tests. Full automated gate was PASS — 18 files, 105 tests; typecheck/lint/build/manifest/diff-check PASS.
- Latest Chrome retry: connected Chrome listed `chrome://extensions/`, but claiming that internal tab failed (`Chrome internal tab ... cannot be claimed`). No extension installation or live A→B→C→D Fold/Unseal test was performed. Live browser gate remains `UNVERIFIED`.
- Latest UI safety pass: the Side Panel now disables Fold for the Quest root/path and reports `Nothing to fold` until the active node is an unclassified descendant of a path node. Full automated gate remains PASS — 18 files, 102 tests; typecheck/lint/build/diff-check PASS.
- Latest lifecycle hardening: Unseal now rejects concurrent restore and already-open Portals; stable existing bindings remain deduplicated and are covered by restore regression tests. Full automated gate: 18 files, 100 tests passed; typecheck/lint/build/diff-check PASS. Lint emits one existing React hook dependency warning, no errors.
- Latest final UI state pass: Side Panel clears stale current-node focus when the active Chrome tab is unrelated, preventing a previous Quest branch from being presented as foldable. Full automated gate remains clean: 18 files, 100 tests; typecheck/lint/build/diff-check PASS.
- Latest restore fidelity pass: Unseal now uses the live origin binding as the opener for a restored branch root when that origin is outside the snapshot, preserving the fork topology. Regression coverage added. Full automated gate: 18 files, 101 tests passed; typecheck/lint/build/diff-check PASS.
- Latest fold lifecycle pass: successful folds now persist captured branch nodes as `sealed`/`portal` in the durable graph after tab closure, preventing sealed nodes from being treated as live Quest ancestry. Snapshot contents remain available for restore.
- Latest fold persistence correction: the durable graph now takes final live bindings from `chrome.storage.session` after branch bindings are cleared, preventing closed branch tab IDs from returning after worker restart. Full automated gate remains PASS — 18 files, 101 tests; typecheck/lint/build/diff-check PASS.
- Latest fold failure-safety pass: if the origin disappears after Portal creation but before placement, the new Portal tab is best-effort removed while the persisted snapshot remains retryable. Regression coverage added. Full automated gate: 18 files, 102 tests passed; typecheck/lint/build/diff-check PASS.
- Latest flagship-surface pass: Side Panel component defaults no longer fabricate trail pages or Portal/Loot counts; empty/start state is now the neutral default, with persisted runtime data supplied only by the live wrapper. Full automated gate remains PASS — 18 files, 102 tests; typecheck/lint/build/diff-check PASS.
- Latest manifest permission pass: added the PRD-required `tabs` permission for opener/metadata lifecycle tracking; no host permissions were added. Side Panel entry remains the default toolbar surface.
- Latest manual-Portal lifecycle pass: removing a tracked Portal tab now clears its session binding and persists `PORTAL_TAB_UNAVAILABLE` on the durable Portal while leaving the branch snapshot/history untouched. Successful restored Portals are not marked unavailable by their intentional removal.
- Manual-Portal deletion reducer contract is covered: unavailable state clears only the Portal tab identity and preserves the full snapshot.
- Latest Portal-tab race pass: intentional Portal removal during `restoring` is no longer misclassified as manual deletion; only sealed/error Portal tabs become unavailable. Full automated gate remains PASS — 18 files, 103 tests; typecheck/lint/build/diff-check PASS.
- Latest restore failure-safety pass: live-origin lookup failures now return retryable partial-restore results instead of escaping the restore transaction. Regression coverage added.
- Restore failure-safety regression is green; full automated gate is now 18 files, 104 tests with typecheck/lint/build/diff-check PASS.
- Historical checkpoint: service-worker manual-Portal deletion event coverage is green; full automated gate was 18 files, 105 tests with typecheck/lint/build/diff-check PASS.
- Earlier 102/103/104/105/137-test entries above are historical checkpoints; the current authoritative total is 23 files, 140 tests.
- Latest event-surface pass: the service worker now registers `tabs.onActivated` so active-tab changes participate in reconciliation alongside creation, update, movement, attachment, and removal events.
- Historical checkpoint: activation-listener mock and registration contract are green; full automated gate was 18 files, 105 tests with typecheck/lint/build/diff-check PASS.
- Latest Computer Use browser pass: TABYRINTH was observed loaded/enabled in Chrome (extension ID `oockgmcnndahfdbeninicliacgplfjlg`); the Side Panel opened on a normal Google tab and `BEGIN QUEST` succeeded, showing a persisted one-page Google trail. An initial live crash (`Cannot read properties of null (reading 'currentNodeId')`) was hardened in `src/pages/sidepanel/main.tsx`; rebuilt/reloaded extension then returned the explicit safe error `UNSUPPORTED_ACTIVE_TAB` when invoked from the extension page. Opener-linked A→B→C→D Fold/Unseal remains UNVERIFIED because Computer Use did not produce a reliable opener-linked child-tab chain.
- Latest raw-CDP evidence audit: locally preserved `/tmp/tabyrinth-e2e/evidence/evidence.json` contains 58 records: 30 `PASS`, 1 `NOTE`, 0 `FAIL`, plus 27 raw state captures. Observed run used the built TABYRINTH extension in a copied Chrome profile and verified real opener chains B←A, C←B, D←C; A→B→C→D trail; B/C/D closure; exactly one Portal adjacent to A; A active after Fold; unrelated tab unchanged; Portal Unseal; restored opener chains B←A, C←new-B, D←new-C; Portal tab removal after success; and service-worker recovery mid-flow and post-Unseal. The single NOTE is expected durable Portal record persistence as `open` with `portalTabIds` cleared after successful restore. This is direct local CDP artifact evidence, not a claim about the user's untouched live Chrome profile.

## Current authoritative gate — 2026-08-12

- `npm test`: PASS — 23 files, 140 tests.
- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm run build`: PASS — Side Panel, Portal, Popup, Room, and service-worker bundles emitted.
- `git diff --check`: PASS.
- Rendered preview QA: PASS at 360×720 for active Side Panel and Portal artifact. Preview data is non-production and does not prove Chrome tab behavior.
- React Bits: one dependency-free Folder visual adapted for Portal artifact; license boundary recorded in `THIRD_PARTY_NOTICES.md`.
- Direct copied-profile CDP evidence: local artifact records 30 PASS, 1 NOTE, 0 FAIL across Fold, Unseal, opener ancestry, unrelated-tab safety, and worker recovery. This is direct local evidence, not untouched user-profile proof.
- Untested/blocked: live Fold/Unseal in the user’s current Chrome profile and AO CLI execution remain `UNVERIFIED`.
- Latest exact-tree release gate: after `npm ci --ignore-scripts` with pinned dependency versions, `npm run typecheck`, `npm test -- --run` (23 files, 140 tests), `npm run lint`, `npm run build`, `npm run validate:extension`, and `git diff --check` all passed. The validator now checks MV3 manifest metadata, Side Panel/service-worker wiring, emitted entrypoints, local bundle references, and forbidden host permissions. This evidence is local and current to the dirty checkout; no commit or untouched-profile browser claim is implied.
- Exact committed release gate at `973e9de896399fa2c6c75bc0a1dbcd20e4d39da7`: `npm test -- --run` PASS (23 files, 142 tests), `npm run typecheck` PASS, `npm run lint` PASS, `npm run build` PASS, `npm run validate:extension` PASS, and `git diff --check` PASS. This commit includes the responsive UI refinement, explicit restore-window binding, and fail-closed stale Portal-session reconciliation. Direct untouched-profile Chrome Fold/Unseal and AO CLI evidence remain `UNVERIFIED`.
- Final docs-bound head is `205dff3120c0de533a589bf7d15f354f7c062429` (the evidence-only follow-up commit after the tested runtime head); the same exact code gate remains valid because that commit changes only this build log. A fresh isolated Chrome harness attempt on this macOS host could not load a controllable unpacked extension target, so it adds no new browser proof. Direct Chrome Fold/Unseal and AO CLI evidence remain `UNVERIFIED`.
