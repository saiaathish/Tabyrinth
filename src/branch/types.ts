export type BranchNodeId = string;
export type BranchDisposition = "path" | "unclassified" | "loot" | "portal";
export type BranchStatus = "live" | "sealed" | "closed" | "portal";

export type BranchNode = {
  id: BranchNodeId;
  questId: string;
  parentNodeId: BranchNodeId | null;
  url: string | null;
  title: string | null;
  faviconUrl: string | null;
  disposition: BranchDisposition;
  status: BranchStatus;
  createdAt: number;
  updatedAt: number;
};

/** Runtime-only association. A tab ID is never used as a node identity. */
export type LiveTabBinding = { nodeId: BranchNodeId; windowId: number | null };

export type BranchGraph = {
  nodes: Record<BranchNodeId, BranchNode>;
  tabBindings: Record<string, LiveTabBinding>;
};

export type TabMetadata = {
  url?: string;
  title?: string;
  faviconUrl?: string;
  windowId?: number;
};

export const emptyBranchGraph = (): BranchGraph => ({ nodes: {}, tabBindings: {} });
