# TABYRINTH demo script

Target: 60 seconds. Critical path: Quest → Main Path → Detour → Fold → Portal → Unseal. Product proof first; evidence proof last. Real-browser evidence status: `UNVERIFIED` in this repository.

## Preflight

- Dedicated Chrome window; unrelated tabs closed or clearly outside the run.
- Unpacked extension loaded from `dist/`.
- Confirm current build and manual evidence status.
- Keep tab bar visible. Do not use a prerecorded substitute for tab actions.

## Script

| Time | Action | Say |
|---|---|---|
| 0–10s | Show the TABYRINTH group. | “These five Chrome tabs are the dungeon.” |
| 10–25s | Open a descendant trail and show the Main Path / Detour boundary. | “TABYRINTH derives the detour from tab ancestry.” |
| 25–40s | Press the concrete Fold action and show the Portal plus return to the fork. | “I folded the rabbit hole instead of closing it.” |
| 40–60s | Unseal the Portal and show the branch restore. | “The whole trail comes back when needed.” |
| 75–90s | If victory was directly observed, show it, then factual AO evidence. Otherwise stop and label the product path `UNVERIFIED`; show only AO records. | “AO records the real worker, branch, PR, CI, and review trail.” |

## Stop conditions

Stop and report `UNVERIFIED` if tab ancestry, isolation, Fold, Portal creation, or Unseal cannot be demonstrated. CI does not prove Chrome interaction.
