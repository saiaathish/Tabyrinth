import React from "react";
import { createRoot } from "react-dom/client";
import type { GameState } from "../../game/types";
import { sendMessage } from "../../platform/chrome-messaging";

type Mode = "launcher" | "arcade";

const roomNames: Record<string, string> = {
  entrance: "Entrance",
  armory: "Armory",
  sanctum: "Sanctum",
  vault: "Vault",
  boss: "Boss",
  void: "Void",
};

function errorText(error: unknown) {
  return error instanceof Error
    ? error.message
    : String(error || "TABYRINTH did not answer.");
}

function checkedResponse<T>(value: unknown): T {
  if (value && typeof value === "object" && "error" in value) {
    throw new Error(errorText((value as { error?: unknown }).error));
  }
  return value as T;
}

export function formatElapsed(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function getVictorySummary(run: GameState) {
  const endedAt = run.metrics.endedAt ?? run.metrics.startedAt;
  return {
    elapsed: formatElapsed(endedAt - run.metrics.startedAt),
    hallsCrossed: Object.values(run.roomById).filter(
      (room) => room.kind !== "void" && room.visited,
    ).length,
    realityShifts: run.metrics.tabMoves,
    voidsSevered:
      run.status === "victory" &&
      run.boss.shieldBroken &&
      !run.boss.voidActive
        ? 1
        : 0,
  };
}

async function gameRequest<T>(
  message: Parameters<typeof sendMessage>[0],
): Promise<T> {
  return checkedResponse<T>(await sendMessage(message));
}

function initialMode(): Mode {
  if (typeof window === "undefined") return "launcher";
  const hash = window.location.hash.slice(1).toLowerCase();
  const query = new URLSearchParams(window.location.search);
  return hash === "arcade" ||
    query.get("mode")?.toLowerCase() === "arcade" ||
    query.get("arcade") === "1"
    ? "arcade"
    : "launcher";
}

function TrailMark() {
  return (
    <svg
      className="trail-mark"
      viewBox="0 0 292 72"
      aria-hidden="true"
      focusable="false"
    >
      <path className="trail-base" d="M1 37h58V14h75v44h77V37h80" />
      <path className="trail-branch" d="M134 14V3M211 58v11" />
      <circle cx="59" cy="37" r="4" />
      <circle cx="134" cy="14" r="4" />
      <circle cx="211" cy="58" r="4" />
      <circle className="trail-end" cx="291" cy="37" r="5" />
    </svg>
  );
}

function Launcher({ onOpenArcade }: { onOpenArcade: () => void }) {
  const canResolveWindow =
    typeof chrome !== "undefined" && Boolean(chrome.windows?.getCurrent);
  const [windowId, setWindowId] = React.useState<number | null>(null);
  const [resolvingWindow, setResolvingWindow] =
    React.useState(canResolveWindow);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(
    canResolveWindow ? "" : "Open TABYRINTH from its Chrome toolbar icon.",
  );

  React.useEffect(() => {
    let active = true;

    if (!canResolveWindow) {
      return () => {
        active = false;
      };
    }

    void chrome.windows
      .getCurrent()
      .then((currentWindow) => {
        if (!active) return;
        if (currentWindow.id === undefined) {
          throw new Error("Current Chrome window is unavailable.");
        }
        setWindowId(currentWindow.id);
      })
      .catch(() => {
        if (active) {
          setError("Close this popup, then open TABYRINTH again.");
        }
      })
      .finally(() => {
        if (active) setResolvingWindow(false);
      });

    return () => {
      active = false;
    };
  }, [canResolveWindow]);

  const openSidePanel = () => {
    if (busy) return;
    setError("");

    if (typeof chrome === "undefined" || !chrome.sidePanel?.open) {
      setError("Update Chrome, then try Open Side Panel again.");
      return;
    }
    if (windowId === null) {
      setError("Close this popup, then open TABYRINTH again.");
      return;
    }

    setBusy(true);
    void chrome.sidePanel.open({ windowId }).then(
      () => setBusy(false),
      () => {
        setBusy(false);
        setError("Side Panel did not open. Try the TABYRINTH toolbar icon again.");
      },
    );
  };

  return (
    <section className="launcher" aria-labelledby="launcher-title">
      <header>
        <h1 id="launcher-title">TABYRINTH</h1>
        <p>Fold rabbit holes. Keep the trail.</p>
      </header>
      <TrailMark />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="launcher-actions">
        <button
          type="button"
          className="primary-action"
          disabled={resolvingWindow || windowId === null || busy}
          onClick={openSidePanel}
        >
          {busy ? "Opening Side Panel…" : "Open Side Panel"}
          <span aria-hidden="true">→</span>
        </button>
        <button type="button" className="quiet arcade-link" onClick={onOpenArcade}>
          Open Arcade
        </button>
      </div>
    </section>
  );
}

function ArcadeMode({ onBack }: { onBack: () => void }) {
  const [run, setRun] = React.useState<GameState | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const load = React.useCallback(async () => {
    try {
      setRun(await gameRequest<GameState | null>({ type: "GET_STATE" }));
    } catch (value) {
      setError(errorText(value));
    }
  }, []);

  React.useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const start = async () => {
    setBusy(true);
    setError("");
    try {
      setRun(await gameRequest<GameState>({ type: "START_RUN" }));
    } catch (value) {
      setError(errorText(value));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setBusy(true);
    try {
      await gameRequest<null>({ type: "RESET_RUN" });
      setRun(null);
    } catch (value) {
      setError(errorText(value));
    } finally {
      setBusy(false);
    }
  };

  const rooms =
    run?.orderedRoomIds.map(
      (id) => roomNames[run.roomById[id]?.kind] ?? id,
    ) ?? [];

  return (
    <section className="arcade-mode" aria-labelledby="arcade-title">
      <button type="button" className="quiet back-button" onClick={onBack}>
        ← Back
      </button>
      <p className="eyebrow">Arcade / secondary mode</p>
      <h1 id="arcade-title">The browser is the board.</h1>
      <p className="lede">
        Five managed tabs become a short dungeon. Dragging them changes the
        topology; the Void is a real tab.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!run ? (
        <section className="empty-state" aria-label="Start Arcade">
          <h2>Ready to descend?</h2>
          <p>Arcade preserves the original browser-topology experiment.</p>
          <button type="button" disabled={busy} onClick={() => void start()}>
            Start Arcade Run
          </button>
        </section>
      ) : (
        <>
          <ol className="arcade-map" aria-label="Arcade room order">
            {rooms.map((room, index) => (
              <li
                key={`${room}-${index}`}
                data-state={
                  room ===
                  roomNames[run.roomById[run.player.currentRoomId]?.kind]
                    ? "active"
                    : "available"
                }
              >
                <span className="room-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <strong>{room}</strong>
              </li>
            ))}
          </ol>
          <p className="helper">
            Current room:{" "}
            {roomNames[run.roomById[run.player.currentRoomId]?.kind] ??
              "Unknown"}
            . Use the managed browser tabs to move and act.
          </p>
          {run.status === "victory" ? (
            <p className="success" role="status">
              Arcade run complete. {getVictorySummary(run).realityShifts}{" "}
              topology shifts recorded.
            </p>
          ) : (
            <button
              type="button"
              className="quiet reset-button"
              disabled={busy}
              onClick={() => void reset()}
            >
              Reset Arcade Run
            </button>
          )}
        </>
      )}
    </section>
  );
}

export function App() {
  const [mode, setMode] = React.useState<Mode>(initialMode);

  return (
    <main className="popup-shell">
      <style>{css}</style>
      {mode === "launcher" ? (
        <Launcher onOpenArcade={() => setMode("arcade")} />
      ) : (
        <ArcadeMode onBack={() => setMode("launcher")} />
      )}
    </main>
  );
}

const css = `
:root {
  color-scheme: dark;
  font: 14px/1.45 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --void: #090c0b;
  --ink: #111615;
  --line: #2c3734;
  --bone: #f0ecdf;
  --muted: #98a29a;
  --acid: #c8ff63;
  --cyan: #74dfdb;
  --red: #ff8b7b;
}

* { box-sizing: border-box; }

html, body, #root { margin: 0; min-height: 100%; }

body {
  min-width: 328px;
  background: var(--void);
  color: var(--bone);
}

button { font: inherit; }

button {
  appearance: none;
  border: 1px solid var(--acid);
  border-radius: 2px;
  background: var(--acid);
  color: #10150d;
  cursor: pointer;
  font-weight: 780;
  min-height: 44px;
  padding: 0.72rem 0.9rem;
  transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease, transform 140ms ease;
}

button:hover:not(:disabled) { transform: translateY(-1px); }
button:active:not(:disabled) { transform: translateY(0); }
button:disabled { cursor: not-allowed; opacity: 0.48; }

button:focus-visible {
  outline: 2px solid var(--cyan);
  outline-offset: 3px;
}

.popup-shell {
  width: 328px;
  max-width: 100vw;
  min-height: 282px;
  overflow: hidden;
  background-color: var(--void);
  background-image:
    linear-gradient(90deg, rgb(255 255 255 / 0.025) 1px, transparent 1px),
    linear-gradient(rgb(255 255 255 / 0.025) 1px, transparent 1px);
  background-size: 32px 32px;
  border-top: 2px solid var(--acid);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.04);
}

.launcher { padding: 22px 18px 17px; }

.launcher header { border-left: 2px solid var(--acid); padding: 3px 0 4px 12px; }

.launcher h1,
.arcade-mode h1 {
  font: 800 1.55rem/1 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  letter-spacing: 0.12em;
  margin: 0;
}

.launcher header p,
.lede,
.helper,
.empty-state p {
  color: var(--muted);
}

.launcher header p { margin: 8px 0 0; }

.launcher header p { font-size: 0.78rem; letter-spacing: 0.01em; }

.trail-mark {
  display: block;
  height: 72px;
  margin: 17px 0 13px;
  width: 100%;
}

.trail-mark path {
  fill: none;
  stroke-linecap: square;
  stroke-linejoin: miter;
}

.trail-base { stroke: var(--line); stroke-width: 2; }
.trail-branch { stroke: var(--cyan); stroke-width: 2; }
.trail-mark circle { fill: var(--void); stroke: var(--cyan); stroke-width: 2; }
.trail-mark .trail-end { fill: var(--acid); stroke: var(--acid); }

.launcher-actions { display: grid; gap: 3px; }

.primary-action {
  align-items: center;
  display: flex;
  justify-content: space-between;
  letter-spacing: 0.035em;
  width: 100%;
  box-shadow: 4px 4px 0 rgb(110 231 228 / 0.2);
}

.primary-action span { font-size: 1.2rem; font-weight: 500; }

.quiet {
  border-color: var(--line);
  background: transparent;
  color: var(--bone);
}

.quiet:hover:not(:disabled) {
  border-color: var(--muted);
  background: rgb(255 255 255 / 0.035);
}

.quiet:active:not(:disabled) { transform: translateY(1px); }

.arcade-link {
  border-color: transparent;
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 650;
}

.error,
.success {
  font-size: 0.78rem;
  margin: 0 0 12px;
}

.error { color: var(--red); }
.success { color: var(--acid); }

.arcade-mode { padding: 18px; }

.back-button {
  border: 0;
  color: var(--muted);
  font-size: 0.72rem;
  min-height: 32px;
  padding: 0 4px;
}

.eyebrow {
  color: var(--acid);
  font: 750 0.62rem/1.3 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  letter-spacing: 0.12em;
  margin: 18px 0 9px;
  text-transform: uppercase;
}

.arcade-mode h1 {
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-weight: 760;
  font-size: 1.55rem;
  letter-spacing: -0.04em;
  line-height: 1.05;
}

.lede { font-size: 0.8rem; margin: 9px 0 0; max-width: 38ch; }

.empty-state {
  border-top: 1px solid var(--line);
  margin-top: 19px;
  padding-top: 16px;
  border-left: 1px solid var(--line);
  padding-left: 12px;
}

.empty-state h2 {
  font: 700 1.1rem/1.1 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  margin: 0 0 7px;
}

.empty-state p { font-size: 0.76rem; margin: 0 0 12px; }

.arcade-map {
  display: grid;
  list-style: none;
  margin: 19px 0 13px;
  padding: 0;
}

.arcade-map li {
  align-items: center;
  border-block: 1px solid var(--line);
  color: var(--muted);
  display: flex;
  gap: 10px;
  min-height: 40px;
  padding: 7px 9px;
}

.arcade-map li + li { border-top: 0; }
.arcade-map li[data-state="active"] { border-color: var(--acid); color: var(--bone); }

.arcade-map li[data-state="active"] { background: rgb(200 255 99 / 0.06); box-shadow: inset 2px 0 0 var(--acid); }

.room-index {
  color: var(--cyan);
  font: 700 0.65rem/1 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.arcade-map strong { font-size: 0.8rem; }
.helper { font-size: 0.74rem; margin: 0 0 13px; }
.reset-button { font-size: 0.74rem; min-height: 38px; }

@media (max-width: 340px) {
  .popup-shell { width: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  button { transition: none; }
  button:hover:not(:disabled),
  button:active:not(:disabled) { transform: none; }
}

@media (forced-colors: active) {
  .trail-mark path,
  .trail-mark circle { stroke: CanvasText; }
  .trail-mark .trail-end { fill: Highlight; }
}
`;

createRoot(document.getElementById("root")!).render(<App />);
