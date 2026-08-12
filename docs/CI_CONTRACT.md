# CI contract

CI runs on pushes and pull requests. It uses the repository lockfile and does not modify source, package metadata, or generated artifacts in Git.

Required checks:

- `npm ci`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `test -f dist/manifest.json`

The build artifact check confirms the Vite output includes the extension manifest. It does not prove that Chrome accepts the unpacked extension or that the UI/game is correct.

CI cannot prove real Chrome tab dragging, tab order as game topology, tab creation/closure, tab isolation, popup/room visuals, service-worker lifecycle behavior, or the complete manual demo. Those require a recorded, real-browser session.
