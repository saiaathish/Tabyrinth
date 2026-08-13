import { foldBranch, type FoldTab } from "./fold-runtime";
import { restorePortal } from "./restore-runtime";
import { portalReducer } from "./reducer";
import { portalStorage } from "./storage";
import type { BranchGraph } from "../branch/types";
import { BranchRuntime } from "../branch/runtime";
import { emptyBranchGraph } from "../branch/types";
import { createPortalQuest, finishPortalQuest } from "./quest";
import type { LootItem } from "./types";

const chromeFold = { get: async (id: number) => chrome.tabs.get(id) as unknown as Promise<FoldTab>, query: async (q: { windowId?: number }) => chrome.tabs.query(q) as unknown as Promise<FoldTab[]>, create: async (url: string) => chrome.tabs.create({ url }) as unknown as Promise<FoldTab>, move: async (ids: number[], index: number, windowId: number) => chrome.tabs.move(ids, { index, windowId }), remove: async (ids: number[]) => chrome.tabs.remove(ids), activate: async (id: number) => chrome.tabs.update(id, { active: true }) };
const isSupportedWebUrl = (url: string | null | undefined): url is string => {
  if (!url) return false;
  try { return /^https?:$/.test(new URL(url).protocol); } catch { return false; }
};

export async function getPortalState() {
  await reconcilePortalSession();
  const graph = await graphWithSession();
  const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTabId = activeTabs[0]?.id;
  const currentNodeId = activeTabId === undefined ? null : graph.tabBindings[String(activeTabId)]?.nodeId ?? null;
  return { state: await portalStorage.get(), graph, currentNodeId, quest: await portalStorage.getActiveQuest() ?? await portalStorage.getLatestQuest(), loot: await portalStorage.getLoot() };
}

/**
 * Reconcile ephemeral branch bindings after a worker wake or extension reload.
 * Durable ancestry is retained, while bindings that can no longer be proven to
 * identify the same live HTTP(S) tab are removed fail-closed. Portal-tab IDs
 * are intentionally left untouched; their manual-close lifecycle is handled by
 * the onRemoved event and durable Portal reducer.
 */
export async function reconcilePortalSession(): Promise<void> {
  const durable = await portalStorage.getGraph() ?? emptyBranchGraph();
  const session = await portalStorage.getSession();
  const nextBindings = { ...session.bindings };
  const nextNodes = { ...durable.nodes };
  let changed = false;

  for (const [rawTabId, binding] of Object.entries(session.bindings)) {
    const tabId = Number(rawTabId);
    const node = durable.nodes[binding.nodeId];
    const tab = Number.isInteger(tabId) && tabId >= 0
      ? await chrome.tabs.get(tabId).catch(() => null)
      : null;

    const valid = Boolean(
      node
      && node.status === "live"
      && node.url
      && tab
      && tab.id === tabId
      && Number.isInteger(binding.windowId)
      && binding.windowId! >= 0
      && tab.windowId === binding.windowId
      && tab.url === node.url,
    );
    if (valid) continue;

    delete nextBindings[rawTabId];
    changed = true;
    // A missing tab is a durable closure; malformed or drifted bindings are
    // merely detached so later operations cannot close an uncertain tab.
    if (!tab && node?.status === "live") nextNodes[node.id] = { ...node, status: "closed", updatedAt: Date.now() };
  }

  if (!changed) return;
  await portalStorage.setGraph({ nodes: nextNodes, tabBindings: {} });
  await portalStorage.setSession({ ...session, bindings: nextBindings });
}

async function graphWithSession(): Promise<BranchGraph> {
  const graph = await portalStorage.getGraph() ?? emptyBranchGraph();
  const session = await portalStorage.getSession();
  return { ...graph, tabBindings: { ...session.bindings } };
}

async function persistGraph(graph: BranchGraph) {
  await portalStorage.setGraph({ nodes: graph.nodes, tabBindings: {} });
  await portalStorage.setSession({ portalTabIds: (await portalStorage.getSession()).portalTabIds, bindings: graph.tabBindings });
}

export async function beginPortalQuest(title: string) {
  if (await portalStorage.getActiveQuest()) throw new Error("QUEST_ALREADY_ACTIVE");
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs.find((candidate) => candidate.id !== undefined && isSupportedWebUrl(candidate.url));
  if (!tab?.id || tab.windowId === undefined) throw new Error("UNSUPPORTED_ACTIVE_TAB");
  const questId = crypto.randomUUID();
  const graph = await graphWithSession();
  const runtime = new BranchRuntime(graph);
  const nodeId = runtime.createRoot(questId, tab.id, { url: tab.url, title: tab.title, faviconUrl: tab.favIconUrl, windowId: tab.windowId });
  // The quest origin is the user's main path. Mark it before the first child
  // can be folded so the initial A -> B detour follows the PRD's happy path.
  runtime.setDisposition(nodeId, "path");
  await persistGraph(runtime.snapshot());
  const quest = createPortalQuest({ id: questId, title, rootNodeId: nodeId });
  await portalStorage.putQuest(quest);
  return { quest, questId, rootNodeId: nodeId, currentNodeId: nodeId };
}

