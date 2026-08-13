# TABYRINTH — Portal Fold

## Executive Summary

TABYRINTH lets people explore rabbit holes without losing the main task. A Quest has one goal and one browsing trail. When a descendant branch becomes distracting, **Fold Branch** persists the complete subtree, replaces it with one real Chrome extension Portal tab, closes only verified branch tabs, and returns focus to the fork. **Unseal** reconstructs the branch later.

Primary product: Portal Fold Quest Mode. Primary UI: Chrome Side Panel. Secondary product: existing Arcade mode, preserved for compatibility.

## Problem

Normal browsing turns one useful page into an unbounded chain of tabs. Closing the chain loses context; keeping it creates clutter. TABYRINTH makes a descendant browsing subtree a reversible browser object.

## Competitive Boundary

TABYRINTH is not tree-style tabs, saved sessions, tab groups, notes, or a task dashboard. Its narrow differentiator is: one action compresses a live descendant subtree into one actual Portal tab, preserves relationships, rewinds to the origin, and later reconstructs the subtree.

## One-Sentence Pitch

Fold an entire browser rabbit hole into one tab, then reopen it later.

## Product Modes

### Quest / Portal Mode — primary

The user enters one goal, browses normally, and folds distracting branches. TABYRINTH records ancestry silently. Loot is optional and small. Quest completion never deletes Portals or Loot.

### Arcade — secondary

Preserve the existing dungeon game, managed-tab topology, Void behavior, and victory flow when they work. Do not add enemies, weapons, progression, campaigns, or multiplayer.

## First 30 Seconds

No active Quest:

```text
TABYRINTH
What are you trying to finish?
[ Ship the next release________ ]
[ BEGIN QUEST ]
Try Arcade
```

Begin Quest queries the active normal HTTP(S) tab, creates the Quest root, persists it, and opens the Side Panel. No rooms, wizard, login, API key, AI, or planning workflow.

## Quest State

```ts
type Quest = {
  id: string; title: string; rootNodeId: string;
  currentNodeId: string | null;
  status: "active" | "complete" | "archived";
  createdAt: number; completedAt: number | null;
}
```

The root is protected. `KEEP ON PATH` marks a node as `path`; new nodes default to `unclassified`. `SAVE AS LOOT` stores one useful page. `FINISH QUEST` marks complete while retaining saved data.

## Branch Graph

```ts
type BranchNode = {
  id: string; questId: string; parentNodeId: string | null;
  liveTabId: number | null; windowId: number | null;
  url: string | null; title: string | null; faviconUrl: string | null;
  disposition: "path" | "unclassified" | "loot" | "portal";
  status: "live" | "sealed" | "closed" | "portal";
  createdAt: number; updatedAt: number;
}
```

Chrome tab IDs are ephemeral bindings, never durable node identity. Parent relationships remain after a parent closes, a tab is replaced, a Portal is folded, a browser restarts, or a branch is restored.

## Chrome Event Capture

Register top-level MV3 listeners for `tabs.onCreated`, `tabs.onUpdated`, `tabs.onRemoved`, `tabs.onActivated`, movement, attachment, startup, and installation. On `onCreated`, read `openerTabId` immediately, resolve it to a stable parent node, create a skeleton node, then hydrate URL/title/favicon through `onUpdated`. Never create duplicate nodes on metadata updates.

Listeners must be registered before asynchronous reconciliation can miss events. Service-worker handlers reload authoritative state from storage; they must not rely on globals.

## Stable Node Identity

Durable state belongs in `chrome.storage.local`: Quest, BranchNodes, Portals, snapshots, Loot, and settings. Ephemeral bindings belong in `chrome.storage.session`: tab ID to node ID, live Portal tab IDs, window bindings, restore transactions, and Arcade session state. Reconciliation clears stale bindings after `tabs.get` fails.

## Portal Data Model

```ts
type Portal = {
  id: string; questId: string; title: string;
  originNodeId: string; branchRootNodeId: string; nodeIds: string[];
  portalNodeId: string; portalTabId: number | null;
  status: "sealed" | "restoring" | "open" | "error";
  createdAt: number; updatedAt: number;
}
```

The snapshot stores nodes and `parentNodeId` relationships, not only URLs. Same URLs in different branches remain distinct by stable node ID.

## Fold Algorithm

`foldBranch(currentNodeId)` is a serialized transaction:

1. Validate active Quest and current node.
2. Walk toward root; find nearest `path` ancestor. The branch root is its immediate child.
3. Enumerate that branch root and all descendants.
4. Validate every live candidate belongs to the Quest and selected subtree. Any uncertain tab aborts with `FOLD_BLOCKED_UNSAFE_TAB`.
5. Snapshot URL/title/favicon/relationships.
6. Persist Portal and transaction state before closing anything.
7. Create one real extension tab at `portal.html?portal=<id>`.
8. Place it after the origin when safe; never reorder unrelated tabs for cosmetics.
9. Close only validated live branch tabs.
10. Clear live bindings, mark nodes sealed, activate the origin, and emit `BRANCH_SEALED`.

