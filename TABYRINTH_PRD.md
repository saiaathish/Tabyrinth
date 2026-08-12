# TABYRINTH
## Product Requirements Document + AO Orchestration Build Plan

**Version:** 1.0 — Hackathon Build Lock  
**Status:** BUILD NOW. No further ideation unless the core feasibility gate fails.  
**Hackathon:** The Orchestra — Agent Orchestrator  
**Primary build agent:** Codex, launched and supervised through Agent Orchestrator (AO)  
**Optional worker agent:** Zcode only if AO already has a working local plugin for it. Do not build or debug a new Zcode integration during the hackathon.  
**Primary platform:** Chrome Extension, Manifest V3  
**Frontend:** React + TypeScript + Vite  
**Persistence:** `chrome.storage.session` for active-run truth; `chrome.storage.local` only for durable preferences/statistics if needed  
**Core external services:** NONE  
**Accounts / auth:** NONE  
**Backend:** NONE  
**AI/LLM in product:** NONE  
**Product thesis:** The browser tab strip itself becomes the game board, controller, and level topology.

---

# 0. READ THIS FIRST

This document is the source of truth for the hackathon build.

The project succeeds if a judge can understand the novelty in under 10 seconds:

> **Your actual Chrome tabs are dungeon rooms. Drag a tab and you physically rewire the dungeon. Close a tab and that room is destroyed.**

The project fails if it degrades into any of these:

- a normal browser game that merely happens to run in multiple tabs;
- a tab-cleanup utility with fantasy styling;
- a conventional dungeon rendered inside one page;
- a generic “AI-generated game”;
- a huge RPG with weak tab mechanics;
- a demo where tab reordering is decorative instead of mechanically necessary;
- a hardcoded video-only trick that cannot survive the judge dragging tabs themselves.

The **tab topology is the product**.

Every engineering, visual, and gameplay decision must protect that sentence.

---

# 1. EXECUTIVE SUMMARY

TABYRINTH is a Chrome extension that turns a dedicated Chrome tab group into a playable dungeon.

Each managed browser tab is one room.

The physical left-to-right order of those tabs is the current room graph.

Example:

```text
[Entrance] [Armory] [Vault] [Abyss] [Boss]
```

means:

```text
Entrance ↔ Armory ↔ Vault ↔ Abyss ↔ Boss
```

If the player physically drags the `Vault` browser tab beside `Boss`:

```text
[Entrance] [Armory] [Abyss] [Vault] [Boss]
```

the dungeon immediately becomes:

```text
Entrance ↔ Armory ↔ Abyss ↔ Vault ↔ Boss
```

The game requires this manipulation to win.

During the boss encounter, the boss can create a real new Chrome tab called `VOID`. While that tab exists, corruption prevents progress. The player must close the actual `VOID` tab to sever the rift.

The final product is intentionally small:

- one 3–5 minute run;
- five core room types;
- one key item;
- one topology puzzle;
- one boss;
- one boss-spawned Void tab;
- one polished onboarding flow;
- one killer demo.

The perceived product surface should feel much larger than the underlying implementation.

---

# 2. HACKATHON OPTIMIZATION

## 2.1 Official Orchestra criteria

The build must optimize for:

1. **Use of AO while building**
2. **Working demo**
3. **Creativity**
4. **Presentation and engagement**

No official criterion weights are assumed.

## 2.2 Internal fallback stress test

Use these only as secondary quality gates:

1. Originality
2. Technical depth
3. Viability
4. Scope discipline
5. Demo impact
6. Fit

## 2.3 Score strategy

### Use of AO while building — target: Winner

AO must not be ceremonial.

Proof must include:

- multiple real Codex workers running through AO;
- isolated worktrees/branches;
- disjoint ownership;
- visible parallel sessions on AO board;
- PRs produced by workers;
- at least one real review/CI feedback loop if it naturally occurs;
- AO build log with timestamps and worker responsibilities;
- screenshot/video capture of AO Kanban during active work.

### Working demo — target: Winner

The extension must work live from an unpacked install.

Judge path:

1. install/load extension;
2. click Start Run;
3. see grouped game tabs;
4. play through first rooms;
5. physically drag a tab;
6. observe world topology update;
7. enter boss;
8. boss creates Void browser tab;
9. close Void tab;
10. finish run.

No fake data.
No prerecorded-only core mechanic.
No network dependency.

### Creativity — target: Winner

The novelty claim is narrow:

> **The ordered set of real browser tabs is a mutable game-world topology, and browser-level tab operations are load-bearing game actions.**

Do not broaden novelty claims.

Do not claim:
- first browser game;
- first game across tabs;
- first Chrome-extension game;
- first multi-window game;
- first tab gamification.

### Presentation — target: Winner

The demo should produce two distinct reactions:

**Moment 1:** “Wait, dragging the actual tab changed the dungeon.”

**Moment 2:** “The boss literally opened a hostile browser tab, and closing it killed the rift.”

Then show AO:

**Moment 3:** “This was built by multiple Codex workers in parallel through AO.”

---

# 3. PRODUCT PRINCIPLES

These are hard rules.

## P1 — Chrome itself must be part of gameplay

If the player can finish the game without manipulating the tab bar, the design is wrong.

## P2 — The extension only owns tabs it created

Never touch:
- Gmail;
- school/work tabs;
- random tabs;
- unrelated tab groups;
- user browsing history.

Managed tab IDs must be explicitly registered to the active run.

## P3 — One tiny game, finished

Prefer:
- five excellent rooms;
- one excellent boss;
- one excellent puzzle.

Reject:
- campaign;
- inventory system;
- skill tree;
- multiplayer;
- account system;
- procedural world;
- dialogue tree;
- lore database.

## P4 — Browser state is game state

The authoritative topology comes from actual managed tab indices, not an internal array that merely imitates them.

## P5 — The core must survive Manifest V3 service-worker suspension

Do not rely on service-worker global variables for authoritative run state.

## P6 — No product AI

This project is more differentiated without a chatbot or LLM wrapper.

## P7 — UI polish is a score multiplier, not a replacement for mechanics

React Bits and frontend taste tooling must enhance the core interaction, not bury it under effects.

---

# 4. TARGET USER

Primary user:

> A person who wants a short, surprising browser-native game and is comfortable installing a Chrome extension.

Hackathon demo user:

> A judge who should understand the product from a single tab drag.

No account is required.
No developer setup is required after the extension is loaded.
No API key is required.
No internet is required during a run after assets are bundled.

---

# 5. JOB TO BE DONE

“When I want a quick game that feels impossible inside a normal browser, turn Chrome’s own tab controls into the game mechanics so I am manipulating the browser and the world at the same time.”

---

# 6. ONE-SENTENCE PRODUCT PITCH

> **TABYRINTH turns your real Chrome tab strip into a dungeon: every tab is a room, dragging tabs rewires the level, and closing tabs can destroy parts of the world.**

