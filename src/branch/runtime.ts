import { emptyBranchGraph, type BranchGraph, type BranchNode, type BranchNodeId, type TabMetadata } from "./types";

export type BranchRuntimeOptions = { id?: () => string; now?: () => number };
export type CreatedTab = { tabId: number; openerTabId?: number; windowId?: number } & TabMetadata;

export class BranchRuntime {
  private graph: BranchGraph;
  private readonly makeId: () => string;
  private readonly clock: () => number;

  constructor(graph: BranchGraph = emptyBranchGraph(), options: BranchRuntimeOptions = {}) {
    this.graph = graph;
    this.makeId = options.id ?? (() => crypto.randomUUID());
    this.clock = options.now ?? (() => Date.now());
  }
  snapshot(): BranchGraph { return this.graph; }
  createRoot(questId: string, tabId: number, metadata: TabMetadata = {}): BranchNodeId {
    return this.createNode(questId, null, tabId, metadata);
  }
  onCreated(questId: string, tab: CreatedTab): BranchNodeId {
    const parent = tab.openerTabId === undefined ? null : this.graph.tabBindings[String(tab.openerTabId)]?.nodeId ?? null;
    return this.createNode(questId, parent, tab.tabId, tab);
  }
  onUpdated(tabId: number, metadata: TabMetadata): void {
    const binding = this.graph.tabBindings[String(tabId)];
    if (!binding) return;
    const node = this.graph.nodes[binding.nodeId];
    if (!node) return;
    if (metadata.url === node.url && metadata.title === node.title && metadata.faviconUrl === node.faviconUrl && metadata.windowId === undefined) return;
    const now = this.clock();
    this.graph = { ...this.graph, nodes: { ...this.graph.nodes, [node.id]: { ...node, ...metadata, updatedAt: now } } };
  }
  onRemoved(tabId: number): void {
    const key = String(tabId);
    const binding = this.graph.tabBindings[key];
    if (!binding) return;
    const tabBindings = { ...this.graph.tabBindings };
    delete tabBindings[key];
    const node = this.graph.nodes[binding.nodeId];
    const nodes = node && node.status === "live"
      ? { ...this.graph.nodes, [node.id]: { ...node, status: "closed" as const, updatedAt: this.clock() } }
      : this.graph.nodes;
    this.graph = { ...this.graph, nodes, tabBindings };
  }
  bind(tabId: number, nodeId: BranchNodeId, windowId: number | null = null): void {
    if (!this.graph.nodes[nodeId]) throw new Error(`Unknown branch node: ${nodeId}`);
    this.graph = { ...this.graph, tabBindings: { ...this.graph.tabBindings, [String(tabId)]: { nodeId, windowId } } };
  }
  setDisposition(nodeId: BranchNodeId, disposition: BranchNode["disposition"]): void {
    const node = this.graph.nodes[nodeId];
    if (!node) throw new Error(`Unknown branch node: ${nodeId}`);
    this.graph = { ...this.graph, nodes: { ...this.graph.nodes, [nodeId]: { ...node, disposition, updatedAt: this.clock() } } };
  }
  private createNode(questId: string, parentNodeId: BranchNodeId | null, tabId: number, metadata: TabMetadata): BranchNodeId {
    const now = this.clock();
    const id = this.makeId();
    const node: BranchNode = { id, questId, parentNodeId, url: metadata.url ?? null, title: metadata.title ?? null, faviconUrl: metadata.faviconUrl ?? null, disposition: "unclassified", status: "live", createdAt: now, updatedAt: now };
    this.graph = { nodes: { ...this.graph.nodes, [id]: node }, tabBindings: { ...this.graph.tabBindings, [String(tabId)]: { nodeId: id, windowId: metadata.windowId ?? null } } };
    return id;
  }
}
