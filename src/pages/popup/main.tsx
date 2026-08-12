import React from "react";
import { createRoot } from "react-dom/client";
import { sendMessage } from "../../platform/chrome-messaging";
import type { GameState } from "../../game/types";

type ViewState = "loading" | "ready" | "busy" | "error";

const roomNames: Record<string, string> = {
  entrance: "Entrance", armory: "Armory", sanctum: "Sanctum", vault: "Vault", boss: "Boss", void: "Void",
};

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error || "The dungeon did not answer.");
}

function App() {
  const [run, setRun] = React.useState<GameState | null>(null);
  const [view, setView] = React.useState<ViewState>("loading");
  const [notice, setNotice] = React.useState("");
  const [confirmReset, setConfirmReset] = React.useState(false);
  const [onboardingSeen, setOnboardingSeen] = React.useState(false);
  const resetTrigger = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => { if (!confirmReset) return; const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setConfirmReset(false); resetTrigger.current?.focus(); return; } if (event.key !== "Tab") return; const dialog = document.querySelector<HTMLElement>("[role=dialog]"); const focusable = dialog ? Array.from(dialog.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")) : []; if (!focusable.length) return; const first = focusable[0]!; const last = focusable[focusable.length - 1]!; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } }; document.addEventListener("keydown", onKey); return () => document.removeEventListener("keydown", onKey); }, [confirmReset]);

  const load = React.useCallback(async () => {
    try { setRun(await sendMessage({ type: "GET_STATE" }) as GameState | null); setView("ready"); }
    catch (error) { setNotice(errorText(error)); setView("error"); }
  }, []);
  React.useEffect(() => { void load(); }, [load]);

  const start = async () => {
    setView("busy"); setNotice("");
    try { setRun(await sendMessage({ type: "START_RUN" }) as GameState); setView("ready"); }
    catch (error) { setNotice(`Could not open the dungeon: ${errorText(error)}`); setView("error"); }
  };
  const reset = async () => {
    setView("busy"); setConfirmReset(false); setNotice("");
    try { await sendMessage({ type: "RESET_RUN" }); setRun(null); setView("ready"); }
    catch (error) { setNotice(`Reset failed: ${errorText(error)}`); setView("error"); }
  };
  const resume = async () => {
    setView("busy"); setNotice("");
    try { const result = await sendMessage({ type: "ACTIVATE_RUN", roomId: run?.player.currentRoomId }) as { activated: boolean }; if (!result.activated) throw new Error("Current room is unavailable. Reset Run to recover safely."); setView("ready"); setNotice("Current room activated."); }
    catch (error) { setNotice(`Resume failed: ${errorText(error)}`); setView("error"); }
  };

  const busy = view === "busy";
  const rooms = run?.orderedRoomIds.map((id) => roomNames[id] ?? id) ?? [];
  return <main className="popup-shell" aria-busy={busy}>
    <style>{css}</style>
    <header><div className="eyebrow">CHROME // DUNGEON PROTOCOL</div><h1>TABYRINTH</h1><p>The dungeon lives in your tab bar.</p></header>
    {view === "loading" && <p role="status" className="status">Reading the dungeon...</p>}
    {view === "error" && <section className="card danger" role="alert"><strong>Dungeon connection lost</strong><p>{notice}</p><button onClick={() => void load}>Try again</button><button className="quiet" onClick={() => void reset}>Start clean</button></section>}
    {view !== "loading" && view !== "error" && !run && <section className="card"><div className="sigil" aria-hidden="true">//</div><h2>Ready to descend?</h2><p>Five real tabs become five rooms. Your browser is the board.</p><button autoFocus disabled={busy} onClick={() => void start}>{busy ? "Opening rooms..." : "Start Run"}</button><small>~3 minutes · no account · no internet</small></section>}
    {run && <>
      {run.status === "onboarding" && !onboardingSeen && <section className="card onboarding" aria-labelledby="how-title"><div className="step">FIRST DESCENT</div><h2 id="how-title">Your tabs are rooms.</h2><p>Drag a managed tab to change the dungeon’s corridors. Make one explicit move to wake the map.</p><div className="tab-demo" aria-label="Room order">{rooms.map((room) => <span key={room}>{room}</span>)}</div><button autoFocus onClick={() => setOnboardingSeen(true)}>Enter the dungeon</button></section>}
      {(onboardingSeen || run.status !== "onboarding") && <section className="card"><div className="step">{run.status === "victory" ? "DUNGEON CLEARED" : "RUN IN PROGRESS"}</div><h2>{run.status === "victory" ? "The rift is sealed." : "Keep moving."}</h2><p>{run.status === "victory" ? "The tab bar remembers your triumph." : "Reorder rooms. Close the Void. Change the world."}</p><div className="tab-demo" aria-label="Current room order">{rooms.map((room, i) => <span key={`${room}-${i}`}>{room}</span>)}</div>{run.status === "victory" && <dl><div><dt>Tab shifts</dt><dd>{run.metrics.tabMoves}</dd></div><div><dt>Rooms closed</dt><dd>{run.metrics.roomsClosed}</dd></div></dl>}<button onClick={() => window.close()}>Close dungeon</button></section>}
      {run.status !== "victory" && <button className="resume-button" onClick={() => void resume()} disabled={busy}>Resume Run</button>}
      <button ref={resetTrigger} className="reset-link" onClick={() => setConfirmReset(true)} disabled={busy}>Reset Run</button>
      {confirmReset && <div className="confirm" role="dialog" aria-modal="true" aria-labelledby="reset-title"><h2 id="reset-title">Close this run?</h2><p>Only TABYRINTH-owned tabs will close.</p><button autoFocus onClick={() => void reset}>Reset run</button><button className="quiet" onClick={() => setConfirmReset(false)}>Keep playing</button></div>}
    </>}
    {notice && view !== "error" && <p className="notice" role="status">{notice}</p>}
  </main>;
}

const css = `:root{color-scheme:dark;font:14px/1.45 system-ui,sans-serif}*{box-sizing:border-box}body{margin:0;background:#10131a;color:#e8edf7}.popup-shell{width:340px;min-height:420px;padding:24px;background:#10131a}header{margin-bottom:24px}.eyebrow,.step{font-size:10px;letter-spacing:.16em;color:#8d9ab4;font-weight:700}h1{font:800 31px/1 Georgia,serif;letter-spacing:.08em;margin:9px 0 8px;color:#fff}h2{font:700 22px/1.1 Georgia,serif;margin:10px 0}p{color:#acb5c7;margin:8px 0 18px}.card{border:1px solid #3b465c;border-radius:12px;padding:20px;background:#191f2b;box-shadow:0 12px 35px #080a0f88;animation:focal-in 240ms ease both}.sigil{font-size:28px;color:#e9bb69}.card button,.confirm button{width:100%;border:0;border-radius:7px;padding:11px 14px;background:#e9bb69;color:#17130d;font-weight:800;cursor:pointer;transition:transform 140ms ease,filter 140ms ease}.card button:hover:not(:disabled),.confirm button:hover:not(:disabled){transform:translateY(-1px);filter:brightness(1.08)}.card button:active:not(:disabled),.confirm button:active:not(:disabled){transform:translateY(0)}.card button:focus-visible,.confirm button:focus-visible,.reset-link:focus-visible{outline:3px solid #a9d7ff;outline-offset:3px}.card small{display:block;text-align:center;color:#7f8aa0;margin-top:12px}.tab-demo{display:flex;gap:5px;overflow-x:auto;margin:18px 0;padding-bottom:2px}.tab-demo span{flex:1 0 52px;min-width:0;padding:9px 4px;border:1px solid #59677f;border-radius:5px;text-align:center;font-size:10px;color:#d8e0ef}.danger{border-color:#a65f5f}.danger strong{color:#ffb4a8}.danger button{margin-top:7px}.quiet{background:transparent!important;color:#b7c2d7!important;border:1px solid #4e5a71!important}.reset-link{display:block;margin:18px auto 0;background:transparent;border:0;color:#8995ab;text-decoration:underline;cursor:pointer}.notice,.status{text-align:center;color:#ffc9a2;font-size:12px;animation:state-pulse 300ms ease both}.confirm{position:fixed;inset:80px 18px auto;background:#252d3d;border:1px solid #64718a;border-radius:10px;padding:18px;box-shadow:0 15px 40px #000;animation:focal-in 180ms ease both}.confirm button{margin-top:8px}dl{display:flex;gap:20px;margin:18px 0}dt{font-size:11px;color:#8995ab}dd{margin:2px 0;font-size:20px;font-weight:700}@keyframes focal-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}@keyframes state-pulse{from{opacity:.45}to{opacity:1}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:1ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important;transition:none!important}.card button:hover:not(:disabled),.card button:active:not(:disabled),.confirm button:hover:not(:disabled),.confirm button:active:not(:disabled){transform:none;filter:none}}`;

createRoot(document.getElementById("root")!).render(<App />);
