import type { QuestId, RoomId } from "./types";

export type QuestMessage =
  | { type: "GET_QUEST_STATE" }
  | { type: "CREATE_QUEST"; title: string; description?: string; rooms: Array<{ title: string; objective: string }> }
  | { type: "CREATE_ROOM"; questId: QuestId; title: string; objective: string }
  | { type: "ENTER_CONTEXT_ROOM"; questId: QuestId; roomId: RoomId }
  | { type: "LEAVE_CONTEXT_ROOM"; questId: QuestId; roomId: RoomId; notes?: string[] }
  | { type: "CHECKPOINT_CONTEXT_ROOM"; questId: QuestId; roomId: RoomId; notes?: string[] }
  | { type: "ADD_CURRENT_TAB"; questId: QuestId; roomId: RoomId }
  | { type: "STASH_CONTEXT_TAB"; questId: QuestId; roomId: RoomId; savedTabId: string }
  | { type: "CAPTURE_LOOT"; questId: QuestId; roomId: RoomId; note?: string }
  | { type: "ADD_NOTE_LOOT"; questId: QuestId; roomId: RoomId; title: string; note: string }
  | { type: "SAVE_SIDE_QUEST"; questId: QuestId; roomId: RoomId; note?: string }
  | { type: "OPEN_SIDE_QUEST"; questId: QuestId; sideQuestId: string }
  | { type: "DELETE_SIDE_QUEST"; questId: QuestId; sideQuestId: string }
  | { type: "MOVE_SIDE_QUEST"; questId: QuestId; sideQuestId: string; roomId: RoomId }
  | { type: "CLEAR_CONTEXT_ROOM"; questId: QuestId; roomId: RoomId }
  | { type: "RESET_QUEST_SESSION" };

export type QuestSnapshot = {
  state: import("./types").QuestState;
  activeRoomLiveTabCount: number;
  groupId: number | null;
};
