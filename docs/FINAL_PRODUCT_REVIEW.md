# TABYRINTH Final Product Review

Review date: 2026-08-13
Repository: `/Users/saiaathishkarthik/Desktop/Tabyrinth`
Reviewed head: `fea46477ff5e8218711fdb4f0f655cf4b047929a`
Remote head: `fea46477ff5e8218711fdb4f0f655cf4b047929a`

## Review boundary

This is a read-only product review. Source code was not changed for the review. The current automated release gates were run from the exact head above. The Chrome connector could open and inspect a harmless public page, but Chrome URL policy blocked both `chrome://extensions/` and the `chrome-extension://.../sidepanel.html` target. No loaded Side Panel interaction was therefore claimed as live evidence.

Evidence labels used here:

- `PROVEN_LIVE`: personally observed in the loaded Chrome extension.
- `PROVEN_AUTOMATED`: demonstrated by the current automated tests or validator, but not personally observed in the loaded extension.
- `CODE_ONLY`: implementation is present without adequate automated or live proof for the specific claim.
- `PARTIAL`: only part of the expected behavior is proven.
- `FAIL`: the requested check reproduced a failure.
- `NOT_TESTED`: the surface could not be exercised safely or technically.

## Feature Inventory

| Feature | What user sees | What it does | How it works | Evidence | Demo-worthy |
|---|---|---|---|---|---|
| First-run onboarding | Four short stages labelled INTRO, TRAIL, DETOUR, PORTAL | Teaches the core vocabulary before the Side Panel | Completion is stored under `tabyrinth.onboarding` in `chrome.storage.local`; the UI reads it before rendering the main surface | `PROVEN_AUTOMATED` for rendering/advance; `CODE_ONLY` for persistence; live extension blocked | Yes, briefly |
| Quest creation | A bounded goal field and `Begin Quest` | Names the work the user is trying to finish | `PORTAL_BEGIN` creates and persists a Quest root on the supported active page | `PROVEN_AUTOMATED` — message/runtime coverage; live not tested | Yes |
| Quest persistence | Quest remains in the Side Panel after refresh/reopen in the intended architecture | Keeps the user’s intent separate from transient tab IDs | Durable Quest state is stored in `chrome.storage.local`; live bindings are separate session data | `PROVEN_AUTOMATED` / `CODE_ONLY` for the full browser lifecycle | Yes only after live rehearsal |
| Main Path | Trail entries and `ON MAIN PATH` state | Marks pages that directly advance the Quest | Nodes have a `path` disposition; `PORTAL_MARK_PATH` changes the selected node | `PROVEN_AUTOMATED` | Yes |
| Trail display | Ordered local ancestry ending at the current page | Makes the current browsing lineage legible | The Side Panel walks `parentNodeId` links from the current stable node | `PROVEN_AUTOMATED` — Side Panel tests | Yes |
| Keep on Main Path | `Keep this page on Main Path` on an unclassified page | Explicitly promotes the current node to the path | The runtime marks the node `path`; it does not guess based on title or URL | `PROVEN_AUTOMATED` | Yes |
| Untracked tab state | `OUTSIDE TRAIL`, with `ADD TO MAIN PATH` | Fails closed when ownership is ambiguous | A tab without a safe Quest association is not claimed automatically; explicit tracking is required | `PROVEN_AUTOMATED` — ownership tests | Yes |
| Add to Main Path | `ADD TO MAIN PATH` | Explicitly adopts the current supported tab into the Quest | The runtime creates/binds a node only after the user action | `PROVEN_AUTOMATED`; live not tested | Yes |
| Automatic Detour derivation | `DETOUR`, a detour count, and a fold action | Finds the current descendant branch without manual tab selection | The selector finds the nearest `path` ancestor, branch root, and live descendants belonging to the Quest | `PROVEN_AUTOMATED` — selector/fold tests | Killer feature, after live proof |
| Fork destination | Copy says the branch returns to the Main Path | Identifies where focus will return | The nearest Main Path ancestor is the fold origin | `PROVEN_AUTOMATED` / `CODE_ONLY` for visible Chrome focus | Yes |
| Fold | `FOLD N-TAB DETOUR` | Persists and removes only the selected owned branch | Validates ownership, snapshots nodes and relationships, persists the Portal before closure, closes validated live tabs, clears bindings, and activates the origin | `PROVEN_AUTOMATED`; live Fold not tested | Killer feature, not yet recordable as proven |
| Persist-before-close | No user-visible control; safety property | Prevents destructive closure from preceding durable recovery data | Fold phases explicitly include snapshot persistence, Portal opening, tab closing, and sealing | `PROVEN_AUTOMATED` — fold transaction tests | Technical proof |
| Portal creation | A real Portal page remains after the detour tabs disappear | Represents the folded branch as a recoverable artifact | The Portal stores branch node IDs plus a snapshot of URLs, titles, and parent relationships | `PROVEN_AUTOMATED` / `CODE_ONLY` for live tab creation | Killer feature |
| Return to fork | The origin becomes active after Fold | Returns the user to the place where the detour began | Fold validates and activates the origin binding after sealing | `PROVEN_AUTOMATED` — runtime tests; live not tested | Yes |
| Portal collection | A `Portals` drawer and Portal count | Lists saved folded branches | Portal state is read from the runtime response and rendered in the Side Panel | `PROVEN_AUTOMATED` | Yes |
| Portal page | Page count, title, `Forked from`, sealed page list, status, and `Unseal branch` | Explains what is stored and offers recovery | The page reads the Portal snapshot and sends `PORTAL_UNSEAL`; partial restore exposes retry state | `PROVEN_AUTOMATED`; live page not accessible | Yes |
| Unseal | `Unseal` / `Unseal branch` | Reconstructs the branch | Nodes restore parent-before-child, reuse valid bindings, pass `openerTabId` when possible, and retain stable application relationships | `PROVEN_AUTOMATED`; live Unseal not tested | Killer feature, not yet recordable as proven |
| Duplicate protection | Retry skips already restored pages | Avoids reopening the same stable nodes repeatedly | Restore checks existing valid bindings and keeps the snapshot for partial retries | `PROVEN_AUTOMATED` | Technical proof |
| Closed-origin recovery | `ORIGIN LOST`, `The fork is closed`, or Portal recovery state | Fails closed when the return point is gone | The Portal remains sealed and no unrelated tabs are touched | `PROVEN_AUTOMATED` / `CODE_ONLY` for live copy | Yes as an edge case |
| Unrelated-tab isolation | Unrelated tabs are outside the Quest | Prevents accidental closure or adoption | Selected-subtree membership, Quest ownership, live tab identity, and supported window are validated before Fold | `PROVEN_AUTOMATED`; mandatory live isolation not tested | Mandatory before demo |
| Service-worker recovery | No direct user-facing indicator | Keeps durable graph and Quest state across MV3 worker suspension | Durable data is local storage; session bindings are reconciled from Chrome tab reality | `PROVEN_AUTOMATED` for contracts; live worker restart not tested | Technical proof |
| Error/recovery states | Unsupported, unsafe, untracked, partial, restoring, and generic error copy | Makes failure safer and actionable | Side Panel maps runtime reasons to fail-closed states and recovery actions | `PROVEN_AUTOMATED` | Yes only if needed |
| Finish Quest | `Finish` while active; `New Quest` after completion | Ends the current Quest without deleting its saved Portals | Completion is persisted; the current release replaces the completed-state Finish control with New Quest and reuses the start form | `PROVEN_AUTOMATED` — 10 Side Panel tests pass | Yes, optional |
| Replay introduction | `Replay introduction` | Reopens onboarding for an existing user | The onboarding hook resets completion and renders the same staged component | `CODE_ONLY`; live not tested | Optional |
| Contextual hints | Trail and detour notices | Gives lightweight first-use guidance | Hint flags are stored with onboarding state and are set once per hint type | `PROVEN_AUTOMATED` / `CODE_ONLY` for live timing | Optional |
| Loot compatibility | Retained contracts and code exist in the repository | Preserves a small saved-page compatibility surface | Loot is represented separately from the Portal snapshot | `CODE_ONLY` for current flagship review; not a required live claim |
| Arcade/Room compatibility | Compatibility implementation remains in source | Preserves the older game surface without making it the flagship | Separate game/run-controller modules and Room page remain in the build tree | `CODE_ONLY` for live behavior; historical compatibility, not the Portal demo | No |

