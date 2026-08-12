import { INITIAL_ROOMS } from "../game/constants";
import { assertGameState } from "../game/invariants";
import { reduceGame } from "../game/reducer";
import { storage } from "../platform/chrome-storage";
import { tabsAdapter } from "../platform/chrome-tabs";
import type { GameState } from "../game/types";

const uid = () => crypto.randomUUID();

export async function startRun(): Promise<GameState> {
  const existing = await storage.get();
  if (existing && existing.status !== "idle") return existing;
  const win = (await tabsAdapter.query({ active: true, currentWindow: true }))[0]?.windowId ?? -1;
  const runId = uid();
  const created = await Promise.all(INITIAL_ROOMS.map((room) => tabsAdapter.create(chrome.runtime.getURL(`room.html?run=${runId}&room=${room.roomId}`))));
  const ids = created.map((tab) => tab.id as number);
  const groupId = await tabsAdapter.group(ids) as number;
  await tabsAdapter.updateGroup(groupId, "TABYRINTH");
  const roomById = Object.fromEntries(INITIAL_ROOMS.map((room, index) => [room.roomId, { ...room, tabId: ids[index]!, visited: room.roomId === "entrance", destroyed: false, completed: false }])) as GameState["roomById"];
  const state: GameState = { schemaVersion: 1, runId, status: "onboarding", groupId, windowId: win, roomById, roomIdByTabId: Object.fromEntries(ids.map((id, index) => [String(id), INITIAL_ROOMS[index]!.roomId])), orderedRoomIds: INITIAL_ROOMS.map((room) => room.roomId), player: { hp: 3, maxHp: 3, hasBlade: false, hasSigil: false, currentRoomId: "entrance" }, boss: { hp: 3, maxHp: 3, shieldBroken: false, voidActive: false, voidRoomId: null }, flags: { tutorialMoveCompleted: false, sigilAdjacencySatisfied: false, bossIntroduced: false }, metrics: { startedAt: Date.now(), endedAt: null, tabMoves: 0, roomsClosed: 0, actions: 0 }, revision: 0 };
  const managed = await tabsAdapter.query({ groupId });
  const actualOrder = managed.sort((a, b) => (a.index ?? 0) - (b.index ?? 0)).map((tab) => state.roomIdByTabId[String(tab.id)]).filter((id): id is string => Boolean(id));
  const orderedState = actualOrder.length === ids.length ? reduceGame(state, { type: "TAB_TOPOLOGY_SYNC", payload: { orderedRoomIds: actualOrder } }) : state;
  assertGameState(orderedState); await storage.set(orderedState); return orderedState;
}

export async function activateRun(roomId?: string): Promise<{ state: GameState | null; activated: boolean }> {
  const state = await storage.get();
  if (!state) return { state: null, activated: false };
  const target = roomId && state.roomById[roomId] ? state.roomById[roomId] : state.roomById[state.player.currentRoomId];
  if (!target || target.destroyed) return { state, activated: false };
  await tabsAdapter.update(target.tabId, { active: true }); return { state, activated: true };
}

export async function syncTopology(): Promise<GameState | null> {
  const state = await storage.get(); if (!state || !state.groupId) return state;
  const managed = await tabsAdapter.query({ groupId: state.groupId });
  const ordered = managed.sort((a, b) => (a.index ?? 0) - (b.index ?? 0)).map((tab) => state.roomIdByTabId[String(tab.id)]).filter((id): id is string => Boolean(id));
  const known = state.orderedRoomIds.filter((id) => !state.roomById[id].destroyed);
  if (ordered.length !== known.length) return state;
  const next = reduceGame(state, { type: "TAB_TOPOLOGY_SYNC", payload: { orderedRoomIds: ordered } }); assertGameState(next); if (next !== state) await storage.set(next); return next;
}

export async function restoreManagedTab(tabId:number): Promise<boolean> {
  const state=await storage.get(); const room=state?.roomIdByTabId[String(tabId)];
  if(!state||!room||state.groupId===null) return false;
  try { await tabsAdapter.move([tabId], 0, state.windowId ?? undefined); await tabsAdapter.group([tabId],state.groupId); await syncTopology(); return true; } catch { return false; }
}

export async function spawnVoid(state: GameState): Promise<GameState> {
  if (state.boss.voidActive || state.boss.voidRoomId) return state;
  const boss = state.roomById[state.orderedRoomIds.find((id) => state.roomById[id]?.kind === "boss") ?? ""];
  const url = chrome.runtime.getURL(`room.html?run=${state.runId}&room=void-rift`);
  const created = await tabsAdapter.create(url);
  await tabsAdapter.update(created.id, { pinned: false, active: false });
  if (boss) {
    const bossTab = await tabsAdapter.get(boss.tabId);
    await tabsAdapter.move([created.id], (bossTab.index ?? 0) + 1);
  }
  await tabsAdapter.group([created.id], state.groupId ?? undefined);
  const next = reduceGame(state, { type: "VOID_SPAWNED", payload: { roomId: "void-rift", tabId: created.id } });
  assertGameState(next); await storage.set(next);
  return (await syncTopology()) ?? next;
}

export async function resetRun(): Promise<void> {
  const state = await storage.get(); if (!state) return;
  const ids = Object.values(state.roomById).filter((room) => !room.destroyed).map((room) => room.tabId);
  await storage.clear();
  if (ids.length) await tabsAdapter.remove(ids);
}
