# AO evidence instructions

Store factual evidence for the submission here. One file per real session, PR, CI result, review event, or screenshot capture. Use ISO-8601 timestamps with timezone and link to the source when possible.

Required fields: real AO session ID, branch, owner/scope, PR number or `none`, CI result, review result, and evidence link. Mark unavailable values `UNRECORDED`; never invent IDs or outcomes. A local filename is not proof of an AO event.

Suggested files:

- `SESSION_TEMPLATE.md` — worker/session record.
- `PR_TEMPLATE.md` — PR, CI, and review record.
- `MANUAL_TEMPLATE.md` — real-browser critical-path record.

Verified coordination records currently include AO sessions `tabyrinth-5` through
`tabyrinth-37` where listed in `../AO_BUILD_LOG.md`. GitHub records show PRs #1–#18: #1–#17 are merged and #18 is open. Published `main` is PR #17 merge SHA `625eef238ae7f6dac11193665527e086d5e47225`; PR #18 head is `446d938c167640b08e4316207fae5d67764868d4`. Current CI/review details are listed in the build log. See
`../AO_BUILD_LOG.md` for timestamps and branches. These records do not prove
manual Chrome gameplay. Current real-Chrome critical-path evidence remains `UNVERIFIED`.

Two attempted AO OpenCode spawns returned `INTERNAL_ERROR`. No OpenCode worker,
session, branch, PR, or result is recorded.

Manual evidence must state that CI cannot prove real Chrome tab dragging. Do not store secrets, tokens, or unrelated user-tab data.