## Product model

### Quest

A Quest is the user’s stated intention: the bounded answer or outcome they are trying to finish. It gives the browsing graph an ownership boundary and lets the UI distinguish a useful path from unrelated browser activity.

### Main Path

The Main Path is the chain of nodes the user has explicitly or initially designated as directly advancing the Quest. The root is protected. A node marked `path` is not treated as a foldable detour root.

### Detour

A Detour is the live descendant subtree below the nearest Main Path ancestor when the current node is unclassified. The selector derives the branch root and all live descendant nodes belonging to the Quest. The user does not manually choose individual tabs.

### Portal

A Portal is a persisted representation of one folded Detour, not merely a bookmark or a visual tab group. Its snapshot preserves the stable node IDs and `parentNodeId` relationships, along with the live-page metadata needed for restoration. The Portal also records its origin node, branch root, node IDs, Portal tab binding, status, restore status, and restored-node IDs.

## How TABYRINTH Works End-to-End

Concrete example: Quest `Finish hackathon submission`.

1. The user starts on A, a public Devpost page, and begins the Quest. A becomes the protected Quest root and Main Path.
2. The user opens B, keeps it on the path, and then follows B → C → D → E. Chrome events and navigation metadata allow TABYRINTH to bind stable application nodes to live tabs.
3. The user is on E. The current node is unclassified, so the selector walks upward to B, the nearest `path` ancestor, identifies C as the branch root, and derives C/D/E as the current live Detour.
4. The Side Panel exposes a count and `FOLD 3-TAB DETOUR`.
5. The user clicks Fold. TABYRINTH validates that the candidate tabs belong to the Quest and selected subtree, snapshots their URLs/titles/relationships, persists Portal and transaction state, opens the Portal page, closes only validated branch tabs, clears their live bindings, marks the nodes sealed, and activates B.
6. The user later opens the Portal and clicks Unseal. TABYRINTH restores parents before children, reuses any still-valid bindings, reopens stale tabs, preserves stable node relationships even if Chrome’s opener behavior is imperfect, activates the restored current leaf, and removes the Portal tab only after complete success. A partial restore keeps the Portal and supports retry.

