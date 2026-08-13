# CI contract

CI runs on pushes and pull requests. It uses the repository lockfile and does not modify source, package metadata, or generated artifacts in Git.

Required checks:

- `npm ci`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run validate:extension`

The extension validator checks MV3 manifest shape, service-worker and Side Panel wiring, emitted HTML entrypoints, local bundle references, and the absence of host permissions or remote document-shell URLs. It does not prove that Chrome accepts the unpacked extension or that the UI/game is correct.

CI cannot prove real Chrome tab dragging, tab order as game topology, tab creation/closure, tab isolation, popup/room visuals, service-worker lifecycle behavior, or the complete manual demo. Those require a recorded, real-browser session.
