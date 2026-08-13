import type { BranchGraph, BranchNode, BranchNodeId } from "../branch/types";

/** The closest path node on the durable ancestry chain, including `nodeId`. */
export const findNearestPathAncestor = (graph: BranchGraph, nodeId: BranchNodeId): BranchNode | null => {
  const seen = new Set<BranchNodeId>();
  let current: BranchNode | undefined = graph.nodes[nodeId];
  while (current && !seen.has(current.id)) {
    if (current.disposition === "path") return current;
    seen.add(current.id);
    current = current.parentNodeId ? graph.nodes[current.parentNodeId] : undefined;
  }
  return null;
};

/** The first node below the nearest path ancestor (the foldable branch root). */
export const findBranchRoot = (graph: BranchGraph, nodeId: BranchNodeId): BranchNode | null => {
  const nearestPath = findNearestPathAncestor(graph, nodeId);
  if (!nearestPath || nearestPath.id === nodeId) return null;
  let current: BranchNode | undefined = graph.nodes[nodeId];
  const seen = new Set<BranchNodeId>();
  while (current && current.parentNodeId !== nearestPath.id && !seen.has(current.id)) {
    seen.add(current.id);
    current = current.parentNodeId ? graph.nodes[current.parentNodeId] : undefined;
  }
  return current?.parentNodeId === nearestPath.id ? current : null;
};

export const getDescendants = (graph: BranchGraph, rootNodeId: BranchNodeId): BranchNode[] => {
  const root = graph.nodes[rootNodeId];
  if (!root) return [];
  const result: BranchNode[] = [];
  const queue = [root.id];
  const seen = new Set<BranchNodeId>();
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const node = graph.nodes[id];
    if (!node || node.questId !== root.questId) continue;
    result.push(node);
    Object.values(graph.nodes)
      .filter((candidate) => candidate.parentNodeId === id && candidate.questId === root.questId)
      .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
      .forEach((child) => queue.push(child.id));
  }
  return result;
};

export const topologicalSort = (nodes: BranchNode[]): BranchNode[] => {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const result: BranchNode[] = [];
  const visiting = new Set<BranchNodeId>();
  const visited = new Set<BranchNodeId>();
  const visit = (node: BranchNode): void => {
    if (visited.has(node.id)) return;
    if (visiting.has(node.id)) throw new Error("Cannot topologically sort a cyclic branch subtree");
    visiting.add(node.id);
    if (node.parentNodeId && byId.has(node.parentNodeId)) visit(byId.get(node.parentNodeId)!);
    visiting.delete(node.id);
    visited.add(node.id);
    result.push(node);
  };
  [...nodes].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id)).forEach(visit);
  return result;
};

export type SubtreeOwnership = { ok: true; unsafeTabIds: [] } | { ok: false; unsafeTabIds: string[]; reason: string };

export const validateSubtreeOwnership = (graph: BranchGraph, subtree: BranchNode[], questId: string): SubtreeOwnership => {
  const ids = new Set(subtree.map((node) => node.id));
  if (!subtree.length || subtree.some((node) => node.questId !== questId || !graph.nodes[node.id]))
    return { ok: false, unsafeTabIds: [], reason: "subtree is not owned by the active Quest" };
  const unsafeTabIds: string[] = [];
  const boundNodes = new Set<BranchNodeId>();
  for (const [tabId, binding] of Object.entries(graph.tabBindings)) {
    const node = graph.nodes[binding.nodeId];
    if (!node || !ids.has(binding.nodeId)) continue;
    if (node.questId !== questId || node.status !== "live") { unsafeTabIds.push(tabId); continue; }
    if (boundNodes.has(node.id)) unsafeTabIds.push(tabId);
    boundNodes.add(node.id);
    if (!Number.isInteger(binding.windowId) || binding.windowId! < 0) unsafeTabIds.push(tabId);
  }
  for (const node of subtree) if (node.status === "live" && !boundNodes.has(node.id)) unsafeTabIds.push(`node:${node.id}`);
  return unsafeTabIds.length ? { ok: false, unsafeTabIds, reason: "live subtree ownership is uncertain" } : { ok: true, unsafeTabIds: [] };
};
