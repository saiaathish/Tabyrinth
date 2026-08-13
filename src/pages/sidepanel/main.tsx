import React, { FormEvent, useEffect, useId, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Button, Signal } from "../../ui";
import type { PortalQuest } from "../../portal/quest";
import "../surfaces.css";

export type SidePanelState = "loading" | "start" | "active" | "nothing-to-fold" | "unsupported" | "unsafe" | "missing-origin" | "sealed" | "restoring" | "partial" | "error" | "complete";
export type SidePanelAction = "fold" | "keep" | "loot";
export type TrailNode = { id: string; title: string; url: string; disposition: "path" | "unclassified" | "loot" | "portal"; status: string };
export type PortalGraph = { nodes: Record<string, { id: string; questId: string; title: string | null; url: string | null; disposition: TrailNode["disposition"]; parentNodeId: string | null; status: string }>; tabBindings: Record<string, { nodeId: string; windowId: number | null }> };
export type LootItem = { id: string; title: string; url: string; note?: string };
export type PortalItem = { id: string; title: string; nodeIds: string[]; status: string; restoreStatus?: string; restoredNodeIds?: string[]; error?: string | null };

const copy: Record<Exclude<SidePanelState, "start" | "loading">, { label: string; title: string; body?: string }> = {
  active: { label: "DETOUR", title: "Fold this branch?", body: "Seals this detour and returns to the fork." },
  "nothing-to-fold": { label: "ON PATH", title: "No detour open." },
  unsupported: { label: "PAUSED", title: "This tab is unsupported.", body: "Use a normal web page." },
  unsafe: { label: "SAFE STOP", title: "Fold blocked.", body: "Ownership could not be verified. No tabs changed." },
  "missing-origin": { label: "ORIGIN LOST", title: "The fork is closed.", body: "The Portal stays sealed for recovery." },
  sealed: { label: "SEALED", title: "Branch sealed." },
  restoring: { label: "RESTORING", title: "Reopening the trail…" },
  partial: { label: "PARTIAL", title: "Some pages reopened.", body: "Retry from the Portal; restored pages will not duplicate." },
  error: { label: "ERROR", title: "Action failed.", body: "Retry when Chrome is available." },
  complete: { label: "COMPLETE", title: "Quest complete." },
};

function statusTone(state: SidePanelState) {
  if (["error", "unsafe", "missing-origin", "partial"].includes(state)) return "danger" as const;
  if (["active", "sealed", "complete"].includes(state)) return "active" as const;
  if (state === "restoring") return "warning" as const;
  return "idle" as const;
}

function Trail({ trail }: { trail: TrailNode[] }) {
  return <ol className="quest-trail" aria-label="Current browsing trail">
    {trail.map((node, index) => {
      const current = index === trail.length - 1;
      const host = (() => { try { return new URL(node.url).hostname.replace(/^www\./, ""); } catch { return node.url; } })();
      return <li key={node.id} data-current={current}>
        <span className="trail-mark" aria-hidden="true">{current ? "◆" : "·"}</span>
        <span className="trail-copy"><strong>{node.title}</strong><small>{current ? `You are here${host ? ` · ${host}` : ""}` : node.disposition === "path" ? "Main path" : host}</small></span>
      </li>;
    })}
  </ol>;
}

type DrawerName = "portals" | "loot" | null;
function Drawer({ open, portals, loot, busy, onClose, onUnseal, triggerRef }: { open: DrawerName; portals: PortalItem[]; loot: LootItem[]; busy: boolean; onClose: () => void; onUnseal: (portal: PortalItem) => void; triggerRef: React.RefObject<HTMLButtonElement | null> }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (open) closeRef.current?.focus(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open, onClose]);
  useEffect(() => { if (!open) triggerRef.current?.focus(); }, [open, triggerRef]);
  if (!open) return null;
  const items = open === "portals" ? portals : loot;
  const drawerId = `${open}-drawer`;
  return <aside id={drawerId} className="collection-drawer" aria-label={open === "portals" ? "Saved Portals" : "Saved Loot"} role="dialog" aria-modal="false">
    <header><strong>{open === "portals" ? "Portals" : "Loot"}</strong><button ref={closeRef} type="button" className="text-control" onClick={onClose} aria-label={`Close ${open}`}>Close</button></header>
    {items.length === 0 ? <p className="drawer-empty">Nothing saved yet.</p> : open === "portals" ? <ul>{portals.map((portal) => <li key={portal.id}><span><strong>{portal.title}</strong><small>{portal.nodeIds.length} pages · {portal.restoreStatus === "partial" ? `${portal.restoredNodeIds?.length ?? 0} restored` : portal.status}</small></span>{portal.status === "open" ? <span className="drawer-state">Restored</span> : <Button variant="quiet" disabled={busy || portal.status === "restoring"} onClick={() => onUnseal(portal)}>{portal.status === "restoring" ? "Restoring" : portal.restoreStatus === "partial" ? "Retry" : "Unseal"}</Button>}</li>)}</ul> : <ul>{loot.map((item) => <li key={item.id}><a href={item.url} target="_blank" rel="noreferrer"><strong>{item.title}</strong>{item.note && <small>{item.note}</small>}</a></li>)}</ul>}
  </aside>;
}

