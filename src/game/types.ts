export type RoomKind = "entrance" | "armory" | "sanctum" | "vault" | "boss" | "void";
export type RunStatus = "idle" | "onboarding" | "active" | "boss" | "victory" | "defeat";
export type RoomId = string;
export type RoomState = { roomId: RoomId; kind: RoomKind; tabId: number; visited: boolean; destroyed: boolean; completed: boolean };
export type GameState = { schemaVersion: 1; runId: string; status: RunStatus; groupId: number|null; windowId: number|null; roomById: Record<RoomId,RoomState>; roomIdByTabId: Record<string,RoomId>; orderedRoomIds: RoomId[]; player: { hp:number; maxHp:3; hasBlade:boolean; hasSigil:boolean; currentRoomId:RoomId }; boss:{hp:number;maxHp:number;shieldBroken:boolean;voidActive:boolean;voidRoomId:RoomId|null}; flags:{tutorialMoveCompleted:boolean;sigilAdjacencySatisfied:boolean;bossIntroduced:boolean}; metrics:{startedAt:number;endedAt:number|null;tabMoves:number;roomsClosed:number;actions:number}; revision:number };
export type GameAction = {type:"RUN_START";payload:GameState}|{type:"TAB_TOPOLOGY_SYNC";payload:{orderedRoomIds:RoomId[]}}|{type:"ROOM_CLOSED";payload:{roomId:RoomId}}|{type:"VOID_CLOSED"}|{type:"RUN_RESET"};
export type Message = {type:"GET_STATE"}|{type:"START_RUN"}|{type:"RESET_RUN"}|{type:"GAME_ACTION";action:GameAction};