/**
 * Adopt the active web tab only after an explicit user action. Openerless tabs
 * stay outside the Quest until this path proves a live same-window parent.
 */
export async function trackCurrentPortalTab() {
  const quest = await portalStorage.getActiveQuest();
  if (!quest) throw new Error("QUEST_NOT_ACTIVE");

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs.find((candidate) => candidate.id !== undefined);
  if (!tab || tab.id === undefined || tab.windowId === undefined || !isSupportedWebUrl(tab.url)) throw new Error("UNSUPPORTED_ACTIVE_TAB");

  const graph = await graphWithSession();
  if (graph.tabBindings[String(tab.id)]) throw new Error("TAB_ALREADY_TRACKED");

  const parentNodeId = quest.currentNodeId ?? quest.rootNodeId;
  const parentNode = graph.nodes[parentNodeId];
  const parentEntry = Object.entries(graph.tabBindings).find(([, binding]) => binding.nodeId === parentNodeId);
  if (!parentNode || parentNode.questId !== quest.id || parentNode.status !== "live" || !parentEntry) throw new Error("QUEST_ORIGIN_UNAVAILABLE");

  const parentTabId = Number(parentEntry[0]);
  const parentBinding = parentEntry[1];
  if (!Number.isInteger(parentTabId) || parentBinding.windowId === null || parentBinding.windowId !== tab.windowId) throw new Error("CROSS_WINDOW_PARENT");
  const parentTab = await chrome.tabs.get(parentTabId).catch(() => null);
  if (!parentTab || parentTab.id !== parentTabId || parentTab.windowId !== tab.windowId || parentTab.url !== parentNode.url || !isSupportedWebUrl(parentTab.url)) throw new Error("QUEST_ORIGIN_UNAVAILABLE");

  const runtime = new BranchRuntime(graph);
  const childNodeId = runtime.onCreated(quest.id, {
    tabId: tab.id,
    openerTabId: parentTabId,
    windowId: tab.windowId,
    url: tab.url,
    title: tab.title,
    faviconUrl: tab.favIconUrl,
  });
  const nextGraph = runtime.snapshot();
  await persistGraph(nextGraph);
  const nextQuest = { ...quest, currentNodeId: childNodeId };
  await portalStorage.putQuest(nextQuest);
  return { graph: nextGraph, quest: nextQuest, currentNodeId: childNodeId };
}

export async function finishActivePortalQuest(questId: string) {
  const quest = await portalStorage.getActiveQuest();
  if (!quest || quest.id !== questId) throw new Error("QUEST_NOT_FOUND");
  const completed = finishPortalQuest(quest);
  await portalStorage.putQuest(completed);
  return completed;
}

export async function capturePortalCreated(tab: chrome.tabs.Tab) {
  if (tab.id === undefined || tab.openerTabId === undefined) return;
  const graph = await graphWithSession();
  if (graph.tabBindings[String(tab.id)]) return;
  const openerBinding = graph.tabBindings[String(tab.openerTabId)];
  const openerNode = openerBinding ? graph.nodes[openerBinding.nodeId] : undefined;
  if (!openerBinding || !openerNode || openerNode.status !== "live") return;
  const activeQuest = await portalStorage.getActiveQuest();
  if (!activeQuest || activeQuest.id !== openerNode.questId) return;
  if (openerBinding.windowId !== null && tab.windowId !== undefined && openerBinding.windowId !== tab.windowId) return;
  const runtime = new BranchRuntime(graph);
  runtime.onCreated(openerNode.questId, { tabId: tab.id, openerTabId: tab.openerTabId, windowId: tab.windowId, url: tab.url, title: tab.title, faviconUrl: tab.favIconUrl });
  await persistGraph(runtime.snapshot());
  const quest = await portalStorage.getActiveQuest();
  const childNodeId = runtime.snapshot().tabBindings[String(tab.id)]?.nodeId;
  if (quest?.id === openerNode.questId && childNodeId) await portalStorage.putQuest({ ...quest, currentNodeId: childNodeId });
}

export async function capturePortalUpdated(tabId: number, tab: chrome.tabs.Tab) {
  const graph = await graphWithSession();
  const runtime = new BranchRuntime(graph);
  runtime.onUpdated(tabId, { url: tab.url, title: tab.title, faviconUrl: tab.favIconUrl, windowId: tab.windowId });
  await persistGraph(runtime.snapshot());
}

