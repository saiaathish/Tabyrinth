# TABYRINTH design lock

## Operating mode

- Mode: existing application redesign plus release hardening.
- Product: React/TypeScript Chrome MV3 extension.
- Shape: application with one primary Side Panel, one Portal artifact page, and demoted Arcade compatibility surfaces.
- Primary job: keep one browsing Quest legible, then Fold or Unseal a branch without losing place or touching unrelated tabs.
- Risk: medium-high. Tab closure and restoration must remain fail-closed and visibly recoverable.
- Judgment default: preserve working runtime contracts; simplify reversible presentation choices.

## Evidence before lock

- Product truth: `TABYRINTH_PRD.md`, current source, manifest, tests, and build logs.
- Core guidance: `content.action-vocabulary-continuity`, `a11y.name-role-value`, `a11y.status-without-disruption`, `a11y.contrast-and-focus`, `responsive.recompose-not-shrink`, `layout.source-order`, `security.destructive-action-safety`, `motion.interruption-safe`, `motion.frequency-purpose-gate`, `anti.panelized-page-shell`, and `anti.motion-everywhere`.
- User constraint: simplistic, unique, memorable, highly friendly, theme-matched, minimal words, no useless subheaders, and focused on the 80/20 core.
- Source gate: React Bits is licensed MIT plus Commons Clause for use inside an application. Copyright and permission notice must remain with any substantial adapted source. Components cannot be resold or redistributed as a component library.

## Candidate directions

### Trail Instrument — selected

One vertical ancestry trail is the dominant plane. Quest identity and current status stay compact. The next safe action sits beside its relevant fork. Portals and Loot use progressive disclosure. Identity comes from survey-map lines, node notches, fold seams, and tabular path metadata.

### Quest Chronicle — rejected

Editorial milestones create character but require too much prose and push the primary action below the fold.

### Portal Console — rejected

Spatial diagrams can be striking but add interaction and animation cost, risk cyberpunk styling, and weaken narrow source/focus order.

## Selected thesis

TABYRINTH is a quiet trail instrument: one bone-on-charcoal route, moss-marked state, and a single consequence-clear action preserve the user's place without turning browser work into a game dashboard.

**Why this is not generic:** the interface is organized as a live browser ancestry map with a literal fold seam and Portal artifact, not a reusable card grid, SaaS shell, or ornamental game skin.

## System

- Density: `dense-app`, with breathing room around the trail and compact controls elsewhere.
- Composition: wordmark/Quest mark, one goal, one compact status, one dominant ancestry trail, one next action; secondary artifacts remain collapsed until requested.
- Spacing: 4px base; 8/12/16/24px rhythm; no decorative empty bands.
- Type: local humanist sans for readable UI; local mono only for counts, state codes, and path metadata. Scale: 22px product/Quest, 16px node title, 14px body/control, 12px metadata.
- Color: void background, charcoal surface, bone text, quiet steel muted text/rules, moss-acid primary state/action, restrained red only for unsafe/error/destructive consequence.
- Material: flat ink on a dark field instrument. One-pixel rules carry topology. Shadows and translucency are exceptional, not defaults.
- Geometry: square-to-soft corners; circles only for actual nodes/status points; no pill forest.
- Iconography: restrained custom line marks and semantic text. No decorative icon set dependency.
- Familiarity: native buttons, disclosure, headings, lists, and status semantics; originality lives in topology and material, never hidden interaction.

## Motion grammar

1. State continuity: the fold seam closes or reopens only when Fold/Unseal state changes. Reduced motion switches instantly with the same final state.
2. Feedback: press, pending, success, and error feedback confirms the action without moving focus. Reduced motion removes transform and keeps color/text/state cues.
3. Drawer insertion: Portals or Loot disclose from their trigger and reverse cleanly. Reduced motion uses instant visibility.

Ordinary text, trail nodes, page load, and scroll remain static. Motion never controls business state or delays input.

## Component and source strategy

- Use native semantic controls first.
- React Bits inspection set: Animated Content, Fade Content, Count Up, Counter, Pixel Transition, Stepper, Animated List, Folder, Magnet, Click Spark, and Shiny Text.
- Shortlist: Folder, Counter, and a CSS-only fold seam inspired by Pixel Transition.
- Selected ceiling: at most one adapted React Bits component unless runtime evidence proves a second component earns its cost.
- Current selection: adapt Folder only for the Portal artifact if its literal folded-tab-bundle metaphor survives accessibility, reduced-motion, narrow-layout, and bundle checks.
- Rejected: scroll-triggered content animation, continuous number motion, global keyboard listeners, canvas sparks, pointer magnetism, shine loops, GSAP/Motion dependencies, and hover-only state. Reasons: copy/task delay, keyboard conflict, reduced-motion gaps, performance, or decorative mismatch.

## Responsive and accessibility contract

- Support the Side Panel from 320px upward without page-level horizontal scroll.
- Recompose; never shrink text or targets to fit.
- Preserve DOM, reading, and focus order across widths.
- Keep controls at least 40px high where space allows and never below a usable pointer/touch target.
- Use native buttons/disclosure; expose current/selected/expanded/busy state and persistent `role="status"` or `role="alert"` messages by urgency.
- Every action works by keyboard. Focus remains visible against every state and returns predictably after temporary UI.
- Do not rely on color, hover, animation, or symbols alone.
- Long titles wrap; URLs and identifiers break safely; 200% zoom retains task completion.

## Performance budget

- No remote fonts, remote scripts, analytics, canvas ambience, WebGL, or always-running animation.
- Prefer CSS transitions and existing React runtime; add no motion library for polish.
- Keep each surface's initial JavaScript small enough that functionality, not decoration, dominates its chunk.
- Measure build chunks before claiming performance.

## Required states

- Loading.
- No active Quest / first use.
- Active Quest with current trail and fold eligibility.
- Nothing safe to fold.
- Folding / snapshot persisted / branch closed / missing origin.
- Fold blocked by ownership, stale binding, unsupported window, or runtime failure.
- Portal available, unavailable, unsealing, partial restore, complete restore, duplicate-safe restore, and retry.
- Empty and populated Loot.
- Permission/runtime unavailable where reachable.
- Reduced motion and narrow/short viewport outcomes.

## Avoid list

Generic cards, redundant subheaders, explanatory paragraphs, purple gradients, glass, neon, cyberpunk chrome, parchment, pixel-RPG costume, bento grids, badges, fake metrics, ambient particles, repeated reveal animation, remote assets, dead buttons, and status conveyed only by color.

## Rendered refinement

- Before captures: pending.
- Three highest-impact weaknesses: pending rendered inspection.
- Revised captures: pending.
- Second identity pass: required only if the first revised capture still fails the thesis or simplicity test.
