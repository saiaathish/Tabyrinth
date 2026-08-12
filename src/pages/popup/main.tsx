import React from "react";
import { createRoot } from "react-dom/client";
import { sendMessage } from "../../platform/chrome-messaging";
import { STATE_KEY } from "../../platform/chrome-storage";
import type { GameState } from "../../game/types";

type ViewState = "loading" | "ready" | "busy" | "error";

const roomNames: Record<string, string> = {
  entrance: "Entrance", armory: "Armory", sanctum: "Sanctum", vault: "Vault", boss: "Boss", void: "Void",
};

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error || "The dungeon did not answer.");
}

function checkedResponse<T>(value: unknown): T {
  if (value && typeof value === "object" && "error" in value) {
    throw new Error(errorText((value as { error?: unknown }).error));
  }
  return value as T;
}

async function readRun() {
  return checkedResponse<GameState | null>(await sendMessage({ type: "GET_STATE" }));
}

function tutorialWasDismissed(runId: string) {
  try { return localStorage.getItem(`tabyrinth.tutorial.${runId}`) === "done"; }
  catch { return false; }
}

export function formatElapsed(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function getVictorySummary(run: GameState) {
  const endedAt = run.metrics.endedAt ?? run.metrics.startedAt;
  return {
    elapsed: formatElapsed(endedAt - run.metrics.startedAt),
    hallsCrossed: Object.values(run.roomById).filter((room) => room.kind !== "void" && room.visited).length,
    realityShifts: run.metrics.tabMoves,
    voidsSevered: run.status === "victory" && run.boss.shieldBroken && !run.boss.voidActive ? 1 : 0,
  };
}

export function App() {
  const [run, setRun] = React.useState<GameState | null>(null);
  const [view, setView] = React.useState<ViewState>("loading");
  const [notice, setNotice] = React.useState("");
  const [confirmReset, setConfirmReset] = React.useState(false);
  const [showHow, setShowHow] = React.useState(false);
  const [dismissedTutorialRun, setDismissedTutorialRun] = React.useState("");
  const resetTrigger = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    const background = Array.from(document.querySelectorAll<HTMLElement>(".popup-shell > *:not(style):not(.confirm-backdrop)"));
    for (const element of background) (element as HTMLElement & { inert?: boolean }).inert = confirmReset;
    if (!confirmReset) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setConfirmReset(false);
        resetTrigger.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = document.querySelector<HTMLElement>("[role=dialog]");
      const focusable = dialog ? Array.from(dialog.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")) : [];
      if (!focusable.length) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      for (const element of background) (element as HTMLElement & { inert?: boolean }).inert = false;
    };
  }, [confirmReset]);

  const load = React.useCallback(async () => {
    setView("loading");
    setNotice("");
    try { setRun(await readRun()); setView("ready"); }
    catch (error) { setNotice(errorText(error)); setView("error"); }
  }, []);

  React.useEffect(() => {
    let live = true;
    void readRun().then((value) => {
      if (!live) return;
      setRun(value);
      setView("ready");
    }).catch((error: unknown) => {
      if (!live) return;
      setNotice(errorText(error));
      setView("error");
    });
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== "session" || !changes[STATE_KEY]) return;
      void readRun().then((value) => { if (live) { setRun(value); setView("ready"); } }).catch((error: unknown) => {
        if (live) { setNotice(errorText(error)); setView("error"); }
      });
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => { live = false; chrome.storage.onChanged.removeListener(onChanged); };
  }, []);

  const start = async () => {
    setView("busy"); setNotice(""); setShowHow(false);
    try { setRun(checkedResponse<GameState>(await sendMessage({ type: "START_RUN" }))); setView("ready"); }
    catch (error) { setNotice(`Could not open the dungeon: ${errorText(error)}`); setView("error"); }
  };

  const reset = async () => {
    setView("busy"); setConfirmReset(false); setNotice("");
    try { checkedResponse<null>(await sendMessage({ type: "RESET_RUN" })); setRun(null); setShowHow(false); setView("ready"); }
    catch (error) { setNotice(`Reset failed: ${errorText(error)}`); setView("error"); }
  };

  const resume = async () => {
    setView("busy"); setNotice("");
    try {
      const result = checkedResponse<{ activated: boolean }>(await sendMessage({ type: "ACTIVATE_RUN", roomId: run?.player.currentRoomId }));
      if (!result.activated) throw new Error("Current room is unavailable. Reset Run to recover safely.");
      setView("ready"); setNotice("Current room activated.");
    } catch (error) { setNotice(`Resume failed: ${errorText(error)}`); setView("error"); }
  };

  const playAgain = async () => {
    setView("busy"); setNotice("");
    try {
      checkedResponse<null>(await sendMessage({ type: "RESET_RUN" }));
      setRun(checkedResponse<GameState>(await sendMessage({ type: "START_RUN" })));
      setDismissedTutorialRun(""); setShowHow(false); setView("ready");
    } catch (error) { setNotice(`Could not start a new run: ${errorText(error)}`); setView("error"); }
  };

  const closeDungeon = async () => {
    setView("busy"); setNotice("");
    try { checkedResponse<null>(await sendMessage({ type: "RESET_RUN" })); window.close(); }
    catch (error) { setNotice(`Could not close the dungeon: ${errorText(error)}`); setView("error"); }
  };

  const closeConfirm = () => {
    setConfirmReset(false);
    queueMicrotask(() => resetTrigger.current?.focus());
  };

  const dismissTutorial = () => {
    if (!run) return;
    try { localStorage.setItem(`tabyrinth.tutorial.${run.runId}`, "done"); } catch { /* UI state still dismisses. */ }
    setDismissedTutorialRun(run.runId);
    setShowHow(false);
  };

  const busy = view === "busy";
  const rooms = run?.orderedRoomIds.map((id) => roomNames[run.roomById[id]?.kind] ?? id) ?? [];
  const armoryAfterVault = run ? run.orderedRoomIds.indexOf("armory") === run.orderedRoomIds.indexOf("vault") + 1 : false;
  const tutorialProof = Boolean(run?.flags.tutorialMoveCompleted && armoryAfterVault);
  const tutorialDismissed = Boolean(run && (dismissedTutorialRun === run.runId || tutorialWasDismissed(run.runId)));
  const showTutorial = Boolean(run && (showHow || (!tutorialDismissed && (run.status === "onboarding" || run.flags.tutorialMoveCompleted))));
  const victory = run?.status === "victory" ? getVictorySummary(run) : null;

  return <main className="popup-shell" aria-busy={busy}>
    <style>{css}</style>
    <header><div className="eyebrow">CHROME // DUNGEON PROTOCOL</div><h1>TABYRINTH</h1><p>The dungeon lives in your tab bar.</p></header>
    {view === "loading" && <p role="status" className="status">Reading the dungeon...</p>}
    {view === "error" && <section className="card danger" role="alert"><strong>Dungeon connection lost</strong><p>{notice}</p><button onClick={() => void load()}>Try again</button><button ref={resetTrigger} className="quiet" onClick={() => setConfirmReset(true)}>Start clean</button></section>}
    {view !== "loading" && view !== "error" && !run && !showHow && <section className="card"><div className="sigil" aria-hidden="true">//</div><h2>Ready to descend?</h2><p>Five real tabs become five rooms. Your browser is the board.</p><button autoFocus disabled={busy} onClick={() => void start()}>{busy ? "Opening rooms..." : "Start Run"}</button><button className="how-link" onClick={() => setShowHow(true)} disabled={busy}>How it works</button><small>~3 minutes · no account · no internet</small></section>}
    {view !== "loading" && view !== "error" && !run && showHow && <section className="card onboarding" aria-labelledby="how-first-title"><div className="step">HOW IT WORKS</div><h2 id="how-first-title">Your tab bar is the map.</h2><ol className="instructions"><li>Start a run to create five managed room tabs.</li><li>Drag those tabs to rewire the corridor.</li><li>Close the real VOID tab when the boss breaches Chrome.</li></ol><button disabled={busy} onClick={() => void start()}>{busy ? "Opening rooms..." : "Start Run"}</button><button className="how-link" onClick={() => setShowHow(false)} disabled={busy}>Back</button></section>}
    {run && view !== "error" && <>
      {showTutorial ? <section className="card onboarding" aria-labelledby="how-title"><div className="step">HOW IT WORKS</div><h2 id="how-title">Move one wall.</h2><ol className="instructions"><li>Find the managed <b>Armory</b> tab.</li><li>Drag it immediately to the right of <b>Vault</b>.</li><li>Return here after Chrome moves the tab.</li></ol><div className="tab-demo" aria-label="Live room order">{rooms.map((room, index) => <span key={`${room}-${index}`} className={room === "Armory" || room === "Vault" ? "target" : ""}>{room}</span>)}</div>{tutorialProof ? <><p className="proof" role="status">Walls moved. The live corridor now reads Vault → Armory.</p><button autoFocus onClick={dismissTutorial}>Enter the dungeon</button></> : <p className="waiting" role="status">{run.flags.tutorialMoveCompleted ? "Walls moved, but Armory is not immediately right of Vault yet." : "Waiting for Chrome’s real tab-move signal…"}</p>}</section> : <section className="card"><div className="step">{run.status === "victory" ? "DUNGEON CLEARED" : "RUN IN PROGRESS"}</div><h2>{run.status === "victory" ? "The Tabyrinth has fallen." : "Keep moving."}</h2><p>{run.status === "victory" ? "The rift is sealed and every surviving hall is stable." : "Reorder rooms. Close the Void. Change the world."}</p><div className="tab-demo" aria-label="Current room order">{rooms.map((room, index) => <span key={`${room}-${index}`}>{room}</span>)}</div>{victory && <dl><div><dt>Elapsed</dt><dd>{victory.elapsed}</dd></div><div><dt>Halls crossed</dt><dd>{victory.hallsCrossed}</dd></div><div><dt>Reality shifts</dt><dd>{victory.realityShifts}</dd></div><div><dt>Void severed</dt><dd>{victory.voidsSevered}</dd></div></dl>}{victory ? <div className="victory-actions"><button disabled={busy} onClick={() => void playAgain()}>{busy ? "Opening halls..." : "Play Again"}</button><button className="quiet" disabled={busy} onClick={() => void closeDungeon()}>Close Dungeon</button></div> : <button className="resume-button" onClick={() => void resume()} disabled={busy}>Resume Run</button>}</section>}
      {!showTutorial && run.status !== "victory" && <button className="how-link" onClick={() => setShowHow(true)} disabled={busy}>How it works</button>}
      {run.status !== "victory" && <button ref={resetTrigger} className="reset-link" onClick={() => setConfirmReset(true)} disabled={busy}>Reset Run</button>}
    </>}
    {confirmReset && <div className="confirm-backdrop"><div className="confirm" role="dialog" aria-modal="true" aria-labelledby="reset-title" aria-describedby="reset-description"><h2 id="reset-title">Close this run?</h2><p id="reset-description">Only TABYRINTH-owned tabs will close.</p><button autoFocus onClick={() => void reset()}>Reset run</button><button className="quiet" onClick={closeConfirm}>Keep playing</button></div></div>}
    {notice && view !== "error" && <p className="notice" role="status">{notice}</p>}
  </main>;
}

