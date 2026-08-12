# TABYRINTH UI system

Status: visual foundation for extension surfaces. Gameplay contracts remain untouched.

## Thesis

TABYRINTH is an occult operating system: the browser is a dark instrument panel and the tab strip is the world. Interfaces should feel engineered, alert, and slightly haunted—not like a fantasy card game or purple SaaS dashboard. Use asymmetrical rails, hairline dividers, signal marks, and short all-caps labels. Start unboxed; panels name a state or instrument rather than decorating every sentence.

Variance 8 / motion 7 / density 5: strong typographic contrast and small irregular offsets, with motion reserved for causality and status. No emoji, remote assets, canvas, WebGL, gradients, or new dependencies.

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

## Accessibility and performance

Native controls first; keyboard focus is visible; labels must remain meaningful without color; contrast target is WCAG AA. Panels do not trap focus. Topology remains readable when colors or motion are unavailable. Zero runtime dependencies, inline SVG only, CSS-only motion, no hydration, no network fetch, and no heavy effect library. React Bits was evaluated as refinement research, not a runtime dependency.

## React Bits evaluation

`components.json` exposes `https://reactbits.dev/r/{name}.json`. Registry probe on 2026-08-12 returned HTTP 200 for six candidates: BlurText, Magnet, GlareText, ShinyText, ClickSpark, Particles. Candidates were rejected for this foundation: BlurText/ShinyText duplicate readable type but risk instruction movement; Magnet/ClickSpark add pointer-dependent feedback without keyboard parity; GlareText adds decoration without state value; Particles violate the low-cost, no-canvas direction. No React Bits component selected. This is an honest registry availability check, not proof that source code was copied or locally tested.

Why this is not generic: the visual grammar treats topology as an instrument readout—acid green marks the actionable sigil, cyan marks spectral structure, and red marks a breach—rather than applying a universal dashboard card kit.