Persist first. Close second. Intended removals must be marked so `onRemoved` cannot treat them as unexpected corruption.

## Rewind

After a successful fold, Chrome focuses the fork/origin tab. The visible result is: branch tabs disappear, one Portal remains, and the user is back where the detour began. If the origin is gone, keep the Portal and report the missing-origin state without touching unrelated tabs.

## Portal Tab

The Portal is a real Chrome extension page, not a Side Panel list item. It shows the Quest-independent artifact:

```text
TABYRINTH
ANIMATION RESEARCH
4 pages sealed
Forked from: Chrome Side Panel API docs
[ UNSEAL BRANCH ]
Delete Portal
```

Portal titles derive from the branch root title, hostname, or latest title. No AI required.

## Unseal / Restore

Read the durable snapshot, validate URLs, choose a restore window, and restore nodes in topological order. Parents precede children; pass `openerTabId` when possible while retaining stable application relationships regardless of Chrome behavior. Reuse a valid existing binding for the same stable node. Reopen stale bindings. Activate the restored leaf/current node. Remove the Portal tab only after complete success.

Partial failure keeps the snapshot and Portal, reports `PARTIAL RESTORE`, shows restored count, and supports retry. Repeated Unseal must not duplicate stable nodes.

## Loot

Loot is one useful page, not an inventory system:

```ts
type LootItem = { id: string; questId: string; sourceNodeId: string;
  url: string; title: string; faviconUrl: string | null; note?: string; createdAt: number }
```

Provide `SAVE AS LOOT`, optional one-short-note, open, and safe `Save + Close`. No rich notes, tags, folders, XP, or economy.

## Safety Model

Fail closed. Before any close, prove stable-node ownership, active Quest ownership, selected-subtree membership, live tab identity, and supported window. Never close on URL match alone. Unrelated tabs, same-URL tabs, moved tabs, pre-existing tabs, and Arcade tabs remain untouched. Missing or stale bindings become closed/stale nodes, not inferred deletion of durable lineage.

## Persistence and MV3 Architecture

Use event-driven modules under the actual repository structure. Recommended boundaries: branch graph selectors, portal types/reducer/invariants, portal runtime, storage, validated messages, Side Panel, Portal page, and service-worker adapters. Preserve the existing Arcade reducer, actual tab-order reconciliation, reset ordering, and Void lifecycle. Keep permissions least-privilege; no history, host permissions, page-body scraping, server, account, analytics, or remote scripts.

## Side Panel UX

Manifest V3 Side Panel is the primary application surface. The toolbar action opens it. Popup, if retained, is a tiny `OPEN PANEL` entry and must not duplicate the application.

Normal active panel:

```text
TABYRINTH
SHIP THE NEXT RELEASE
Main path
A
│╲
│ B
│ │
│ C  ← YOU ARE HERE
Current page · github.com/...
[ FOLD THIS DETOUR ]
Keep on path   Save as loot
────────────────────────
2 Portals       4 Loot
```

Render only a local trail window around the current node. Keep Portals and Loot behind compact drawers. One column, fewer than seven major controls, one obvious primary action, no room dashboard, card farm, workspace panel, giant notes panel, or required stage sequence. Required states: start, active, nothing-to-fold, unsupported tab, unsafe fold, missing origin, sealed, restoring, partial restore, error, complete, keyboard focus, and reduced motion.

## Visual System

Page type: narrow persistent Chrome product panel. Direction: roguelike minimap embedded in browser chrome; cartography, foldable map, quiet field instrument. Charcoal/bone base, moss-acid accent, quiet steel, one danger accent. Use local variable sans and optional local mono; no remote fonts. Use 1px trail lines, whitespace, readable labels, and restrained symbols. Avoid parchment, pixel RPG, cyberpunk dashboard, purple SaaS, glassmorphism, neon borders, generic admin cards, and continuous animation.

Motion roles: state transition for fold/unseal, feedback for action status, and drawer insertion/removal. Motion must be interruptible, short, state-driven, and have an equivalent `prefers-reduced-motion` result.

## React Bits MCP

Before UI implementation, inspect existing Codex config and call the configured React Bits MCP. Query at least eight relevant compact feedback/list/text/button/fold/success candidates; inspect implementations; shortlist four; implement no more than four and normally two. Record server, queries, inspected/rejected/selected components, reasons, and performance risk in `docs/UI_SYSTEM.md`. If unavailable after a 15-minute repair attempt, record `REACT_BITS_MCP_BLOCKED`, use native/CSS fallback, and mark the tooling gate PARTIAL. Never use effects that obscure state or accessibility.