const css = `:root{color-scheme:dark;font:14px/1.45 system-ui,sans-serif}*{box-sizing:border-box}body{margin:0;background:#10131a;color:#f1f4fa}.popup-shell{width:340px;min-height:420px;padding:24px;background:#10131a}header{margin-bottom:24px}.eyebrow,.step{font-size:10px;letter-spacing:.16em;color:#aeb9ce;font-weight:700}h1{font:800 31px/1 Georgia,serif;letter-spacing:.08em;margin:9px 0 8px;color:#fff}h2{font:700 22px/1.1 Georgia,serif;margin:10px 0}p{color:#c4ccda;margin:8px 0 18px}.card{border:1px solid #526078;border-radius:12px;padding:20px;background:#191f2b;box-shadow:0 12px 35px #080a0f88;animation:focal-in 240ms ease both}.sigil{font-size:28px;color:#f4c979}.card button,.confirm button{width:100%;border:0;border-radius:7px;padding:11px 14px;background:#f4c979;color:#17130d;font-weight:800;cursor:pointer;transition:transform 140ms ease,filter 140ms ease}.card button:hover:not(:disabled),.confirm button:hover:not(:disabled){transform:translateY(-1px);filter:brightness(1.08)}.card button:active:not(:disabled),.confirm button:active:not(:disabled){transform:translateY(0)}button:disabled{cursor:not-allowed;opacity:.62}.card button:focus-visible,.confirm button:focus-visible,.reset-link:focus-visible,.how-link:focus-visible{outline:3px solid #a9d7ff;outline-offset:3px}.card small{display:block;text-align:center;color:#b1bdd1;margin-top:12px}.instructions{padding-left:19px;color:#d8deea}.instructions li{margin:7px 0}.tab-demo{display:flex;gap:5px;overflow-x:auto;margin:18px 0;padding:2px 1px 5px}.tab-demo span{flex:1 0 52px;min-width:0;padding:9px 4px;border:1px solid #71809a;border-radius:5px;text-align:center;font-size:10px;color:#e3e8f2}.tab-demo .target{border-color:#f4c979;color:#f4c979}.proof{color:#b8efcf}.waiting{color:#ffd3a2}.danger{border-color:#d17878}.danger strong{color:#ffc0b7}.danger button{margin-top:7px}.quiet{background:transparent!important;color:#d5ddeb!important;border:1px solid #71809a!important}.resume-button{margin-top:4px}.how-link,.reset-link{display:block;margin:14px auto 0;background:transparent;border:0;color:#b6c2d7;text-decoration:underline;cursor:pointer;padding:5px}.reset-link{margin-top:6px}.notice,.status{text-align:center;color:#ffd3a2;font-size:12px;animation:state-pulse 300ms ease both}.confirm-backdrop{position:fixed;inset:0;background:#05070bb8;z-index:2}.confirm{position:absolute;inset:80px 18px auto;background:#252d3d;border:1px solid #8492aa;border-radius:10px;padding:18px;box-shadow:0 15px 40px #000;animation:focal-in 180ms ease both}.confirm button{margin-top:8px}dl{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:18px 0}dl div{border-left:2px solid #526078;padding-left:9px}dt{font-size:10px;color:#b5c0d3}dd{margin:2px 0;font-size:19px;font-weight:700}.victory-actions{display:grid;gap:8px}@keyframes focal-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}@keyframes state-pulse{from{opacity:.45}to{opacity:1}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:1ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important;transition:none!important}.card button:hover:not(:disabled),.card button:active:not(:disabled),.confirm button:hover:not(:disabled),.confirm button:active:not(:disabled){transform:none;filter:none}}`;

createRoot(document.getElementById("root")!).render(<App />);
