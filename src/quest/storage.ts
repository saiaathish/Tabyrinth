import { createDefaultQuestState, assertQuestState } from "./invariants";
import { QUEST_SCHEMA_VERSION, type QuestState } from "./types";

export const QUEST_STATE_KEY = "tabyrinth.questState";

function stripEphemeralIds(state: QuestState): QuestState {
  return { ...state, rooms: Object.fromEntries(Object.entries(state.rooms).map(([id, room]) => [id, { ...room, tabs: room.tabs.map((tab) => { const durable = { ...tab }; delete durable.chromeTabId; return durable; }) }])) };
}

function migrate(value: unknown): QuestState {
  if (value === undefined || value === null) return createDefaultQuestState();
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("invalid quest storage");
  const candidate = value as { schemaVersion?: unknown };
  if (candidate.schemaVersion !== QUEST_SCHEMA_VERSION) throw new Error("unsupported quest schema version");
  assertQuestState(value); return stripEphemeralIds(value);
}

export const questStorage = {
  async get(): Promise<QuestState> {
    const result = await chrome.storage.local.get(QUEST_STATE_KEY);
    try { return migrate(result[QUEST_STATE_KEY]); }
    catch { await chrome.storage.local.remove(QUEST_STATE_KEY); return createDefaultQuestState(); }
  },
  async set(state: QuestState): Promise<void> {
    assertQuestState(state); const durable = stripEphemeralIds(state); assertQuestState(durable);
    await chrome.storage.local.set({ [QUEST_STATE_KEY]: durable });
  },
  async clear(): Promise<void> { await chrome.storage.local.remove(QUEST_STATE_KEY); },
};
