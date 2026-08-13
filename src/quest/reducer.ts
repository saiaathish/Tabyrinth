import { assertQuestState } from "./invariants";
import { getNextRoom } from "./selectors";
import type { ContextRoom, QuestAction, QuestState } from "./types";

const copy = (state: QuestState): QuestState => ({
  ...state,
  quests: Object.fromEntries(Object.entries(state.quests).map(([id, quest]) => [id, { ...quest, roomIds: [...quest.roomIds] }])),
  rooms: Object.fromEntries(Object.entries(state.rooms).map(([id, room]) => [id, { ...room, tabs: room.tabs.map((tab) => ({ ...tab })), loot: room.loot.map((item) => ({ ...item })), notes: [...room.notes] }])),
  sideQuests: Object.fromEntries(Object.entries(state.sideQuests).map(([id, sideQuest]) => [id, { ...sideQuest }])),
});

export function reduceQuest(state: QuestState, action: QuestAction): QuestState {
  const next = copy(state);
  switch (action.type) {
    case "QUEST_CREATED": {
      const quest = action.payload.quest; if (next.quests[quest.id]) return state;
      next.quests[quest.id] = quest; if (quest.status === "active") { next.activeQuestId = quest.id; next.activeRoomId = null; } break;
    }
    case "ROOM_CREATED": {
      const room = action.payload.room; const quest = next.quests[room.questId];
      if (!quest || next.rooms[room.id] || quest.roomIds.includes(room.id)) return state;
      const normalizedRoom = createRoom({ ...room, status: quest.roomIds.length === 0 ? "available" : room.status });
      next.rooms[room.id] = normalizedRoom; quest.roomIds = [...quest.roomIds, room.id].sort((a, b) => next.rooms[a].order - next.rooms[b].order || (a === room.id ? -1 : 1));
      quest.roomIds.forEach((roomId, index) => {
        const orderedRoom = next.rooms[roomId];
        orderedRoom.order = index;
        if (index === 0 && orderedRoom.status === "locked") orderedRoom.status = "available";
        if (index > 0 && orderedRoom.status === "available") orderedRoom.status = "locked";
      });
      if (next.activeQuestId === null) next.activeQuestId = quest.id; break;
    }
    case "ROOM_ENTERED": {
      const room = next.rooms[action.payload.roomId]; if (!room || room.status === "locked" || room.status === "complete") return state;
      Object.values(next.rooms).forEach((candidate) => { if (candidate.questId === room.questId && candidate.status === "active") candidate.status = "available"; });
      room.status = "active"; room.checkpointedAt = action.payload.checkpointedAt ?? room.checkpointedAt; next.activeQuestId = room.questId; next.activeRoomId = room.id; break;
    }
    case "ROOM_LEFT": {
      const room = next.rooms[action.payload.roomId];
      if (!room || room.status !== "active" || next.activeRoomId !== room.id) return state;
      room.status = "available";
      next.activeRoomId = null;
      break;
    }
    case "ROOM_CHECKPOINTED": {
      const room = next.rooms[action.payload.roomId]; if (!room) return state;
      room.tabs = action.payload.tabs.map((tab) => ({ ...tab, chromeTabId: undefined })); room.notes = [...action.payload.notes]; room.checkpointedAt = action.payload.checkpointedAt ?? Date.now(); break;
    }
    case "TAB_SAVED": {
      const room = next.rooms[action.payload.roomId]; if (!room || room.tabs.some((tab) => tab.id === action.payload.tab.id || tab.url === action.payload.tab.url)) return state;
      room.tabs = [...room.tabs, { ...action.payload.tab, chromeTabId: undefined }]; break;
    }
    case "LOOT_ADDED": {
      const item = action.payload.item; const room = next.rooms[item.roomId]; if (!room || room.loot.some((loot) => loot.id === item.id) || (item.type === "link" && item.url !== undefined && room.loot.some((loot) => loot.type === "link" && loot.url === item.url))) return state;
      room.loot = [...room.loot, item]; break;
    }
    case "SIDE_QUEST_SAVED": {
      const sideQuest = action.payload.sideQuest; if (!next.quests[sideQuest.questId] || !next.rooms[sideQuest.roomId] || next.sideQuests[sideQuest.id]) return state;
      next.sideQuests[sideQuest.id] = sideQuest; break;
    }
    case "SIDE_QUEST_DELETED": if (!next.sideQuests[action.payload.sideQuestId]) return state; delete next.sideQuests[action.payload.sideQuestId]; break;
    case "SIDE_QUEST_MOVED": {
      const sideQuest = next.sideQuests[action.payload.sideQuestId]; if (!sideQuest || !next.rooms[action.payload.roomId] || next.rooms[action.payload.roomId].questId !== sideQuest.questId) return state;
      sideQuest.roomId = action.payload.roomId; break;
    }
    case "ROOM_CLEARED": {
      const room = next.rooms[action.payload.roomId]; if (!room || room.status === "locked" || room.status === "complete") return state;
      const completedAt = action.payload.completedAt ?? Date.now(); room.status = "complete"; room.completedAt = completedAt;
      const following = getNextRoom(next, room.id); if (following && following.status === "locked") following.status = "available";
      const quest = next.quests[room.questId]; const allComplete = quest.roomIds.every((id) => next.rooms[id]?.status === "complete");
      if (allComplete) { quest.status = "complete"; quest.completedAt = completedAt; if (next.activeQuestId === quest.id) { next.activeQuestId = null; next.activeRoomId = null; } }
      if (next.activeQuestId === quest.id && next.activeRoomId === room.id) next.activeRoomId = null;
      break;
    }
    case "QUEST_ARCHIVED": { const quest = next.quests[action.payload.questId]; if (!quest) return state; quest.status = "archived"; if (next.activeQuestId === quest.id) { next.activeQuestId = null; next.activeRoomId = null; } break; }
  }
  assertQuestState(next);
  return next;
}

export const createRoom = (room: ContextRoom): ContextRoom => ({ ...room, tabs: room.tabs.map((tab) => ({ ...tab, chromeTabId: undefined })) });
