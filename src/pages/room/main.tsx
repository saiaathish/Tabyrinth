import React from "react";
import { createRoot } from "react-dom/client";
import { sendMessage } from "../../platform/chrome-messaging";
import { STATE_KEY } from "../../platform/chrome-storage";
import type { GameState, RoomGameAction, RoomKind, Message } from "../../game/types";

type Intent = "enter" | "take-blade" | "restore" | "take-sigil" | "break-seal" | "attack" | "move-left" | "move-right";
type ActionState = { intent: Intent | null; label: string; disabled: boolean; reason: string; completed: boolean };
const labels: Record<RoomKind, string> = { entrance: "The Threshold", armory: "The Armory", sanctum: "The Sanctum", vault: "The Vault", boss: "The Throne", void: "The Void Rift" };
const flavor: Record<RoomKind, string> = { entrance: "A quiet threshold. The tab bar is your corridor.", armory: "Old steel waits beneath a skin of dust.", sanctum: "A low, warm pulse answers your footsteps.", vault: "The sigil hums toward the throne.", boss: "The throne watches from beyond the broken seal.", void: "A cold seam has opened in the tab bar." };
const icon: Record<RoomKind, string> = { entrance: "01", armory: "02", sanctum: "03", vault: "04", boss: "05", void: "00" };

function intentMessage(intent: Intent, runId: string, roomId: string, targetRoomId?: string): { type: "GAME_ACTION"; runId: string; action: RoomGameAction } {
  if (intent === "move-left" || intent === "move-right" || intent === "enter") return { type: "GAME_ACTION", runId, action: { type: "MOVE_PLAYER", payload: { toRoomId: targetRoomId ?? roomId } } };
  const actions: Record<Exclude<Intent, "move-left" | "move-right" | "enter">, RoomGameAction> = {
    "take-blade": { type: "TAKE_BLADE" },
    restore: { type: "RESTORE_HEALTH" },
    "take-sigil": { type: "TAKE_SIGIL" },
    "break-seal": { type: "BREAK_SEAL" },
    attack: { type: "ATTACK_BOSS" },
  };
  return { type: "GAME_ACTION", runId, action: actions[intent] };
}

function responseError(value: unknown): string | null {
  if (!value || typeof value !== "object" || !("error" in value)) return null;
  return String((value as { error?: unknown }).error || "The dungeon rejected that action.");
}

export function deriveActionState(state: GameState, roomId: string): ActionState {
  const room = state.roomById[roomId];
  if (!room || room.destroyed) return { intent: null, label: "Room unavailable", disabled: true, reason: "This room has collapsed.", completed: false };
  if (room.kind === "void") return { intent: null, label: "Close This Tab", disabled: false, reason: "Closing only this Void tab severs the rift.", completed: false };
  if (state.status === "victory") return { intent: null, label: "Dungeon cleared", disabled: true, reason: "Open TABYRINTH to review the completed run.", completed: true };
  if (state.player.currentRoomId !== roomId) return { intent: null, label: "Room out of reach", disabled: true, reason: "Use an adjacent portal to enter this room first.", completed: false };
  if (state.status === "onboarding") return { intent: null, label: "Corridor locked", disabled: true, reason: "Move Armory immediately right of Vault to wake the dungeon.", completed: false };
  if (room.kind === "entrance") {
    const index = state.orderedRoomIds.indexOf(roomId);
    const hasExit = index >= 0 && index < state.orderedRoomIds.length - 1;
    return { intent: "enter", label: "Enter the dungeon", disabled: !hasExit, reason: hasExit ? "Continue through the right corridor." : "No surviving corridor leads onward.", completed: false };
  }
  if (room.kind === "armory") return room.completed || state.player.hasBlade
    ? { intent: null, label: "Blade claimed", disabled: true, reason: "The Armory is complete.", completed: true }
    : { intent: "take-blade", label: "Take the Blade", disabled: false, reason: "The Blade enables attacks against the Throne.", completed: false };
  if (room.kind === "sanctum") return room.completed
    ? { intent: null, label: "Sanctum spent", disabled: true, reason: "The Sanctum has already restored your health.", completed: true }
    : { intent: "restore", label: "Restore health", disabled: false, reason: "Restore to full health once.", completed: false };
  if (room.kind === "vault") return room.completed || state.player.hasSigil
    ? { intent: null, label: "Sigil claimed", disabled: true, reason: "The Vault is complete.", completed: true }
    : { intent: "take-sigil", label: "Take the Sigil", disabled: false, reason: "Carry the Sigil to the Throne.", completed: false };
  if (!state.boss.shieldBroken) {
    if (!state.player.hasSigil) return { intent: null, label: "Seal holds", disabled: true, reason: "Claim the Sigil from the Vault first.", completed: false };
    const aligned = state.orderedRoomIds.indexOf("vault") === state.orderedRoomIds.indexOf("boss") - 1;
    return aligned
      ? { intent: "break-seal", label: "Break the Seal", disabled: false, reason: "Vault and Throne are aligned.", completed: false }
      : { intent: null, label: "Seal out of reach", disabled: true, reason: "Drag Vault immediately left of the Throne.", completed: false };
  }
  if (state.boss.voidActive) return { intent: null, label: "Attack blocked", disabled: true, reason: "Close the Void tab before striking again.", completed: false };
  if (!state.player.hasBlade) return { intent: null, label: "Blade required", disabled: true, reason: "Claim the Blade from the Armory first.", completed: false };
  if (state.status !== "boss" || state.boss.hp <= 0) return { intent: null, label: "Throne defeated", disabled: true, reason: "The run is complete.", completed: true };
  return { intent: "attack", label: "Attack the Throne", disabled: false, reason: `${state.boss.hp} strike${state.boss.hp === 1 ? "" : "s"} remain.`, completed: false };
}

