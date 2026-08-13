import { topologicalSort } from "./selectors";
import type { BranchGraph, BranchNode } from "../branch/types";
import type { Portal } from "./types";

/** The narrow Chrome boundary needed by restore. Implementations may be backed by chrome.tabs. */
export type RestoreAdapter = {
  getTab(tabId: number): Promise<{ id: number; windowId?: number; url?: string } | null>;
  createTab(input: { url: string; windowId?: number; openerTabId?: number }): Promise<{ id: number; windowId?: number; url?: string }>;
  bind(nodeId: string, tabId: number, windowId: number | null): Promise<void> | void;
  clearBinding(tabId: number): Promise<void> | void;
  activate(tabId: number): Promise<void> | void;
  removePortalTab(tabId: number): Promise<void> | void;
};

export type RestoreResult =
  | { ok: true; restoredNodeIds: string[]; leafNodeId: string; leafTabId: number }
  | { ok: false; restoredNodeIds: string[]; reason: string };

/** Restore is retryable: the supplied snapshot and Portal are never modified or deleted here. */
export async function restorePortal(portal: Portal, graph: BranchGraph, adapter: RestoreAdapter): Promise<RestoreResult> {
  const nodes = portal.nodeIds.map((id) => portal.snapshot.nodes[id]).filter((node): node is BranchNode => Boolean(node));
  const ordered = topologicalSort(nodes);
  const restored = new Set<string>();
  const tabs = new Map<string, number>();
  const tabWindows = new Map<string, number | undefined>();
  try {
   const originBinding = Object.entries(graph.tabBindings).find(([, binding]) => binding.nodeId === portal.originNodeId);
   const originNode = graph.nodes[portal.originNodeId];
   let originTab = originBinding ? await adapter.getTab(Number(originBinding[0])) : null;
   if (originBinding && (!originTab || !originNode?.url || originTab.url !== originNode.url || originBinding[1].windowId === null || originTab.windowId !== originBinding[1].windowId)) {
     await adapter.clearBinding(Number(originBinding[0]));
     originTab = null;
   }
   for (const node of ordered) {
    if (!node.url || node.url.startsWith("javascript:")) return { ok: false, restoredNodeIds: [...restored], reason: `invalid URL for ${node.id}` };
    const existing = Object.entries(graph.tabBindings).find(([, binding]) => binding.nodeId === node.id);
    let tab: { id: number; windowId?: number; url?: string } | null = null;
    if (existing) {
      tab = await adapter.getTab(Number(existing[0]));
      if (!tab || tab.url !== node.url || existing[1].windowId === null || tab.windowId !== existing[1].windowId) {
        await adapter.clearBinding(Number(existing[0]));
        tab = null;
      }
    }
    if (!tab) {
      const parentTabId = node.parentNodeId
        ? tabs.get(node.parentNodeId) ?? (node.parentNodeId === portal.originNodeId ? originTab?.id : undefined)
        : undefined;
      const parentWindowId = node.parentNodeId
        ? tabWindows.get(node.parentNodeId) ?? (node.parentNodeId === portal.originNodeId ? originTab?.windowId : undefined)
        : originTab?.windowId;
      // Keep every newly-created page in the selected restore window. Chrome's
      // opener relationship is best-effort, but an explicit window prevents a
      // restore from silently scattering a branch across browser windows.
      const createInput: { url: string; windowId?: number; openerTabId?: number } = { url: node.url };
      if (parentWindowId !== undefined) createInput.windowId = parentWindowId;
      if (parentTabId !== undefined) createInput.openerTabId = parentTabId;
      tab = await adapter.createTab(createInput);
    }
    await adapter.bind(node.id, tab.id, tab.windowId ?? null);
    tabs.set(node.id, tab.id);
    tabWindows.set(node.id, tab.windowId);
    restored.add(node.id);
   }

  const leafNodeId = portal.snapshot.currentNodeId;
  const leafTabId = tabs.get(leafNodeId);
  if (leafTabId === undefined) return { ok: false, restoredNodeIds: [...restored], reason: "restore produced no leaf" };
  await adapter.activate(leafTabId);
  if (portal.portalTabId !== null) await adapter.removePortalTab(portal.portalTabId);
  return { ok: true, restoredNodeIds: [...restored], leafNodeId, leafTabId };
  } catch (error) {
    return { ok: false, restoredNodeIds: [...restored], reason: error instanceof Error ? error.message : String(error) };
  }
}
