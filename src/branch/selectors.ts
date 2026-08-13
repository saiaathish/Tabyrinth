import type { BranchGraph, BranchNode, BranchNodeId } from "./types";

export const getNode = (graph: BranchGraph, nodeId: BranchNodeId): BranchNode | null => graph.nodes[nodeId] ?? null;
export const getRoot = (graph: BranchGraph, questId: string): BranchNode | null =>
  Object.values(graph.nodes).find((node) => node.questId === questId && node.parentNodeId === null) ?? null;
export const getChildren = (graph: BranchGraph, nodeId: BranchNodeId): BranchNode[] =>
  Object.values(graph.nodes).filter((node) => node.parentNodeId === nodeId).sort((a, b) => a.createdAt - b.createdAt);
export const getAncestry = (graph: BranchGraph, nodeId: BranchNodeId): BranchNode[] => {
  const result: BranchNode[] = [];
  let current: BranchNode | undefined = graph.nodes[nodeId];
  while (current) {
    result.unshift(current);
    current = current.parentNodeId ? graph.nodes[current.parentNodeId] ?? undefined : undefined;
  }
  return result;
};
export const getNodeForTab = (graph: BranchGraph, tabId: number): BranchNode | null => {
  const binding = graph.tabBindings[String(tabId)];
  return binding ? getNode(graph, binding.nodeId) : null;
};
