import { describe, expect, it } from "vitest";
import { BranchRuntime } from "./runtime";
import { getAncestry, getNodeForTab } from "./selectors";

const setup = () => { let n = 0; let time = 100; return { runtime: new BranchRuntime(undefined, { id: () => `node-${++n}`, now: () => time++ }) }; };

describe("stable branch graph runtime", () => {
  it("creates a root with a UUID identity", () => { const { runtime } = setup(); const id = runtime.createRoot("q", 1, { url: "https://a" }); expect(id).toBe("node-1"); expect(runtime.snapshot().nodes[id].parentNodeId).toBeNull(); });
  it("resolves immediate opener and keeps parent closure", () => { const { runtime } = setup(); const a = runtime.createRoot("q", 1); const b = runtime.onCreated("q", { tabId: 2, openerTabId: 1 }); const c = runtime.onCreated("q", { tabId: 3, openerTabId: 2 }); runtime.onRemoved(1); expect(getAncestry(runtime.snapshot(), c).map((node) => node.id)).toEqual([a, b, c]); expect(runtime.snapshot().nodes[a].status).toBe("closed"); });
  it("hydrates late metadata without creating duplicates", () => { const { runtime } = setup(); const id = runtime.onCreated("q", { tabId: 1, url: "https://a" }); runtime.onUpdated(1, { title: "A", faviconUrl: "icon" }); expect(Object.keys(runtime.snapshot().nodes)).toEqual([id]); expect(runtime.snapshot().nodes[id].title).toBe("A"); });
  it("creates an orphan when the opener binding is stale", () => { const { runtime } = setup(); runtime.onRemoved(99); const id = runtime.onCreated("q", { tabId: 2, openerTabId: 99 }); expect(runtime.snapshot().nodes[id].parentNodeId).toBeNull(); });
  it("does not let a stale live binding alter ancestry", () => { const { runtime } = setup(); const a = runtime.createRoot("q", 1); const b = runtime.onCreated("q", { tabId: 2, openerTabId: 1 }); runtime.onRemoved(1); runtime.onUpdated(2, { url: "https://new" }); expect(getNodeForTab(runtime.snapshot(), 1)).toBeNull(); expect(getAncestry(runtime.snapshot(), b)[0].id).toBe(a); });
  it("marks a removed live node closed while retaining its durable lineage", () => { const { runtime } = setup(); const root = runtime.createRoot("q", 1); const child = runtime.onCreated("q", { tabId: 2, openerTabId: 1 }); runtime.onRemoved(2); expect(runtime.snapshot().nodes[child]).toMatchObject({ parentNodeId: root, status: "closed" }); expect(getAncestry(runtime.snapshot(), child).map((node) => node.id)).toEqual([root, child]); });
});
