import { QUEST_SCHEMA_VERSION, type ContextRoom, type LootItem, type Quest, type QuestState, type SavedTab, type SideQuest } from "./types";

const statuses = {
  quest: new Set(["active", "complete", "archived"]),
  room: new Set(["locked", "available", "active", "complete"]),
  tab: new Set(["open", "stashed"]),
  loot: new Set(["link", "note"]),
  sideQuest: new Set(["saved", "complete"]),
};

const record = (value: unknown, name: string): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`invalid ${name}`);
  return value as Record<string, unknown>;
};
const string = (value: unknown, name: string): string => {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`invalid ${name}`);
  return value;
};
const optionalString = (value: unknown, name: string): void => { if (value !== undefined) string(value, name); };
const integer = (value: unknown, name: string): number => {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) throw new Error(`invalid ${name}`);
  return value;
};
const array = (value: unknown, name: string): unknown[] => { if (!Array.isArray(value)) throw new Error(`invalid ${name}`); return value; };
const oneOf = (value: unknown, values: Set<string>, name: string): void => { if (typeof value !== "string" || !values.has(value)) throw new Error(`invalid ${name}`); };

function assertTab(value: unknown, roomId: string): asserts value is SavedTab {
  const tab = record(value, "saved tab");
  string(tab.id, "saved tab id"); const url = string(tab.url, "saved tab url"); string(tab.title, "saved tab title");
  optionalString(tab.faviconUrl, "favicon url"); oneOf(tab.state, statuses.tab, "saved tab state");
  if (tab.chromeTabId !== undefined) integer(tab.chromeTabId, "chrome tab id");
  if (url.startsWith("javascript:")) throw new Error("invalid saved tab url");
  void roomId;
}

function assertLoot(value: unknown, roomId: string): asserts value is LootItem {
  const loot = record(value, "loot item");
  if (string(loot.roomId, "loot room id") !== roomId) throw new Error("loot room mismatch");
  string(loot.id, "loot id"); oneOf(loot.type, statuses.loot, "loot type"); string(loot.title, "loot title"); integer(loot.createdAt, "loot created at");
  optionalString(loot.url, "loot url"); optionalString(loot.note, "loot note");
  if (loot.type === "link" && typeof loot.url !== "string") throw new Error("link loot requires url");
  if (loot.type === "note" && typeof loot.note !== "string") throw new Error("note loot requires note");
}

function assertQuest(value: unknown, id: string): asserts value is Quest {
  const quest = record(value, "quest");
  if (string(quest.id, "quest id") !== id) throw new Error("quest key mismatch");
  string(quest.title, "quest title"); optionalString(quest.description, "quest description"); oneOf(quest.status, statuses.quest, "quest status");
  array(quest.roomIds, "quest rooms").forEach((roomId) => string(roomId, "quest room id")); integer(quest.createdAt, "quest created at");
  if (quest.completedAt !== undefined) integer(quest.completedAt, "quest completed at");
}

function assertRoom(value: unknown, id: string): asserts value is ContextRoom {
  const room = record(value, "context room");
  if (string(room.id, "room id") !== id) throw new Error("room key mismatch");
  string(room.questId, "room quest id"); string(room.title, "room title"); string(room.objective, "room objective"); oneOf(room.status, statuses.room, "room status");
  const tabs = array(room.tabs, "room tabs"); const tabIds = new Set<string>(); const tabUrls = new Set<string>();
  tabs.forEach((tab) => { assertTab(tab, id); if (tabIds.has(tab.id)) throw new Error("duplicate saved tab id"); if (tabUrls.has(tab.url)) throw new Error("duplicate saved tab url"); tabIds.add(tab.id); tabUrls.add(tab.url); });
  const loot = array(room.loot, "room loot"); const lootIds = new Set<string>();
  loot.forEach((item) => { assertLoot(item, id); if (lootIds.has(item.id)) throw new Error("duplicate loot id"); lootIds.add(item.id); });
  array(room.notes, "room notes").forEach((note) => string(note, "room note")); integer(room.order, "room order"); integer(room.createdAt, "room created at");
  if (room.completedAt !== undefined) integer(room.completedAt, "room completed at"); if (room.checkpointedAt !== undefined) integer(room.checkpointedAt, "checkpointed at");
}

