import type {GameState,RoomId,RoomState} from "./types";
export const getOrderedRooms=(s:GameState)=>s.orderedRoomIds.map(id=>s.roomById[id]).filter(Boolean) as RoomState[];
export const getRoomNeighbors=(s:GameState,id:RoomId)=>{const i=s.orderedRoomIds.indexOf(id);return {left:i>0?s.orderedRoomIds[i-1]:null,right:i>=0&&i<s.orderedRoomIds.length-1?s.orderedRoomIds[i+1]:null};};
export const isAdjacent=(s:GameState,a:RoomId,b:RoomId)=>{const n=getRoomNeighbors(s,a);return n.left===b||n.right===b;};
export const canBreakBossSeal=(s:GameState)=>s.player.hasSigil&&s.orderedRoomIds.indexOf("vault")===s.orderedRoomIds.indexOf("boss")-1;
export const getCurrentRoom=(s:GameState)=>s.roomById[s.player.currentRoomId];
export const canMoveTo=(s:GameState,id:RoomId)=>Boolean(s.roomById[id]&&!s.roomById[id].destroyed&&isAdjacent(s,s.player.currentRoomId,id));
