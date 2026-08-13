import { describe, expect, it } from "vitest";
import { parsePortalMessage } from "./messages";

describe("Portal message boundary", () => {
  it("accepts the exact operations", () => {
    expect(parsePortalMessage({ type: "PORTAL_GET" })).toEqual({ type: "PORTAL_GET" });
    expect(parsePortalMessage({ type: "PORTAL_BEGIN", title: "  Ship release " })).toEqual({ type: "PORTAL_BEGIN", title: "Ship release" });
    expect(parsePortalMessage({ type: "PORTAL_FINISH", questId: "q" })).toEqual({ type: "PORTAL_FINISH", questId: "q" });
    expect(parsePortalMessage({ type: "PORTAL_SAVE_LOOT", nodeId: "n", note: "  key fact  ", close: true })).toEqual({ type: "PORTAL_SAVE_LOOT", nodeId: "n", note: "key fact", close: true });
    expect(parsePortalMessage({ type: "PORTAL_SAVE_LOOT", nodeId: "n", note: "   " })).toEqual({ type: "PORTAL_SAVE_LOOT", nodeId: "n" });
    expect(parsePortalMessage({ type: "PORTAL_FOLD", questId: "q", currentNodeId: "n" })).not.toBeNull();
    expect(parsePortalMessage({ type: "PORTAL_UNSEAL", portalId: "p" })).not.toBeNull();
    expect(parsePortalMessage({ type: "PORTAL_RENAME", portalId: "p", title: "Research" })).toEqual({ type: "PORTAL_RENAME", portalId: "p", title: "Research" });
    expect(parsePortalMessage({ type: "PORTAL_DELETE", portalId: "p" })).toEqual({ type: "PORTAL_DELETE", portalId: "p" });
  });
  it("rejects unknown fields and malformed operations", () => {
    expect(parsePortalMessage({ type: "PORTAL_GET", extra: true })).toBeNull();
    expect(parsePortalMessage({ type: "PORTAL_BEGIN", title: " " })).toBeNull();
    expect(parsePortalMessage({ type: "PORTAL_RENAME", portalId: "p", title: " " })).toBeNull();
    expect(parsePortalMessage({ type: "PORTAL_SAVE_LOOT", nodeId: "n", close: "yes" })).toBeNull();
    expect(parsePortalMessage({ type: "PORTAL_SAVE_LOOT", nodeId: "n", note: "x".repeat(161) })).toBeNull();
    expect(parsePortalMessage({ type: "PORTAL_SAVE_LOOT", nodeId: "n", extra: true })).toBeNull();
    expect(parsePortalMessage({ type: "PORTAL_DELETE", portalId: "p", extra: true })).toBeNull();
    expect(parsePortalMessage({ type: "PORTAL_BEGIN", questId: "q" })).toBeNull();
    expect(parsePortalMessage({ type: "PORTAL_FOLD", questId: "q", currentNodeId: "n", graph: { nodes: {}, tabBindings: {} } })).toBeNull();
    expect(parsePortalMessage({ type: "PORTAL_UNSEAL", portalId: "p", graph: { nodes: {}, tabBindings: {} } })).toBeNull();
  });
});