Never replace this with a longer first explanation.

---

# 7. CORE USER FLOW

## 7.1 Installation

For hackathon:

1. User opens `chrome://extensions`.
2. Enables Developer Mode.
3. Chooses Load unpacked.
4. Selects built extension directory.

Stretch after hackathon:
- Chrome Web Store packaging.

## 7.2 First launch

Extension action popup shows:

```text
TABYRINTH

THE DUNGEON LIVES IN YOUR TAB BAR.

[ START RUN ]

~3 minutes
No account
No internet required
```

Secondary small link:
`How it works`

No settings screen before Start.

## 7.3 Start Run

When clicked:

1. generate `runId`;
2. create five extension-owned room tabs;
3. group those exact tabs;
4. label group `TABYRINTH`;
5. apply group color;
6. register `tabId → roomId`;
7. persist state;
8. activate Entrance;
9. show 10–15 second onboarding overlay.

Initial room order:

```text
Entrance | Armory | Sanctum | Vault | Boss
```

Optional Abyss replaces Sanctum if five-room puzzle design works better. Keep total initial tabs at five.

## 7.4 Onboarding

Entrance overlay:

```text
THIS DUNGEON IS YOUR TAB BAR.

Every game tab is a room.

[Show animated tab-strip diagram]

DRAG A TAB
→ the dungeon rewires

CLOSE A TAB
→ the room is destroyed

[ ENTER ]
```

Then one explicit tutorial action:

> “Drag ARMORY to the right of VAULT.”

The game waits for the real `tabs.onMoved` event.

After the move:

```text
THE WALLS MOVED WITH YOU.
```

This proves the core mechanic before exposition continues.

## 7.5 Explore

Each room page shows:

- current room title;
- room art/ambient scene;
- player health;
- held item if any;
- left portal;
- right portal;
- one room interaction;
- topology mini-strip showing only managed rooms;
- short event feed.

Movement uses in-game portals that activate the adjacent actual game tab.

The browser tab strip remains visible and useful.

## 7.6 Topology puzzle

Vault contains the `Sigil`.

Boss shield can only be opened when:

- player has Sigil;
- Vault is physically adjacent to Boss in the managed tab order.

The game gives a readable clue:

```text
THE SIGIL HUMS TOWARD THE THRONE.

The seal cannot cross a broken corridor.
```

If player reaches Boss while Vault is not adjacent:

```text
THE SIGIL CANNOT REACH THE THRONE.

Rearrange the halls.
```

The player must drag the Vault tab beside Boss.

The room graph updates live.

Boss shield changes immediately.

## 7.7 Boss phase

Boss has two phases.

### Phase 1 — Shield

Condition:
`Vault adjacent to Boss && player.hasSigil`

Action:
`Break Seal`

Visual:
corridor energy line / UI pulse across topology strip.

### Phase 2 — Void Rift

On entering phase 2:

1. service worker creates new extension-owned room tab;
2. room ID = `void-rift`;
3. tab title = `VOID`;
4. tab is inserted next to Boss if possible;
5. tab joins TABYRINTH group;
6. game state sets `voidActive = true`.

All game rooms show:

```text
A VOID RIFT HAS BREACHED THE TAB BAR.
SEVER THE TAB.
```

While Void exists:
- boss damage is disabled OR corruption rises per player action.

Player physically closes `VOID`.

`tabs.onRemoved` detects the managed Void tab.

State:
`voidActive = false`.

All open rooms animate:
`RIFT SEVERED`.

Boss becomes vulnerable.

## 7.8 Victory

After final hit:

- boss room collapses visually;
- run timer stops;
- stats shown;
- controlled room tabs optionally collapse into one Victory tab only after explicit button.

Victory page:

```text
THE TABYRINTH HAS FALLEN.

03:42
5 halls crossed
2 reality shifts
1 void severed

[ PLAY AGAIN ]
[ CLOSE DUNGEON ]
```

Do not automatically close all tabs without user action.

---

# 8. GAMEPLAY SPEC

## 8.1 Room types

MVP room set:

1. **Entrance**
2. **Armory**
3. **Sanctum**
4. **Vault**
5. **Boss**
6. **Void** — spawned, not initial

Optional:
- Abyss can replace Sanctum.

Do not exceed six total room types in hackathon version.

## 8.2 Player state

```ts
type PlayerState = {
  hp: number;              // 0..3
  maxHp: 3;
  hasBlade: boolean;
  hasSigil: boolean;
  currentRoomId: RoomId;
};
```

Keep combat deterministic.

No random critical hits.
No complex stats.

## 8.3 Room state

```ts
type RoomKind =
  | "entrance"
  | "armory"
  | "sanctum"
  | "vault"
  | "boss"
  | "void";

type RoomState = {
  roomId: string;
  kind: RoomKind;
  tabId: number;
  visited: boolean;
  destroyed: boolean;
  completed: boolean;
};
```

## 8.4 Run state

```ts
type RunStatus =
  | "idle"
  | "onboarding"
  | "active"
  | "boss"
  | "victory"
  | "defeat";

type GameState = {
  schemaVersion: 1;
  runId: string;
  status: RunStatus;

  groupId: number | null;
  windowId: number | null;

  roomById: Record<string, RoomState>;
  roomIdByTabId: Record<string, string>;

  orderedRoomIds: string[];

  player: PlayerState;

  boss: {
    hp: number;
    maxHp: number;
    shieldBroken: boolean;
    voidActive: boolean;
    voidRoomId: string | null;
  };

  flags: {
    tutorialMoveCompleted: boolean;
    sigilAdjacencySatisfied: boolean;
    bossIntroduced: boolean;
  };

  metrics: {
    startedAt: number;
    endedAt: number | null;
    tabMoves: number;
    roomsClosed: number;
    actions: number;
  };

  revision: number;
};
```

## 8.5 Canonical game actions

All mutations go through a reducer.

```ts
type GameAction =
  | { type: "RUN_START"; payload: ... }
  | { type: "TAB_TOPOLOGY_SYNC"; payload: ... }
  | { type: "MOVE_PLAYER"; payload: { toRoomId: string } }
  | { type: "TAKE_BLADE" }
  | { type: "TAKE_SIGIL" }
  | { type: "BREAK_SEAL" }
  | { type: "ATTACK_BOSS" }
  | { type: "VOID_SPAWNED"; payload: ... }
  | { type: "ROOM_CLOSED"; payload: { roomId: string } }
  | { type: "VOID_CLOSED" }
  | { type: "RUN_VICTORY" }
  | { type: "RUN_RESET" };
```

No UI component may directly mutate storage.

## 8.6 Derived selectors

Use pure selectors:

```ts
getOrderedRooms(state)
getRoomNeighbors(state, roomId)
isAdjacent(state, a, b)
canEnter(state, from, to)
canBreakBossSeal(state)
canDamageBoss(state)
getCurrentRoom(state)
```