Paired user/runtime view:

**USER:** Starts a Quest on A.
**TABYRINTH:** Persists Quest intent and a stable root node; the tab ID is only a live binding.

**USER:** Marks B as Main Path, then browses B → C → D → E.
**TABYRINTH:** Captures browser events, resolves parent-child lineage when safe, hydrates metadata, and leaves ambiguous tabs untracked.

**USER:** Sees `FOLD 3-TAB DETOUR`.
**TABYRINTH:** Derives the nearest path ancestor, branch root, and descendant subtree from the durable graph.

**USER:** Clicks Fold.
**TABYRINTH:** Performs the persist-first safety transaction, closes only owned branch tabs, and returns focus to the fork.

**USER:** Opens the Portal and clicks Unseal.
**TABYRINTH:** Reconstructs the branch in topological order and keeps the snapshot when recovery is partial.

## Technical moat

One sentence: TABYRINTH maintains a persistent intent-aware browser ancestry graph and uses it to derive the current Detour, fold that subtree safely, and later reconstruct it without requiring manual tab-tree management.

10 words: Persistent intent and ancestry make safe reversible browser detours possible.

20 words: TABYRINTH derives owned browser detours from intent and ancestry, folds them safely, and restores their relationships later.

40 words: TABYRINTH combines explicit Quest intent with browser event capture and stable node identity. It derives the current descendant detour, validates ownership before closure, persists a Portal first, returns to the fork, and restores the branch without relying on fragile live tab IDs.

## Why not Chrome Groups?

10-second answer: Chrome Groups are useful manual collections. TABYRINTH uses navigation ancestry and Main Path intent to decide which current branch is the detour and where to return.

20-second answer: A group can keep tabs together, but the user still decides membership and return location. TABYRINTH records how Quest tabs came from one another, lets the user mark the useful path, and folds the current owned descendant branch back to its fork.

