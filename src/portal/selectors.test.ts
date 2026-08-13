import { describe, expect, it } from "vitest";
import { findBranchRoot, findNearestPathAncestor, getDescendants, topologicalSort, validateSubtreeOwnership } from "./selectors";
import type { BranchGraph, BranchNode } from "../branch/types";

const node = (id: string, parentNodeId: string | null, disposition: BranchNode["disposition"] = "unclassified", status: BranchNode["status"] = "live"): BranchNode => ({ id, questId: "q", parentNodeId, url: null, title: id, faviconUrl: null, disposition, status, createdAt: Number(id.replace(/\D/g, "") || 0), updatedAt: 0 });
const graph = (nodes: BranchNode[], tabBindings: BranchGraph["tabBindings"] = {}): BranchGraph => ({ nodes: Object.fromEntries(nodes.map((item) => [item.id, item])), tabBindings });

describe("pure Portal subtree selectors", () => {
  it("finds the nearest path ancestor and immediate branch root through a closed parent", () => {
    const g = graph([node("root", null, "path"), node("a", "root", "path", "closed"), node("b", "a"), node("c", "b")]);
    expect(findNearestPathAncestor(g, "c")?.id).toBe("a");
    expect(findBranchRoot(g, "c")?.id).toBe("b");
  });

  it("returns no branch for a path node or an unconnected node", () => {
    const g = graph([node("root", null, "path"), node("orphan", "missing")]);
    expect(findBranchRoot(g, "root")).toBeNull();
    expect(findNearestPathAncestor(g, "orphan")).toBeNull();
  });

  it("preserves sibling branches while collecting only the selected subtree", () => {
    const nodes = [node("root", null, "path"), node("a", "root"), node("b", "root"), node("a1", "a"), node("b1", "b")];
    expect(getDescendants(graph(nodes), "a").map((item) => item.id)).toEqual(["a", "a1"]);
  });

  it("sorts parent before child and is stable for siblings", () => {
    const items = [node("child", "parent"), node("sibling", null), node("parent", null)];
    expect(topologicalSort(items).map((item) => item.id)).toEqual(["parent", "child", "sibling"]);
  });

  it("fails closed for missing live bindings and bad windows while ignoring unrelated stale bindings", () => {
    const items = [node("a", null), node("b", "a")];
    expect(validateSubtreeOwnership(graph(items, { "1": { nodeId: "a", windowId: 2 }, "2": { nodeId: "b", windowId: null }, "3": { nodeId: "gone", windowId: 2 } }), items, "q")).toMatchObject({ ok: false, unsafeTabIds: ["2"] });
    expect(validateSubtreeOwnership(graph(items, { "1": { nodeId: "a", windowId: 2 }, "2": { nodeId: "b", windowId: 2 } }), items, "q")).toEqual({ ok: true, unsafeTabIds: [] });
  });

  it("fails closed for duplicate and out-of-subtree live bindings", () => {
    const items = [node("root", null, "path"), node("branch", "root"), node("sibling", "root")];
    expect(validateSubtreeOwnership(graph(items, { "1": { nodeId: "branch", windowId: 1 }, "2": { nodeId: "branch", windowId: 1 } }), [items[1]], "q").ok).toBe(false);
    expect(validateSubtreeOwnership(graph(items, { "1": { nodeId: "branch", windowId: 1 }, "2": { nodeId: "sibling", windowId: 1 } }), [items[1]], "q")).toEqual({ ok: true, unsafeTabIds: [] });
  });

  it("ignores origin and unrelated bindings while requiring every live subtree node", () => {
    const root = node("root", null, "path");
    const branch = node("branch", "root");
    const unrelated = node("other", null);
    const g = graph([root, branch, unrelated], {
      "1": { nodeId: root.id, windowId: 1 },
      "2": { nodeId: branch.id, windowId: 1 },
      "3": { nodeId: unrelated.id, windowId: 1 },
      "99": { nodeId: "stale-unrelated", windowId: 1 },
    });
    expect(validateSubtreeOwnership(g, [branch], "q")).toEqual({ ok: true, unsafeTabIds: [] });
    delete g.tabBindings["2"];
    expect(validateSubtreeOwnership(g, [branch], "q")).toEqual({ ok: false, unsafeTabIds: ["node:branch"], reason: "live subtree ownership is uncertain" });
  });
});
