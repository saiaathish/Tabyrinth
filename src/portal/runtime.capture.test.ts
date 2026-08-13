import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BranchGraph, BranchNode } from "../branch/types";
import { capturePortalCreated, reconcilePortalSession } from "./runtime";
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

  it("inherits Quest ownership only from the explicit live opener", async () => {
    const unrelated = node("unrelated", "quest-wrong");
    const opener = node("opener", "quest-right");
    seed({ nodes: { unrelated, opener }, tabBindings: { "7": { nodeId: opener.id, windowId: 3 } } }, undefined, "quest-right");

    await capturePortalCreated({ id: 8, openerTabId: 7, windowId: 3, url: "https://child.test", title: "Child" } as chrome.tabs.Tab);

    const graph = storedGraph();
    const captured = graph.nodes[graph.tabBindings["8"]!.nodeId]!;
    expect(captured).toMatchObject({ questId: "quest-right", parentNodeId: opener.id, url: "https://child.test", title: "Child" });
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
