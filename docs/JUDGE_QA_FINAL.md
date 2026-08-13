# TABYRINTH Judge Q&A

## What is TABYRINTH?

TABYRINTH is a Chrome extension that turns goal-directed browsing into a reversible trail. The user starts a Quest, keeps useful pages on a Main Path, folds a descendant Detour into a Portal, and can later Unseal that branch.

## What problem does it solve?

Research and project work create useful rabbit holes. Closing them loses context; leaving them open creates tab clutter. TABYRINTH stores the branch relationships and lets the user fold the detour away while returning to the page where it began.

## Why not Chrome tab groups?

Chrome Groups are useful manual collections. TABYRINTH adds an intent and ancestry model: the user states the Quest, the user’s Main Path is explicit, and the current descendant branch can be derived and returned to its fork. A group alone does not express that return-to-fork transaction.

## Why does parent-child ancestry matter?

It distinguishes a Quest branch from unrelated browser tabs, identifies the fork, selects the correct subtree for Fold, and gives Unseal an order for reconstruction. The implementation keeps stable node identity separate from transient Chrome tab IDs.

## What is a Main Path?

The Main Path is the chain of pages directly advancing the Quest. The Quest root starts protected; explicit Keep on Main Path actions can promote later nodes. Main Path nodes are not treated as the current foldable Detour.

## How does TABYRINTH know something is a Detour?

When the current Quest node is live and unclassified, the selector walks its durable ancestry to the nearest `path` node, finds the first child below that fork, and collects live descendants in the same Quest. That gives the branch root, fork, current leaf, node IDs, and count.

## What is a Portal?

A Portal is a persisted folded branch artifact. It stores the origin and branch IDs plus a snapshot containing stable nodes and their relationships, not only URLs. The Portal page shows the sealed count, origin, branch contents, status, and recovery action.

## What happens when I Fold?

TABYRINTH validates Quest ownership and selected-subtree membership, snapshots the branch, persists the Portal and transaction state first, opens the Portal page, closes only validated branch tabs, clears their live bindings, seals them, and activates the fork. If ownership is uncertain, it fails closed.

## What happens when I Unseal?

TABYRINTH reads the snapshot, validates URLs, restores parents before children, reuses valid bindings, reopens stale tabs, passes opener information when possible, activates the restored leaf, and removes the Portal only after complete success. Partial restore keeps the Portal and supports retry.

## What happens to unrelated tabs?

They are not automatically claimed. Before closure, the runtime checks stable ownership, Quest membership, selected-subtree membership, live tab identity, and supported window. The automated safety tests cover this contract; a live unrelated-tab run still must be captured before making an absolute demo claim.

## What if Chrome does not provide opener information?

TABYRINTH fails closed. The tab can appear as Outside Trail and the user can explicitly Add to Main Path. It does not infer ownership from a matching URL or proximity in the tab strip.

## What if I manually open a new tab?

It remains untracked until the product can establish a safe relationship or the user explicitly adds it to the Main Path. This prevents a manually created unrelated tab from becoming part of the Quest by accident.

## What if the original fork closes?

The Portal remains sealed and the Side Panel has a missing-origin state: `ORIGIN LOST`, `The fork is closed`, and recovery-oriented copy. The whole Quest is not treated as destroyed merely because the live return tab is gone.

## What survives Chrome service-worker suspension?

Durable Quest, graph, Portal, snapshot, and settings data are designed for `chrome.storage.local`. Live tab-to-node bindings, Portal tab IDs, windows, and in-flight transactions are session data and are reconciled against current Chrome tabs. This design is covered by automated storage/reconciliation tests; live termination/restart was not available in this review.

## What is technically hard?

The difficult part is not rendering a list of tabs. It is maintaining stable identity while Chrome tab IDs disappear, metadata arrives late, tabs move between windows, and browser events race with service-worker suspension. Fold must persist before closing and restore must preserve relationships without duplicates.

## Is this just a tree-style tab manager?

No. A tree manager can display hierarchy. TABYRINTH adds explicit Quest intent, Main Path dispositions, automatic current-Detour derivation, safe persist-before-close Fold, return-to-fork, and Portal restore. The comparison is about the implemented interaction, not an unsupported uniqueness claim.

## Does this use AI?

The core product does not need AI. Deterministic browser events and explicit user actions are safer for deciding which tabs may be closed than an LLM guess. The core remains useful with AI removed.

## Why AO?

The project records bounded workstreams around product recon, Chrome architecture, branch runtime, contracts, UI, Portal lifecycle, and testing. The current AO log explicitly states that AO CLI/config and AO board/PR/CI/browser evidence were unavailable in this checkout. The safe answer is to show only those records, not claim unverified orchestration outcomes.

## Couldn't you just use multiple Codex terminals?

Multiple terminals can run tasks, but the useful distinction is bounded ownership and evidence coordination. In this checkout, the verifiable record is isolated Codex workstreams and checked-in build/test evidence; it does not justify claiming a specific AO board execution.

## What would you build next?

First, complete a reliable real-Chrome validation harness and capture untouched-profile Fold/Unseal evidence. Then improve recovery telemetry and presentation polish only after the safety and browser gates are repeatable. Do not pitch cloud sync, AI classification, or richer tab automation as if they already exist.

## Questions I Hope Judges Don't Ask

### Isn't this just Chrome Groups?

**Why dangerous:** It invites a feature checklist comparison.
**Safe answer:** Groups are useful manual collections; TABYRINTH derives an owned descendant branch from Quest ancestry and Main Path intent, then returns to the fork.
**What to show:** Before/after tab bar, Side Panel count, Portal, and restored branch.

### Doesn't another extension already suspend tab branches?

**Why dangerous:** It encourages an unsupported “first” claim.
**Safe answer:** Acknowledge overlap in branch-saving tools and explain the concrete combination implemented here.
**What to show:** Parent-child lineage, ownership checks, persist-first Fold, and Unseal order.

### Why do I need a Quest?

**Why dangerous:** Without intent, the product sounds like unsolicited tracking.
**Safe answer:** A Quest is an explicit boundary that tells TABYRINTH which browsing work is relevant.
**What to show:** Goal field and Outside Trail state.

### How often do I manually mark Main Path?

**Why dangerous:** Too much manual work undermines the product promise.
**Safe answer:** The root begins the path, safe child relationships are captured automatically, and explicit Keep/Add actions resolve ambiguity. Do not promise zero manual decisions.
**What to show:** Root, child trail, and one explicit action.

### What happens when browser ancestry is missing?

**Why dangerous:** Guessing could close unrelated tabs.
**Safe answer:** The tab stays Outside Trail and requires explicit Add to Main Path; unsafe Fold fails closed.
**What to show:** Untracked state and no-change safety result.
