import type { ContextRoom, Quest, QuestId, QuestState, RoomId } from "./types";

export const getActiveQuest = (state: QuestState): Quest | null => state.activeQuestId ? state.quests[state.activeQuestId] ?? null : null;
export const getActiveRoom = (state: QuestState): ContextRoom | null => state.activeRoomId ? state.rooms[state.activeRoomId] ?? null : null;
export const getQuestRooms = (state: QuestState, questId: QuestId): ContextRoom[] => {
  const quest = state.quests[questId];
  return quest ? quest.roomIds.map((id) => state.rooms[id]).filter((room): room is ContextRoom => room !== undefined).sort((a, b) => a.order - b.order) : [];
};
export const getOrderedRooms = (state: QuestState): ContextRoom[] => {
  const quest = getActiveQuest(state);
  return quest ? getQuestRooms(state, quest.id) : [];
};
export const getNextRoom = (state: QuestState, roomId: RoomId): ContextRoom | null => {
  const room = state.rooms[roomId]; if (!room) return null;
  return getQuestRooms(state, room.questId).find((candidate) => candidate.order === room.order + 1) ?? null;
};