function assertSideQuest(value: unknown, id: string): asserts value is SideQuest {
  const sideQuest = record(value, "side quest");
  if (string(sideQuest.id, "side quest id") !== id) throw new Error("side quest key mismatch");
  string(sideQuest.questId, "side quest quest id"); string(sideQuest.roomId, "side quest room id"); string(sideQuest.title, "side quest title"); optionalString(sideQuest.url, "side quest url"); optionalString(sideQuest.note, "side quest note"); string(sideQuest.objective, "side quest objective");
  oneOf(sideQuest.status, statuses.sideQuest, "side quest status"); integer(sideQuest.createdAt, "side quest created at");
}

export function assertQuestState(value: unknown): asserts value is QuestState {
  const state = record(value, "quest state");
  if (state.schemaVersion !== QUEST_SCHEMA_VERSION) throw new Error("invalid quest schema version");
  const quests = record(state.quests, "quest registry"); const rooms = record(state.rooms, "room registry"); const sideQuests = record(state.sideQuests, "side quest registry");
  Object.entries(quests).forEach(([id, quest]) => assertQuest(quest, id)); Object.entries(rooms).forEach(([id, room]) => assertRoom(room, id)); Object.entries(sideQuests).forEach(([id, sideQuest]) => assertSideQuest(sideQuest, id));
  if (state.activeQuestId !== null) string(state.activeQuestId, "active quest id"); if (state.activeRoomId !== null) string(state.activeRoomId, "active room id");
  const typed = value as QuestState;
  const questIds = new Set(Object.keys(quests)); const roomIds = new Set(Object.keys(rooms));
  const referencedRoomIds = new Set<string>();
  Object.values(typed.quests).forEach((quest) => { const roomSet = new Set(quest.roomIds); if (roomSet.size !== quest.roomIds.length) throw new Error("duplicate quest rooms"); const roomsForQuest = quest.roomIds.map((roomId) => typed.rooms[roomId]); if (roomsForQuest.some((room) => !room || room.questId !== quest.id)) throw new Error("quest room registry mismatch"); if (roomsForQuest.some((room, index) => room.order !== index)) throw new Error("rooms must be ordered"); let activeRooms = 0; roomsForQuest.forEach((room, index) => { if (room.status === "active") activeRooms += 1; if (room.status !== "locked" && index > 0 && roomsForQuest[index - 1]?.status !== "complete") throw new Error("room progression is out of order"); if (room.status === "locked" && index === 0) throw new Error("first room cannot be locked"); }); if (activeRooms > 1) throw new Error("multiple active rooms"); quest.roomIds.forEach((roomId) => { if (!roomIds.has(roomId)) throw new Error("quest room registry mismatch"); referencedRoomIds.add(roomId); }); });
  if (referencedRoomIds.size !== roomIds.size) throw new Error("orphan room registry entry");
  Object.values(typed.rooms).forEach((room) => { if (!questIds.has(room.questId)) throw new Error("room references unknown quest"); });
  Object.values(typed.sideQuests).forEach((sideQuest) => { if (!questIds.has(sideQuest.questId) || !roomIds.has(sideQuest.roomId) || typed.rooms[sideQuest.roomId].questId !== sideQuest.questId) throw new Error("side quest references unknown object"); });
  if (typed.activeQuestId !== null && !questIds.has(typed.activeQuestId)) throw new Error("active quest is missing");
  if (typed.activeRoomId !== null && !roomIds.has(typed.activeRoomId)) throw new Error("active room is missing");
  if (typed.activeRoomId !== null && typed.activeQuestId !== null && typed.rooms[typed.activeRoomId].questId !== typed.activeQuestId) throw new Error("active room quest mismatch");
  if (typed.activeQuestId !== null && typed.quests[typed.activeQuestId].status !== "active") throw new Error("completed or archived quest is active");
  if (typed.activeRoomId !== null && typed.rooms[typed.activeRoomId].status !== "active") throw new Error("non-active room is selected");
}

export function isQuestState(value: unknown): value is QuestState { try { assertQuestState(value); return true; } catch { return false; } }

export function createDefaultQuestState(): QuestState { return { schemaVersion: QUEST_SCHEMA_VERSION, quests: {}, rooms: {}, sideQuests: {}, activeQuestId: null, activeRoomId: null }; }

export const assertValidQuest = (quest: Quest): void => assertQuest(quest, quest.id);
