# Decisions

- Foundation uses `chrome.storage.session` as sole active-run source of truth.
- Chrome tab indices are re-queried after movement; event indices are advisory.
- `tabs` permission is omitted; only tab creation, grouping, querying, moving, updating, and removal are used through the extension APIs available without host access.
