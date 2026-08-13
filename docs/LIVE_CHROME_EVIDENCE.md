# TABYRINTH Live Chrome Evidence

## Environment

- Chrome family: connected through the Codex Chrome browser integration
- Chrome version observed in the isolated extension harness: `Chrome/151.0.7922.109`
- Loaded extension ID reported by the isolated harness: `fignfifoniblkonapihmkfakmlgkbkcf`
- Reviewed Git SHA: `fea46477ff5e8218711fdb4f0f655cf4b047929a`
- Remote SHA: `fea46477ff5e8218711fdb4f0f655cf4b047929a`
- Build: `npm run build` passed; `dist` extension validation passed
- Review date: `2026-08-13`
- Sensitive data policy: private Gmail, settings, and account tabs were not opened, read, or used for testing

## Browser access boundary

The connector successfully opened `https://example.com/` in a clean agent tab. Its DOM showed the expected Example Domain heading and link. The only captured console error came from the separate browser-assistance content script (`chrome-extension://bkkbcggnhapdmkeljlodobbkopceiche/content.js`), not Tabyrinth.

Direct navigation to `chrome://extensions/` was rejected by browser URL policy. Direct navigation to `chrome-extension://fignfifoniblkonapihmkfakmlgkbkcf/sidepanel.html` was rejected by the same policy. The visible Chrome Extensions manager tab was also not claimable through the connector. Therefore no Side Panel or Portal interaction below is labelled `PROVEN_LIVE`.

## Live tests

### Start Quest

Expected: open the Side Panel on a harmless public page, enter a Quest, and see the page become the root/Main Path node.
Observed: the live Side Panel could not be opened through the browser connector.
Status: `NOT_TESTED`
Evidence: implementation and automated runtime/message tests only.

### Onboarding

Expected: four short stages explain the useful path, trail, reversible detour, and Portal; completion persists and Replay introduction reopens it.
Observed: no live extension page was accessible.
Status: `PROVEN_AUTOMATED` for component/persistence behavior; `NOT_TESTED` live.
Evidence: onboarding source and current component tests.

### Main Path

Expected: root and explicitly kept pages show the path; Fold is not offered for a path page.
Observed: no live Side Panel.
Status: `PROVEN_AUTOMATED`; live `NOT_TESTED`.
Evidence: graph selector, runtime, and Side Panel tests.

### Same-tab navigation

Expected: navigation changes current-page metadata without fabricating a new unsafe child relationship.
Observed: no live Quest.
Status: `PROVEN_AUTOMATED` / live `NOT_TESTED`.
Evidence: branch/runtime and navigation contract tests.

### Normal child tabs

Expected: safe A → B → C ancestry is captured with stable parent relationships.
Observed: no live Quest.
Status: `PROVEN_AUTOMATED` / live `NOT_TESTED`.
Evidence: ancestry/runtime tests covering opener capture, late metadata, and stable parent closure.

### Untracked tab

Expected: an unrelated manually created tab shows Outside Trail and is not guessed into the Quest.
Observed: no live Side Panel.
Status: `PROVEN_AUTOMATED` / live `NOT_TESTED`.
Evidence: explicit tracking and ownership tests.

### Add to Main Path

Expected: explicit action adopts the current supported tab exactly once.
Observed: no live Side Panel.
Status: `PROVEN_AUTOMATED` / live `NOT_TESTED`.
Evidence: runtime/message and Side Panel contract tests.

### Keep on Main Path

Expected: explicit action marks the current node as path and changes future Detour derivation.
Observed: no live Side Panel.
Status: `PROVEN_AUTOMATED` / live `NOT_TESTED`.
Evidence: reducer/runtime/selector tests.

### Automatic Detour derivation

Expected: current unclassified E below path B produces a three-node C/D/E Detour and return fork B.
Observed: no live Side Panel.
Status: `PROVEN_AUTOMATED` / live `NOT_TESTED`.
Evidence: selector/fold tests derive nearest path ancestor, branch root, descendants, and tab count.

### Fold

