import type { PortalSnapshot, PortalState } from "./types";

export function assertPortalSnapshot(snapshot: PortalSnapshot): void {
  if (new Set(snapshot.nodeIds).size !== snapshot.nodeIds.length) throw new Error("duplicate snapshot node");
  if (!snapshot.nodeIds.includes(snapshot.currentNodeId)) throw new Error("snapshot current node is outside the branch");
  for (const id of snapshot.nodeIds) {
    const node = snapshot.nodes[id];
    if (!node || node.id !== id || node.questId !== snapshot.questId) throw new Error("invalid snapshot relationship");
    if (node.url?.startsWith("javascript:")) throw new Error("invalid snapshot URL");
    if (node.parentNodeId !== null && !snapshot.nodes[node.parentNodeId] && node.id !== snapshot.branchRootNodeId) throw new Error("missing snapshot parent");
  }
}
export function assertPortalState(state: PortalState): void { for (const portal of Object.values(state.portals)) { if (portal.id !== portal.snapshot.id || portal.nodeIds.join("\0") !== portal.snapshot.nodeIds.join("\0")) throw new Error("portal snapshot mismatch"); assertPortalSnapshot(portal.snapshot); } for (const fold of Object.values(state.folds)) if (fold.phase === "tabs-closing" && !state.portals[fold.portalId]) throw new Error("close has no durable portal"); }
export const isPortalState = (value: unknown): value is PortalState => { try { assertPortalState(value as PortalState); return true; } catch { return false; } };
