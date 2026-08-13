import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BranchGraph, BranchNode } from "../branch/types";
import { capturePortalCreated, capturePortalUpdated, reconcilePortalSession, trackCurrentPortalTab } from "./runtime";
import { BRANCH_GRAPH_KEY, PORTAL_QUESTS_KEY, PORTAL_SESSION_KEY, type PortalSession } from "./storage";

const local: Record<string, unknown> = {};
const session: Record<string, unknown> = {};

const node = (id: string, questId: string, status: BranchNode["status"] = "live"): BranchNode => ({
  id,
  questId,
  parentNodeId: null,
  url: `https://${id}.test`,
  title: id,
  faviconUrl: null,
  disposition: "path",
  status,
  createdAt: 1,
  updatedAt: 1,
});

function seed(graph: BranchGraph, bindings: PortalSession["bindings"] = graph.tabBindings, activeQuestId?: string) {
  local[BRANCH_GRAPH_KEY] = { nodes: graph.nodes, tabBindings: {} };
  session[PORTAL_SESSION_KEY] = { portalTabIds: {}, bindings } satisfies PortalSession;
  if (activeQuestId) local[PORTAL_QUESTS_KEY] = [{ id: activeQuestId, title: "Quest", rootNodeId: "root", currentNodeId: "root", status: "active", createdAt: 1, completedAt: null }];
}

function storedGraph(): BranchGraph {
  const graph = local[BRANCH_GRAPH_KEY] as BranchGraph;
  const bindings = (session[PORTAL_SESSION_KEY] as PortalSession).bindings;
  return { ...graph, tabBindings: bindings };
}