export type SidePanelProps = {
  state: SidePanelState;
  quest: PortalQuest | null;
  trail: TrailNode[];
  portals: PortalItem[];
  loot: LootItem[];
  busy?: boolean;
  notice?: string;
  drawer?: DrawerName;
  onBegin?: (title: string) => void;
  onAction?: (action: SidePanelAction) => void;
  onFinish?: () => void;
  onDrawer?: (drawer: DrawerName) => void;
  onUnseal?: (portal: PortalItem) => void;
  lootComposer?: boolean;
  onLootComposer?: (open: boolean) => void;
  onLootSave?: (note: string, close: boolean) => void;
};

export function SidePanel({ state, quest, trail, portals, loot, busy = false, notice = "", drawer = null, onBegin, onAction, onFinish, onDrawer, onUnseal, lootComposer = false, onLootComposer, onLootSave }: SidePanelProps) {
  const goalId = useId();
  const [goal, setGoal] = useState("");
  const portalsTriggerRef = useRef<HTMLButtonElement>(null);
  const lootTriggerRef = useRef<HTMLButtonElement>(null);
  const lastDrawerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const submit = (event: FormEvent) => { event.preventDefault(); const title = goal.trim(); if (title) onBegin?.(title); };
  const stateCopy = state === "start" || state === "loading" ? null : copy[state];
  return <main className="surface sidepanel" aria-labelledby="sidepanel-title" aria-busy={busy || state === "loading"}>
    <header className="instrument-header">
      <span className="wordmark" id="sidepanel-title">TABYRINTH</span>
      {quest && <Signal label={stateCopy?.label ?? "QUEST"} state={statusTone(state)} />}
    </header>

    {state === "loading" ? <div className="instrument-loading" role="status"><span />Reading the trail…</div> : !quest ? <section className="quest-start">
      <form onSubmit={submit}>
        <label htmlFor={goalId}>What are you trying to finish?</label>
        <input id={goalId} value={goal} maxLength={120} required autoFocus placeholder="Ship the next release" onChange={(event) => setGoal(event.target.value)} />
        <Button type="submit" disabled={busy || !goal.trim()}>{busy ? "Beginning…" : "Begin Quest"}</Button>
      </form>
      {state === "unsupported" && <p className="inline-alert" role="alert">Use a normal web page to begin.</p>}
    </section> : <>
      <section className="quest-heading" aria-label="Active Quest"><h1>{quest.title}</h1><button type="button" className="text-control" onClick={onFinish} disabled={busy}>Finish</button></section>
      <Trail trail={trail} />
      <section className="decision" data-state={state}>
        <div aria-live="polite"><h2>{stateCopy?.title}</h2>{stateCopy?.body && <p>{stateCopy.body}</p>}</div>
        {state === "active" && <Button disabled={busy} onClick={() => onAction?.("fold")}>{busy ? "Folding…" : "Fold this detour"}</Button>}
        {state === "unsafe" && <Button disabled={busy} onClick={() => onAction?.("fold")}>Retry fold</Button>}
        {state !== "complete" && <div className="secondary-actions">
          <button type="button" className="text-control" disabled={busy || !trail.length} onClick={() => onAction?.("keep")}>Keep on path</button>
          <button type="button" className="text-control" disabled={busy || !trail.length} onClick={() => onLootComposer?.(!lootComposer)}>Save as Loot</button>
        </div>}
        {lootComposer && <form className="loot-composer" onSubmit={(event) => { event.preventDefault(); const note = new FormData(event.currentTarget).get("note"); onLootSave?.(typeof note === "string" ? note.trim() : "", false); }}>
          <label htmlFor="loot-note">Optional note</label><input id="loot-note" name="note" maxLength={160} placeholder="One useful detail" />
          <div><Button type="submit" disabled={busy}>Save</Button><Button type="button" variant="quiet" disabled={busy} onClick={(event) => { const form = event.currentTarget.form; const note = form ? new FormData(form).get("note") : ""; onLootSave?.(typeof note === "string" ? note.trim() : "", true); }}>Save + Close</Button><button type="button" className="text-control" onClick={() => onLootComposer?.(false)}>Cancel</button></div>
        </form>}
      </section>
      <footer className="instrument-footer">
        <button ref={portalsTriggerRef} type="button" className="collection-trigger" aria-expanded={drawer === "portals"} aria-controls="portals-drawer" onClick={() => { lastDrawerTriggerRef.current = portalsTriggerRef.current; onDrawer?.(drawer === "portals" ? null : "portals"); }}><span>{portals.length}</span> Portals</button>
        <button ref={lootTriggerRef} type="button" className="collection-trigger" aria-expanded={drawer === "loot"} aria-controls="loot-drawer" onClick={() => { lastDrawerTriggerRef.current = lootTriggerRef.current; onDrawer?.(drawer === "loot" ? null : "loot"); }}><span>{loot.length}</span> Loot</button>
      </footer>
      <Drawer open={drawer} portals={portals} loot={loot} busy={busy} triggerRef={lastDrawerTriggerRef} onClose={() => onDrawer?.(null)} onUnseal={(portal) => onUnseal?.(portal)} />
    </>}
    {notice && <p className="surface-notice" role={state === "error" || state === "unsafe" || state === "partial" ? "alert" : "status"}>{notice}</p>}
  </main>;
}

