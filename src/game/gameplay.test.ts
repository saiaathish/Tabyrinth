import { describe, expect, it } from "vitest";
import { reduceGame } from "./reducer";
import { assertGameState } from "./invariants";
import { canBreakBossSeal, canMoveTo, getRoomNeighbors } from "./selectors";
import type { GameState } from "./types";

const makeState = (order = ["entrance", "armory", "sanctum", "vault", "boss"]): GameState => ({ schemaVersion: 1, runId: "test", status: "active", groupId: 1, windowId: 1, roomById: Object.fromEntries(order.map((roomId, tabId) => [roomId, { roomId, kind: roomId as GameState["roomById"][string]["kind"], tabId, visited: roomId === "entrance", destroyed: false, completed: false }])), roomIdByTabId: Object.fromEntries(order.map((roomId, tabId) => [String(tabId), roomId])), orderedRoomIds: order, player: { hp: 1, maxHp: 3, hasBlade: false, hasSigil: false, currentRoomId: "entrance" }, boss: { hp: 2, maxHp: 2, shieldBroken: false, voidActive: false, voidRoomId: null }, flags: { tutorialMoveCompleted: false, sigilAdjacencySatisfied: false, bossIntroduced: false }, metrics: { startedAt: 0, endedAt: null, tabMoves: 0, roomsClosed: 0, actions: 0 }, revision: 0 });

describe("pure gameplay loop", () => {
  it("starts onboarding on the first complete topology action", () => {
    const onboarding = { ...makeState(), status: "onboarding" as const };
    const next = reduceGame(onboarding, { type: "TAB_TOPOLOGY_SYNC", payload: { orderedRoomIds: ["entrance", "armory", "vault", "sanctum", "boss"] } });
    expect(next.status).toBe("active");
    expect(next.orderedRoomIds).toEqual(["entrance", "armory", "vault", "sanctum", "boss"]);
    expect(next.flags.tutorialMoveCompleted).toBe(true);
  });

  it("rejects topology sync that drops a live room", () => {
    const state = makeState();
    expect(reduceGame(state, { type: "TAB_TOPOLOGY_SYNC", payload: { orderedRoomIds: ["entrance", "armory", "boss"] } })).toBe(state);
  });

  it("moves only to adjacent rooms and grants Armory/Vault items", () => {
    let state = makeState();
    expect(reduceGame(state, { type: "MOVE_PLAYER", payload: { toRoomId: "vault" } })).toBe(state);
    state = reduceGame(state, { type: "MOVE_PLAYER", payload: { toRoomId: "armory" } });
    state = reduceGame(state, { type: "TAKE_BLADE" });
    expect(state.player.hasBlade).toBe(true);
    state = reduceGame(state, { type: "MOVE_PLAYER", payload: { toRoomId: "sanctum" } });
    expect(state.player.hp).toBe(3);
    state = reduceGame(state, { type: "MOVE_PLAYER", payload: { toRoomId: "vault" } });
    state = reduceGame(state, { type: "TAKE_SIGIL" });
    expect(state.player.hasSigil).toBe(true);
  });

  it("completes Sanctum restoration after entry heals to max health", () => {
    let state = makeState();
    state = reduceGame(state, { type: "MOVE_PLAYER", payload: { toRoomId: "armory" } });
    state = reduceGame(state, { type: "MOVE_PLAYER", payload: { toRoomId: "sanctum" } });
    expect(state.player.hp).toBe(state.player.maxHp);
    expect(state.roomById.sanctum.completed).toBe(false);

    const restored = reduceGame(state, { type: "RESTORE_HEALTH" });
    expect(restored.roomById.sanctum.completed).toBe(true);
    expect(reduceGame(restored, { type: "RESTORE_HEALTH" })).toBe(restored);
  });

  it("breaks seal, blocks attacks during Void, then wins on final hit", () => {
    let state = makeState();
    state = reduceGame(state, { type: "MOVE_PLAYER", payload: { toRoomId: "armory" } });
    state = reduceGame(state, { type: "TAKE_BLADE" });
    state = reduceGame(state, { type: "MOVE_PLAYER", payload: { toRoomId: "sanctum" } });
    state = reduceGame(state, { type: "MOVE_PLAYER", payload: { toRoomId: "vault" } });
    state = reduceGame(state, { type: "TAKE_SIGIL" });
    state = reduceGame(state, { type: "MOVE_PLAYER", payload: { toRoomId: "boss" } });
    state = reduceGame(state, { type: "BREAK_SEAL" });
    expect(state.boss.shieldBroken).toBe(true);
    state = reduceGame(state, { type: "VOID_SPAWNED", payload: { roomId: "void-rift", tabId: 5 } });
    expect(state.orderedRoomIds).toEqual(["entrance", "armory", "sanctum", "vault", "boss", "void-rift"]);
    expect(reduceGame(state, { type: "TAB_TOPOLOGY_SYNC", payload: { orderedRoomIds: ["entrance", "armory", "sanctum", "vault", "boss", "void-rift"] } })).toBe(state);
    expect(reduceGame(state, { type: "ATTACK_BOSS" })).toBe(state);
    state = reduceGame(state, { type: "VOID_CLOSED" });
    state = reduceGame(state, { type: "ATTACK_BOSS" });
    state = reduceGame(state, { type: "ATTACK_BOSS" });
    expect(state.status).toBe("victory");
    expect(state.boss.hp).toBe(0);
  });

  it("resets to idle without replaying a completed run", () => {
    const state = { ...makeState(), status: "victory" as const };
    const reset = reduceGame(state, { type: "RUN_RESET" });
    expect(reset.status).toBe("idle");
    expect(reduceGame(reset, { type: "ATTACK_BOSS" })).toBe(reset);
  });

  it("returns the same state for invalid actions", () => {
    const state = makeState();
    expect(reduceGame(state, { type: "TAKE_BLADE" })).toBe(state);
    expect(reduceGame(state, { type: "BREAK_SEAL" })).toBe(state);
    expect(reduceGame(state, { type: "RUN_VICTORY" })).toBe(state);
    expect(reduceGame(state, { type: "VOID_CLOSED" })).toBe(state);
  });

  it("keeps selectors and invariants aligned with managed topology", () => {
    const state = makeState();
    expect(getRoomNeighbors(state, "sanctum")).toEqual({ left: "armory", right: "vault" });
    expect(canMoveTo(state, "armory")).toBe(true);
    expect(canMoveTo(state, "boss")).toBe(false);
    expect(canBreakBossSeal(state)).toBe(false);
    expect(() => assertGameState(state)).not.toThrow();
    expect(() => assertGameState({ ...state, orderedRoomIds: ["entrance", "entrance"] })).toThrow("invalid topology");
    expect(() => assertGameState({ ...state, boss: { ...state.boss, hp: 3 } })).toThrow("invalid boss hp");
  });

  it("keeps invariants valid when the current room is destroyed", () => {
    const state = makeState();
    const next = reduceGame(state, { type: "ROOM_CLOSED", payload: { roomId: "entrance" } });
    expect(next.player.currentRoomId).toBe("armory");
    expect(() => assertGameState(next)).not.toThrow();
  });
});
