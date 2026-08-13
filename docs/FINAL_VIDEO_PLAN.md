# TABYRINTH Final Video Plan

## Recording gate

Do not record the flagship demo until a human or an allowed Chrome session completes one clean live rehearsal of Start → Main Path → Detour → Fold → Portal → Unseal with one unrelated public tab visible. The current review could not open the extension page through the Chrome connector, so this plan is ready but not yet live-validated.

## Goal and length

Target 75–100 seconds. The product should be understandable in the first 15 seconds, the killer behavior visible by 35 seconds, technical credibility by 60 seconds, and the factual AO segment before the close. If the official hackathon limit is shorter, preserve product action and cut explanation before cutting the Fold/Unseal proof.

## Exact storyboard and script

### 0–8 seconds — Problem

Show a clean Chrome window with the real tab bar visible. Keep one unrelated public tab, such as Example Domain or Wikipedia, clearly separate.

Say: “I needed one answer and ended up four tabs deep.”

Show the Quest path and descendant tabs. Do not start with code, a terminal, architecture, AO, or slides.

### 8–15 seconds — Product

Open the real TABYRINTH Side Panel. Show the Quest title, local trail, current state, and Detour count.

Say: “TABYRINTH knows where I left my Main Path and which tabs became the detour.”

If onboarding is shown, keep it to two or four seconds: show the INTRO/TRAIL/DETOUR/PORTAL progression, then move on.

### 15–30 seconds — Killer Fold

Show the tab bar before the action. The Side Panel must visibly say `FOLD 3-TAB DETOUR` or the exact current count and show the return-to-fork meaning.

Say: “I don’t close the rabbit hole. I fold it.”

Click Fold. Keep the tab bar visible while the branch tabs disappear, the Portal remains, the fork becomes active, and the unrelated tab stays open. Capture a before and after frame.

### 30–43 seconds — Restore

Open the Portal. Show its sealed-page count, `Forked from` origin, branch contents, and Unseal action. Click Unseal. Keep the tab bar visible as the branch returns.

Say: “When I need it again, the whole trail comes back.”

Do not claim exact restoration or no-duplicates until the rehearsal visibly proves it.

### 43–58 seconds — Technical credibility

Use a short browser-side explanation or a small state view, not a terminal dump.

Say: “Under the hood, TABYRINTH keeps stable node IDs and parent-child ancestry separate from live Chrome tab IDs. It derives the current descendant branch, verifies ownership, persists the Portal before closing tabs, and restores parents before children.”

Point to the unchanged unrelated tab as the safety proof. Avoid absolute “never” language until live isolation is captured.

### 58–80 seconds — AO evidence

Only show factual evidence available in the repository. The current AO log records Codex workstreams and explicitly says AO CLI/config, AO board, PR, CI, and live browser evidence are unavailable in this checkout.

Safe line: “The build was coordinated as bounded workstreams around branch runtime, Chrome architecture, Portal lifecycle, UI, and tests. The repository records the evidence boundary explicitly; I’m showing only what is verifiable.”

Do not show invented board cards, worker counts, PRs, CI runs, or recovery events.

### 80–90 seconds — Close

Return to the product and the restored tab bar.

Say: “TABYRINTH turns browsing drift into a reversible, intent-aware trail.”

## Mandatory capture checklist

- Clean Chrome window and a fresh harmless public test set
- Personal bookmarks and private account tabs hidden
- One unrelated public tab deliberately left visible
- Real loaded `dist` extension confirmed before recording
- Tab names readable; browser zoom reasonable
- Tab bar visible before Fold, during Fold, after Fold, before Unseal, and after Unseal
- Side Panel readable at approximately 360 × 720
- Quest state reset or a clearly named clean Quest prepared
- A → B → C → D rehearsal completed without dead air
- Main Path marking and current Detour count visible
- Portal page shows title, origin, page count, and Unseal
- Reopened tabs and unrelated tab checked for duplicates/changes
- No email, school system, private document, or sensitive URL visible
- Notifications disabled
- AO evidence prepared only from real records
- Terminal and DevTools closed except for the short technical segment
- Mouse movement deliberate; no accidental tab closure
- Before/after screenshots saved outside source and reviewed

## Failure recovery script

### Fold fails

Say: “The safety check blocked this fold, so no tabs were changed.”

Show the unsafe/untracked state or switch to the automated evidence screen. Do not retry blindly or fake the tab result.

### Unseal fails

Say: “Restore is partial, so the Portal stays available for a safe retry.”

Show restored count and retry state. Do not claim the full branch returned.

### Side Panel does not update

Say: “The browser surface is stale; I’m switching to the recorded state proof.”

Stop the live claim and use the automated/source evidence only.

### Wrong tab becomes active

Say: “The return target is not proven in this run, so I’m not presenting this take.”

Reset the clean fixture and rehearse again. Do not edit the video to hide the failure.

### AO evidence does not load

Say: “The repository records the AO evidence boundary; I won’t invent a board or CI result.”

Show the checked-in AO log or remove the AO segment if the submission does not require it.

## Backup 25-second version

“TABYRINTH gives browsing a goal and a Main Path. When I branch into a rabbit hole, it derives that descendant Detour, persists it as a Portal, closes only the owned branch, and returns me to the fork. When I need the branch again, Unseal restores the trail. The browser tab bar stays visible so the behavior is concrete.”

## Claims to avoid on camera

- “No other extension can do this.”
- “The current test suite proves Chrome works.”
- “Unrelated tabs are never touched” before live isolation is recorded.
- “Service-worker recovery is live-proven” without a worker restart.
- “AO created these PRs/CI runs” without repository evidence.
- “This uses AI to decide what to close.”
- “The entire branch always restores” when partial restore is a supported state.
