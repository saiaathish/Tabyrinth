import type { BranchGraph, BranchNode } from "../branch/types";

export type PortalStatus = "sealed" | "restoring" | "open" | "error";
export type RestoreStatus = "idle" | "partial" | "complete";
export type PortalSnapshot = {
  id: string;
  questId: string;
  originNodeId: string;
  branchRootNodeId: string;
  currentNodeId: string;
  nodeIds: string[];
  nodes: Record<string, BranchNode>;
  createdAt: number;
};
export type Portal = { id: string; questId: string; title: string; originNodeId: string; branchRootNodeId: string; nodeIds: string[]; portalNodeId: string; portalTabId: number | null; status: PortalStatus; createdAt: number; updatedAt: number; snapshot: PortalSnapshot; restoreStatus: RestoreStatus; restoredNodeIds: string[]; error: string | null };
export type FoldPhase = "snapshot-persisted" | "portal-open" | "tabs-closing" | "sealed" | "blocked";
export type FoldTransaction = { portalId: string; phase: FoldPhase; closeableNodeIds: string[] };
export type PortalState = { portals: Record<string, Portal>; folds: Record<string, FoldTransaction> };
export type LootItem = { id: string; questId: string; sourceNodeId: string; url: string; title: string; faviconUrl: string | null; note?: string; createdAt: number };
export const emptyPortalState = (): PortalState => ({ portals: {}, folds: {} });
export type PortalAction =
  | { type: "SNAPSHOT_PERSISTED"; portal: Portal; closeableNodeIds: string[] }
  | { type: "PORTAL_OPENED"; portalId: string; portalTabId: number }
  | { type: "CLOSE_STARTED"; portalId: string }
  | { type: "BRANCH_SEALED"; portalId: string }
  | { type: "FOLD_BLOCKED"; portalId: string; reason: string }
  | { type: "RESTORE_STARTED"; portalId: string }
  | { type: "RESTORE_PROGRESS"; portalId: string; nodeId: string }
  | { type: "RESTORE_FAILED"; portalId: string; reason: string }
  | { type: "PORTAL_TAB_LOST"; portalId: string }
  | { type: "RESTORE_COMPLETED"; portalId: string };
export function createPortalSnapshot(
  graph: BranchGraph,
  id: string,
  questId: string,
  originNodeId: string,
  branchRootNodeId: string,
  currentNodeId: string,
  nodeIds: string[],
  createdAt: number,
): PortalSnapshot {
  if (!nodeIds.includes(currentNodeId)) throw new Error("snapshot current node is outside the branch");
  const nodes: Record<string, BranchNode> = {};
  for (const nodeId of nodeIds) { const node = graph.nodes[nodeId]; if (!node || node.questId !== questId) throw new Error("snapshot node is missing or belongs to another quest"); nodes[nodeId] = { ...node }; }
  return { id, questId, originNodeId, branchRootNodeId, currentNodeId, nodeIds: [...nodeIds], nodes, createdAt };
}
