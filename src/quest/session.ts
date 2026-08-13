import type { QuestId, RoomId, SavedTabId } from "./types";

export const QUEST_SESSION_KEY = "tabyrinth.questSession";
export const QUEST_SESSION_SCHEMA_VERSION = 1 as const;

export type QuestTabOwnership = "created" | "explicit";

export type QuestTabBinding = {
  tabId: number;
  roomId: RoomId;
  savedTabId: SavedTabId;
  ownership: QuestTabOwnership;
};

export type QuestSession = {
  schemaVersion: typeof QUEST_SESSION_SCHEMA_VERSION;
  activeQuestId: QuestId | null;
  activeRoomId: RoomId | null;
  groupId: number | null;
  windowId: number | null;
  bindings: Record<string, QuestTabBinding>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function nonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

export function createQuestSession(): QuestSession {
  return { schemaVersion: QUEST_SESSION_SCHEMA_VERSION, activeQuestId: null, activeRoomId: null, groupId: null, windowId: null, bindings: {} };
}

export function assertQuestSession(value: unknown): asserts value is QuestSession {
  if (!isRecord(value) || value.schemaVersion !== QUEST_SESSION_SCHEMA_VERSION) throw new Error("invalid Quest session");
  if (value.activeQuestId !== null && !nonEmptyString(value.activeQuestId)) throw new Error("invalid Quest session quest");
  if (value.activeRoomId !== null && !nonEmptyString(value.activeRoomId)) throw new Error("invalid Quest session room");
  if (value.groupId !== null && !nonNegativeInteger(value.groupId)) throw new Error("invalid Quest session group");
  if (value.windowId !== null && !nonNegativeInteger(value.windowId)) throw new Error("invalid Quest session window");
  if (!isRecord(value.bindings)) throw new Error("invalid Quest session bindings");
  for (const [key, raw] of Object.entries(value.bindings)) {
    if (!nonNegativeInteger(Number(key)) || !isRecord(raw)) throw new Error("invalid Quest tab binding");
    if (!nonNegativeInteger(raw.tabId) || raw.tabId !== Number(key)) throw new Error("Quest tab binding key mismatch");
    if (!nonEmptyString(raw.roomId) || !nonEmptyString(raw.savedTabId)) throw new Error("invalid Quest tab binding identity");
    if (raw.ownership !== "created" && raw.ownership !== "explicit") throw new Error("invalid Quest tab ownership");
  }
}

export const questSessionStorage = {
  async get(): Promise<QuestSession> {
    const result = await chrome.storage.session.get(QUEST_SESSION_KEY);
    const value = result[QUEST_SESSION_KEY];
    if (value === undefined) return createQuestSession();
    try {
      assertQuestSession(value);
      return value;
    } catch {
      await chrome.storage.session.remove(QUEST_SESSION_KEY);
      return createQuestSession();
    }
  },
  async set(session: QuestSession): Promise<void> {
    assertQuestSession(session);
    await chrome.storage.session.set({ [QUEST_SESSION_KEY]: session });
  },
  async clear(): Promise<void> {
    await chrome.storage.session.remove(QUEST_SESSION_KEY);
  },
};