export function RoomPage({ state, error = false, onIntent }: { state: GameState | null; error?: boolean; onIntent?: (intent: Intent, roomId: string) => void }) {
  const roomId = new URLSearchParams(location.search).get("room") ?? "";
  const runId = new URLSearchParams(location.search).get("run") ?? "";
  const [feedback, setFeedback] = React.useState("");
  React.useEffect(() => { document.title = roomId === "void-rift" ? "VOID" : "TABYRINTH"; }, [roomId]);
  const recoveryLink = <a className="state-link" style={{ display: "inline-block", marginTop: 12, color: "#f3c969", fontWeight: 700, textDecoration: "underline", textUnderlineOffset: 4 }} href={chrome.runtime.getURL("sidepanel.html")}>Open TABYRINTH to start a run</a>;
  if (error) return <main className="room-state"><style>{css}</style><p className="eyebrow">TABYRINTH / SIGNAL LOST</p><h1>Room unavailable</h1><p>Runtime state could not be read. Keep this tab open and try again.</p>{recoveryLink}</main>;
  if (!state) return <main className="room-state"><style>{css}</style><p className="eyebrow">TABYRINTH / NO ACTIVE RUN</p><h1>The corridor has collapsed</h1><p>Open TABYRINTH from the toolbar to start a new run.</p>{recoveryLink}</main>;
  if (runId !== state.runId) return <main className="room-state"><style>{css}</style><p className="eyebrow">TABYRINTH / STALE ROOM</p><h1>This room belongs to an older run</h1><p>Open TABYRINTH from the toolbar to return to the active dungeon.</p>{recoveryLink}</main>;
  const room = state.roomById[roomId];
  if (!room || room.destroyed) return <main className="room-state"><style>{css}</style><p className="eyebrow">TABYRINTH / EMPTY</p><h1>Room unavailable</h1><p>This room has collapsed. Open TABYRINTH from the toolbar to start a new run.</p>{recoveryLink}</main>;
  const index = state.orderedRoomIds.indexOf(roomId);
  const left = index > 0 ? state.orderedRoomIds[index - 1] : null;
  const right = index >= 0 && index < state.orderedRoomIds.length - 1 ? state.orderedRoomIds[index + 1] : null;
  const isCurrent = state.player.currentRoomId === roomId;
  const portalLocked = state.status === "onboarding" || !isCurrent;
  const action = deriveActionState(state, roomId);
  const send = async (intent: Intent) => {
    onIntent?.(intent, roomId);
    const target = intent === "move-left" ? left ?? undefined : intent === "move-right" || intent === "enter" ? right ?? undefined : undefined;
    setFeedback("");
    try {
      const value = await sendMessage(intentMessage(intent, state.runId, roomId, target));
      const failure = responseError(value);
      if (failure) throw new Error(failure);
      if (!value || typeof value !== "object" || !("runId" in value)) throw new Error("The dungeon did not confirm that action.");
      window.dispatchEvent(new CustomEvent("tabyrinth-state", { detail: value }));
      setFeedback(intent.startsWith("move") || intent === "enter" ? "Portal engaged." : "Action confirmed.");
    } catch (value) {
      setFeedback(`Action failed: ${value instanceof Error ? value.message : String(value)}`);
    }
  };
  const breachNotice = state.boss.voidActive
    ? <p className="alert state-signal" role="alert">A VOID RIFT HAS BREACHED THE TAB BAR. SEVER THE TAB.</p>
    : state.boss.shieldBroken && state.status === "boss"
      ? <p className="success state-signal" role="status">RIFT SEVERED. THE THRONE IS VULNERABLE.</p>
      : null;

  if (room.kind === "void") return <main className="room-shell room-void">
    <style>{css}</style>
    <header className="topbar"><span className="brand">TABYRINTH</span><span className="run-state">RUN {state.runId.slice(0, 8)} · BREACH</span><span className="revision">SYNC {state.revision}</span></header>
    <article className="void-scene" aria-labelledby="room-title"><div className="void-mark" aria-hidden="true">//</div><p className="eyebrow">ANOMALOUS ROOM</p><h1 id="room-title">VOID</h1><p className="void-copy">THIS ROOM DOES NOT BELONG HERE.</p><p className="void-command">CLOSE THIS TAB.</p><p className="void-help">Use Chrome’s tab close control. No in-page shortcut can sever the rift.</p></article>
  </main>;

  return <main className={`room-shell room-${room.kind}`}>
    <style>{css}</style>
    <header className="topbar"><span className="brand">TABYRINTH</span><span className="run-state">RUN {state.runId.slice(0, 8)} · {state.status.toUpperCase()}</span><span className="revision">SYNC {state.revision}</span></header>
    <section className="hud" aria-label="Player status"><span><b>HP</b> <meter min="0" max={state.player.maxHp} value={state.player.hp} aria-label={`${state.player.hp} of ${state.player.maxHp} health`}>{state.player.hp} / {state.player.maxHp}</meter></span><span><b>HELD</b> {[state.player.hasBlade && "Blade", state.player.hasSigil && "Sigil"].filter(Boolean).join(" · ") || "—"}</span></section>
    <div className="layout">
      <nav className="portal portal-left" aria-label="Left portal"><button disabled={!left || portalLocked} onClick={() => left && void send("move-left")} aria-label={left ? `Open portal to ${labels[state.roomById[left].kind]}` : "No room to the left"}>← <span>{left ? labels[state.roomById[left].kind] : "No corridor"}</span></button></nav>
      <article className="scene focal" aria-labelledby="room-title"><div className="scene-mark" aria-hidden="true">{icon[room.kind]}</div><p className="eyebrow">ROOM {String(index + 1).padStart(2, "0")} / {room.kind.toUpperCase()}</p><h1 id="room-title">{labels[room.kind]}</h1><p className="flavor">{flavor[room.kind]}</p>{breachNotice}{room.kind === "boss" && !state.boss.shieldBroken && <p className="alert" role="status">THE SIGIL CANNOT CROSS A BROKEN CORRIDOR.</p>}<button className={`primary${action.completed ? " completed" : ""}`} disabled={action.disabled || !action.intent} aria-describedby="action-reason" onClick={() => action.intent && void send(action.intent)}>{action.label}</button><p id="action-reason" className="action-reason">{action.reason}</p>{feedback && <p className={feedback.startsWith("Action failed") ? "action-error" : "action-feedback"} role={feedback.startsWith("Action failed") ? "alert" : "status"}>{feedback}</p>}</article>
      <nav className="portal portal-right" aria-label="Right portal"><button disabled={!right || portalLocked} onClick={() => right && void send("move-right")} aria-label={right ? `Open portal to ${labels[state.roomById[right].kind]}` : "No room to the right"}><span>{right ? labels[state.roomById[right].kind] : "No corridor"}</span> →</button></nav>
    </div>
    <section className="topology" aria-labelledby="topology-title"><div className="section-head"><h2 id="topology-title">Tab bar / live topology</h2><span>{state.orderedRoomIds.length} managed</span></div><ol>{state.orderedRoomIds.map((id, i) => <li key={id} className={id === roomId ? "current" : ""} aria-current={id === roomId ? "location" : undefined}><span>{String(i + 1).padStart(2, "0")}</span><b>{labels[state.roomById[id].kind]}</b></li>)}</ol></section>
    <aside className="feed" aria-label="Event feed"><div className="section-head"><h2>Field notes</h2><span>LIVE</span></div><p>↳ {state.flags.tutorialMoveCompleted ? "The corridor remembers your rearrangement." : "Drag a managed tab to rewire the dungeon."}</p><p>↳ {state.player.hasSigil ? "The sigil is in hand." : "The vault still holds the sigil."}</p></aside>
  </main>;
}

