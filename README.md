# TABYRINTH

TABYRINTH helps you explore browser rabbit holes without losing your main task. Set a Quest, browse normally, and when you wander away from your Main Path, fold the entire Detour into one Portal. TABYRINTH returns you to the fork; open the Portal later to restore the trail.

## Current state

The current `codex/prd-completion` release patch keeps Portal Fold as the flagship and moves the Side Panel to Quest, Main Path, Detour, and Portal recovery. The automated suite is **158 tests passing**; final untouched-profile Chrome critical path remains **UNVERIFIED**.

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

- Chrome behavior and permissions still require manual validation in a real browser; the connected browser could render the local UI preview but could not claim `chrome://extensions` for an unpacked-extension run.
- Automated checks do not prove real Chrome tab creation, closure, service-worker wake behavior, or visual presentation.
- Existing copied-profile CDP evidence covers the earlier Portal runtime checkpoint; it is not re-used as fresh proof for the compatibility recovery.
- Chrome Web Store packaging and distribution are out of scope.
- On this macOS Chrome 151 host, an isolated CDP launch discovered the unpacked MV3 service worker but Chrome loaded test-created extension pages as `chrome-error://chromewebdata`; the generated extension-page E2E therefore remains an external browser limitation, not a product pass claim.

## AO build evidence

AO evidence is append-only and factual. Current records cover AO sessions `tabyrinth-5` through `tabyrinth-37` where metadata exists, and recorded PRs #1–#18: #1–#17 are merged and #18 is open. CI outcomes are listed in [docs/AO_BUILD_LOG.md](docs/AO_BUILD_LOG.md). Two attempted AO OpenCode spawns returned `INTERNAL_ERROR`; no OpenCode session, branch, PR, or result exists. Final Chrome critical path remains **UNVERIFIED**.
