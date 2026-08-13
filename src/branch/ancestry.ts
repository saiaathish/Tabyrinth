import { BranchRuntime } from "./runtime";
import type { BranchNode } from "./types";

export type AncestryNode = BranchNode & { liveTabId: number | null };

export function createAncestryCapture() {
  const runtime = new BranchRuntime();
  const historical = new Map<number, string>();
  const capture = {
    onCreated(tab: chrome.tabs.Tab): AncestryNode {
      const id = runtime.onCreated("default", { tabId: tab.id!, openerTabId: tab.openerTabId, windowId: tab.windowId, url: tab.url, title: tab.title, faviconUrl: tab.favIconUrl });
      historical.set(tab.id!, id);
      return capture.get(id);
    },
    onUpdated(tabId: number, metadata: { url?: string; title?: string; favIconUrl?: string }): AncestryNode | null {
      if (!runtime.snapshot().tabBindings[String(tabId)]) return null;
      runtime.onUpdated(tabId, { ...metadata, faviconUrl: metadata.favIconUrl });
      return capture.get(historical.get(tabId)!);
    },
    onRemoved(tabId: number): void { runtime.onRemoved(tabId); },
    nodeForTab(tabId: number): string | null { return historical.get(tabId) ?? null; },
    get(id: string): AncestryNode { const node = runtime.snapshot().nodes[id]; const liveTabId = Object.entries(runtime.snapshot().tabBindings).find(([, binding]) => binding.nodeId === id)?.[0]; return { ...node, liveTabId: liveTabId === undefined ? null : Number(liveTabId) }; },
    nodes(): AncestryNode[] { return Object.keys(runtime.snapshot().nodes).map((id) => capture.get(id)); },
  };
  return capture;
}