export async function capturePortalRemoved(tabId: number) {
  const graph = await graphWithSession();
  const runtime = new BranchRuntime(graph);
  runtime.onRemoved(tabId);
  await persistGraph(runtime.snapshot());
}
export async function markPortalPath(nodeId: string) {
  const graph = await graphWithSession();
  const runtime = new BranchRuntime(graph);
  runtime.setDisposition(nodeId, "path");
  await persistGraph(runtime.snapshot());
  return runtime.snapshot();
}

export const LOOT_CLOSE_UNSAFE = "LOOT_CLOSE_UNSAFE";

export async function savePortalLoot(nodeId: string, note?: string, close = false) {
  const graph = await graphWithSession();
  const node = graph.nodes[nodeId];
  const quest = await portalStorage.getActiveQuest();
  if (!node || node.status !== "live" || !quest || quest.id !== node.questId || !isSupportedWebUrl(node.url)) throw new Error("UNSUPPORTED_LOOT_PAGE");

  let tabId: number | null = null;
  if (close) {
    const bindings = Object.entries(graph.tabBindings).filter(([, binding]) => binding.nodeId === node.id);
    if (bindings.length !== 1) throw new Error(LOOT_CLOSE_UNSAFE);
    const [rawTabId, binding] = bindings[0];
    const candidateTabId = Number(rawTabId);
    if (!Number.isInteger(candidateTabId) || binding.windowId === null || !Number.isInteger(binding.windowId) || binding.windowId < 0) throw new Error(LOOT_CLOSE_UNSAFE);
    const tab = await chrome.tabs.get(candidateTabId).catch(() => null);
    if (!tab || tab.id !== candidateTabId || tab.windowId !== binding.windowId || tab.url !== node.url || !isSupportedWebUrl(tab.url)) throw new Error(LOOT_CLOSE_UNSAFE);
    tabId = candidateTabId;
  }

  const trimmedNote = note?.trim();
  const item: LootItem = {
    id: crypto.randomUUID(),
    questId: node.questId,
    sourceNodeId: node.id,
    url: node.url,
    title: node.title ?? node.url,
    faviconUrl: node.faviconUrl,
    ...(trimmedNote ? { note: trimmedNote } : {}),
    createdAt: Date.now(),
  };
  await portalStorage.addLoot(item);

  const lootedAt = Date.now();
  await portalStorage.setGraph({
    nodes: { ...graph.nodes, [node.id]: { ...node, disposition: "loot", updatedAt: lootedAt } },
    tabBindings: {},
  });
  if (tabId !== null) {
    await chrome.tabs.remove(tabId);
    const latestGraph = await portalStorage.getGraph() ?? graph;
    const latestNode = latestGraph.nodes[node.id] ?? node;
    await portalStorage.setGraph({
      nodes: { ...latestGraph.nodes, [node.id]: { ...latestNode, disposition: "loot", status: "closed", updatedAt: Date.now() } },
      tabBindings: {},
    });
    const session = await portalStorage.getSession();
    if (session.bindings[String(tabId)]?.nodeId === node.id) delete session.bindings[String(tabId)];
    await portalStorage.setSession(session);
    if (quest.currentNodeId === node.id) await portalStorage.putQuest({ ...quest, currentNodeId: node.parentNodeId });
  }
  return item;
}
export async function renamePortal(portalId: string, title: string) {
  const state = await portalStorage.get();
  const portal = state.portals[portalId];
  if (!portal) throw new Error("PORTAL_NOT_FOUND");
  const next = { ...state, portals: { ...state.portals, [portalId]: { ...portal, title: title.trim(), updatedAt: portal.updatedAt + 1 } } };
  await portalStorage.set(next);
  return next.portals[portalId];
}

