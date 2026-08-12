# AO evidence instructions

Store factual evidence for the submission here. One file per real session, PR, CI result, review event, or screenshot capture. Use ISO-8601 timestamps with timezone and link to the source when possible.

Required fields: real AO session ID, branch, owner/scope, PR number or `none`, CI result, review result, and evidence link. Mark unavailable values `UNRECORDED`; never invent IDs or outcomes. A local filename is not proof of an AO event.

Suggested files:

- `SESSION_TEMPLATE.md` — worker/session record.
- `PR_TEMPLATE.md` — PR, CI, and review record.
- `MANUAL_TEMPLATE.md` — real-browser critical-path record.

Verified coordination records currently include AO sessions `tabyrinth-5`,
`tabyrinth-6`, `tabyrinth-10`, `tabyrinth-11`, `tabyrinth-12`,
`tabyrinth-13`, and `tabyrinth-14`. GitHub records show PR #1 merged, PR #2
open, PR #3 open with green `verify` checks, and PR #4 open/pending. See
`../AO_BUILD_LOG.md` for timestamps and branches. These records do not prove
manual Chrome gameplay.

Manual evidence must state that CI cannot prove real Chrome tab dragging. Do not store secrets, tokens, or unrelated user-tab data.
