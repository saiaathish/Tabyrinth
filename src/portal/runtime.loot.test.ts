import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BranchGraph } from "../branch/types";
import { BRANCH_GRAPH_KEY, LOOT_KEY, PORTAL_QUESTS_KEY, PORTAL_SESSION_KEY, type PortalSession } from "./storage";

const node = { id: "n", questId: "q", parentNodeId: "origin", url: "https://loot.test/page", title: "Useful page", faviconUrl: "https://loot.test/icon.png", disposition: "unclassified" as const, status: "live" as const, createdAt: 1, updatedAt: 1 };
const origin = { ...node, id: "origin", parentNodeId: null, url: "https://origin.test", title: "Origin", disposition: "path" as const };

function setup(options: { tabUrl?: string; bindingWindowId?: number | null; tabWindowId?: number; duplicate?: boolean } = {}) {
  const local: Record<string, unknown> = {
    [BRANCH_GRAPH_KEY]: { nodes: { origin, n: node }, tabBindings: {} } satisfies BranchGraph,
    [PORTAL_QUESTS_KEY]: [{ id: "q", title: "Research", rootNodeId: "origin", currentNodeId: "n", status: "active", createdAt: 1, completedAt: null }],
  };
  const session: Record<string, unknown> = {
    [PORTAL_SESSION_KEY]: {
      portalTabIds: {},
      bindings: {
        "7": { nodeId: "n", windowId: options.bindingWindowId === undefined ? 1 : options.bindingWindowId },
        ...(options.duplicate ? { "8": { nodeId: "n", windowId: 1 } } : {}),
      },
    } satisfies PortalSession,
  };
  const calls: string[] = [];
  const chromeMock = {
    storage: {
      local: { get: async (key: string) => ({ [key]: local[key] }), set: async (value: Record<string, unknown>) => { calls.push(Object.hasOwn(value, LOOT_KEY) ? "persist-loot" : "persist-local"); Object.assign(local, value); } },
      session: { get: async (key: string) => ({ [key]: session[key] }), set: async (value: Record<string, unknown>) => { calls.push("persist-session"); Object.assign(session, value); } },
    },
    tabs: {
      get: async (id: number) => ({ id, windowId: options.tabWindowId ?? 1, url: options.tabUrl ?? node.url }),
      remove: async (id: number) => { calls.push(`remove:${id}`); },
    },
  };
  vi.stubGlobal("chrome", chromeMock);
  vi.stubGlobal("crypto", { randomUUID: () => "loot-id" });
  return { local, session, calls };
}

describe("Portal Loot runtime", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("trims an optional note and marks the durable node as Loot without closing", async () => {
    const state = setup();
    const { savePortalLoot } = await import("./runtime");
    const item = await savePortalLoot("n", "  decisive evidence  ");
    expect(item).toMatchObject({ id: "loot-id", sourceNodeId: "n", note: "decisive evidence" });
    expect((state.local[LOOT_KEY] as unknown[])).toEqual([item]);
    expect(((state.local[BRANCH_GRAPH_KEY] as BranchGraph).nodes.n)).toMatchObject({ disposition: "loot", status: "live" });
    expect(state.calls).not.toContain("remove:7");
  });

  it("persists Loot before closing exactly one validated bound tab and clears its binding", async () => {
    const state = setup();
    const { savePortalLoot } = await import("./runtime");
    await savePortalLoot("n", "keep", true);
    expect(state.calls.indexOf("persist-loot")).toBeLessThan(state.calls.indexOf("remove:7"));
    expect(state.calls.filter((call) => call.startsWith("remove:"))).toEqual(["remove:7"]);
    expect(((state.session[PORTAL_SESSION_KEY] as PortalSession).bindings)).toEqual({});
    expect(((state.local[BRANCH_GRAPH_KEY] as BranchGraph).nodes.n)).toMatchObject({ disposition: "loot", status: "closed" });
    expect((state.local[PORTAL_QUESTS_KEY] as Array<{ currentNodeId: string | null }>)[0].currentNodeId).toBe("origin");
  });

  it.each([
    ["URL drift", { tabUrl: "https://wrong.test" }],
    ["window drift", { tabWindowId: 2 }],
    ["unknown binding window", { bindingWindowId: null }],
    ["duplicate bindings", { duplicate: true }],
  ])("fails closed without persisting or closing for %s", async (_label, options) => {
    const state = setup(options);
    const { LOOT_CLOSE_UNSAFE, savePortalLoot } = await import("./runtime");
    await expect(savePortalLoot("n", undefined, true)).rejects.toThrow(LOOT_CLOSE_UNSAFE);
    expect(state.local[LOOT_KEY]).toBeUndefined();
    expect(state.calls.some((call) => call.startsWith("remove:"))).toBe(false);
  });
});