export async function deletePortal(portalId: string) {
  const state = await portalStorage.get();
  const portal = state.portals[portalId];
  if (!portal) throw new Error("PORTAL_NOT_FOUND");
  if (portal.status === "restoring") throw new Error("RESTORE_ALREADY_IN_PROGRESS");

  const session = await portalStorage.getSession();
  const knownTabId = session.portalTabIds[portalId] ?? portal.portalTabId;
  let closeTabId: number | null = null;
  if (Number.isInteger(knownTabId) && knownTabId! >= 0) {
    const tab = await chrome.tabs.get(knownTabId!).catch(() => null);
    const expectedUrl = chrome.runtime.getURL(`portal.html?portal=${encodeURIComponent(portalId)}`);
    if (tab?.id === knownTabId && tab.url === expectedUrl) closeTabId = knownTabId!;
  }

  const portals = { ...state.portals };
  const folds = { ...state.folds };
  delete portals[portalId];
  delete folds[portalId];
  await portalStorage.set({ portals, folds });
  delete session.portalTabIds[portalId];
  await portalStorage.setSession(session);
  if (closeTabId !== null) await chrome.tabs.remove(closeTabId);
  return { portalId, closedPortalTab: closeTabId !== null };
}
export async function foldPortal(questId: string, currentNodeId: string) {
  const graph = await graphWithSession();
  const result = await foldBranch({ graph, questId, currentNodeId, chrome: chromeFold, persist: async (portal, closeableNodeIds) => { const state = portalReducer(await portalStorage.get(), { type: "SNAPSHOT_PERSISTED", portal, closeableNodeIds }); await portalStorage.set(state); }, clearBindings: async (nodeIds) => { const session = await portalStorage.getSession(); for (const [tabId, binding] of Object.entries(session.bindings)) if (nodeIds.includes(binding.nodeId)) delete session.bindings[tabId]; await portalStorage.setSession(session); }, portalUrl: (id) => chrome.runtime.getURL(`portal.html?portal=${encodeURIComponent(id)}`) });
  const opened = portalReducer(await portalStorage.get(), { type: "PORTAL_OPENED", portalId: result.portal.id, portalTabId: result.portal.portalTabId! });
  const closing = portalReducer(opened, { type: "CLOSE_STARTED", portalId: result.portal.id });
  const session = await portalStorage.getSession();
  session.portalTabIds[result.portal.id] = result.portal.portalTabId!;
  await portalStorage.setSession(session);
  const sealedAt = Date.now();
  const sealedNodes = { ...graph.nodes };
  for (const nodeId of result.snapshot.nodeIds) {
    const node = sealedNodes[nodeId];
    if (node) sealedNodes[nodeId] = { ...node, status: "sealed", disposition: "portal", updatedAt: sealedAt };
  }
  const finalSession = await portalStorage.getSession();
  await portalStorage.setGraph({ nodes: sealedNodes, tabBindings: finalSession.bindings });
  await portalStorage.set(portalReducer(closing, { type: "BRANCH_SEALED", portalId: result.portal.id }));
  return result;
}

export async function unsealPortal(portalId: string) {
  const state = await portalStorage.get();
  const portal = state.portals[portalId];
  if (!portal) throw new Error("PORTAL_NOT_FOUND");
  if (portal.status === "restoring") throw new Error("RESTORE_ALREADY_IN_PROGRESS");
  if (portal.status === "open") throw new Error("PORTAL_ALREADY_RESTORED");
  // Read the authoritative graph before changing lifecycle state. A suspended
  // worker or transient storage failure must leave the Portal retryable rather
  // than stranding it in `restoring` with no restore attempt started.
  const graph = await graphWithSession();
  await portalStorage.set(portalReducer(state, { type: "RESTORE_STARTED", portalId }));
  const result = await restorePortal(portal, graph, {
    getTab: async (id) => chrome.tabs.get(id).catch(() => null) as unknown as Promise<{ id: number; windowId?: number; url?: string } | null>,
    createTab: async (input) => chrome.tabs.create(input) as unknown as Promise<{ id: number; windowId?: number; url?: string }>,
    bind: async (nodeId, tabId, windowId) => { const s = await portalStorage.getSession(); s.bindings[String(tabId)] = { nodeId, windowId }; await portalStorage.setSession(s); },
    clearBinding: async (tabId) => { const s = await portalStorage.getSession(); delete s.bindings[String(tabId)]; await portalStorage.setSession(s); },
    activate: async (id) => { await chrome.tabs.update(id, { active: true }); },
    removePortalTab: (id) => chrome.tabs.remove(id),
  });
  const next = await portalStorage.get();
  const restoredAt = Date.now();
  const restoredNodes = { ...graph.nodes };
  for (const nodeId of result.restoredNodeIds) {
    const snapshotNode = portal.snapshot.nodes[nodeId];
    if (snapshotNode) restoredNodes[nodeId] = { ...snapshotNode, status: "live", updatedAt: restoredAt };
  }
  const restoredSession = await portalStorage.getSession();
  await portalStorage.setGraph({ nodes: restoredNodes, tabBindings: restoredSession.bindings });
  if (result.ok) {
    delete restoredSession.portalTabIds[portalId];
    await portalStorage.setSession(restoredSession);
  }
  let restoredState = next;
  for (const nodeId of result.restoredNodeIds) restoredState = portalReducer(restoredState, { type: "RESTORE_PROGRESS", portalId, nodeId });
  await portalStorage.set(portalReducer(restoredState, result.ok
    ? { type: "RESTORE_COMPLETED", portalId }
    : { type: "RESTORE_FAILED", portalId, reason: result.reason }));
  return result;
}