Technical answer: Chrome’s group membership is not the product’s ownership model. TABYRINTH maintains stable nodes with `parentNodeId`, path dispositions, live tab bindings, and durable Portal snapshots. That graph supports subtree selection, fail-closed ownership checks, return-to-fork, and parent-before-child restore.

## Why parent → child matters

With ancestry, TABYRINTH can distinguish:

```text
A Quest path
├── unrelated Gmail       <- not claimed
├── unrelated Spotify     <- not claimed
└── B
    └── C
        └── D             <- candidate descendant branch
```

Without ancestry, the browser is only a collection of tabs. With ancestry, the product can identify branch membership, find the fork, select the safe Fold subtree, return to the correct page, and restore in order. If opener information is missing or stale, the safe result is an untracked tab and an explicit Add to Main Path action—not a guess.

## How a Portal works technically

The Portal model records `originNodeId`, `branchRootNodeId`, `nodeIds`, a `portalNodeId`, optional `portalTabId`, lifecycle status, timestamps, a snapshot, restore status, restored IDs, and an error field. The snapshot preserves node relationships rather than only URLs. That is why two identical URLs in different Quest branches can remain distinct stable nodes.

## Why no AI is required

The core product is deterministic because tab ownership is safety-critical. Browser events, explicit Main Path actions, stable graph identity, and fail-closed checks are more appropriate than asking an LLM to guess which tabs may be closed. The product can remain useful with all AI removed.

## AO contribution

The repository’s AO log records two documented read-only/recon sessions and explicit limitations: AO CLI/config was not present in the repository or PATH, no AO board/PR/CI evidence was recorded in that log, and unavailable evidence is marked `UNVERIFIED`. Do not claim that AO ran the build fleet, created PRs, or supplied live Chrome proof from this repository record.

Safe 15-second answer: The recorded work used isolated Codex workstreams for product recon, Chrome architecture, branch runtime, contracts, and UI/runtime work. The repository does not contain verifiable AO board or CLI evidence, so I would show only the evidence that actually exists.

Safe 30-second answer: AO-style orchestration was useful as a coordination model for bounded workstreams, but this checkout’s factual AO log explicitly says the AO CLI/config was unavailable and does not claim AO PR, CI, or browser evidence. I would not turn an orchestration description into a fabricated execution claim.

## Claims Register

| Claim | Evidence | Safe to say in video? |
|---|---|---|
| The current automated suite passes | Exact run: 23 files, 159 tests, exit 0 | Yes, as automated proof |
| Typecheck, lint, build, and extension validator pass | Exact run from reviewed head, all exit 0 | Yes, as local gates |
| The isolated extension E2E passes | Exact run: 5 passed, 1 failed; popup runtime API unavailable on `chrome-error://chromewebdata/` | No; say the harness is blocked |
| TABYRINTH automatically derives the current Detour | Selector and fold tests cover nearest path, branch root, descendants, and ownership | Only after live Fold rehearsal; otherwise say automated proof |
| Fold closes only owned branch tabs | Automated ownership tests and implementation contract | Only after live unrelated-tab isolation |
| Unrelated tabs are never touched | Safety design and automated tests exist; mandatory live isolation was not observed in this review | No absolute claim yet |
| Service-worker recovery works | Storage/session contracts and reconciliation tests; no live worker termination/restart | Say automated proof only |
| Unseal restores without duplication | Restore tests cover ordering, existing bindings, partial retry | Say automated proof only |
| Portal is a persisted branch artifact | Source data model and Portal page implementation | Yes as implementation explanation; live artifact still needs proof |
| First extension to do this | No independent market proof | No |
| AI chooses which tabs to close | False; core path is deterministic | No |
| AO created the recorded PRs/CI | Not evidenced by the current AO log | No |

## Product differentiation

| Category | Safe description |
|---|---|
| Chrome Saved Tab Groups | Manual collection and organization |
| Tree-style tab managers | Display or manage hierarchy |
| Branch suspension tools | Save or hide a branch/subtree |
| TABYRINTH | Combines explicit Quest/Main Path intent with ancestry-derived Detour selection, safe Fold, return-to-fork, and Portal restoration |

