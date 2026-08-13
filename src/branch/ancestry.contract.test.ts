import { describe, expect, it } from "vitest";
import { createAncestryCapture } from "./ancestry";

const tab = (id: number, url = `https://example.test/${id}`, openerTabId?: number): chrome.tabs.Tab => ({
  id,
  index: id,
  windowId: 1,
  url,
  title: `Tab ${id}`,
  ...(openerTabId === undefined ? {} : { openerTabId }),
} as chrome.tabs.Tab);

describe("stable browser ancestry capture contract", () => {
  it("captures the opener immediately and keeps a stable node identity", () => {
    const capture = createAncestryCapture();
    capture.onCreated(tab(1));
    const child = capture.onCreated(tab(2, undefined, 1));

    expect(child.parentNodeId).toBe(capture.nodeForTab(1));
    expect(child.liveTabId).toBe(2);
    expect(child.id).not.toBe("2");
  });

  it("makes a tab without an opener a root node", () => {
    const capture = createAncestryCapture();

    expect(capture.onCreated(tab(1)).parentNodeId).toBeNull();
  });

  it("does not infer a parent when the opener is unknown", () => {
    const capture = createAncestryCapture();

    expect(capture.onCreated(tab(2, undefined, 999)).parentNodeId).toBeNull();
  });

  it("hydrates late metadata without replacing the stable node", () => {
    const capture = createAncestryCapture();
    capture.onCreated(tab(1));
    const created = capture.onCreated(tab(2, "about:blank", 1));

    const updated = capture.onUpdated(2, { url: "https://example.test/final", title: "Final" });

    if (!updated) throw new Error("metadata update lost the stable node");
    expect(updated.id).toBe(created.id);
    expect(updated.parentNodeId).toBe(created.parentNodeId);
    expect(updated.url).toBe("https://example.test/final");
    expect(updated.title).toBe("Final");
  });

  it("treats duplicate metadata updates as idempotent", () => {
    const capture = createAncestryCapture();
    capture.onCreated(tab(1));
    const created = capture.onCreated(tab(2, "about:blank", 1));

    expect(capture.onUpdated(2, { url: "https://example.test/final", title: "Final" })).toEqual(
      capture.onUpdated(2, { url: "https://example.test/final", title: "Final" }),
    );
    expect(capture.nodes()).toHaveLength(2);
    expect(capture.nodeForTab(2)).toBe(created.id);
  });

  it("retains ancestry after the parent tab is closed", () => {
    const capture = createAncestryCapture();
    capture.onCreated(tab(1));
    const child = capture.onCreated(tab(2, undefined, 1));

    capture.onRemoved(1);

    expect(capture.get(child.id).parentNodeId).toBe(capture.nodeForTab(1));
    expect(capture.get(child.id).liveTabId).toBe(2);
  });

  it("clears only the stale live-tab binding when a child closes", () => {
    const capture = createAncestryCapture();
    capture.onCreated(tab(1));
    const child = capture.onCreated(tab(2, undefined, 1));

    capture.onRemoved(2);

    expect(capture.get(child.id).liveTabId).toBeNull();
    expect(capture.get(child.id).parentNodeId).toBe(capture.nodeForTab(1));
  });

  it("never mutates the node for a reused or stale Chrome tab ID", () => {
    const capture = createAncestryCapture();
    capture.onCreated(tab(1));
    const first = capture.onCreated(tab(2, "https://example.test/first", 1));
    capture.onRemoved(2);

    expect(capture.onUpdated(2, { url: "https://example.test/reused", title: "Reused" })).toBeNull();
    expect(capture.nodes()).toEqual([
      expect.objectContaining({ liveTabId: 1 }),
      expect.objectContaining({ id: first.id, liveTabId: null, url: "https://example.test/first" }),
    ]);
  });

  it("ignores updates and removals for unrelated tabs", () => {
    const capture = createAncestryCapture();
    const root = capture.onCreated(tab(1));

    expect(capture.onUpdated(999, { url: "https://unrelated.test" })).toBeNull();
    capture.onRemoved(999);

    expect(capture.nodes()).toEqual([root]);
  });
});
