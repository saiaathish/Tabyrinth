export const QUEST_SCHEMA_VERSION = 1 as const;

export type QuestId = string;
export type RoomId = string;
export type SavedTabId = string;
export type LootItemId = string;
export type SideQuestId = string;

export type QuestStatus = "active" | "complete" | "archived";
export type RoomStatus = "locked" | "available" | "active" | "complete";
export type SavedTabState = "open" | "stashed";
export type LootType = "link" | "note";
export type SideQuestStatus = "saved" | "complete";

export type Quest = {
  id: QuestId;
  title: string;
  description?: string;
  roomIds: RoomId[];
  status: QuestStatus;
  createdAt: number;
  completedAt?: number;
};

export type SavedTab = {
  id: SavedTabId;
  url: string;
  title: string;
  faviconUrl?: string;
  /** Reconciliation hint only. Never use this as durable identity. */
  chromeTabId?: number;
  state: SavedTabState;
};

export type LootItem = {
  id: LootItemId;
  roomId: RoomId;
  type: LootType;
  title: string;
  url?: string;
  note?: string;
  createdAt: number;
};

export type ContextRoom = {
  id: RoomId;
  questId: QuestId;
  title: string;
  objective: string;
  status: RoomStatus;
  tabs: SavedTab[];
  loot: LootItem[];
  notes: string[];
  order: number;
  createdAt: number;
  completedAt?: number;
  checkpointedAt?: number;
};

export type SideQuest = {
  id: SideQuestId;
  questId: QuestId;
  roomId: RoomId;
  title: string;
  url?: string;
  note?: string;
  objective: string;
  status: SideQuestStatus;
  createdAt: number;
};

export type QuestState = {
  schemaVersion: typeof QUEST_SCHEMA_VERSION;
  quests: Record<QuestId, Quest>;
  rooms: Record<RoomId, ContextRoom>;
  sideQuests: Record<SideQuestId, SideQuest>;
  activeQuestId: QuestId | null;
  activeRoomId: RoomId | null;
};

export type QuestAction =
  | { type: "QUEST_CREATED"; payload: { quest: Quest } }
  | { type: "ROOM_CREATED"; payload: { room: ContextRoom } }
  | { type: "ROOM_ENTERED"; payload: { roomId: RoomId; checkpointedAt?: number } }
  | { type: "ROOM_LEFT"; payload: { roomId: RoomId } }
  | { type: "ROOM_CHECKPOINTED"; payload: { roomId: RoomId; tabs: SavedTab[]; notes: string[]; checkpointedAt?: number } }
  | { type: "TAB_SAVED"; payload: { roomId: RoomId; tab: SavedTab } }
  | { type: "LOOT_ADDED"; payload: { item: LootItem } }
  | { type: "SIDE_QUEST_SAVED"; payload: { sideQuest: SideQuest } }
  | { type: "SIDE_QUEST_DELETED"; payload: { sideQuestId: SideQuestId } }
  | { type: "SIDE_QUEST_MOVED"; payload: { sideQuestId: SideQuestId; roomId: RoomId } }
  | { type: "ROOM_CLEARED"; payload: { roomId: RoomId; completedAt?: number } }
  | { type: "QUEST_ARCHIVED"; payload: { questId: QuestId } };