## Frontend Taste

Apply the local `frontend-taste-engineer` skill to this narrow side-panel application. Design variance 7, motion intensity 5, visual density 3. Preserve semantic HTML, keyboard operation, focus-visible states, contrast, reduced motion, long-content reflow, and honest empty/error/success states. Run a screenshot/refine audit before UI merge; do not claim browser proof from static checks.

## Arcade Compatibility

Arcade remains reachable through a small start-screen link or overflow. Its core must still start, create managed tabs, reflect actual tab movement, preserve Void behavior, and reach victory. Quest/Portal state and Arcade state cannot collide. No new Arcade content.

## AO Orchestration

Use real isolated workers where the orchestrator is available. AO CLI/config is not currently present in this checkout; fallback isolated subagent evidence must be labeled as such, never presented as AO board/PR/CI proof. Worker contract:

```text
GOAL / INPUTS / OUTPUT / OWNERSHIP / CONSTRAINTS / VALIDATE / DONE WHEN / RETURN
```

Wave 0 read-only recon: product delta, Chrome architecture, frontend taste. Wave 1: branch graph plus tests. Wave 2: selectors, fold, restore, Loot, chaos tests. Wave 3: Side Panel, Portal page, design system, drawers. Wave 4: cleanup and Arcade compatibility. Wave 5: Chrome chaos, safety, judge, and taste red teams. Record only real sessions, worktrees, branches, PRs, CI, reviews, timestamps, and recovery in `docs/AO_BUILD_LOG.md`.

## Tests

Unit-test ancestry, nearest path, branch root, descendants, topological order, snapshots, ownership, lifecycle, and Loot. Mock Chrome events for immediate opener capture, late metadata, removal, stale IDs, Portal creation/placement, close, restore, partial failure, duplicate restore, same URLs, and unrelated tabs. Regression-test Arcade. Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.

## Failure Modes

Unsupported active tab: explain and do nothing. No foldable branch: `NOTHING TO FOLD`. Unsafe ownership: abort and preserve all tabs. Missing Portal data: retain recoverable state. Missing origin: retain Portal. Partial restore: retain snapshot and retry. Manual Portal deletion: mark the durable Portal unavailable without touching branch history. Worker suspension: reload storage. Invalid storage: show recovery and touch no unrelated tabs.

## Demo Script

Start on Docs, open a four-tab descendant rabbit hole, show the local trail, press `FOLD THIS DETOUR`, show four tabs disappear, one Portal remain, and focus return to Docs. Open Portal, press `UNSEAL`, show branch return and preserved relationships. Save one page as Loot. End with a truthful Arcade glimpse and evidence log. Never claim live browser behavior unless directly observed.

## Definition of Done

- [ ] This PRD is the only current PRD and names Portal Fold as flagship.
- [ ] Quest root and stable ancestry survive metadata updates, parent closure, worker restart, and extension reload.
- [ ] Fold persists before close, creates one real Portal, closes only owned subtree tabs, rewinds origin, and preserves unrelated tabs.
- [ ] Unseal restores parent-before-child, avoids duplicate stable nodes, handles partial failure, and removes Portal only after success.
- [ ] Side Panel is primary; Portal page, local trail, drawers, focus, reduced motion, and error states work.
- [ ] Minimal Loot works; old room/workspace/notes/Side Quest UX is removed or demoted from flagship.
- [ ] Arcade core remains compatible.
- [ ] Typecheck, lint, tests, build, and direct Chrome manual fold/unseal evidence are recorded separately.
- [ ] AO evidence is real, or fallback limitation is explicit.

## Cut List

Cut first: sound, extra Arcade polish, animations beyond state feedback, rename, shortcut, advanced graph, rich Loot notes, debug UI. Never cut: stable ancestry, Fold Branch, persist-before-close, real Portal tab, rewind, Unseal, unrelated-tab safety, Side Panel core, or evidence honesty.

## Explicitly Out of Scope

AI classifier, distraction detection, scraping, blocker, Pomodoro, task manager, Context Rooms, team features, login, cloud sync, server database, OAuth, calendar/email integrations, social feed, XP, coins, avatars, analytics, and surveillance.

## Current Evidence Boundary

At PRD update time, the pre-transition checkout was Room/popup-based and lacked Portal Fold and Side Panel implementation; that statement is historical. Current validation is recorded in `docs/PORTAL_TRANSITION_BUILD_LOG.md`: Portal Fold and Side Panel are implemented, automated gates pass, and real Chrome Fold/Unseal plus AO CLI execution remain `UNVERIFIED` until directly observed.
