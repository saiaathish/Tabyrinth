# Release blockers

Current release boundary: 2026-08-13.

- B1 — Automated suite: **PASS**. `npm test -- --run` reports 23 files and 158 tests passing.
- B2 — Static gates: **PASS**. Typecheck, lint, production build, extension validation, and `git diff --check` pass.
- B3 — Second-tab tracking: **IMPLEMENTED/automated**. Same-tab identity is preserved; an explicitly opened second web tab is exposed as outside the trail and can be tracked with the exact parent fallback and fail-closed errors.
- B4 — Generated-extension E2E: **PARTIAL**. Isolated Chrome 151 discovers the unpacked MV3 service worker, but Chrome loads test-created extension pages as `chrome-error://chromewebdata`; `artifacts/e2e/report.json` records the failed browser harness attempt. This is an external Chrome/CDP limitation.
- B5 — Untouched-profile Chrome proof: **UNVERIFIED**. The connected user Chrome was on Gmail, and no current-profile Fold/Unseal or second-tab run was claimed.

137 is a historical checkpoint, not the canonical current suite. The current verified total is 158.
