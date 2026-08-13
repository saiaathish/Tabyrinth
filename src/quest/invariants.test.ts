import { describe, expect, it } from "vitest";
import { assertQuestState, createDefaultQuestState } from "./invariants";
import type { QuestState } from "./types";

const validState = (): QuestState => {
  const state = createDefaultQuestState();
  state.quests.quest = { id: "quest", title: "Research", roomIds: ["room-a", "room-b"], status: "active", createdAt: 1 };
  state.rooms["room-a"] = { id: "room-a", questId: "quest", title: "Discover", objective: "Find sources", status: "available", tabs: [{ id: "tab-a", url: "https://example.com", title: "Example", state: "stashed" }], loot: [{ id: "loot-a", roomId: "room-a", type: "link", title: "Reference", url: "https://docs.example.com", createdAt: 1 }], notes: [], order: 0, createdAt: 1 };
  state.rooms["room-b"] = { id: "room-b", questId: "quest", title: "Write", objective: "Draft outcome", status: "locked", tabs: [], loot: [], notes: [], order: 1, createdAt: 1 };
  return state;
};

describe("Quest invariants", () => {
  it("accepts ordered rooms and useful link loot", () => expect(() => assertQuestState(validState())).not.toThrow());
  it("rejects duplicate saved URLs and stale tab identity as a substitute for a URL", () => {
    const state = validState(); state.rooms["room-a"].tabs.push({ id: "tab-b", url: "https://example.com", title: "Duplicate", state: "open" });
    expect(() => assertQuestState(state)).toThrow("duplicate saved tab url");
  });
  it("rejects a room that is not registered in the Quest order", () => {
    const state = validState(); state.rooms["room-b"].order = 3;
    expect(() => assertQuestState(state)).toThrow("rooms must be ordered");
  });
  it("rejects orphan rooms and side quests moved across Quest boundaries", () => {
    const state = validState(); state.rooms.orphan = { ...state.rooms["room-a"], id: "orphan", loot: [{ ...state.rooms["room-a"].loot[0], roomId: "orphan" }] };
    expect(() => assertQuestState(state)).toThrow("orphan room registry entry");
    delete state.rooms.orphan; state.quests.other = { id: "other", title: "Other", roomIds: [], status: "active", createdAt: 1 }; state.sideQuests.side = { id: "side", questId: "other", roomId: "room-b", title: "Follow-up", objective: "Later", status: "saved", createdAt: 1 };
    expect(() => assertQuestState(state)).toThrow("side quest references unknown object");
  });
  it("rejects link Loot without a URL and note Loot without a note", () => {
    const state = validState(); state.rooms["room-a"].loot = [{ id: "bad", roomId: "room-a", type: "link", title: "Missing", createdAt: 1 }];
    expect(() => assertQuestState(state)).toThrow("link loot requires url");
  });
});
