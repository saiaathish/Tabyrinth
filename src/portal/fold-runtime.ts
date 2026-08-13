import { createPortalSnapshot } from "./types";
import type { BranchGraph, BranchNode } from "../branch/types";
import type { Portal, PortalSnapshot } from "./types";
import { getDescendants, validateSubtreeOwnership } from "./selectors";

export const FOLD_BLOCKED_UNSAFE_TAB = "FOLD_BLOCKED_UNSAFE_TAB";
export const MISSING_ORIGIN = "MISSING_ORIGIN";

export type FoldTab = { id: number; index: number; windowId: number; url?: string; title?: string };
export type FoldChrome = {
  get(id: number): Promise<FoldTab>;
  query(query: { windowId?: number }): Promise<FoldTab[]>;
  create(url: string): Promise<FoldTab>;
  move(ids: number[], index: number, windowId: number): Promise<unknown>;
  remove(ids: number[]): Promise<unknown>;
  activate(id: number): Promise<unknown>;
};
export type FoldPersist = (portal: Portal, closeableNodeIds: string[]) => Promise<void>;
export type FoldOptions = {
  graph: BranchGraph;
  questId: string;
  currentNodeId: string;
  chrome: FoldChrome;
  persist: FoldPersist;
  clearBindings: (nodeIds: string[]) => Promise<void> | void;
  markSealed?: (nodeIds: string[]) => Promise<void> | void;
  id?: () => string;
  now?: () => number;
  portalUrl?: (portalId: string) => string;
};

export type FoldResult = { portal: Portal; snapshot: PortalSnapshot; closedTabIds: number[] };

function portalTitle(root: BranchNode, count: number): string {
  const label = root.title?.trim() || (root.url ? (() => { try { return new URL(root.url).hostname; } catch { return "Browsing branch"; } })() : "Browsing branch");
  return `${label} · ${count}`;
}

export async function foldBranch(options: FoldOptions): Promise<FoldResult> {
  const now = options.now ?? (() => Date.now());
  const id = options.id ?? (() => crypto.randomUUID());
  const graph = options.graph;
  const current = graph.nodes[options.currentNodeId];
  if (!current || current.questId !== options.questId) throw new Error("ACTIVE_QUEST_OR_CURRENT_NODE_MISSING");

  const ancestry: BranchNode[] = [];
  for (let node: BranchNode | undefined = current; node; node = node.parentNodeId ? graph.nodes[node.parentNodeId] : undefined) ancestry.unshift(node);
  const pathIndex = [...ancestry].reverse().findIndex((node) => node.disposition === "path");
  const origin = pathIndex < 0 ? undefined : ancestry[ancestry.length - 1 - pathIndex];
  const originIndex = origin ? ancestry.findIndex((node) => node.id === origin.id) : -1;
  const branchRoot = originIndex >= 0 ? ancestry[originIndex + 1] : undefined;
  if (!origin || !branchRoot || origin.questId !== options.questId) throw new Error("NOTHING_TO_FOLD");
  const originBinding = graph.tabBindings[String(findTab(graph, origin.id))];
  if (!originBinding) throw new Error(MISSING_ORIGIN);

  const subtree = getDescendants(graph, branchRoot.id);
  const ownership = validateSubtreeOwnership(graph, subtree, options.questId);
  if (!ownership.ok) throw new Error(FOLD_BLOCKED_UNSAFE_TAB);
  const live: { node: BranchNode; tab: FoldTab }[] = [];
  for (const node of subtree) {
    const tabId = findTab(graph, node.id);
    if (tabId === undefined) continue;
    const binding = graph.tabBindings[String(tabId)];
    let tab: FoldTab;
    try { tab = await options.chrome.get(tabId); } catch { throw new Error(FOLD_BLOCKED_UNSAFE_TAB); }
    if (!binding || binding.nodeId !== node.id || binding.windowId === null || binding.windowId !== tab.windowId || !node.url || tab.url !== node.url) throw new Error(FOLD_BLOCKED_UNSAFE_TAB);
    live.push({ node, tab });
  }
  const originTabId = findTab(graph, origin.id);
  if (originTabId === undefined) throw new Error(MISSING_ORIGIN);
  const snapshot = createPortalSnapshot(graph, id(), options.questId, origin.id, branchRoot.id, current.id, subtree.map((node) => node.id), now());
  const portalId = snapshot.id;
  const portal: Portal = { id: portalId, questId: options.questId, title: portalTitle(branchRoot, subtree.length), originNodeId: origin.id, branchRootNodeId: branchRoot.id, nodeIds: snapshot.nodeIds, portalNodeId: `${portalId}:portal`, portalTabId: null, status: "sealed", createdAt: snapshot.createdAt, updatedAt: snapshot.createdAt, snapshot, restoreStatus: "idle", restoredNodeIds: [], error: null };
  await options.persist(portal, live.map(({ node }) => node.id));
  const created = await options.chrome.create((options.portalUrl ?? ((pid) => `portal.html?portal=${encodeURIComponent(pid)}`))(portalId));
  portal.portalTabId = created.id;
  const originTab = await options.chrome.get(originTabId).catch(() => undefined);
  if (!originTab || originBinding.windowId === null || originTab.windowId !== originBinding.windowId || !origin.url || originTab.url !== origin.url) {
    await options.chrome.remove([created.id]).catch(() => undefined);
    throw new Error(MISSING_ORIGIN);
  }
  await options.chrome.query({ windowId: originTab.windowId });
  if (created.windowId === originTab.windowId) await options.chrome.move([created.id], originTab.index + 1, originTab.windowId);
  const closeIds = live.filter(({ tab }) => tab.id !== originTabId && tab.id !== created.id).map(({ tab }) => tab.id);
  if (closeIds.length) await options.chrome.remove(closeIds);
  await options.clearBindings(live.filter(({ tab }) => closeIds.includes(tab.id)).map(({ node }) => node.id));
  await options.markSealed?.(live.map(({ node }) => node.id));
  await options.chrome.activate(originTabId);
  return { portal, snapshot, closedTabIds: closeIds };
}

function findTab(graph: BranchGraph, nodeId: string): number | undefined {
  const entry = Object.entries(graph.tabBindings).find(([, binding]) => binding.nodeId === nodeId);
  return entry ? Number(entry[0]) : undefined;
}