Expected: persist Portal first, close only selected owned branch tabs, leave Main Path and unrelated tabs, activate the fork.
Observed: no live Fold action could be issued.
Status: `PROVEN_AUTOMATED` for transaction/ownership contracts; live `NOT_TESTED`.
Evidence: fold runtime, delete, ownership, reducer, and service-worker tests.

### Portal

Expected: one real Portal page shows sealed-page count, title, fork origin, branch contents, lifecycle status, and Unseal.
Observed: direct extension-page navigation was blocked.
Status: `PROVEN_AUTOMATED` for implementation/contracts; live `NOT_TESTED`.
Evidence: Portal page source, Portal model, runtime tests.

### Return to fork

Expected: origin/Main Path tab becomes active after Fold.
Observed: no live Fold.
Status: `PROVEN_AUTOMATED` / live `NOT_TESTED`.
Evidence: fold runtime and service-worker action coverage.

### Unseal

Expected: branch restores parent-before-child, avoids duplicate stable nodes, keeps Portal on partial failure, and removes Portal only after full success.
Observed: no live Portal page.
Status: `PROVEN_AUTOMATED` / live `NOT_TESTED`.
Evidence: restore runtime tests.

### Duplicate Unseal

Expected: repeated restore skips valid existing bindings rather than duplicating the branch.
Observed: no live Portal page.
Status: `PROVEN_AUTOMATED` / live `NOT_TESTED`.
Evidence: restore/runtime duplicate-protection tests.

### Closed origin recovery

Expected: Portal remains recoverable/sealed and the UI explains that the fork is closed.
Observed: no live Portal page.
Status: `PROVEN_AUTOMATED` / live `NOT_TESTED`.
Evidence: missing-origin state and Portal error contracts.

### Unrelated tab isolation

Expected: a deliberately unrelated public tab remains open, unchanged, and unclaimed through Start → Fold → Unseal.
Observed: this critical path could not be performed in the loaded extension.
Status: `NOT_TESTED`
Evidence: automated ownership tests are supporting evidence, not live proof.

### Service-worker recovery

Expected: worker suspension/restart retains durable Quest, graph, and Portal state and wakes on the next browser event.
Observed: the connected Chrome surface did not expose a controllable Tabyrinth worker target; no termination/restart was attempted.
Status: `PROVEN_AUTOMATED` for persistence/reconciliation contracts; live `NOT_TESTED`.
Evidence: storage, worker, and reconciliation tests.

### Real Side Panel width

Expected: the 360 × 720 panel remains readable and keyboard/reduced-motion states are usable.
Observed: no live Side Panel viewport was available.
Status: `NOT_TESTED` live; source/CSS and component evidence only.
Evidence: Side Panel markup, CSS, reduced-motion rule, and focus tests.

## Automated gates supporting this review

- `npm run typecheck`: PASS
- `npm run lint`: PASS
- `npm test`: PASS — 23 test files, 159 tests
- `npm run build`: PASS
- `npm run validate:extension`: PASS — `dist` manifest and entrypoints valid
- `npm run test:e2e:extension`: FAIL — 5 checks passed, generated extension E2E failed because popup runtime API was unavailable after the page landed on `chrome-error://chromewebdata/`
- `git diff --check`: PASS before review

The E2E command rewrote `artifacts/e2e/report.json`; that generated change was restored. It is not part of this review’s documentation diff.

## Failures and blockers

1. **Live extension surface unavailable through the current connector.** Chrome URL policy rejected both the extension manager and extension-page URLs. This is a review-environment blocker, not evidence that the product UI fails.
2. **Isolated extension E2E fails at popup runtime context.** The harness proves build/launch/service-worker discovery and fixture loading, then fails when the generated page has no extension runtime API context. This is a genuine automated-test blocker for release confidence.
3. **No live critical-path evidence.** Fold, Portal, Unseal, and unrelated-tab isolation remain unverified in the loaded user profile.

## Final live verdict

`NOT_TESTED` for the real extension critical path. The current review provides strong automated and code evidence, but it does not provide the live Chrome proof required for a ready-to-record verdict.
