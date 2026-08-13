import type { GameState, RoomKind, RunStatus } from "./types";

const roomKinds = new Set<RoomKind>(["entrance", "armory", "sanctum", "vault", "boss", "void"]);
const runStatuses = new Set<RunStatus>(["idle", "onboarding", "active", "boss", "victory", "defeat"]);

function record(value: unknown, name: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`invalid ${name}`);
  return value as Record<string, unknown>;
}

function finiteNumber(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`invalid ${name}`);
  return value;
}

function nonNegativeInteger(value: unknown, name: string): number {
  const number = finiteNumber(value, name);
  if (!Number.isInteger(number) || number < 0) throw new Error(`invalid ${name}`);
  return number;
}

function boolean(value: unknown, name: string): boolean {
  if (typeof value !== "boolean") throw new Error(`invalid ${name}`);
  return value;
}

function nonEmptyString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`invalid ${name}`);
  return value;
}

export function assertGameState(value: unknown): asserts value is GameState {
  const raw = record(value, "game state");
  if (raw.schemaVersion !== 1) throw new Error("invalid schema version");
  nonEmptyString(raw.runId, "run id");
  if (typeof raw.status !== "string" || !runStatuses.has(raw.status as RunStatus)) throw new Error("invalid run status");
  if (raw.groupId !== null) nonNegativeInteger(raw.groupId, "group id");
  if (raw.windowId !== null) nonNegativeInteger(raw.windowId, "window id");

  const roomById = record(raw.roomById, "room registry");
  const roomIdByTabId = record(raw.roomIdByTabId, "tab registry");
  if (!Array.isArray(raw.orderedRoomIds) || raw.orderedRoomIds.some((id) => typeof id !== "string" || id.length === 0)) throw new Error("invalid topology");

  for (const [id, value] of Object.entries(roomById)) {
    const room = record(value, `room ${id}`);
    if (nonEmptyString(room.roomId, "room id") !== id) throw new Error("room registry key mismatch");
    if (typeof room.kind !== "string" || !roomKinds.has(room.kind as RoomKind)) throw new Error("invalid room kind");
    nonNegativeInteger(room.tabId, "room tab id");
    boolean(room.visited, "room visited flag");
    boolean(room.destroyed, "room destroyed flag");
    boolean(room.completed, "room completed flag");
  }

  for (const [tabId, roomId] of Object.entries(roomIdByTabId)) {
    nonEmptyString(tabId, "tab registry key");
    nonEmptyString(roomId, "tab registry room id");
  }

  const player = record(raw.player, "player");
  nonNegativeInteger(player.hp, "player hp");
  if (player.maxHp !== 3) throw new Error("invalid player max hp");
  boolean(player.hasBlade, "blade flag");
  boolean(player.hasSigil, "sigil flag");
  nonEmptyString(player.currentRoomId, "player room");

  const boss = record(raw.boss, "boss");
  nonNegativeInteger(boss.hp, "boss hp");
  const bossMaxHp = nonNegativeInteger(boss.maxHp, "boss max hp");
  if (bossMaxHp === 0) throw new Error("invalid boss max hp");
  boolean(boss.shieldBroken, "boss shield flag");
  boolean(boss.voidActive, "void active flag");
  if (boss.voidRoomId !== null) nonEmptyString(boss.voidRoomId, "void room id");

  const flags = record(raw.flags, "flags");
  boolean(flags.tutorialMoveCompleted, "tutorial flag");
  boolean(flags.sigilAdjacencySatisfied, "sigil adjacency flag");
  boolean(flags.bossIntroduced, "boss introduced flag");

  const metrics = record(raw.metrics, "metrics");
  nonNegativeInteger(metrics.startedAt, "start time");
  if (metrics.endedAt !== null) nonNegativeInteger(metrics.endedAt, "end time");
  nonNegativeInteger(metrics.tabMoves, "tab move count");
  nonNegativeInteger(metrics.roomsClosed, "room close count");
  nonNegativeInteger(metrics.actions, "action count");
  nonNegativeInteger(raw.revision, "revision");

  const state = value as GameState;
  const roomEntries = Object.entries(state.roomById);
  if (roomEntries.length > 6) throw new Error("too many managed rooms");
  const liveRoomIds = roomEntries.filter(([, room]) => !room.destroyed).map(([id]) => id);
  if (liveRoomIds.length > 6) throw new Error("too many live rooms");
  if (state.orderedRoomIds.length !== liveRoomIds.length || new Set(state.orderedRoomIds).size !== liveRoomIds.length) throw new Error("invalid topology");
  if (liveRoomIds.some((id) => !state.orderedRoomIds.includes(id))) throw new Error("incomplete topology");

  for (const [id, room] of roomEntries) {
    const mappedId = state.roomIdByTabId[String(room.tabId)];
    if (room.destroyed) {
      if (mappedId !== undefined || state.orderedRoomIds.includes(id)) throw new Error("destroyed room is still registered");
    } else if (mappedId !== id) {
      throw new Error("missing reverse tab mapping");
    }
  }

  if (Object.keys(state.roomIdByTabId).length !== liveRoomIds.length) throw new Error("invalid tab mapping count");
  for (const [tabId, id] of Object.entries(state.roomIdByTabId)) {
    const room = state.roomById[id];
    if (!room || room.destroyed || String(room.tabId) !== tabId) throw new Error("invalid tab mapping");
  }

  if (state.boss.hp > state.boss.maxHp) throw new Error("invalid boss hp");
  if (state.player.hp > state.player.maxHp) throw new Error("invalid player hp");
  const playerRoom = state.roomById[state.player.currentRoomId];
  if (!playerRoom || playerRoom.destroyed) throw new Error("invalid player room");

  const liveVoidRooms = roomEntries.filter(([, room]) => room.kind === "void" && !room.destroyed);
  if (state.boss.voidActive) {
    if (state.boss.voidRoomId === null || liveVoidRooms.length !== 1) throw new Error("void state missing room");
    const voidRoom = state.roomById[state.boss.voidRoomId];
    if (!voidRoom || voidRoom.destroyed || voidRoom.kind !== "void") throw new Error("invalid void room");
    if (state.roomIdByTabId[String(voidRoom.tabId)] !== state.boss.voidRoomId || !state.orderedRoomIds.includes(state.boss.voidRoomId)) throw new Error("invalid void mapping");
  } else if (state.boss.voidRoomId !== null || liveVoidRooms.length !== 0) {
    throw new Error("inactive void is still registered");
  }
}
