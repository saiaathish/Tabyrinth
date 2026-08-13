import { assertPortalState, isPortalState } from "./invariants";
import { emptyPortalState, type PortalState } from "./types";
import type { BranchGraph } from "../branch/types";
import { isPortalQuest, type PortalQuest } from "./quest";

export const PORTAL_STATE_KEY = "tabyrinth.portals";
export const BRANCH_GRAPH_KEY = "tabyrinth.branchGraph";
export const PORTAL_SESSION_KEY = "tabyrinth.portalBindings";
export const PORTAL_QUESTS_KEY = "tabyrinth.portalQuests";
export type PortalSession = { portalTabIds: Record<string, number>; bindings: Record<string, { nodeId: string; windowId: number | null }> };

export const portalStorage = {
  async get(): Promise<PortalState> { const result = await chrome.storage.local.get(PORTAL_STATE_KEY); return isPortalState(result[PORTAL_STATE_KEY]) ? result[PORTAL_STATE_KEY] : emptyPortalState(); },
  async set(state: PortalState) { assertPortalState(state); await chrome.storage.local.set({ [PORTAL_STATE_KEY]: state }); },
  async getGraph(): Promise<BranchGraph | null> { const result = await chrome.storage.local.get(BRANCH_GRAPH_KEY); return result[BRANCH_GRAPH_KEY] && typeof result[BRANCH_GRAPH_KEY] === "object" ? result[BRANCH_GRAPH_KEY] as BranchGraph : null; },
  async setGraph(graph: BranchGraph) { await chrome.storage.local.set({ [BRANCH_GRAPH_KEY]: graph }); },
  async getSession(): Promise<PortalSession> { const result = await chrome.storage.session.get(PORTAL_SESSION_KEY); const value = result[PORTAL_SESSION_KEY]; return value && typeof value === "object" && "portalTabIds" in value && "bindings" in value ? value as PortalSession : { portalTabIds: {}, bindings: {} }; },
  async setSession(session: PortalSession) { await chrome.storage.session.set({ [PORTAL_SESSION_KEY]: session }); },
  async getQuests(): Promise<PortalQuest[]> {
    const result = await chrome.storage.local.get(PORTAL_QUESTS_KEY);
    return Array.isArray(result[PORTAL_QUESTS_KEY]) ? result[PORTAL_QUESTS_KEY].filter(isPortalQuest) : [];
  },
  async setQuests(quests: PortalQuest[]) {
    if (!quests.every(isPortalQuest)) throw new Error("INVALID_PORTAL_QUESTS");
    await chrome.storage.local.set({ [PORTAL_QUESTS_KEY]: quests });
  },
  async getActiveQuest(): Promise<PortalQuest | null> {
    const quests = await this.getQuests();
    for (let index = quests.length - 1; index >= 0; index -= 1) {
      if (quests[index]?.status === "active") return quests[index];
    }
    return null;
  },
  async getLatestQuest(): Promise<PortalQuest | null> {
    const quests = await this.getQuests();
    return quests.length ? quests[quests.length - 1] ?? null : null;
  },
  async putQuest(quest: PortalQuest) {
    if (!isPortalQuest(quest)) throw new Error("INVALID_PORTAL_QUEST");
    const quests = await this.getQuests();
    await this.setQuests([...quests.filter((candidate) => candidate.id !== quest.id), quest]);
  },
};
