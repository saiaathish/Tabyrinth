# TABYRINTH content lock

## Content rule

Show only what changes the user's next decision, confidence, instruction, or recovery. Prefer one noun or verb over a subheader plus explanation. Keep safety consequences concise and visible.

## Product vocabulary

- Quest: one goal and its browsing trail.
- Trail: current root-to-leaf ancestry.
- Branch: the selected descendant subtree.
- Fork: the node where that branch began.
- Fold Branch: persist the branch, create one Portal, close only verified owned branch tabs, then return to the fork.
- Portal: the saved branch artifact.
- Unseal: restore the Portal parent-before-child and remove it only after full success.
- Loot: minimal saved finds attached to the Quest.
- Arcade: secondary compatibility mode.

Do not rename these concepts between trigger, pending, success, error, and recovery states.

## Primary Side Panel scan order

1. TABYRINTH / active Quest identity.
2. Goal.
3. Compact current status.
4. Ancestry trail.
5. One context-valid primary action.
6. Collapsed Portals and Loot disclosures when they contain useful depth.
7. Arcade entry as a quiet secondary action.

No generic welcome text, feature explanation, instruction block, or repeated section preamble.

## Core labels

- Create Quest
- End Quest
- Fold Branch
- Folding…
- Branch folded
- Open Portal
- Unseal
- Unsealing…
- Branch restored
- Retry Fold
- Retry Unseal
- Portals
- Loot
- Add Loot
- Open Arcade

Use `…` only while work is actually pending. Buttons retain stable width where possible.

## State copy

- Loading: `Reading trail…`
- No Quest: `No active Quest.` Primary action: `Create Quest`.
- Root only: `Open a link from this tab to grow the trail.`
- No eligible branch: `Nothing safe to fold.`
- Fold pending: `Saving branch before tabs close…`
- Fold success: `Branch folded.`
- Origin missing after fold: `Branch folded. Fork tab is gone; Portal kept.`
- Ownership/safety block: `Fold blocked. Tab ownership could not be proved.`
- Generic fold recovery: `Branch stayed open. Try Fold Branch again.`
- Portal missing/unavailable: `Portal unavailable. Saved branch kept.`
- Unseal pending: `Restoring branch in order…`
- Partial restore: `Restore paused. Portal kept for retry.`
- Unseal success: `Branch restored.`
- Runtime unavailable: `TABYRINTH is unavailable. Reload the extension.`
- Empty Loot: `No Loot yet.`

Errors may add one short actionable cause when verified. Never expose stack traces or imply tabs closed/restored before runtime confirmation.

## Consequence copy

Before Fold Branch, scope copy may state the current verified count: `<n> tabs become 1 Portal.` This is derived live, never a fabricated metric. If scope cannot be proven, disable or remove the action and show the safety block.

Unseal copy: `<n> tabs restore in trail order.` Keep Portal until completion.

## Portal page

Show: branch title, tab count, saved time when real, fork label, compact ordered contents, and `Unseal`. Add one recovery line only for missing/partial state. Do not repeat Quest instructions or technical architecture.

## Popup and Arcade

Popup routes users to the primary Side Panel when available and keeps `Open Arcade` secondary. Arcade room copy remains functional and terse; no redesign may rename gameplay actions or break existing message contracts.

## Content acceptance

- Headings, labels, controls, and first status line alone explain current state and next action.
- Every visible sentence has one unique task, decision, trust, instruction, or recovery job.
- No useless subheader remains.
- No paragraph repeats a control label or neighboring state.
- No placeholder, fake proof, internal build narration, or unsupported capability claim appears.
- Long Quest, node, and branch titles preserve distinguishing words when wrapped.
