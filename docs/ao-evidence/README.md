# AO evidence instructions

Store factual evidence for the submission here. One file per real session, PR, CI result, review event, or screenshot capture. Use ISO-8601 timestamps with timezone and link to the source when possible.

Required fields: real AO session ID, branch, owner/scope, PR number or `none`, CI result, review result, and evidence link. Mark unavailable values `UNRECORDED`; never invent IDs or outcomes. A local filename is not proof of an AO event.

Suggested files:

- `SESSION_TEMPLATE.md` — worker/session record.
- `PR_TEMPLATE.md` — PR, CI, and review record.
- `MANUAL_TEMPLATE.md` — real-browser critical-path record.

Manual evidence must state that CI cannot prove real Chrome tab dragging. Do not store secrets, tokens, or unrelated user-tab data.
