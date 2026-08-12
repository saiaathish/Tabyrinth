import { describe, expect, it } from "vitest";
import { reduceGame } from "./reducer";
import { assertGameState } from "./invariants";
import { canBreakBossSeal, canMoveTo, getRoomNeighbors } from "./selectors";
import type { GameState } from "./types";

const makeState = (order = ["entrance", "armory", "sanctum", "vault", "boss"]): GameState => ({ schemaVersion: 1, runId: "test", status: "active", groupId: 1, windowId: 1, roomById: Object.fromEntries(order.map((roomId, tabId) => [roomId, { roomId, kind: roomId as GameState["roomById"][string]["kind"], tabId, visited: roomId === "entrance", destroyed: false, completed: false }])), roomIdByTabId: Object.fromEntries(order.map((roomId, tabId) => [String(tabId), roomId])), orderedRoomIds: order, player: { hp: 1, maxHp: 3, hasBlade: false, hasSigil: false, currentRoomId: "entrance" }, boss: { hp: 2, maxHp: 2, shieldBroken: false, voidActive: false, voidRoomId: null }, flags: { tutorialMoveCompleted: false, sigilAdjacencySatisfied: false, bossIntroduced: false }, metrics: { startedAt: 0, endedAt: null, tabMoves: 0, roomsClosed: 0, actions: 0 }, revision: 0 });

describe("pure gameplay loop", () => {
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
    expect(reduceGame(state, { type: "ATTACK_BOSS" })).toBe(state);
    state = reduceGame(state, { type: "VOID_CLOSED" });
    state = reduceGame(state, { type: "ATTACK_BOSS" });
    state = reduceGame(state, { type: "ATTACK_BOSS" });
    expect(state.status).toBe("victory");
    expect(state.boss.hp).toBe(0);
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
});
