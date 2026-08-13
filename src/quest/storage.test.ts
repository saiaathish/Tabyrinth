import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultQuestState } from "./invariants";
import { QUEST_STATE_KEY, questStorage } from "./storage";

const local: Record<string, unknown> = {};
const chromeLocal = {
  get: vi.fn(async (key: string) => ({ [key]: local[key] })),
  set: vi.fn(async (value: Record<string, unknown>) => Object.assign(local, value)),
  remove: vi.fn(async (key: string) => { delete local[key]; }),
};

describe("Quest local storage", () => {
  afterEach(() => { vi.unstubAllGlobals(); for (const key of Object.keys(local)) delete local[key]; vi.clearAllMocks(); });
  it("writes schema-v1 durable state without chrome tab IDs", async () => {
    vi.stubGlobal("chrome", { storage: { local: chromeLocal } });
    const state = createDefaultQuestState(); state.quests.q = { id: "q", title: "Quest", roomIds: ["r"], status: "active", createdAt: 1 }; state.rooms.r = { id: "r", questId: "q", title: "Room", objective: "Do it", status: "available", tabs: [{ id: "tab", url: "https://example.com", title: "Example", chromeTabId: 123, state: "open" }], loot: [], notes: [], order: 0, createdAt: 1 };
    await questStorage.set(state);
    expect((local[QUEST_STATE_KEY] as { rooms: { r: { tabs: [{ chromeTabId?: number }] } } }).rooms.r.tabs[0].chromeTabId).toBeUndefined();
    await expect(questStorage.get()).resolves.toEqual(expect.objectContaining({ schemaVersion: 1 }));
  });
  it("returns defaults and removes unsupported or corrupt schema data", async () => {
    vi.stubGlobal("chrome", { storage: { local: chromeLocal } }); local[QUEST_STATE_KEY] = { schemaVersion: 0, quests: {} };
    await expect(questStorage.get()).resolves.toEqual(createDefaultQuestState()); expect(chromeLocal.remove).toHaveBeenCalledWith(QUEST_STATE_KEY);
    local[QUEST_STATE_KEY] = { schemaVersion: 1, quests: {} };
    await expect(questStorage.get()).resolves.toEqual(createDefaultQuestState()); expect(chromeLocal.remove).toHaveBeenCalledTimes(2);
  });
  it("keeps completed rooms in persisted state", async () => {
    vi.stubGlobal("chrome", { storage: { local: chromeLocal } }); const state = createDefaultQuestState(); state.quests.q = { id: "q", title: "Quest", roomIds: ["r"], status: "complete", createdAt: 1, completedAt: 2 }; state.rooms.r = { id: "r", questId: "q", title: "Room", objective: "Done", status: "complete", tabs: [], loot: [], notes: [], order: 0, createdAt: 1, completedAt: 2 };
    await questStorage.set(state); const restored = await questStorage.get(); expect(restored.rooms.r.status).toBe("complete"); expect(restored.rooms.r.completedAt).toBe(2);
  });
});
