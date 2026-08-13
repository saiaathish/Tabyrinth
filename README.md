# TABYRINTH

TABYRINTH helps you explore browser rabbit holes without losing your main task. Set a Quest, browse normally, and when you wander away from your Main Path, fold the entire Detour into one Portal. TABYRINTH returns you to the fork; open the Portal later to restore the trail.

## Current state

Published `main` is `625eef238ae7f6dac11193665527e086d5e47225` ([PR #17](https://github.com/saiaathish/Tabyrinth/pull/17), merged 2026-08-12T08:25:20Z, two successful `verify` checks). [PR #18](https://github.com/saiaathish/Tabyrinth/pull/18) is open at head `446d938c167640b08e4316207fae5d67764868d4` with two successful `verify` checks and no GitHub reviews. This local `codex/prd-completion` branch contains a clean committed PRD-completion checkpoint integrating PR #18. Final Chrome critical path remains **UNVERIFIED**.

The complete judge path (real Chrome tab reorder, Vault/Boss puzzle, VOID tab, and victory) remains **UNVERIFIED** because no direct real-Chrome critical-path run is recorded. Do not present those behaviors as browser-proven until direct Chrome evidence exists.

## Load the extension locally

Requirements: Node.js 22.22.2+ (or 24.15+) and Chrome 116+ with Developer mode enabled. Chrome 116 is the minimum supported version for the Side Panel API. CI pins Node 22.22.2; the current lockfile uses jsdom/undici releases with this Node engine floor.

```sh
npm ci
npm run build
```

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select this repository's generated `dist/` directory.

No account, API key, backend, or network service is required by the product. Reload the extension from `chrome://extensions` after rebuilding.

## How it works

1. Start a Quest: what you are trying to finish.
2. Browse normally. The root becomes your Main Path.
3. Keep useful pages on the Main Path.
4. When a branch wanders away, fold the Detour.
5. Reopen its Portal later to restore the trail.

If any step is not manually verified, stop the sequence and mark it unverified. CI cannot prove real Chrome tab dragging, tab creation, tab isolation, or visual gameplay.

## Safety and isolation

The extension must own and mutate only tab IDs registered to the active run. Test in a dedicated Chrome window. Keep work, school, banking, and personal tabs outside the run. Review manifest permissions before loading an unpacked build. There is no server-side game state.

## Development and checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

See [docs/CI_CONTRACT.md](docs/CI_CONTRACT.md) for the CI contract and [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) for the rehearsal version of the critical path.

## Known limitations

- Published `main` is the PR #17 merge above; this branch includes the open PR #18 candidate and additional uncommitted hardening.
- Chrome behavior and permissions still require manual validation in a real browser.
- Automated checks do not prove real Chrome tab creation, closure, service-worker wake behavior, or visual presentation.
- Chrome Web Store packaging and distribution are out of scope.

## AO build evidence

AO evidence is append-only and factual. Current records cover AO sessions `tabyrinth-5` through `tabyrinth-37` where metadata exists, and recorded PRs #1–#18: #1–#17 are merged and #18 is open. CI outcomes are listed in [docs/AO_BUILD_LOG.md](docs/AO_BUILD_LOG.md). Two attempted AO OpenCode spawns returned `INTERNAL_ERROR`; no OpenCode session, branch, PR, or result exists. Final Chrome critical path remains **UNVERIFIED**.