function App() {
  const [state, setState] = React.useState<GameState | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  React.useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const value = await sendMessage({ type: "GET_STATE" });
        const failure = responseError(value);
        if (failure) throw new Error(failure);
        if (live) { setState(value as GameState | null); setError(false); setLoading(false); }
      } catch {
        if (live) { setError(true); setLoading(false); }
      }
    };
    const onMessage = (message: Message) => { if (message.type === "GAME_ACTION" || message.type === "START_RUN" || message.type === "RESET_RUN") void load(); };
    const onState = (event: Event) => { const value = (event as CustomEvent).detail; if (live && value && !responseError(value)) { setState(value as GameState); setError(false); setLoading(false); } };
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => { if (area === "session" && changes[STATE_KEY]) void load(); };
    void load();
    chrome.runtime.onMessage.addListener(onMessage);
    chrome.storage.onChanged.addListener(onChanged);
    window.addEventListener("tabyrinth-state", onState);
    return () => { live = false; chrome.runtime.onMessage.removeListener(onMessage); chrome.storage.onChanged.removeListener(onChanged); window.removeEventListener("tabyrinth-state", onState); };
  }, []);
  if (loading) return <main className="room-state"><style>{css}</style><p className="eyebrow">TABYRINTH / LOADING</p><h1>Mapping the corridor…</h1><p>Waiting for the managed tab topology.</p></main>;
  return <RoomPage state={state} error={error} />;
}
const css = `:root{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#eee8dc;background:#121313}*{box-sizing:border-box}body{margin:0;min-width:320px}.room-shell{min-height:100vh;padding:18px clamp(18px,5vw,72px) 42px;background:#121313;letter-spacing:.02em}.room-shell:before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.12;background-image:linear-gradient(#ffffff08 1px,transparent 1px),linear-gradient(90deg,#ffffff08 1px,transparent 1px);background-size:48px 48px}.topbar,.hud,.section-head{display:flex;justify-content:space-between;align-items:center;gap:16px}.topbar{border-bottom:1px solid #ffffff25;padding-bottom:14px;font-size:11px;color:#b8b1a7}.brand{color:#f3c969;font-weight:800;letter-spacing:.18em}.revision{color:#79bda7}.hud{max-width:720px;margin:24px auto 0;border:1px solid #ffffff25;padding:12px 16px;color:#c8c0b2;font-size:11px}.hud b{color:#aaa398;margin-right:8px}.layout{display:grid;grid-template-columns:minmax(120px,1fr) minmax(220px,620px) minmax(120px,1fr);align-items:center;gap:20px;min-height:390px}.portal{text-align:center}.portal button{border:0;background:transparent;color:#eee8dc;cursor:pointer;font:inherit;padding:16px;transition:color 140ms ease,transform 140ms ease}.portal button:hover:not(:disabled){color:#f3c969;transform:translateY(-1px)}.portal button:focus-visible,.primary:focus-visible{outline:3px solid #f3c969;outline-offset:4px}.portal button:disabled{color:#6e6b66;cursor:not-allowed}.portal span{display:block;font-size:10px;color:#a8a197;margin-top:8px}.scene{text-align:center;padding:30px 20px}.focal{animation:focal-in 240ms ease both}.scene-mark{font-family:Georgia,serif;color:#f3c969;font-size:72px;line-height:1;text-shadow:0 0 40px #d1904055}.eyebrow{color:#b39576;font-size:10px;letter-spacing:.2em}.scene h1{font:500 clamp(30px,5vw,58px)/1 Georgia,serif;margin:16px 0}.flavor{color:#c1bbb2;font:16px/1.6 Georgia,serif;max-width:440px;margin:0 auto 26px}.alert{color:#ff9a80;font-size:11px;line-height:1.6}.success,.action-feedback{color:#8ed7b8;font-size:11px}.state-signal{animation:state-signal 420ms ease both}.primary{border:1px solid #f3c969;background:#f3c969;color:#151515;padding:14px 22px;font:700 11px inherit;cursor:pointer;transition:transform 120ms ease,filter 120ms ease}.primary:hover:not(:disabled){transform:translateY(-1px);filter:brightness(1.06)}.primary:active:not(:disabled){transform:translateY(0)}.primary:disabled{cursor:not-allowed;background:#4e4a3d;border-color:#777165;color:#d2ccc1}.primary.completed{background:#294a3b;border-color:#70b493}.action-reason{color:#aaa398;font-size:11px;line-height:1.5;margin:12px auto 0;max-width:360px}.action-error{color:#ff9a80;font-size:11px}.topology,.feed{max-width:900px;margin:10px auto 0;border-top:1px solid #ffffff25;padding-top:16px}.section-head h2{font-size:11px;letter-spacing:.12em;text-transform:uppercase;margin:0}.section-head span{font-size:10px;color:#aaa398}.topology ol{display:flex;gap:8px;list-style:none;padding:14px 0 0;margin:0;overflow:auto}.topology li{min-width:112px;border:1px solid #ffffff20;padding:12px;color:#aaa398}.topology li.current{border-color:#f3c969;color:#f3c969;background:#f3c9690d;animation:state-signal 420ms ease both}.topology li span{display:block;font-size:10px;margin-bottom:8px}.topology li b{font-size:11px;font-weight:500}.feed{max-width:900px;margin-top:26px}.feed p{font-size:11px;color:#b2aca3;margin:10px 0}.void-scene{min-height:calc(100vh - 70px);display:grid;place-content:center;text-align:center;position:relative}.void-mark{font-size:100px;line-height:.8;color:#ff5a52;opacity:.35;animation:state-signal 620ms ease both}.void-scene h1{font:700 clamp(64px,14vw,180px)/.85 Georgia,serif;letter-spacing:.12em;margin:18px 0;color:#fff}.void-copy{font-weight:700;letter-spacing:.16em}.void-command{color:#ff847d;font-size:clamp(18px,3vw,32px);font-weight:900;letter-spacing:.12em}.void-help{color:#b8b1a7;font-size:12px}.room-void{background:#050606}.room-state{max-width:600px;margin:18vh auto;padding:32px}.room-state h1{font:48px Georgia,serif}.room-state p:not(.eyebrow){color:#b8b1a7;line-height:1.6}@keyframes focal-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}@keyframes state-signal{0%{opacity:.45}100%{opacity:1}}@media(max-width:640px){.layout{grid-template-columns:1fr;min-height:0}.scene{order:1}.portal-left{order:2}.portal-right{order:3}.portal button{width:100%;border:1px solid #ffffff20}.topbar .run-state{display:none}.hud{align-items:flex-start;flex-direction:column}.room-shell{padding-inline:16px}.void-scene{min-height:calc(100vh - 60px)}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important;transform:none!important}}`;

createRoot(document.getElementById("root")!).render(<App />);