describe("Portal Chrome ancestry capture", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    for (const key of Object.keys(local)) delete local[key];
    for (const key of Object.keys(session)) delete session[key];
    vi.stubGlobal("chrome", {
      storage: {
        local: {
          get: async (key: string) => ({ [key]: local[key] }),
          set: async (value: Record<string, unknown>) => Object.assign(local, value),
        },
        session: {
          get: async (key: string) => ({ [key]: session[key] }),
          set: async (value: Record<string, unknown>) => Object.assign(session, value),
        },
      },
      tabs: { query: vi.fn(async () => { throw new Error("openerless capture must not query for an inferred parent"); }) },
    });
  });

  it("ignores an openerless active tab even when the window contains a Quest binding", async () => {
    const root = node("root", "quest-a");
    seed({ nodes: { root }, tabBindings: { "1": { nodeId: root.id, windowId: 7 } } });

    await capturePortalCreated({ id: 2, windowId: 7, active: true, url: "https://unrelated.test" } as chrome.tabs.Tab);

    expect(storedGraph()).toEqual({ nodes: { root }, tabBindings: { "1": { nodeId: root.id, windowId: 7 } } });
    expect(chrome.tabs.query).not.toHaveBeenCalled();
  });

  it("clears stale session bindings after a worker wake while retaining ancestry", async () => {
    const live = node("live", "quest-a");
    const stale = node("stale", "quest-a");
    seed({ nodes: { live, stale }, tabBindings: { "7": { nodeId: live.id, windowId: 3 }, "8": { nodeId: stale.id, windowId: 3 } } });
    (chrome.tabs.get as unknown as ReturnType<typeof vi.fn>) = vi.fn(async (id: number) => id === 7 ? { id, windowId: 3, url: live.url } : Promise.reject(new Error("missing tab")));

    await reconcilePortalSession();

    expect((session[PORTAL_SESSION_KEY] as PortalSession).bindings).toEqual({ "7": { nodeId: live.id, windowId: 3 } });
    expect((local[BRANCH_GRAPH_KEY] as BranchGraph).nodes.stale?.status).toBe("closed");
    expect((local[BRANCH_GRAPH_KEY] as BranchGraph).nodes.live?.status).toBe("live");
  });

  it("keeps a live binding when the same tab navigates and refreshes its durable metadata", async () => {
    const drifted = node("drifted", "quest-a");
    seed({ nodes: { drifted }, tabBindings: { "7": { nodeId: drifted.id, windowId: 3 } } });
    session[PORTAL_SESSION_KEY] = { portalTabIds: { saved: 90 }, bindings: { "7": { nodeId: drifted.id, windowId: 3 } } } satisfies PortalSession;
    (chrome.tabs.get as unknown as ReturnType<typeof vi.fn>) = vi.fn(async (id: number) => ({ id, windowId: 3, url: "https://different.test", title: "Different", favIconUrl: "icon" }));

    await reconcilePortalSession();

    expect((session[PORTAL_SESSION_KEY] as PortalSession).bindings).toEqual({ "7": { nodeId: drifted.id, windowId: 3 } });
    expect((session[PORTAL_SESSION_KEY] as PortalSession).portalTabIds).toEqual({ saved: 90 });
    expect((local[BRANCH_GRAPH_KEY] as BranchGraph).nodes.drifted?.status).toBe("live");
    expect((local[BRANCH_GRAPH_KEY] as BranchGraph).nodes.drifted).toMatchObject({ url: "https://different.test", title: "Different", faviconUrl: "icon" });
  });

  it("updates a bound node in place without erasing omitted Chrome metadata", async () => {
    const original = node("original", "quest-a");
    seed({ nodes: { original }, tabBindings: { "7": { nodeId: original.id, windowId: 3 } } });

    await capturePortalUpdated(7, { id: 7, windowId: 3, url: "https://google.test", title: "Google" } as chrome.tabs.Tab);

    const updated = (local[BRANCH_GRAPH_KEY] as BranchGraph).nodes.original;
    expect(updated).toMatchObject({ id: original.id, url: "https://google.test", title: "Google", faviconUrl: null, status: "live" });
    expect((session[PORTAL_SESSION_KEY] as PortalSession).bindings).toEqual({ "7": { nodeId: original.id, windowId: 3 } });
  });

  it("falls back to the live Quest root when currentNodeId has no live binding", async () => {
    const root = node("root", "quest-a");
    const stale = { ...node("stale", "quest-a"), parentNodeId: root.id };
    seed({ nodes: { root, stale }, tabBindings: { "7": { nodeId: root.id, windowId: 3 } } }, undefined, "quest-a");
    local[PORTAL_QUESTS_KEY] = [{ id: "quest-a", title: "Quest", rootNodeId: root.id, currentNodeId: stale.id, status: "active", createdAt: 1, completedAt: null }];
    (chrome.tabs.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 8, windowId: 3, url: "https://child.test", title: "Child" }]);
    (chrome.tabs.get as unknown as ReturnType<typeof vi.fn>) = vi.fn(async (id: number) => id === 7 ? { id, windowId: 3, url: root.url } : null);

    const result = await trackCurrentPortalTab();

    expect(result.graph.nodes[result.currentNodeId]?.parentNodeId).toBe(root.id);
  });

  it("does not confuse an unavailable parent with origin loss", async () => {
    const root = node("root", "quest-a");
    seed({ nodes: { root }, tabBindings: {} }, undefined, "quest-a");
    (chrome.tabs.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 8, windowId: 3, url: "https://child.test" }]);

    await expect(trackCurrentPortalTab()).rejects.toThrow("UNTRACKED_TAB_PARENT_UNAVAILABLE");
  });

  it("inherits Quest ownership only from the explicit live opener", async () => {
    const unrelated = node("unrelated", "quest-wrong");
    const opener = node("opener", "quest-right");
    seed({ nodes: { unrelated, opener }, tabBindings: { "7": { nodeId: opener.id, windowId: 3 } } }, undefined, "quest-right");

    await capturePortalCreated({ id: 8, openerTabId: 7, windowId: 3, url: "https://child.test", title: "Child" } as chrome.tabs.Tab);

    const graph = storedGraph();
    const captured = graph.nodes[graph.tabBindings["8"]!.nodeId]!;
    expect(captured).toMatchObject({ questId: "quest-right", parentNodeId: opener.id, url: "https://child.test", title: "Child" });
  });

  it("tracks an explicit openerless current tab under the active Quest node", async () => {
    const root = node("root", "quest-a");
    seed({ nodes: { root }, tabBindings: { "7": { nodeId: root.id, windowId: 3 } } }, undefined, "quest-a");
    (chrome.tabs.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 8, windowId: 3, url: "https://child.test", title: "Child" }]);
    (chrome.tabs.get as unknown as ReturnType<typeof vi.fn>) = vi.fn(async (id: number) => id === 7 ? { id, windowId: 3, url: root.url } : null);

    const result = await trackCurrentPortalTab();
    expect(result.quest.currentNodeId).toBe(result.currentNodeId);
    expect(result.graph.nodes[result.currentNodeId]).toMatchObject({ questId: "quest-a", parentNodeId: root.id, url: "https://child.test", title: "Child" });
    expect((session[PORTAL_SESSION_KEY] as PortalSession).bindings["8"]).toMatchObject({ nodeId: result.currentNodeId, windowId: 3 });
    expect((local[PORTAL_QUESTS_KEY] as Array<{ currentNodeId: string }>)[0]?.currentNodeId).toBe(result.currentNodeId);
  });

  it("rejects an unsupported active tab without changing the Quest graph", async () => {
    const root = node("root", "quest-a");
    seed({ nodes: { root }, tabBindings: { "7": { nodeId: root.id, windowId: 3 } } }, undefined, "quest-a");
    (chrome.tabs.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 8, windowId: 3, url: "chrome://extensions" }]);

    await expect(trackCurrentPortalTab()).rejects.toThrow("UNSUPPORTED_ACTIVE_TAB");
    expect(storedGraph()).toEqual({ nodes: { root }, tabBindings: { "7": { nodeId: root.id, windowId: 3 } } });
  });

  it("rejects an already tracked active tab", async () => {
    const root = node("root", "quest-a");
    seed({ nodes: { root }, tabBindings: { "7": { nodeId: root.id, windowId: 3 } } }, undefined, "quest-a");
    (chrome.tabs.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 7, windowId: 3, url: root.url }]);

    await expect(trackCurrentPortalTab()).rejects.toThrow("TAB_ALREADY_TRACKED");
  });

  it("rejects a current tab in a different window from the Quest parent", async () => {
    const root = node("root", "quest-a");
    seed({ nodes: { root }, tabBindings: { "7": { nodeId: root.id, windowId: 3 } } }, undefined, "quest-a");
    (chrome.tabs.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 8, windowId: 4, url: "https://child.test" }]);

    await expect(trackCurrentPortalTab()).rejects.toThrow("CROSS_WINDOW_PARENT");
    expect(storedGraph()).toEqual({ nodes: { root }, tabBindings: { "7": { nodeId: root.id, windowId: 3 } } });
  });

  it("ignores a live opener from a completed Quest", async () => {
    const opener = node("opener", "quest-done");
    seed({ nodes: { opener }, tabBindings: { "7": { nodeId: opener.id, windowId: 3 } } });
    local[PORTAL_QUESTS_KEY] = [{ id: "quest-done", title: "Finished", rootNodeId: opener.id, currentNodeId: null, status: "complete", createdAt: 1, completedAt: 2 }];

    await capturePortalCreated({ id: 8, openerTabId: 7, windowId: 3, url: "https://child.test" } as chrome.tabs.Tab);

    expect(storedGraph().tabBindings["8"]).toBeUndefined();
  });

  it.each([
    ["missing opener node", { nodeId: "missing", windowId: 3 }, undefined, 3],
    ["sealed opener", { nodeId: "sealed", windowId: 3 }, node("sealed", "quest-a", "sealed"), 3],
    ["cross-window opener", { nodeId: "opener", windowId: 3 }, node("opener", "quest-a"), 4],
  ])("ignores a child with a %s", async (_label, binding, opener, childWindowId) => {
    seed({ nodes: opener ? { [opener.id]: opener } : {}, tabBindings: { "7": binding } }, undefined, opener?.questId);

    await capturePortalCreated({ id: 8, openerTabId: 7, windowId: childWindowId, url: "https://child.test" } as chrome.tabs.Tab);

    expect(storedGraph().tabBindings["8"]).toBeUndefined();
  });
});