Topology logic must be fully unit-testable without Chrome.

---

# 9. TOPOLOGY RULES

## 9.1 Source of truth

For actual browser ordering:

1. query the active TABYRINTH group;
2. obtain managed tabs;
3. sort by Chrome `tab.index`;
4. map to registered `roomId`;
5. persist `orderedRoomIds`.

Do not trust the `fromIndex/toIndex` event alone.

## 9.2 Adjacency

A linear world is sufficient:

For ordered rooms:

```text
A B C D E
```

edges are:

```text
A↔B
B↔C
C↔D
D↔E
```

No graph editor.
No branching topology for MVP.

The novelty is browser topology, not graph theory.

## 9.3 Manual tab movement

On `chrome.tabs.onMoved`:

- ignore unregistered tabs;
- if managed:
  - rescan managed group order;
  - dispatch `TAB_TOPOLOGY_SYNC`;
  - increment `metrics.tabMoves`;
  - recalculate adjacency selectors;
  - notify pages through storage change or message;
  - trigger room transition animation.

Target:
- visible UI reaction should feel immediate.
- optimize only if obviously laggy.

## 9.4 Tab closure

On `chrome.tabs.onRemoved`:

If tab ID is not managed:
- ignore.

If managed:
- find room;
- remove from topology;
- mark/remove room;
- update mapping;
- if Void:
  - dispatch `VOID_CLOSED`;
- otherwise:
  - dispatch `ROOM_CLOSED`.

Never interfere with closure.

## 9.5 User creates random tabs

Ignore them.

Only tabs explicitly created by TABYRINTH with:
- active `runId`;
- extension room URL;
- registered tab ID;

may enter game state.

## 9.6 Game tab moved outside group

MVP behavior:

- detect that managed tab no longer belongs to expected group;
- pause run;
- show warning on remaining rooms:

```text
A ROOM FELL OUTSIDE THE TABYRINTH.
[ RESTORE ROOM ]
```

Restore button:
- re-group the managed tab if it still exists.

If implementation threatens schedule:
- simpler fallback: immediately regroup it automatically.

## 9.7 Game tab moved to another browser window

MVP:
- prevent unsupported cross-window state by restoring it to original run window when detected.

If restoration proves unreliable:
- display a non-fatal “Return the room to this window” instruction.

Do not attempt multi-window dungeon support.

---

# 10. CHROME EXTENSION ARCHITECTURE

## 10.1 Manifest

Manifest V3.

Required permissions should remain narrow.

Expected:

```json
{
  "manifest_version": 3,
  "name": "TABYRINTH",
  "version": "0.1.0",
  "permissions": [
    "storage",
    "tabGroups"
  ],
  "background": {
    "service_worker": "service-worker.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup.html"
  }
}
```

Add `"tabs"` only if implementation genuinely requires privileged Tab fields.

No broad host permissions.

No `<all_urls>`.

No content scripts for MVP.

## 10.2 Service worker

Responsibilities:

- run creation;
- tab creation;
- group creation/configuration;
- authoritative dispatch/reduce/persist;
- topology sync;
- tab event listeners;
- activate adjacent room;
- Void spawn;
- cleanup/reset;
- state validation/migration.

The worker must tolerate suspension.

No authoritative globals.

## 10.3 Storage

Use:

`chrome.storage.session`

for:

- active run;
- tab mapping;
- current game state.

Reason:
- shared across extension contexts;
- survives service-worker suspension;
- naturally clears at browser restart/extension reload.

Optional:

`chrome.storage.local`

for:
- sound preference;
- reduced motion preference;
- best run time.

Do not persist active tab IDs to long-term storage across browser restarts.

## 10.4 Messaging

Room and popup pages send intents to service worker:

```ts
chrome.runtime.sendMessage({
  type: "GAME_ACTION",
  runId,
  action
})
```

Service worker validates:
- active run ID;
- allowed action;
- current state preconditions.

Room pages subscribe to storage changes:

```ts
chrome.storage.onChanged.addListener(...)
```

This keeps UI simple and resilient.

## 10.5 Room page identity

Every room page URL includes:

```text
room.html?run=<runId>&room=<roomId>
```

The page must also verify that:
- active run matches;
- current tab ID is registered to that room.

Never trust query params alone.

## 10.6 Service-worker event listener registration

Register Chrome event listeners synchronously at top level.

State loading can happen inside handlers.

## 10.7 No remotely hosted executable code

All JS, component source, animation logic, and assets needed by the extension must ship in the extension bundle.

React Bits components must be copied/installed into the project build, not executed from a remote CDN.

---

# 11. PROJECT STACK

## Required

- TypeScript
- React
- Vite
- Chrome Manifest V3
- Vitest
- ESLint
- Prettier
- Phosphor Icons or another non-generic icon set already recommended by the taste skill
- CSS variables + component-scoped styling or Tailwind if scaffold chooses it consistently

## Strong preference

Use a straightforward single-repo structure.

Do not introduce:
- Next.js;
- server framework;
- database;
- state-management mega-library;
- WebSocket backend;
- auth library.

## State

Pure reducer + Chrome storage is enough.

Do not install Redux unless a concrete blocker appears.

---

# 12. REPOSITORY STRUCTURE

Target structure:

