import type { GameAction, GameState, RoomState } from "./types";
import { canBreakBossSeal, canMoveTo, getCurrentRoom } from "./selectors";

const changed = (state: GameState, patch: Partial<GameState>): GameState => ({ ...state, ...patch, metrics: { ...state.metrics, ...(patch.metrics ?? {}), actions: state.metrics.actions + 1 }, revision: state.revision + 1 });
const completeRoom = (state: GameState, room: RoomState): GameState => changed(state, { roomById: { ...state.roomById, [room.roomId]: { ...room, visited: true, completed: true } } });

export function reduceGame(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "RUN_START": return action.payload;
    case "TAB_TOPOLOGY_SYNC": { const order = action.payload.orderedRoomIds.filter(id => state.roomById[id] && !state.roomById[id].destroyed); const moved = order.join() !== state.orderedRoomIds.join(); return moved ? changed(state, { orderedRoomIds: order, flags: { ...state.flags, tutorialMoveCompleted: true }, metrics: { ...state.metrics, tabMoves: state.metrics.tabMoves + 1 } }) : state; }
    case "MOVE_PLAYER": { if (state.status !== "active" && state.status !== "boss") return state; if (!canMoveTo(state, action.payload.toRoomId)) return state; const room = state.roomById[action.payload.toRoomId]; let next = changed(state, { player: { ...state.player, currentRoomId: room.roomId }, roomById: { ...state.roomById, [room.roomId]: { ...room, visited: true } } }); if (room.kind === "sanctum") next = { ...next, player: { ...next.player, hp: next.player.maxHp } }; if (room.kind === "boss") next = { ...next, status: "boss", flags: { ...next.flags, bossIntroduced: true } }; return next; }
    case "TAKE_BLADE": { const room = getCurrentRoom(state); if (!room || room.kind !== "armory" || state.player.hasBlade || room.completed) return state; return completeRoom(changed(state, { player: { ...state.player, hasBlade: true } }), room); }
    case "TAKE_SIGIL": { const room = getCurrentRoom(state); if (!room || room.kind !== "vault" || state.player.hasSigil || room.completed) return state; return completeRoom(changed(state, { player: { ...state.player, hasSigil: true }, flags: { ...state.flags, sigilAdjacencySatisfied: canBreakBossSeal({ ...state, player: { ...state.player, hasSigil: true } }) } }), room); }
    case "BREAK_SEAL": if (!canBreakBossSeal(state) || state.boss.shieldBroken || state.status !== "boss") return state; return changed(state, { boss: { ...state.boss, shieldBroken: true } });
    case "ATTACK_BOSS": if (state.status !== "boss" || !state.player.hasBlade || !state.boss.shieldBroken || state.boss.voidActive || state.boss.hp <= 0) return state; return changed(state, { boss: { ...state.boss, hp: state.boss.hp - 1 }, status: state.boss.hp === 1 ? "victory" : "boss", metrics: state.boss.hp === 1 ? { ...state.metrics, endedAt: Date.now() } : state.metrics });
    case "VOID_SPAWNED": { if (state.boss.voidActive || state.roomById[action.payload.roomId]) return state; const room: RoomState = { roomId: action.payload.roomId, kind: "void", tabId: action.payload.tabId, visited: true, destroyed: false, completed: false }; return changed(state, { roomById: { ...state.roomById, [room.roomId]: room }, roomIdByTabId: { ...state.roomIdByTabId, [String(room.tabId)]: room.roomId }, orderedRoomIds: [...state.orderedRoomIds, room.roomId], boss: { ...state.boss, voidActive: true, voidRoomId: room.roomId } }); }
    case "ROOM_CLOSED": { const r = state.roomById[action.payload.roomId]; if (!r || r.destroyed) return state; const map = { ...state.roomIdByTabId }; delete map[String(r.tabId)]; return changed(state, { roomById: { ...state.roomById, [r.roomId]: { ...r, destroyed: true } }, roomIdByTabId: map, orderedRoomIds: state.orderedRoomIds.filter(id => id !== r.roomId), metrics: { ...state.metrics, roomsClosed: state.metrics.roomsClosed + 1 } }); }
    case "VOID_CLOSED": if (!state.boss.voidActive) return state; return changed(state, { boss: { ...state.boss, voidActive: false, voidRoomId: null } });
    case "RUN_VICTORY": if (state.boss.hp !== 0) return state; return changed(state, { status: "victory", metrics: { ...state.metrics, endedAt: Date.now() } });
    case "RUN_RESET": return state.status === "idle" ? state : changed(state, { status: "idle" });
    default: return state;
  }
}
