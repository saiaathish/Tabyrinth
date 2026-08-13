import { describe, expect, it } from "vitest";
import { createPortalQuest, finishPortalQuest, isPortalQuest } from "./quest";

describe("flagship Portal Quest", () => {
  it("creates the exact durable PRD record", () => {
    expect(createPortalQuest({ id: "q", title: "  Ship release  ", rootNodeId: "root", createdAt: 7 })).toEqual({
      id: "q", title: "Ship release", rootNodeId: "root", currentNodeId: "root", status: "active", createdAt: 7, completedAt: null,
    });
  });

  it("finishes without deleting its durable identity", () => {
    const quest = createPortalQuest({ id: "q", title: "Ship", rootNodeId: "root", createdAt: 7 });
    expect(finishPortalQuest(quest, 11)).toEqual({ ...quest, status: "complete", currentNodeId: null, completedAt: 11 });
  });

  it("rejects malformed or extended storage records", () => {
    const quest = createPortalQuest({ id: "q", title: "Ship", rootNodeId: "root", createdAt: 7 });
    expect(isPortalQuest(quest)).toBe(true);
    expect(isPortalQuest({ ...quest, extra: true })).toBe(false);
    expect(() => createPortalQuest({ id: "q", title: "   ", rootNodeId: "root" })).toThrow("INVALID_QUEST_TITLE");
  });
});