```text
tabyrinth/
├── .github/
│   └── workflows/
│       └── ci.yml
├── .codex/
│   └── agents/                 # optional project-scoped worker profiles
├── docs/
│   ├── GAME_CONTRACT.md
│   ├── UI_SYSTEM.md
│   ├── DECISIONS.md
│   ├── AO_BUILD_LOG.md
│   ├── DEMO_SCRIPT.md
│   └── ao-evidence/
│       └── README.md
├── public/
│   ├── icons/
│   └── manifest.json
├── src/
│   ├── background/
│   │   ├── service-worker.ts
│   │   ├── chrome-events.ts
│   │   ├── run-controller.ts
│   │   └── tab-controller.ts
│   ├── game/
│   │   ├── types.ts
│   │   ├── constants.ts
│   │   ├── reducer.ts
│   │   ├── selectors.ts
│   │   ├── invariants.ts
│   │   ├── rooms.ts
│   │   └── boss.ts
│   ├── platform/
│   │   ├── chrome-storage.ts
│   │   ├── chrome-messaging.ts
│   │   └── chrome-tabs.ts
│   ├── pages/
│   │   ├── popup/
│   │   ├── room/
│   │   └── victory/
│   ├── ui/
│   │   ├── components/
│   │   ├── effects/
│   │   ├── icons/
│   │   ├── tokens.css
│   │   └── global.css
│   └── test/
│       ├── mocks/
│       └── fixtures/
├── popup.html
├── room.html
├── victory.html
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

The exact structure may vary slightly.

Do not reorganize after Wave 1 unless necessary.

---

# 13. CODE CONTRACTS

The foundation worker must create and freeze these before parallel feature workers begin:

1. `GameState`
2. `GameAction`
3. reducer interface
4. selector interface
5. storage adapter interface
6. message envelope
7. room page query contract
8. managed-tab registration contract
9. design token names

Workers may add fields only when:
- backward compatible;
- documented;
- tested.

No worker may independently invent a second state store.

---

# 14. STATE INVARIANTS

Implement runtime assertions in development and tests.

Examples:

```text
I1: Every room with tabId has exactly one reverse roomIdByTabId entry.
I2: Every orderedRoomId exists in roomById.
I3: orderedRoomIds contains no duplicate room IDs.
I4: Every managed tab in topology belongs to the active run.
I5: currentRoomId must exist unless status is idle.
I6: voidActive=true implies voidRoomId exists.
I7: voidRoomId, when present, points to a room of kind "void".
I8: boss.hp never falls below 0.
I9: active run mutation increments revision.
I10: unrelated Chrome tab events never change GameState.
```

Tests must intentionally try to violate these.

---

# 15. ROOM DESIGN

## 15.1 Common frame

All rooms share:

- top-left: `TABYRINTH` micro-brand;
- top-center: room title;
- top-right: 3-heart HP indicator;
- bottom center: topology strip;
- left edge: left portal;
- right edge: right portal;
- center: room-specific interaction;
- bottom-left: short event log;
- bottom-right: tiny hint icon.

No large conventional navbar.

No dashboard card grid.

## 15.2 Entrance

Purpose:
- onboarding;
- first topology manipulation.

Visual:
- giant archway;
- subtle stone/grid geometry;
- animated line matching tab topology.

Action:
`Enter`.

## 15.3 Armory

Purpose:
- obtain Blade.

Visual:
- suspended weapon / shrine.

Action:
`Take Blade`.

If already taken:
- empty weapon stand;
- no duplicate.

## 15.4 Sanctum

Purpose:
- restore health or teach interaction.

Action:
`Restore`.

Keep mechanics minimal.

## 15.5 Vault

Purpose:
- obtain Sigil;
- communicate adjacency requirement.

Action:
`Take Sigil`.

After taking:
- ambient pulse points toward Boss only when adjacent.

## 15.6 Boss

Purpose:
- climax.

Visual:
- large central silhouette / eye / throne;
- simple health bar;
- no complicated sprite animation required.

Phase 1:
`Break Seal` only when valid.

Phase 2:
`Attack`.

When Void active:
- attack disabled;
- red corruption treatment;
- explicit browser-level instruction.

## 15.7 Void

Purpose:
- the second signature browser mechanic.

Visual:
- nearly black page;
- huge `VOID`;
- glitch border;
- one instruction:

```text
THIS ROOM DOES NOT BELONG HERE.

CLOSE THIS TAB.
```

No in-page “Close” button.

The player must close the browser tab.

---

# 16. MOVEMENT

The player moves through **portal buttons inside the room**.

Left portal:
- targets current room's left neighbor in real tab topology.

Right portal:
- targets right neighbor.

Click:
1. validate adjacency from current authoritative state;
2. update `player.currentRoomId`;
3. activate target Chrome tab.

Do not allow arbitrary in-game teleport.

If the player manually clicks another game tab:
- acceptable MVP behavior: update current room to that tab.
- topology puzzle remains load-bearing through boss adjacency.

Do not spend hours enforcing adjacency on manual browser activation.

---

# 17. VISUAL DIRECTION

## 17.1 Design concept

**“Occult operating system trapped inside Chrome.”**

Not:
- generic medieval RPG;
- neon-purple AI SaaS;
- crypto dashboard;
- pixel-art clone;
- Bootstrap game.

Combine:
- sharp browser/software geometry;
- dungeon atmosphere;
- restrained arcane motifs;
- premium motion.

## 17.2 Visual tokens

Suggested palette:

```css
--bg-0: #070909;
--bg-1: #0d1110;
--surface: #121817;
--surface-2: #18201e;

--text: #f3f0e8;
--muted: #8d9892;

--sigil: #d6ff4b;
--arcane: #62e8d5;
--danger: #ff5a52;
--gold: #d4ae61;

