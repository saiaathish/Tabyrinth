import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BranchGraph } from "../branch/types";
import { BRANCH_GRAPH_KEY, LOOT_KEY, PORTAL_SESSION_KEY, PORTAL_STATE_KEY, type PortalSession } from "./storage";
import { createPortalSnapshot, type Portal, type PortalState } from "./types";

const node = { id: "branch", questId: "q", parentNodeId: "origin", url: "https://branch.test", title: "Branch", faviconUrl: null, disposition: "portal" as const, status: "sealed" as const, createdAt: 1, updatedAt: 1 };
const graph = { nodes: { branch: node }, tabBindings: {} } satisfies BranchGraph;

function portal(id: string, portalTabId: number | null, status: Portal["status"] = "sealed"): Portal {
  const snapshot = createPortalSnapshot(graph, id, "q", "origin", "branch", "branch", ["branch"], 1);
  return { id, questId: "q", title: id, originNodeId: "origin", branchRootNodeId: "branch", nodeIds: ["branch"], portalNodeId: `${id}:portal`, portalTabId, status, createdAt: 1, updatedAt: 1, snapshot, restoreStatus: "idle", restoredNodeIds: [], error: null };
}

function setup(options: { tabUrl?: string; status?: Portal["status"] } = {}) {
  const target = portal("p", 90, options.status);
  const other = portal("other", 91);
  const portalState: PortalState = {
    portals: { p: target, other },
    folds: {
      p: { portalId: "p", phase: "sealed", closeableNodeIds: ["branch"] },
      other: { portalId: "other", phase: "sealed", closeableNodeIds: ["branch"] },
    },
  };
  const branchGraph = { nodes: { branch: node }, tabBindings: {} } satisfies BranchGraph;
  const loot = [{ id: "loot", questId: "q", sourceNodeId: "branch", url: "https://branch.test", title: "Loot", faviconUrl: null, createdAt: 1 }];
  const local: Record<string, unknown> = { [PORTAL_STATE_KEY]: portalState, [BRANCH_GRAPH_KEY]: branchGraph, [LOOT_KEY]: loot };
  const portalSession: PortalSession = { portalTabIds: { p: 90, other: 91 }, bindings: { "7": { nodeId: "branch", windowId: 1 } } };
  const session: Record<string, unknown> = { [PORTAL_SESSION_KEY]: portalSession };
  const calls: string[] = [];
  vi.stubGlobal("chrome", {
    runtime: { getURL: (path: string) => `chrome-extension://test/${path}` },
    storage: {
      local: { get: async (key: string) => ({ [key]: local[key] }), set: async (value: Record<string, unknown>) => { calls.push("persist-local"); Object.assign(local, value); } },
      session: { get: async (key: string) => ({ [key]: session[key] }), set: async (value: Record<string, unknown>) => { calls.push("persist-session"); Object.assign(session, value); } },
    },
    tabs: {
      get: async (id: number) => ({ id, url: options.tabUrl ?? "chrome-extension://test/portal.html?portal=p", windowId: 1 }),
      remove: async (id: number) => { calls.push(`remove:${id}`); },
    },
  });
  return { local, session, calls, branchGraph, loot };
}

describe("Portal deletion runtime", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("deletes only the target durable Portal and closes its exact extension tab after persistence", async () => {
    const state = setup();
    const { deletePortal } = await import("./runtime");
    await expect(deletePortal("p")).resolves.toEqual({ portalId: "p", closedPortalTab: true });
    const portals = state.local[PORTAL_STATE_KEY] as PortalState;
    expect(Object.keys(portals.portals)).toEqual(["other"]);
    expect(Object.keys(portals.folds)).toEqual(["other"]);
    expect((state.session[PORTAL_SESSION_KEY] as PortalSession).portalTabIds).toEqual({ other: 91 });
    expect((state.session[PORTAL_SESSION_KEY] as PortalSession).bindings).toEqual({ "7": { nodeId: "branch", windowId: 1 } });
    expect(state.local[BRANCH_GRAPH_KEY]).toEqual(state.branchGraph);
    expect(state.local[LOOT_KEY]).toEqual(state.loot);
    expect(state.calls).toEqual(["persist-local", "persist-session", "remove:90"]);
  });

  it("deletes durable state but never closes a stale or mismatched tab ID", async () => {
    const state = setup({ tabUrl: "https://unrelated.test" });
    const { deletePortal } = await import("./runtime");
    await expect(deletePortal("p")).resolves.toEqual({ portalId: "p", closedPortalTab: false });
    expect(state.calls.some((call) => call.startsWith("remove:"))).toBe(false);
    expect((state.local[PORTAL_STATE_KEY] as PortalState).portals.p).toBeUndefined();
  });

  it("rejects deletion while restore is in progress without mutating anything", async () => {
    const state = setup({ status: "restoring" });
    const { deletePortal } = await import("./runtime");
    await expect(deletePortal("p")).rejects.toThrow("RESTORE_ALREADY_IN_PROGRESS");
    expect(state.calls).toEqual([]);
    expect((state.local[PORTAL_STATE_KEY] as PortalState).portals.p).toBeDefined();
  });

  it("does not strand a Portal in restoring when authoritative graph storage fails", async () => {
    const state = setup();
    const originalGet = (chrome.storage.local as unknown as { get: (key: string) => Promise<unknown> }).get;
    vi.stubGlobal("chrome", {
      ...(chrome as unknown as object),
      storage: {
        ...(chrome.storage as unknown as object),
        local: {
          ...(chrome.storage.local as unknown as object),
          get: async (key: string) => key === "tabyrinth.branchGraph" ? Promise.reject(new Error("storage unavailable")) : originalGet(key),
        },
      },
    });
    const { unsealPortal } = await import("./runtime");
    await expect(unsealPortal("p")).rejects.toThrow("storage unavailable");
    expect(state.calls).toEqual([]);
    expect((state.local[PORTAL_STATE_KEY] as PortalState).portals.p.status).toBe("sealed");
  });
});
