import { describe, expect, it } from "vitest";
import { createDefaultQuestState } from "./invariants";
import { reduceQuest } from "./reducer";
import { getActiveQuest, getActiveRoom, getOrderedRooms } from "./selectors";
import type { ContextRoom, Quest, QuestState } from "./types";

const quest: Quest = { id: "quest", title: "Launch", description: "Ship the project", roomIds: [], status: "active", createdAt: 1 };
const room = (id: string, order: number, status: ContextRoom["status"]): ContextRoom => ({ id, questId: "quest", title: id, objective: `Complete ${id}`, status, tabs: [], loot: [], notes: [], order, createdAt: 1 });
const withRooms = (): QuestState => {
  let state = reduceQuest(createDefaultQuestState(), { type: "QUEST_CREATED", payload: { quest } });
  state = reduceQuest(state, { type: "ROOM_CREATED", payload: { room: room("room-b", 1, "locked") } });
  state = reduceQuest(state, { type: "ROOM_CREATED", payload: { room: room("room-a", 0, "available") } });
  return state;
};

describe("Quest reducer", () => {
  it("creates an ordered room list and selects the active Quest", () => {
    const state = withRooms();
    expect(getActiveQuest(state)?.id).toBe("quest");
    expect(getOrderedRooms(state).map((item) => item.id)).toEqual(["room-a", "room-b"]);
    expect(getOrderedRooms(state).map((item) => item.order)).toEqual([0, 1]);
  });
  it("enters a room, checkpoints durable workspace, and strips chrome tab IDs", () => {
    const original = withRooms();
    const entered = reduceQuest(original, { type: "ROOM_ENTERED", payload: { roomId: "room-a", checkpointedAt: 2 } });
    const next = reduceQuest(entered, { type: "ROOM_CHECKPOINTED", payload: { roomId: "room-a", tabs: [{ id: "saved", url: "https://example.com", title: "Example", chromeTabId: 99, state: "open" }], notes: ["checkpoint"], checkpointedAt: 3 } });
    expect(getActiveRoom(next)?.id).toBe("room-a"); expect(next.rooms["room-a"].tabs[0].chromeTabId).toBeUndefined(); expect(next.rooms["room-a"].notes).toEqual(["checkpoint"]); expect(original.rooms["room-a"].status).toBe("available");
  });
  it("persists completion, unlocks the next room, and completes the Quest", () => {
    let state = reduceQuest(withRooms(), { type: "ROOM_ENTERED", payload: { roomId: "room-a" } });
    state = reduceQuest(state, { type: "ROOM_CLEARED", payload: { roomId: "room-a", completedAt: 10 } });
    expect(state.rooms["room-a"].status).toBe("complete"); expect(state.rooms["room-a"].completedAt).toBe(10); expect(state.rooms["room-b"].status).toBe("available"); expect(getActiveRoom(state)).toBeNull();
    state = reduceQuest(state, { type: "ROOM_ENTERED", payload: { roomId: "room-b" } });
    state = reduceQuest(state, { type: "ROOM_CLEARED", payload: { roomId: "room-b", completedAt: 11 } });
    expect(state.quests.quest.status).toBe("complete"); expect(state.quests.quest.completedAt).toBe(11); expect(getActiveRoom(state)).toBeNull();
  });
  it("saves, moves, and deletes Side Quests without losing their identity", () => {
    let state = withRooms();
    state = reduceQuest(state, { type: "SIDE_QUEST_SAVED", payload: { sideQuest: { id: "side", questId: "quest", roomId: "room-a", title: "Follow-up", objective: "Review later", status: "saved", createdAt: 2 } } });
    state = reduceQuest(state, { type: "SIDE_QUEST_MOVED", payload: { sideQuestId: "side", roomId: "room-b" } });
    expect(state.sideQuests.side.roomId).toBe("room-b");
    state = reduceQuest(state, { type: "SIDE_QUEST_DELETED", payload: { sideQuestId: "side" } }); expect(state.sideQuests.side).toBeUndefined();
  });
  it("does not add duplicate link Loot or duplicate saved URLs", () => {
    let state = reduceQuest(withRooms(), { type: "LOOT_ADDED", payload: { item: { id: "link-1", roomId: "room-a", type: "link", title: "Docs", url: "https://docs.example.com", createdAt: 1 } } });
    expect(reduceQuest(state, { type: "LOOT_ADDED", payload: { item: { id: "link-2", roomId: "room-a", type: "link", title: "Docs again", url: "https://docs.example.com", createdAt: 2 } } })).toBe(state);
    state = reduceQuest(state, { type: "TAB_SAVED", payload: { roomId: "room-a", tab: { id: "tab-1", url: "https://tab.example.com", title: "Tab", state: "open" } } });
    expect(reduceQuest(state, { type: "TAB_SAVED", payload: { roomId: "room-a", tab: { id: "tab-2", url: "https://tab.example.com", title: "Tab again", state: "open" } } })).toBe(state);
  });
});