--line: rgba(243,240,232,0.12);
```

Avoid giant gradients.

Use glow only for:
- topology changes;
- Sigil adjacency;
- Void warning;
- boss damage.

## 17.3 Typography

Use locally bundled font packages if possible.

Suggested:
- display: `Unbounded` or a similarly distinctive geometric face;
- UI/body: `Space Grotesk Variable`.

If these hurt readability:
- keep Space Grotesk for everything and vary weight/letter spacing.

Never fetch executable assets remotely.

## 17.4 Icons

Prefer:
- Phosphor;
- Tabler;
- Radix;
- HugeIcons;

based on installed taste skill guidance and availability.

No emoji as production UI icons.

## 17.5 Motion

Motion should explain state:

- tab topology changed → corridor line reorders;
- Sigil becomes adjacent → connection pulse;
- room destroyed → hard collapse/fade;
- Void appears → corruption edge enters;
- Void closes → shockwave clears corruption;
- boss damage → restrained impact.

Avoid constant motion everywhere.

## 17.6 Performance rule

Multiple Chrome tabs can be open simultaneously.

Therefore:

- no heavy WebGL background on every room;
- no always-running expensive particle field in every inactive tab;
- pause nonessential animation when `document.hidden`;
- use transform/opacity animations;
- reduce effects with `prefers-reduced-motion`.

Target smooth active-room experience over maximal decoration.

---

# 18. FRONTEND TOOLING: CODEX HOME IS THE CONTROL PLANE

AO must tell every Codex worker:

> **Inspect the Codex home directory before installing or recreating any plugin, skill, MCP server, or agent profile. Global tooling belongs there and is inherited by workers.**

Resolve Codex home:

1. `$CODEX_HOME` if set;
2. otherwise `~/.codex`.

Inspect:

```text
$CODEX_HOME/config.toml
$CODEX_HOME/.env
$CODEX_HOME/skills/
$CODEX_HOME/agents/
$CODEX_HOME/plugins/        # if present in this installation
project/.codex/
```

Do not overwrite unrelated configuration.

Back up `config.toml` before modifying.

Example:

```bash
cp ~/.codex/config.toml ~/.codex/config.toml.tabyrinth-backup
```

---

# 19. FRONTEND-TASTE-ENGINEER / TASTE SKILL

The user's local Codex setup may expose a plugin/skill named:

```text
frontend-taste-engineer
```

AO must search for that exact local name first.

Also search aliases:

```text
design-taste-frontend
gpt-taste
taste-skill
taste-frontend
```

If the user's exact `frontend-taste-engineer` tooling exists:
- use it;
- do not replace it.

If absent, install the upstream Taste Skill fallback:

```bash
npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"
```

Optional Codex-specific stricter variant only if useful:

```bash
npx skills add https://github.com/Leonxlnx/taste-skill --skill "gpt-taste"
```

Do not spend more than 10 minutes debugging this.

## 19.1 Required design worker behavior

Frontend workers must:

1. read the relevant taste skill before UI implementation;
2. infer a design direction from this PRD;
3. write `docs/UI_SYSTEM.md` before broad styling;
4. use the design tokens consistently;
5. avoid generic hero/card-grid/gradient-button patterns;
6. run a pre-flight UI audit;
7. perform screenshot-driven visual review if a browser tool is available.

Recommended taste dials:

```text
DESIGN_VARIANCE = 8
MOTION_INTENSITY = 7
VISUAL_DENSITY = 5
```

Do not blindly force those if the installed skill uses different terminology.

---

# 20. REACT BITS MCP

React Bits is an enhancement source, not a dependency on the critical game loop.

## 20.1 Installation policy

First inspect Codex MCP config for an existing React Bits server.

Search `config.toml` for:
- `reactbits`;
- `react-bits`;
- similar server names.

If a working one exists:
- reuse it.

If absent:
- install/configure the current community ReactBits MCP helper.

Preferred stdio configuration:

```toml
[mcp_servers.reactbits]
command = "npx"
args = ["-y", "reactbits-dev-mcp-server"]
```

After changing Codex MCP config:
- restart new Codex worker sessions as required;
- verify the server can list/search components.

If this community MCP fails:
1. do not stall more than 10 minutes;
2. use the official React Bits library/CLI directly;
3. continue build.

Official-library fallback example:

```bash
npx shadcn@latest add @react-bits/BlurText-TS-TW
```

Use the exact component command from the currently installed React Bits tooling rather than assuming every registry path exists.

## 20.2 Community MCP warning

The React Bits MCP server is not treated as an official core dependency.

Some community MCP component implementations may lag the official React Bits library or have incomplete components.

Therefore:

- query components;
- inspect returned code;
- test locally;
- use it mainly for animation/effects;
- never let it own core buttons/forms/game state.

## 20.3 React Bits usage target

UI worker must query at least 6 candidates.

Use at most 2–4 components in the final extension.

Good candidate categories:
- text reveal;
- click impact;
- lightweight transition;
- ambient active-room effect.

Potential examples to evaluate, not mandates:
- DecryptedText
- BlurText
- ClickSpark
- PixelTransition
- GlareHover
- SpotlightCard

Avoid:
- giant WebGL background in every tab;
- anything that noticeably harms GPU/CPU;
- components that duplicate a simpler native implementation.

Create:

`docs/UI_SYSTEM.md`

with:
- candidates considered;
- final selected components;
- why each exists;
- performance notes.

---

# 21. ACCESSIBILITY / UX BASELINE

This is a game, but basic quality matters.

Required:

- keyboard-accessible buttons;
- visible focus states;
- readable contrast;
- `prefers-reduced-motion`;
- meaningful labels;
- no critical instruction communicated only by color;
- no audio-only cue;
- popup usable at standard extension popup size.

Do not build an accessibility settings platform.

---

# 22. SOUND

Optional but high demo value.

Keep to:
- portal activation;
- topology shift;
- Sigil pickup;
- boss hit;
- Void spawn;
- Void sever;
- victory.

Use local bundled sounds.

No autoplay until user interaction.

Add mute toggle.

If sound integration costs >45 minutes:
- cut it.

---

# 23. ERROR / EMPTY STATES

Required.

## No active run

Popup:
`Start Run`.

Room tab opened without valid run:
`This room has collapsed. Start a new run.`

## Existing run

Popup:
- `Resume Run`
- `Reset Run`

Do not create duplicate uncontrolled runs.

## Missing managed tab

Remaining rooms:
`A room has collapsed.`

Topology reflows.

## Storage invalid/corrupt

Fail safe:
- show restart option;
- do not touch unrelated tabs.

## Extension reload during run

Because `storage.session` can clear on extension reload:
- stale open room pages detect no active run;
- show collapsed state with `Start New Run`.

## Browser restart

Active run naturally ends.

No attempt to restore old tab IDs.

---

# 24. SECURITY / PRIVACY

The extension must not request permissions it does not need.

Hard rules:

- no browsing history;
- no page content;
- no host permissions;
- no content-script injection;
- no clipboard;
- no account data;
- no analytics in hackathon build;
- no remote code.

README must clearly state:

> TABYRINTH only manages the dedicated game tabs it creates.

---

# 25. TEST PLAN

## 25.1 Unit tests

Required for:

### reducer
- valid action transitions;
- invalid actions no-op or error;
- boss shield conditions;
- Void state;
- victory state.

### selectors
- left/right neighbor;
- adjacency;
- boss seal predicate;
- room lookup.

### invariants
- duplicate room IDs;
- stale mappings;
- invalid Void state;
- invalid current room.

### topology
Given:
```text
A B C D E
```

move:
```text
D → index 1
```

expect:
```text
A D B C E
```

adjacency must recompute.

## 25.2 Chrome adapter tests

Mock Chrome API.

Test:

- managed `onMoved` mutates topology;
- unrelated `onMoved` ignored;
- managed normal `onRemoved` destroys room;
- unrelated `onRemoved` ignored;
- closing Void clears Void;
- Start Run registers exactly created tabs;
- reset only closes/cleans managed tabs if close behavior is implemented.

## 25.3 Manual extension matrix

Before demo:

### Start
- [ ] load unpacked extension
- [ ] Start Run works
- [ ] five tabs created
- [ ] only game tabs grouped
- [ ] group correctly titled

### Core
- [ ] drag Armory
- [ ] topology UI changes
- [ ] left/right portals point to new neighbors
- [ ] no reload needed

### Safety
- [ ] move unrelated tab
- [ ] state unchanged
- [ ] close unrelated tab
- [ ] state unchanged

### State
- [ ] refresh room page
- [ ] run remains
- [ ] service worker can suspend/revive without losing state

### Puzzle
- [ ] obtain Sigil
- [ ] Boss seal rejects invalid topology
- [ ] move Vault adjacent to Boss
- [ ] Boss seal changes immediately

### Void
- [ ] boss opens real Void tab
- [ ] Void is in game group
- [ ] closing Void triggers state change
- [ ] boss becomes vulnerable

### End
- [ ] victory works
- [ ] replay/reset works
- [ ] no console errors

## 25.4 CI

Minimum CI:

```text
npm ci
npm run typecheck
npm run lint
npm run test
npm run build
```

No CI job should require Chrome UI unless reliable.

---

# 26. PERFORMANCE BUDGET

Soft targets:

- popup opens instantly enough to feel native;
- room render <1s locally;
- topology update feels immediate;
- no obvious 100% CPU behavior across 5 tabs;
- no multi-second animation before controls become available.

Bundle size is secondary to reliability, but avoid unnecessary heavy libraries.

---

# 27. ANALYTICS / EVIDENCE

No user analytics required.

For hackathon evidence only, record locally:

```ts
metrics: {
  startedAt,
  endedAt,
  tabMoves,
  roomsClosed,
  actions
}
```

Victory screen may show:
- run time;
- topology shifts;
- rooms destroyed.

Do not make unsupported “engagement” claims.

---

# 28. AO BUILD STRATEGY

AO is mandatory to the development process.

AO's job:

- supervise;
- spawn Codex workers;
- keep workers isolated;
- track branches/PRs;
- route review/CI feedback;
- maintain execution state.

Codex workers write the code.

The orchestrator must not become the primary coding worker.

## 28.1 AO configuration target

Project config should resolve to the equivalent of:

```yaml
agent: codex
workspace: worktree

