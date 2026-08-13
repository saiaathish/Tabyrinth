import { describe, expect, it } from "vitest";
import { restorePortal, type RestoreAdapter } from "./restore-runtime";
import type { BranchGraph, BranchNode } from "../branch/types";
import type { Portal } from "./types";

const node = (id: string, parentNodeId: string | null, url: string): BranchNode => ({ id, questId: "q", parentNodeId, url, title: id, faviconUrl: null, disposition: "unclassified", status: "sealed", createdAt: Number(id.slice(1)), updatedAt: 1 });
const setup = (nodes: BranchNode[], bindings: BranchGraph["tabBindings"] = {}, currentNodeId = nodes.at(-1)!.id): { portal: Portal; graph: BranchGraph; calls: string[]; adapter: RestoreAdapter } => {
  const calls: string[] = []; let next = 20; const map = new Map<number, { id: number; windowId: number; url: string }>();
  const graph = { nodes: Object.fromEntries(nodes.map((n) => [n.id, n])), tabBindings: bindings };
  const portal = { id: "p", questId: "q", title: "P", originNodeId: "o", branchRootNodeId: nodes[0].id, nodeIds: nodes.map((n) => n.id), portalNodeId: "pn", portalTabId: 99, status: "sealed", createdAt: 1, updatedAt: 1, snapshot: { id: "p", questId: "q", originNodeId: "o", branchRootNodeId: nodes[0].id, currentNodeId, nodeIds: nodes.map((n) => n.id), nodes: Object.fromEntries(nodes.map((n) => [n.id, n])), createdAt: 1 }, restoreStatus: "idle", restoredNodeIds: [], error: null } as Portal;
  const adapter: RestoreAdapter = { getTab: async (id) => map.get(id) ?? null, createTab: async ({ openerTabId, url }) => { const tab = { id: next++, windowId: 1, url }; map.set(tab.id, tab); calls.push(`create:${tab.id}:${openerTabId ?? ""}`); return tab; }, bind: (n, t) => { calls.push(`bind:${n}:${t}`); }, clearBinding: (t) => { calls.push(`clear:${t}`); }, activate: async (t) => { calls.push(`activate:${t}`); }, removePortalTab: async (t) => { calls.push(`remove:${t}`); } };
  return { portal, graph, calls, adapter };
};

describe("Portal restore adapter", () => {
  it("restores parent before child, passes opener, activates leaf, then removes Portal", async () => {
    const s = setup([node("n2", "n1", "https://same.test"), node("n1", null, "https://same.test")], {}, "n2");
    const result = await restorePortal(s.portal, s.graph, s.adapter);
    expect(result.ok).toBe(true); expect(s.calls).toEqual(["create:20:", "bind:n1:20", "create:21:20", "bind:n2:21", "activate:21", "remove:99"]);
  });
  it("dedupes a valid stable binding and clears stale bindings on retryable failure", async () => {
    const s = setup([node("n1", null, "https://same.test"), node("n2", "n1", "https://same.test")], { "7": { nodeId: "n1", windowId: 1 }, "8": { nodeId: "n2", windowId: 1 } });
    const result = await restorePortal(s.portal, s.graph, { ...s.adapter, getTab: async (id) => id === 7 ? { id, windowId: 1, url: "https://same.test" } : null, createTab: async () => { throw new Error("temporary Chrome failure"); } });
    expect(result.ok).toBe(false); expect(s.calls).toContain("clear:8"); expect(s.calls).not.toContain("remove:99");
  });
  it("does not recreate a valid stable binding", async () => {
    const s = setup([node("n1", null, "https://same.test")], { "7": { nodeId: "n1", windowId: 1 } });
    const result = await restorePortal(s.portal, s.graph, { ...s.adapter, getTab: async (id) => ({ id, windowId: 1, url: "https://same.test" }) });
    expect(result.ok).toBe(true);
    expect(s.calls).toEqual(["bind:n1:7", "activate:7", "remove:99"]);
  });
  it("uses the live origin as opener for the restored branch root", async () => {
    const branch = node("n1", "o", "https://same.test");
    const s = setup([branch], { "7": { nodeId: "o", windowId: 1 } });
    s.graph.nodes.o = node("o", null, "https://origin.test");
    const result = await restorePortal(s.portal, s.graph, { ...s.adapter, getTab: async (id) => ({ id, windowId: 1, url: "https://origin.test" }) });
    expect(result.ok).toBe(true);
    expect(s.calls).toEqual(["create:20:7", "bind:n1:20", "activate:20", "remove:99"]);
  });
  it("returns a retryable failure when the origin lookup fails", async () => {
    const s = setup([node("n1", "o", "https://same.test")], { "7": { nodeId: "o", windowId: 1 } });
    const result = await restorePortal(s.portal, s.graph, { ...s.adapter, getTab: async () => { throw new Error("origin lookup failed"); } });
    expect(result).toEqual({ ok: false, restoredNodeIds: [], reason: "origin lookup failed" });
    expect(s.calls).not.toContain("remove:99");
  });

  it("activates the captured current node rather than the last topological sibling", async () => {
    const branch = node("n1", "o", "https://branch.test");
    const current = node("n2", "n1", "https://current.test");
    const laterSibling = node("n3", "n1", "https://later.test");
    const s = setup([branch, current, laterSibling], {}, current.id);
    const result = await restorePortal(s.portal, s.graph, s.adapter);
    expect(result).toMatchObject({ ok: true, leafNodeId: current.id, leafTabId: 21 });
    expect(s.calls.at(-2)).toBe("activate:21");
  });

  it("reports only nodes restored during this retry", async () => {
    const s = setup([node("n1", null, "https://same.test")]);
    s.portal.restoredNodeIds = ["stale-progress"];
    const result = await restorePortal(s.portal, s.graph, s.adapter);
    expect(result.restoredNodeIds).toEqual(["n1"]);
  });

  it("clears a binding whose live tab has drifted to a different URL before recreating", async () => {
    const s = setup([node("n1", null, "https://expected.test")], { "7": { nodeId: "n1", windowId: 1 } });
    const result = await restorePortal(s.portal, s.graph, { ...s.adapter, getTab: async (id) => ({ id, windowId: 1, url: "https://wrong.test" }) });
    expect(result).toMatchObject({ ok: true, leafTabId: 20 });
    expect(s.calls).toEqual(["clear:7", "create:20:", "bind:n1:20", "activate:20", "remove:99"]);
  });

  it("clears a binding whose live tab moved windows before recreating", async () => {
    const s = setup([node("n1", null, "https://expected.test")], { "7": { nodeId: "n1", windowId: 1 } });
    const result = await restorePortal(s.portal, s.graph, { ...s.adapter, getTab: async (id) => ({ id, windowId: 2, url: "https://expected.test" }) });
    expect(result).toMatchObject({ ok: true, leafTabId: 20 });
    expect(s.calls[0]).toBe("clear:7");
  });
});
