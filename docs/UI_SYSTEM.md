# TABYRINTH UI system

Status: visual foundation for extension surfaces. Runtime wiring is implemented in
the typed background contract; this document records the surface system only.

## Thesis

TABYRINTH is an occult operating system: the browser is a dark instrument panel and the tab strip is the world. Interfaces should feel engineered, alert, and slightly haunted—not like a fantasy card game or purple SaaS dashboard. Use asymmetrical rails, hairline dividers, signal marks, and short all-caps labels. Start unboxed; panels name a state or instrument rather than decorating every sentence.

Variance 6 / motion 3 / density 3: strong typographic contrast, one vertical trail, and small irregular offsets. Motion stays state-driven. No remote assets, canvas, WebGL, or new dependencies.

## Tokens

```css
--ui-void: #090b0b;       /* page / deepest surface */
--ui-charcoal: #121616;   /* panel surface */
--ui-ash: #202727;        /* rule / inactive control */
--ui-bone: #e8e3d5;       /* primary text */
--ui-muted: #929b91;      /* secondary text */
--ui-acid: #b7f34a;       /* active sigil / primary action */
--ui-cyan: #6ee7e4;       /* spectral topology signal */
--ui-red: #ff5c5c;        /* danger / destructive state */
```

Use `--ui-acid` with dark text only. Never communicate state by color alone: pair it with `data-state`, text, or an icon. `--ui-focus` uses cyan and a 2px outline with 3px offset.

## Type and composition

The system uses a local-first stack: `ui-monospace` for instrumentation and labels, `system-ui` for readable body copy. Display text uses weight, tracking, and a clipped line—not a downloaded font. Suggested scale: 0.7rem signal label, 0.875rem body, 1.125rem section, `clamp(1.7rem, 6vw, 3.6rem)` display. Keep line length near 60ch. Dense data belongs in a signal row, not a card grid.

## Primitives

`Button` is a native `<button>` with explicit variants, disabled semantics, focus-visible styling, and pressed state. `Panel` names a bounded surface and supports `data-state` (`idle`, `active`, `warning`, `danger`, `success`). `Signal` renders an accessible status marker and text. `Topology` renders an ordered, text-readable room strip; it is informational and does not mutate game state. `Icon` is a small inline SVG vocabulary with a text label supplied by the caller.

## Motion

Three roles only: focal (enter/leave), state (active/warning), feedback (button/topology response). CSS transitions stay transform/opacity/border-color. No perpetual animation by default. `prefers-reduced-motion: reduce` removes transforms and durations while preserving the final state. Consumers should pause decorative motion when `document.visibilityState !== "visible"`; these primitives never create timers or animation loops.

Current implementation keeps motion state-driven: room/popup surfaces use a short focal entrance, notices and boss alerts use a brief state emphasis, and controls use small hover/press feedback. Reduced motion disables transforms, filters, and animation timing. Topology remains horizontally scrollable on narrow popup widths so room labels are not clipped.

## Accessibility and performance

Native controls first; keyboard focus is visible; labels must remain meaningful without color; contrast target is WCAG AA. Panels do not trap focus. Topology remains readable when colors or motion are unavailable. Zero runtime dependencies, inline SVG only, CSS-only motion, no hydration, no network fetch, and no heavy effect library. React Bits was evaluated as refinement research, not a runtime dependency.

## React Bits evaluation

React Bits MCP inspection covered compact button, form, loader, text, list, drawer, success, fold, card, and Folder candidates. The catalog exposed placeholder Button/Form/Loader records; targeted search returned no usable matches. The dependency-free Folder source was inspected directly and reduced to a small CSS/React folded-tab artifact for `portal.html`.

Selected: one adapted Folder visual. It communicates “pages sealed” without owning business state. Rejected: text reveals, counters, pointer magnetism, click sparks, shine loops, canvas particles, and continuous loaders because they add task cost, keyboard/reduced-motion risk, or decoration without state value. See `THIRD_PARTY_NOTICES.md` for attribution and license boundary.

Why this is not generic: the visual grammar treats browser ancestry as an instrument readout—one vertical trail, acid-green action seam, and a folded Portal artifact—rather than applying a dashboard card kit.

## Rendered refinement — 2026-08-12

- Side Panel and Portal now share a thin acid top seam, quiet topology grid, and a responsive 520px reading measure. The current trail node is identified by a filled marker plus text, not color alone.
- Primary actions gain a restrained offset shadow on hover and a physical press state; reduced-motion removes both transform and shadow. Drawers keep native focus order and remain the only elevated surface.
- Popup launcher and Arcade retain their compatibility behavior while using the same system font stack, active-row rail, and 44px action targets. Room display headings moved to the same sans display treatment so the extension reads as one product.
- No runtime dependency was added. The Folder artifact remains the only React Bits-inspired visual; all other refinement is local CSS and native controls.

# Portal Fold surfaces

The Portal and Side Panel use native semantic controls plus one adapted Folder visual. Native CSS supplies state feedback, focus-visible outlines, mutually exclusive drawers, compact collection affordances, and a reduced-motion equivalent.

Selected interaction roles: one primary fold/unseal action, a local trail window, and compact Portal/Loot counters. The page remains one column and uses semantic buttons, headings, lists, alert/status regions, and honest local view-model states. Runtime message wiring is implemented through the typed background contract.
