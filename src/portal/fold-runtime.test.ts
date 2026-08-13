import { describe, expect, it } from "vitest";
import { foldBranch, FOLD_BLOCKED_UNSAFE_TAB, MISSING_ORIGIN } from "./fold-runtime";
import type { BranchGraph } from "../branch/types";

const node = (id: string, parentNodeId: string | null, disposition: "path" | "unclassified" = "unclassified") => ({ id, questId: "q", parentNodeId, url: `https://${id}`, title: id, faviconUrl: null, disposition, status: "live" as const, createdAt: 1, updatedAt: 1 });
const setup = () => {
  const graph: BranchGraph = { nodes: { o: node("o", null, "path"), b: node("b", "o"), c: node("c", "b") }, tabBindings: { "1": { nodeId: "o", windowId: 7 }, "2": { nodeId: "b", windowId: 7 }, "3": { nodeId: "c", windowId: 7 } } };
  const calls: string[] = [];
  const chrome = { get: async (id: number) => ({ id, index: id - 1, windowId: 7, url: `https://${id === 1 ? "o" : id === 2 ? "b" : "c"}` }), query: async () => [{ id: 1, index: 0, windowId: 7 }, { id: 2, index: 1, windowId: 7 }, { id: 3, index: 2, windowId: 7 }], create: async () => { calls.push("create"); return { id: 9, index: 3, windowId: 7, url: "portal" }; }, move: async () => { calls.push("move"); }, remove: async (ids: number[]) => { calls.push(`remove:${ids.join(",")}`); }, activate: async () => { calls.push("activate"); } };
  return { graph, chrome, calls };
};

describe("safe Portal fold runtime", () => {
  it("persists before creating and closes only the validated subtree", async () => {
    const { graph, chrome, calls } = setup(); let persisted = false;
    const result = await foldBranch({ graph, questId: "q", currentNodeId: "c", chrome, persist: async () => { persisted = true; calls.push("persist"); }, clearBindings: () => { calls.push("clear"); } });
    expect(persisted).toBe(true); expect(result.portal.title).toBe("b · 2"); expect(calls).toEqual(["persist", "create", "move", "remove:2,3", "clear", "activate"]); expect(result.closedTabIds).toEqual([2, 3]);
  });
  it("closes zero tabs when validation fails", async () => {
    const { graph, chrome, calls } = setup(); const get = chrome.get; chrome.get = async (id) => ({ ...(await get(id)), windowId: id === 3 ? 8 : 7 });
    await expect(foldBranch({ graph, questId: "q", currentNodeId: "c", chrome, persist: async () => { calls.push("persist"); }, clearBindings: () => { } })).rejects.toThrow(FOLD_BLOCKED_UNSAFE_TAB);
    expect(calls).toEqual([]);
  });
  it("keeps the snapshot durable when portal creation fails", async () => {
    const { graph, chrome, calls } = setup(); chrome.create = async () => { throw new Error("create failed"); };
    await expect(foldBranch({ graph, questId: "q", currentNodeId: "c", chrome, persist: async () => { calls.push("persist"); }, clearBindings: () => { } })).rejects.toThrow("create failed");
    expect(calls).toEqual(["persist"]);
  });
  it("reports missing origin without touching tabs", async () => {
    const { graph, chrome, calls } = setup(); delete graph.tabBindings["1"];
    await expect(foldBranch({ graph, questId: "q", currentNodeId: "c", chrome, persist: async () => { calls.push("persist"); }, clearBindings: () => { } })).rejects.toThrow(MISSING_ORIGIN);
    expect(calls).toEqual([]);
  });
  it("cleans up a Portal created after the origin disappears", async () => {
    const { graph, chrome, calls } = setup();
    const get = chrome.get;
    chrome.get = async (id) => { if (id === 1) throw new Error("origin closed"); return get(id); };
    await expect(foldBranch({ graph, questId: "q", currentNodeId: "c", chrome, persist: async () => { calls.push("persist"); }, clearBindings: () => undefined })).rejects.toThrow(MISSING_ORIGIN);
    expect(calls).toEqual(["persist", "create", "remove:9"]);
  });

  it.each([
    ["a missing live binding", (graph: BranchGraph) => { delete graph.tabBindings["3"]; }],
    ["a duplicate live binding", (graph: BranchGraph) => { graph.tabBindings["4"] = { nodeId: "c", windowId: 7 }; }],
    ["an unknown window", (graph: BranchGraph) => { graph.tabBindings["3"] = { nodeId: "c", windowId: null }; }],
    ["a cross-Quest subtree node", (graph: BranchGraph) => { graph.nodes.b = { ...graph.nodes.b, questId: "other" }; }],
  ])("touches no Chrome tabs when ownership has %s", async (_label, mutate) => {
    const { graph, chrome, calls } = setup();
    mutate(graph);
    await expect(foldBranch({ graph, questId: "q", currentNodeId: "c", chrome, persist: async () => { calls.push("persist"); }, clearBindings: () => { calls.push("clear"); } })).rejects.toThrow(FOLD_BLOCKED_UNSAFE_TAB);
    expect(calls).toEqual([]);
  });

  it("ignores unrelated and same-URL bindings outside the selected subtree", async () => {
    const { graph, chrome, calls } = setup();
    graph.nodes.u = { ...node("u", null), url: graph.nodes.c.url };
    graph.tabBindings["8"] = { nodeId: "u", windowId: 7 };
    const result = await foldBranch({ graph, questId: "q", currentNodeId: "c", chrome, persist: async () => { calls.push("persist"); }, clearBindings: () => { calls.push("clear"); } });
    expect(result.closedTabIds).toEqual([2, 3]);
    expect(calls).toContain("remove:2,3");
  });

  it("touches no Chrome tabs when a bound subtree tab has navigated to a different URL", async () => {
    const { graph, chrome, calls } = setup();
    const get = chrome.get;
    chrome.get = async (id) => id === 3 ? { ...(await get(id)), url: "https://drifted.test" } : get(id);
    await expect(foldBranch({ graph, questId: "q", currentNodeId: "c", chrome, persist: async () => { calls.push("persist"); }, clearBindings: () => { calls.push("clear"); } })).rejects.toThrow(FOLD_BLOCKED_UNSAFE_TAB);
    expect(calls).toEqual([]);
  });

  it("removes only the newly-created Portal if the origin navigates after persistence", async () => {
    const { graph, chrome, calls } = setup();
    const get = chrome.get;
    let originReads = 0;
    chrome.get = async (id) => id === 1 && ++originReads > 0 ? { ...(await get(id)), url: "https://origin-drifted.test" } : get(id);
    await expect(foldBranch({ graph, questId: "q", currentNodeId: "c", chrome, persist: async () => { calls.push("persist"); }, clearBindings: () => { calls.push("clear"); } })).rejects.toThrow(MISSING_ORIGIN);
    expect(calls).toEqual(["persist", "create", "remove:9"]);
  });
});
