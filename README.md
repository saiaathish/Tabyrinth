# TABYRINTH

TABYRINTH turns your real Chrome tab strip into a dungeon: every managed tab is a room, dragging tabs rewires the level, and closing tabs can destroy parts of the world.

## Current state

The integrated `main` history is current through commit `e730b52` ([PR #11](https://github.com/saiaathish/Tabyrinth/pull/11)), with [PR #12](https://github.com/saiaathish/Tabyrinth/pull/12) also merged. Both PRs have green `verify` checks. The complete judge path (real Chrome tab reorder, Vault/Boss puzzle, VOID tab, and victory) remains **UNVERIFIED** because no direct real-Chrome critical-path run is recorded. Do not present those behaviors as browser-proven until direct Chrome evidence exists.

## Load the extension locally

Requirements: Node.js 20+ and Chrome with Developer mode enabled.

```sh
npm ci
npm run build
```

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select this repository's generated `dist/` directory.

No account, API key, backend, or network service is required by the product. Reload the extension from `chrome://extensions` after rebuilding.

## 90-second demo sequence

Use only a clean Chrome window and the tabs created by TABYRINTH. Keep the browser tab bar visible.

1. **0–10s — Hook:** show the TABYRINTH group and say: “These five Chrome tabs are the dungeon.”
2. **10–20s — Topology:** drag the `Vault` tab. Show the in-game topology changing and say: “Dragging the real browser tab rewires the level.”
3. **20–45s — Explore:** move through rooms, obtain the Sigil, and reach the boss.
4. **45–60s — Puzzle:** if the boss rejects the Sigil, drag `Vault` beside `Boss`; show the shield change.
5. **60–75s — VOID:** let the boss create the real `VOID` tab, then close that tab and show the rift clearing.
6. **75–90s — AO evidence:** show only real AO session/branch/PR/CI/review records from `docs/ao-evidence/`. Current real-browser evidence status: `UNVERIFIED`.

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

- The repository's current main branch is a foundation, not a verified submission build.
- Chrome behavior and permissions still require manual validation in a real browser.
- Automated checks do not prove real tab dragging, tab-group behavior, service-worker wake behavior, popup/room presentation, or the full boss/Void run.
- Chrome Web Store packaging and distribution are out of scope.

## AO build evidence

AO evidence is append-only and factual. Current records cover AO sessions `tabyrinth-5` through `tabyrinth-26` where metadata exists, merged PRs #1 and #6–#13, and the CI outcomes explicitly listed in [docs/AO_BUILD_LOG.md](docs/AO_BUILD_LOG.md). Two attempted AO OpenCode spawns returned `INTERNAL_ERROR`; no OpenCode session, branch, PR, or result exists. Never fill an example with invented events.
