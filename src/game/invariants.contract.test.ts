import { describe, expect, it } from "vitest";
import { assertGameState } from "./invariants";
import type { GameState, RoomKind } from "./types";

const roomKinds: Record<string, RoomKind> = {
  entrance: "entrance",
  armory: "armory",
  sanctum: "sanctum",
  vault: "vault",
  boss: "boss",
};

const makeState = (): GameState => {
  const ids = ["entrance", "armory", "sanctum", "vault", "boss"];
  return {
    schemaVersion: 1,
    runId: "run",
    status: "active",
    groupId: 7,
    windowId: 1,
    roomById: Object.fromEntries(ids.map((roomId, index) => [roomId, { roomId, kind: roomKinds[roomId]!, tabId: index + 11, visited: roomId === "entrance", destroyed: false, completed: false }])),
    roomIdByTabId: Object.fromEntries(ids.map((roomId, index) => [String(index + 11), roomId])),
    orderedRoomIds: ids,
    player: { hp: 3, maxHp: 3, hasBlade: false, hasSigil: false, currentRoomId: "entrance" },
    boss: { hp: 3, maxHp: 3, shieldBroken: false, voidActive: false, voidRoomId: null },
    flags: { tutorialMoveCompleted: false, sigilAdjacencySatisfied: false, bossIntroduced: false },
    metrics: { startedAt: 1, endedAt: null, tabMoves: 0, roomsClosed: 0, actions: 0 },
    revision: 0,
  };
};

describe("persisted game-state invariants", () => {
  it("accepts a complete bidirectional managed-tab registry", () => {
    expect(() => assertGameState(makeState())).not.toThrow();
  });

  it("rejects missing and forged reverse tab mappings", () => {
    const missing = makeState();
    delete missing.roomIdByTabId["12"];
    expect(() => assertGameState(missing)).toThrow(/reverse tab mapping|tab mapping count/);

    const forged = makeState();
    forged.roomIdByTabId["12"] = "vault";
    expect(() => assertGameState(forged)).toThrow(/reverse tab mapping|invalid tab mapping/);
  });

  it("requires active Void state to name one fully registered live Void room", () => {
    const missingVoid = makeState();
    missingVoid.boss = { ...missingVoid.boss, voidActive: true, voidRoomId: "void-rift" };
    expect(() => assertGameState(missingVoid)).toThrow("void state missing room");

    const inactiveVoid = makeState();
    inactiveVoid.roomById["void-rift"] = { roomId: "void-rift", kind: "void", tabId: 20, visited: true, destroyed: false, completed: false };
    inactiveVoid.roomIdByTabId["20"] = "void-rift";
    inactiveVoid.orderedRoomIds.push("void-rift");
    expect(() => assertGameState(inactiveVoid)).toThrow("inactive void is still registered");
  });
});