function canFoldCurrent(graph: PortalGraph, nodeId: string | null) {
  if (!nodeId) return false;
  const node = graph.nodes[nodeId];
  if (!node || node.status !== "live" || node.disposition !== "unclassified") return false;
  let parent = node.parentNodeId ? graph.nodes[node.parentNodeId] : undefined;
  while (parent) { if (parent.disposition === "path") return true; parent = parent.parentNodeId ? graph.nodes[parent.parentNodeId] : undefined; }
  return false;
}

function errorState(reason: string): SidePanelState {
  if (reason.includes("UNSUPPORTED")) return "unsupported";
  if (reason.includes("UNSAFE") || reason.includes("OWNERSHIP") || reason.includes("CROSS_WINDOW")) return "unsafe";
  if (reason.includes("ORIGIN")) return "missing-origin";
  if (reason.includes("PARTIAL")) return "partial";
  return "error";
}

function LiveSidePanel() {
  const [state, setState] = useState<SidePanelState>("loading");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [graph, setGraph] = useState<PortalGraph | null>(null);
  const [quest, setQuest] = useState<PortalQuest | null>(null);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [loot, setLoot] = useState<LootItem[]>([]);
  const [portals, setPortals] = useState<PortalItem[]>([]);
  const [drawer, setDrawer] = useState<DrawerName>(null);
  const [lootComposer, setLootComposer] = useState(false);

  const refresh = async () => {
    const result = await chrome.runtime.sendMessage({ type: "PORTAL_GET" });
    if (result?.error) throw new Error(result.error);
    const nextGraph = (result?.graph ?? { nodes: {}, tabBindings: {} }) as PortalGraph;
    const nextQuest = (result?.quest ?? null) as PortalQuest | null;
    const nextPortals = Object.values(result?.state?.portals ?? {}) as PortalItem[];
    const nextCurrent = result?.currentNodeId ?? null;
    setGraph(nextGraph); setQuest(nextQuest); setLoot(result?.loot ?? []); setPortals(nextPortals); setCurrentNodeId(nextCurrent);
    if (!nextQuest) setState("start");
    else if (nextQuest.status === "complete") setState("complete");
    else {
      const partial = nextPortals.find((portal) => portal.restoreStatus === "partial");
      const restoring = nextPortals.find((portal) => portal.status === "restoring");
      if (restoring) setState("restoring");
      else if (partial) setState("partial");
      else setState(canFoldCurrent(nextGraph, nextCurrent) ? "active" : "nothing-to-fold");
    }
  };

  useEffect(() => {
    let disposed = false;
    const update = () => { void refresh().catch((error) => { if (!disposed) { setState(errorState(String(error))); setNotice("Could not read the trail."); } }); };
    update();
    const events = [chrome.tabs?.onActivated, chrome.tabs?.onCreated, chrome.tabs?.onRemoved, chrome.tabs?.onUpdated];
    events.forEach((event) => event?.addListener(update));
    const storage = () => update();
    chrome.storage?.onChanged?.addListener(storage);
    return () => { disposed = true; events.forEach((event) => event?.removeListener?.(update)); chrome.storage?.onChanged?.removeListener?.(storage); };
  }, []);

  const perform = async (task: () => Promise<unknown>, success: string) => {
    setBusy(true); setNotice("");
    try { const result = await task() as { error?: string } | undefined; if (result?.error) throw new Error(result.error); setNotice(success); await refresh(); return result; }
    catch (error) { const reason = error instanceof Error ? error.message : String(error); setState(errorState(reason)); setNotice(reason.replaceAll("_", " ").toLowerCase()); return undefined; }
    finally { setBusy(false); }
  };
  const trail = graph && currentNodeId ? (() => { const nodes: TrailNode[] = []; const seen = new Set<string>(); let node: PortalGraph["nodes"][string] | undefined = graph.nodes[currentNodeId]; while (node && !seen.has(node.id)) { seen.add(node.id); nodes.unshift({ id: node.id, title: node.title ?? node.url ?? "Untitled page", url: node.url ?? "", disposition: node.disposition, status: node.status }); node = node.parentNodeId ? graph.nodes[node.parentNodeId] : undefined; } return nodes.slice(-7); })() : [];
  const begin = (title: string) => { void perform(() => chrome.runtime.sendMessage({ type: "PORTAL_BEGIN", title }), "Quest begun."); };
  const action = (kind: SidePanelAction) => {
    if (!quest || !currentNodeId) { setState("unsupported"); return; }
    if (kind === "fold") void perform(() => chrome.runtime.sendMessage({ type: "PORTAL_FOLD", questId: quest.id, currentNodeId }), "Branch sealed.");
    if (kind === "keep") void perform(() => chrome.runtime.sendMessage({ type: "PORTAL_MARK_PATH", nodeId: currentNodeId }), "Kept on path.");
    if (kind === "loot") setLootComposer(true);
  };
  const finish = () => { if (quest) void perform(() => chrome.runtime.sendMessage({ type: "PORTAL_FINISH", questId: quest.id }), "Quest complete."); };
  const unseal = (portal: PortalItem) => { setState("restoring"); void perform(() => chrome.runtime.sendMessage({ type: "PORTAL_UNSEAL", portalId: portal.id }), "Branch unsealed."); };
  const saveLoot = (note: string, close: boolean) => {
    if (!currentNodeId) return;
    void perform(() => chrome.runtime.sendMessage({ type: "PORTAL_SAVE_LOOT", nodeId: currentNodeId, ...(note ? { note } : {}), ...(close ? { close: true } : {}) }), close ? "Loot saved. Tab closed." : "Loot saved.").then((result) => {
      if (result) setLootComposer(false);
    });
  };
  return <SidePanel state={state} quest={quest} trail={trail} portals={portals} loot={loot} busy={busy} notice={notice} drawer={drawer} lootComposer={lootComposer} onLootComposer={setLootComposer} onLootSave={saveLoot} onBegin={begin} onAction={action} onFinish={finish} onDrawer={setDrawer} onUnseal={unseal} />;
}

export function SidePanelPreview() {
  const trail: TrailNode[] = [
    { id: "preview-root", title: "Chrome extensions", url: "https://developer.chrome.com", disposition: "path", status: "live" },
    { id: "preview-fork", title: "Side Panel API", url: "https://developer.chrome.com/docs/extensions/reference/api/sidePanel", disposition: "path", status: "live" },
    { id: "preview-leaf", title: "Lifecycle edge cases", url: "https://issues.chromium.org", disposition: "unclassified", status: "live" },
  ];
  const quest: PortalQuest = { id: "preview", title: "Ship the next release", rootNodeId: trail[0].id, currentNodeId: trail[2].id, status: "active", createdAt: 1, completedAt: null };
  return <SidePanel state="active" quest={quest} trail={trail} portals={[{ id: "preview-portal", title: "Animation research", nodeIds: ["x", "y"], status: "sealed" }]} loot={[{ id: "preview-loot", title: "MV3 lifecycle notes", url: "https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle" }]} />;
}

const rootElement = typeof document !== "undefined" ? document.getElementById("root") : null;
if (rootElement) createRoot(rootElement).render(new URLSearchParams(window.location.search).has("preview") ? <SidePanelPreview /> : <LiveSidePanel />);