This is positioning, not a claim that no other product has overlapping behavior.

## Remove AI: what remains?

Chrome event capture, stable graph identity, Main Path state, automatic Detour derivation, ownership verification, Portal persistence, Fold, return-to-fork, Unseal, service-worker-safe storage, and Side Panel interaction. Those are the product.

## First 60 seconds of user experience

0–5 seconds: install/open the extension and see the short staged introduction.
5–20 seconds: enter a Quest goal.
20–60 seconds: browse normally; the extension captures safe ancestry and shows a trail when a branch forms.
Later: Fold the owned detour into a Portal and reopen it when needed. No API key, login, terminal, paid service, or AI setup is required by the documented core path.

## Stale-language audit

The current repository still contains compatibility-era Arcade, Room, Dungeon/Void, and Loot references in source and PRD/history documentation. These are not silently classified as removed. The Side Panel flagship uses Quest, Main Path, Detour, and Portal vocabulary, while compatibility code remains in the build tree. A recording should avoid showing Arcade/Room surfaces unless the demo explicitly labels them as secondary compatibility behavior.

## Questions I Hope Judges Don't Ask

### Isn't this just Chrome Groups?

Danger: a vague answer makes the product sound like a duplicate organizer. Safe answer: Groups are useful manual collections; TABYRINTH derives an owned current branch from ancestry plus Main Path intent and returns to the fork. Show the before/after tab bar and the Portal.

### Doesn't another extension already suspend tab branches?

Danger: unsupported novelty claims. Safe answer: acknowledge overlap in branch-saving tools and focus on the concrete combination implemented here. Show the ancestry explanation and the deterministic safety contract, not an “only product” claim.

### Why do I need a Quest?

Danger: the product can sound like unsolicited browser tracking. Safe answer: the Quest is an explicit ownership boundary and intent label; it lets the user say which browsing work is relevant. Show the goal field and the untracked-tab state.

### How often must I mark Main Path?

Danger: too much manual classification undermines the promise. Safe answer: the root starts the path, normal child lineage is captured when safe, and explicit Keep/Add actions resolve ambiguity. Do not promise zero manual decisions.

### What happens when browser ancestry is missing?

Danger: guessing could close unrelated tabs. Safe answer: the tab is shown as Outside Trail and requires explicit Add to Main Path; unsafe Fold fails closed.

## Verdict

**PRODUCT STATUS:** NOT READY TO RECORD

**STRONGEST FEATURE:** The deterministic ancestry → current Detour → persist-first Fold model, supported by focused selector, ownership, transaction, and restore tests.

**WEAKEST FEATURE:** Direct user-browser proof of the flagship Fold/Portal/Unseal flow is still absent, and the extension E2E harness fails at runtime API context.

**STRONGEST TECHNICAL PROOF:** Exact local gates: 23 test files and 159 tests passed; typecheck, lint, build, extension validator, and diff check passed.

**BIGGEST JUDGE RISK:** Claiming live Fold/Unseal or unrelated-tab isolation without observing it in the loaded extension.

**BIGGEST DEMO RISK:** The extension surface cannot currently be opened through the connected Chrome browser because both internal/extension URLs are blocked by browser policy; the isolated harness has a known popup API-context failure.

**UNVERIFIED CLAIMS:** Live onboarding, Quest persistence, child-tab lineage, untracked-tab UI, Add to Main Path, Keep on Main Path, automatic Detour count, Fold, Portal artifact, Unseal, duplicate protection, closed-origin recovery, unrelated-tab isolation, service-worker restart, and real Side Panel width.

**DO NOT SAY:** “159 tests prove the live browser,” “unrelated tabs are never touched” as an absolute live claim, “first extension to do this,” “AO created the PR/CI evidence,” or “Fold/Unseal was live-tested in this review.”

**MUST SHOW BEFORE RECORDING:** A clean Chrome window with one unrelated public tab; real Side Panel; Quest start; A → B → C → D; Main Path marking; Detour count; Fold; Portal; Unseal; restored branch; unrelated tab unchanged.