postCreate:
  - npm install

agentRules: |
  Read TABYRINTH_PRD.md before coding.
  Keep changes inside assigned ownership.
  Never touch unrelated user tabs.
  Use Manifest V3.
  Run relevant tests before pushing.
  No placeholder implementations.
  No remote executable code.
  No scope expansion.
```

If `npm ci` is available after lockfile creation, prefer it for later workers.

Do not clobber an existing valid AO config.

## 28.2 Agent selection

Default:
`codex`

Optional Zcode:
- only if already installed;
- only if AO already supports it locally;
- never on the critical path;
- no time spent writing an AO plugin.

---

# 29. WAVE ORCHESTRATION

The build is intentionally phased.

Do not spawn six agents against an unfrozen architecture.

---

## WAVE 0 — RECON + TOOLING

**Time budget:** 15–25 minutes

Orchestrator tasks:

1. inspect repo;
2. inspect Codex home;
3. verify Codex auth/runtime;
4. verify AO;
5. verify frontend taste skill;
6. verify/install ReactBits MCP;
7. back up config before edits;
8. set AO worker agent = Codex;
9. create/confirm Git repo and remote if already authorized;
10. create `docs/DECISIONS.md`.

Do not do broad product research.

### W0 gate

Must know:
- project root;
- Codex home;
- which frontend skill is available;
- whether ReactBits MCP works;
- whether `gh` is authenticated;
- whether AO can spawn Codex worker.

If ReactBits MCP fails:
- mark fallback;
- continue.

---

## WAVE 1 — FOUNDATION

**Concurrency:** 1 primary worker  
**Time budget:** 1.5–2.5 hours

### Worker: `foundation-core`

Owns:

```text
package.json
vite.config.ts
tsconfig.json
public/manifest.json
src/game/**
src/platform/**
src/background/**
basic popup/room bootstraps only
tests for game core
docs/GAME_CONTRACT.md
```

Goal:

> Make real managed Chrome tabs create, group, reorder, and update an authoritative topology.

Acceptance:

1. extension builds;
2. popup can Start Run;
3. creates 5 controlled tabs;
4. creates TABYRINTH group;
5. state persists in `storage.session`;
6. moving one controlled tab updates `orderedRoomIds`;
7. room page displays current order as plain debug UI;
8. unrelated tabs are ignored;
9. tests pass.

No visual polish.

### HARD GATE 1

Human/orchestrator must manually prove:

> **drag a real game tab → topology debug strip changes without reload**

If this fails:
- DO NOT spawn polish workers;
- keep one or two workers on core only;
- fix within next 90 minutes.

If still impossible:
- pivot mechanic before spending more time.

---

## WAVE 2 — PARALLEL PRODUCT BUILD

Start only after Hard Gate 1.

**Concurrency:** 5 workers max  
**Time budget:** 3–4 hours

Workers must use disjoint primary ownership.

### W2-A — `gameplay-worker`

Owns:

```text
src/game/rooms.ts
src/game/boss.ts
src/game/content/**
tests for gameplay
```

Goal:
- Blade;
- Sigil;
- boss shield;
- adjacency rule;
- Void phase;
- victory.

Must not redesign shared types unless necessary.

### W2-B — `room-ui-worker`

Owns:

```text
src/pages/room/**
```

Goal:
- common room shell;
- portals;
- room scenes;
- topology strip;
- HP/item HUD;
- event feed.

Requirements:
- use frontend taste skill;
- use design tokens;
- no generic dashboard.

### W2-C — `popup-onboarding-worker`

Owns:

```text
src/pages/popup/**
src/pages/victory/**
```

Goal:
- Start Run;
- Resume;
- Reset;
- onboarding;
- victory;
- concise explanations.

### W2-D — `visual-system-worker`

Owns:

```text
src/ui/**
docs/UI_SYSTEM.md
```

Goal:
- tokens;
- typography;
- motion primitives;
- icon system;
- React Bits evaluation and selected integrations.

Must query ReactBits MCP if working.

Must not add more than 2–4 React Bits components.

### W2-E — `chrome-reliability-worker`

Owns:

```text
src/background/chrome-events.ts
src/background/tab-controller.ts
src/test/mocks/**
adapter/integration tests
```

Goal:
- removed tabs;
- detached tabs;
- unrelated tabs;
- Void creation/closure;
- storage/service-worker resilience.

Coordinate with foundation contract.
Avoid editing UI.

### W2 acceptance

Each worker:
- tests its change;
- opens focused PR;
- documents any contract change;
- no unrelated refactor.

---

## WAVE 3 — INTEGRATION + FIRST RED TEAM

**Concurrency:** 2–3  
**Time budget:** 2–3 hours

Start after Wave 2 PRs are integrated/available.

### W3-A — `integration-worker`

Goal:
- integrate feature surfaces;
- resolve type/API mismatches;
- ensure full build.

No redesign.

### W3-B — `adversarial-gameplay-worker`

Read-only first.

Test:
- random tab movement;
- room deletion;
- repeated Start Run;
- refresh;
- reset;
- boss sequence;
- weird topology orders;
- zero/one remaining room;
- closing Void;
- unrelated tabs.

Then implement only confirmed fixes in owned patch.

### W3-C — `ux-judge-worker`

Use frontend taste plugin.

Judge from 3-minute demo perspective.

Report:
- confusing instruction;
- visual hierarchy issue;
- interaction that takes >5 seconds to understand;
- anything looking AI-generated/generic;
- anything requiring explanation before the tab mechanic appears.

Fix highest-severity issues only.

### HARD GATE 2

A fresh tester must be able to:

1. click Start;
2. understand tabs = rooms;
3. drag a tab;
4. visibly see change;
5. obtain Sigil;
6. understand adjacency clue;
7. make Vault adjacent to Boss;
8. spawn Void;
9. close actual Void tab;
10. win;

without developer intervention.

If not:
- cut complexity;
- rewrite onboarding;
- do not add stretch features.

---

## WAVE 4 — POLISH + PRESENTATION EVIDENCE

**Concurrency:** 3–4  
**Time budget:** 2–3 hours

### W4-A — `motion-polish-worker`

Owns:
- transitions;
- topology-shift animation;
- boss feedback;
- Void feedback.

No new mechanic.

### W4-B — `accessibility-performance-worker`

Owns:
- focus;
- keyboard;
- reduced motion;
- hidden-tab animation pause;
- obvious performance issues.

### W4-C — `submission-doc-worker`

Owns:

```text
README.md
docs/DEMO_SCRIPT.md
docs/AO_BUILD_LOG.md
docs/ao-evidence/README.md
```

Must use real evidence only.

No invented metrics.

### W4-D — `final-qa-worker`

Runs:
- typecheck;
- lint;
- tests;
- build;
- manual checklist support.

Creates final blocker list.

---

# 30. WORKER PROMPT TEMPLATE

Every AO worker gets a short atomic prompt in this format:

```text
GOAL
<one concrete outcome>

READ FIRST
- TABYRINTH_PRD.md
- docs/GAME_CONTRACT.md
- files relevant to your ownership

OWNERSHIP
<explicit files/directories>

DO
- <required implementation>
- <required validation>

DO NOT
- edit outside ownership unless required for compilation
- redesign shared contracts without documenting it
- add unrelated features
- add remote services
- touch unrelated Chrome tabs

DONE WHEN
- <observable acceptance conditions>
- tests pass
- build passes for affected surface

RETURN
- concise summary
- files changed
- tests run
- known risks
- PR link/number if available
```

No essay prompts.

---

# 31. EXAMPLE WORKER PROMPTS

## 31.1 Foundation

```text
GOAL
Build TABYRINTH's working Chrome-extension foundation.

READ FIRST
- TABYRINTH_PRD.md

OWNERSHIP
- project scaffold
- public/manifest.json
- src/game/**
- src/platform/**
- src/background/**
- minimal popup/room bootstraps
- docs/GAME_CONTRACT.md

DO
- React + TypeScript + Vite.
- Manifest V3.
- Start Run creates 5 extension-owned tabs.
- Group them as TABYRINTH.
- Store active GameState in chrome.storage.session.
- Register tabId↔roomId.
- Listen for managed tab moves.
- Re-query real managed tab order.
- Persist orderedRoomIds.
- Show orderedRoomIds as plain debug UI in every room.
- Ignore unrelated tabs.
- Add unit tests for reducer/topology/invariants.
- Run typecheck, tests, build.

DO NOT
- add final visuals
- add boss
- add AI
- add backend
- touch non-game tabs

DONE WHEN
Dragging a real game tab changes the visible topology order without reloading.

RETURN
summary, files, tests, risks, PR.
```

## 31.2 Visual system

```text
GOAL
Create TABYRINTH's production visual system without changing game behavior.

READ FIRST
- TABYRINTH_PRD.md
- docs/GAME_CONTRACT.md
- installed frontend-taste-engineer/design-taste-frontend skill

OWNERSHIP
- src/ui/**
- docs/UI_SYSTEM.md

DO
- Use occult-operating-system direction.
- Establish tokens, typography, icons, focus, motion.
- Inspect ReactBits MCP.
- Search at least 6 React Bits candidates.
- Select at most 4.
- Prefer lightweight effects.
- Pause decorative motion when page hidden.
- Support prefers-reduced-motion.
- Document selections.
- Test build.

DO NOT
- use purple AI-SaaS gradients
- build card-grid dashboard
- use emoji as icons
- add heavy WebGL to every room
- change game state contracts

DONE WHEN
UI primitives are distinctive, reusable, performant, and room worker can consume them.

RETURN
summary, chosen React Bits components, files, test/build result, risks, PR.
```

---

# 32. MERGE / INTEGRATION RULES

1. Foundation contract first.
2. Feature workers branch from foundation-integrated main.
3. Keep PRs small enough to review.
4. Do not have two workers concurrently own the same directory.
5. If shared contract change is unavoidable:
   - document it;
   - notify affected sessions with `ao send`;
   - rebase/refresh before continuing.
6. Use CI.
7. Let AO route failures/review feedback back to owning worker where configured.
8. Do not “fix” another worker's code in a random worktree unless that worker is blocked.
9. Preserve meaningful AO session/PR history for judging.

---

# 33. AO EVIDENCE CAPTURE

The hackathon explicitly values use of AO.

Collect evidence while building.

`docs/AO_BUILD_LOG.md` fields:

```text
Wave
Session ID
Worker role
Agent
Start timestamp
End timestamp
Branch
PR
Outcome
CI failures recovered
Review feedback recovered
Notes
```

Also record:

- peak concurrent workers;
- number of worker sessions;
- number of PRs;
- number of merged PRs;
- wall-clock build duration;
- real CI recovery events;
- real review recovery events.

Never fabricate an AO recovery event just for the demo.

Capture screenshots/video of:
- AO board with 4–5 active workers;
- separate worktrees/branches;
- PR cards;
- CI/review state;
- final green state.

Presentation line:

> “Codex wrote the worker branches. AO let me run the fleet: isolated worktrees, parallel ownership, PR state, and feedback loops on one board.”

---

# 34. DEMO SCRIPT

Target product demo: 60–90 seconds before AO story.

## 0–10s — Hook

Show normal Chrome with TABYRINTH group.

Say:

> “These aren't five game screens. These five Chrome tabs are the dungeon.”

## 10–20s — Prove topology

Show current topology.

Drag `Vault` tab.

World/topology strip changes immediately.

Say:

> “Dragging the real browser tab physically rewires the level.”

Do not explain architecture yet.

## 20–45s — Play

Move through rooms.
Take Sigil.
Reach boss.

Boss rejects seal because topology wrong.

Drag Vault beside Boss.

Shield breaks.

## 45–60s — Void moment

Boss spawns `VOID`.

The real Chrome tab appears.

Show corruption.

Say:

> “The boss just breached the browser.”

Close `VOID` browser tab.

Rift dies.

## 60–75s — Win

One hit / final action.
Victory.

## 75–105s — AO reveal

Switch to AO board.

Say:

> “The game was built the same way it plays: one shared contract, several independent pieces. AO ran Codex workers in isolated worktrees for the Chrome engine, gameplay, room UI, visual system, reliability, and QA, then kept their PR and feedback state together.”

Show real metrics.

Stop.

Do not show architecture diagram before product demo.

---

# 35. README REQUIREMENTS

README should include:

1. hero GIF/screenshot;
2. one-sentence pitch;
3. 3-bullet “how it works”;
4. install/load-unpacked steps;
5. gameplay steps;
6. architecture;
7. AO build workflow;
8. privacy/permissions;
9. local development;
10. tests;
11. known limitations;
12. prior-art positioning phrased carefully;
13. hackathon credits.

No fake adoption claims.

---

# 36. PRESENTATION COPY

Use this exact conceptual order:

### Problem / opportunity

Browsers treat tabs as containers.
Games treat browser chrome as dead space.

### Insight

The browser already gives users a physical-looking, reorderable row of objects.

### Product

TABYRINTH makes that row the level itself.

### Proof

Drag a tab.
Dungeon rewires.

Close Void.
Rift dies.

### Build story

AO allowed parallel Codex workers to build independent surfaces against one frozen game contract.

---

# 37. NOVELTY POSITIONING

Safe delta:

> **TABYRINTH uses the ordered collection of actual browser tabs as mutable world topology. Reordering, creating, activating, and closing managed tabs are first-class game mechanics, not decorations around a conventional game.**

Do not claim absolute global first.

Closest-adjacent categories to acknowledge if asked:
- tab gamification;
- games across multiple tabs/windows;
- browser extension games.

Differentiator:
- real tab ordering is the graph;
- graph is mechanically necessary;
- game can mutate tab structure back at the player.

---

# 38. CUT LIST

If behind schedule, cut in this order:

1. sound;
2. Sanctum secondary mechanic;
3. fancy victory animation;
4. advanced detached-tab restore;
5. manual new-room creation;
6. persistent best times;
7. extra room variants;
8. fancy React Bits effects.

Never cut:

- Start Run;
- dedicated managed tab group;
- real tab reorder → world reorder;
- safe isolation from unrelated tabs;
- Sigil adjacency puzzle;
- real Void tab spawn;
- close Void → game state change;
- working boss/victory;
- AO evidence.

---

# 39. STRETCH FEATURES

Only after all hard gates pass.

Priority:

### S1 — Room Forge
A single in-game action creates a new real game tab/room.

### S2 — Tab sacrifice
Player intentionally closes a sacrificial room to weaken boss.

### S3 — Seeded second run
Reorders room roles for replay.

### S4 — Small audio layer

### S5 — Chrome Web Store-ready package

Do not implement multiplayer.

---

# 40. FAILURE MODES

## F1 — Tab move events feel unreliable

Response:
- query actual current group order after event;
- debounce 50–100ms if Chrome reports transitional state;
- never infer final order only from event indices.

## F2 — Service worker loses state

Response:
- remove global source-of-truth state;
- read/write `chrome.storage.session`.

## F3 — ReactBits MCP breaks

Response:
- use official React Bits CLI/source;
- no core dependency.

## F4 — UI looks generic

Response:
- invoke frontend taste skill;
- perform screenshot audit;
- simplify layout;
- increase intentional typography/asymmetry, not random decoration.

## F5 — Five tabs are too GPU-heavy

Response:
- remove heavy background effects;
- pause animation in hidden pages;
- use CSS/SVG.

## F6 — Boss mechanic confusing

Response:
- explicit clue;
- animate Vault↔Boss adjacency;
- make one required reordering, not several.

## F7 — User can manually click any room

Accept for hackathon.
Do not overengineer movement enforcement.

## F8 — User closes required room early

Allow run to become harder or show restart.
Do not build complex recovery unless easy.

## F9 — AO workers collide

Stop new work.
Reassert file ownership.
Use `ao send`.
Integrate contract changes first.

---

# 41. DEFINITION OF DONE

TABYRINTH is DONE when all are true.

## Product

- [ ] Extension loads unpacked.
- [ ] Popup polished.
- [ ] Start Run creates exactly intended game tabs.
- [ ] Tabs grouped and titled.
- [ ] Unrelated tabs untouched.
- [ ] Real tab order is authoritative dungeon order.
- [ ] Dragging a game tab updates world live.
- [ ] Portals reflect actual neighbors.
- [ ] Player can obtain Blade.
- [ ] Player can obtain Sigil.
- [ ] Boss topology requirement works.
- [ ] Moving Vault beside Boss changes boss state.
- [ ] Boss creates real Void tab.
- [ ] Closing real Void tab clears game corruption.
- [ ] Boss can be defeated.
- [ ] Victory works.
- [ ] Reset/replay works.
- [ ] Core survives page refresh/service-worker wake.
- [ ] No obvious console errors.

## Quality

- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Unit tests pass.
- [ ] Build passes.
- [ ] Manual critical path passes twice.
- [ ] Keyboard focus usable.
- [ ] Reduced-motion behavior exists.
- [ ] No broad permissions.
- [ ] No remote executable code.

## UI

- [ ] Frontend taste skill applied.
- [ ] UI_SYSTEM documented.
- [ ] React Bits queried if MCP available.
- [ ] Selected effects tested.
- [ ] No generic AI-SaaS look.
- [ ] Room content readable instantly.

## AO

- [ ] AO used for actual worker orchestration.
- [ ] Multiple Codex worker sessions recorded.
- [ ] Worktrees/branches visible.
- [ ] PRs recorded.
- [ ] CI/review loops recorded if real.
- [ ] AO_BUILD_LOG contains real timestamps.
- [ ] AO board captured for demo.

## Submission

- [ ] Public GitHub ready.
- [ ] README polished.
- [ ] Demo script rehearsed.
- [ ] Product demo video shows AO Kanban usage.
- [ ] No unsupported claims.
- [ ] Submission fields complete.

---

# 42. FINAL BUILD PRIORITY

When tradeoffs appear, use this exact order:

```text
1. Real tab topology works
2. Safety: only managed tabs
3. Boss + Void demo works
4. Demo clarity
5. Stability
6. AO evidence
7. Visual polish
8. Secondary mechanics
9. Sound
10. Stretch
```

Never reverse this order.

---

# 43. SOURCE-OF-TRUTH RESEARCH NOTES

These technical assumptions were checked against current primary documentation before this PRD was written:

- Agent Orchestrator is designed to run multiple coding agents in isolated Git worktrees and track them through PR/CI/review loops.
- AO supports Codex as a built-in agent and tracks/resumes Codex sessions.
- AO recommends well-scoped parallel tasks, not vague broad worker prompts.
- Chrome's Tabs API supports creating, moving/rearranging, and observing tabs.
- Chrome's TabGroups API supports browser tab groups and requires the `tabGroups` permission.
- Manifest V3 uses extension service workers.
- Extension service workers can be suspended; Chrome recommends persistent storage instead of authoritative globals.
- `chrome.storage.session` is specifically suitable for shared in-memory extension state across service-worker runs.
- Chrome runtime messaging supports communication between extension pages and the service worker.
- React Bits' official project is a large copy/install-friendly React animation/component library.
- The ReactBits MCP implementations currently available are community projects, so this PRD treats MCP access as an accelerator rather than a critical runtime dependency.
- The upstream Taste Skill project exposes `design-taste-frontend` and a Codex-oriented `gpt-taste` skill; if the user's local `frontend-taste-engineer` alias exists, that local installation remains preferred.

---

# 44. ONE RULE FOR THE ORCHESTRATOR

> **Do not spend the hackathon making the plan prettier. Once Hard Gate 1 is proven, manufacture product quality in parallel.**
