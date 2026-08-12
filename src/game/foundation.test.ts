import { describe, expect, it } from "vitest";
import { canBreakBossSeal, getRoomNeighbors, isAdjacent } from "./selectors";
import { reduceGame } from "./reducer";
import type { GameState } from "./types";

const state = (order = ["entrance", "armory", "sanctum", "vault", "boss"]): GameState => ({ schemaVersion: 1, runId: "test", status: "active", groupId: 1, windowId: 1, roomById: Object.fromEntries(order.map((roomId, tabId) => [roomId, { roomId, kind: roomId === "boss" ? "boss" : "entrance", tabId, visited: true, destroyed: false, completed: false }])), roomIdByTabId: Object.fromEntries(order.map((roomId, tabId) => [String(tabId), roomId])), orderedRoomIds: order, player: { hp: 3, maxHp: 3, hasBlade: false, hasSigil: true, currentRoomId: "entrance" }, boss: { hp: 3, maxHp: 3, shieldBroken: false, voidActive: false, voidRoomId: null }, flags: { tutorialMoveCompleted: false, sigilAdjacencySatisfied: false, bossIntroduced: false }, metrics: { startedAt: 0, endedAt: null, tabMoves: 0, roomsClosed: 0, actions: 0 }, revision: 0 });

describe("foundation topology", () => {
  it("recomputes neighbors after a real order sync", () => { const next = reduceGame(state(), { type: "TAB_TOPOLOGY_SYNC", payload: { orderedRoomIds: ["entrance", "vault", "armory", "sanctum", "boss"] } }); expect(getRoomNeighbors(next, "vault")).toEqual({ left: "entrance", right: "armory" }); expect(next.metrics.tabMoves).toBe(1); });
  it("gates boss seal on adjacency", () => { expect(isAdjacent(state(), "vault", "boss")).toBe(true); expect(canBreakBossSeal(state())).toBe(true); expect(canBreakBossSeal(state(["entrance", "boss", "vault", "armory", "sanctum"]))).toBe(false); });
  it("ignores unknown closed room", () => { const current = state(); expect(reduceGame(current, { type: "ROOM_CLOSED", payload: { roomId: "unrelated" } })).toBe(current); });
  it("isolates a managed room close", () => { const current = state(); const next = reduceGame(current, { type: "ROOM_CLOSED", payload: { roomId: "vault" } }); expect(next.orderedRoomIds).toEqual(["entrance", "armory", "sanctum", "boss"]); expect(next.roomIdByTabId["3"]).toBeUndefined(); expect(next.roomById.vault.destroyed).toBe(true); });
  it("clears only void state when void tab closes", () => { const current = {...state(), boss: {...state().boss, voidActive: true, voidRoomId: "void"}}; const next = reduceGame(current, {type: "VOID_CLOSED"}); expect(next.boss.voidActive).toBe(false); expect(next.orderedRoomIds).toEqual(current.orderedRoomIds); });
});
