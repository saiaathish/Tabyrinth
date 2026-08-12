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
  const win = (await tabsAdapter.query({ active: true, currentWindow: true }))[0]?.windowId ?? null;
  const runId = uid();
  const createdIds: number[] = [];
  try {
    const created = [];
    for (const room of INITIAL_ROOMS) {
      const tab = await tabsAdapter.create(chrome.runtime.getURL(`room.html?run=${runId}&room=${room.roomId}`));
      created.push(tab);
      createdIds.push(tab.id);
    }
    const ids = created.map((tab) => tab.id);
    const groupId = await tabsAdapter.group(ids) as number;
    await tabsAdapter.updateGroup(groupId, "TABYRINTH");
    const roomById = Object.fromEntries(INITIAL_ROOMS.map((room, index) => [room.roomId, { ...room, tabId: ids[index]!, visited: room.roomId === "entrance", destroyed: false, completed: false }])) as GameState["roomById"];
    const state: GameState = { schemaVersion: 1, runId, status: "onboarding", groupId, windowId: created[0]?.windowId ?? win, roomById, roomIdByTabId: Object.fromEntries(ids.map((id, index) => [String(id), INITIAL_ROOMS[index]!.roomId])), orderedRoomIds: INITIAL_ROOMS.map((room) => room.roomId), player: { hp: 3, maxHp: 3, hasBlade: false, hasSigil: false, currentRoomId: "entrance" }, boss: { hp: 3, maxHp: 3, shieldBroken: false, voidActive: false, voidRoomId: null }, flags: { tutorialMoveCompleted: false, sigilAdjacencySatisfied: false, bossIntroduced: false }, metrics: { startedAt: Date.now(), endedAt: null, tabMoves: 0, roomsClosed: 0, actions: 0 }, revision: 0 };
    const managed = await tabsAdapter.query({ groupId });
    const actualOrder = managed.sort((a, b) => (a.index ?? 0) - (b.index ?? 0)).map((tab) => state.roomIdByTabId[String(tab.id)]).filter((id): id is string => Boolean(id));
    const orderedState = actualOrder.length === ids.length ? reduceGame(state, { type: "TAB_TOPOLOGY_SYNC", payload: { orderedRoomIds: actualOrder } }) : state;
    assertGameState(orderedState);
    await storage.set(orderedState);
    if (!await activateRoomTab(orderedState, "entrance")) throw new Error("Entrance tab is unavailable");
    return orderedState;
  } catch (error) {
    const persisted = await storage.get();
    if (persisted?.runId === runId) await storage.clear();
    if (createdIds.length) await tabsAdapter.remove(createdIds).catch(() => undefined);
    throw error;
  }
}

export async function activateRoomTab(state: GameState, roomId = state.player.currentRoomId): Promise<boolean> {
  const target = state.roomById[roomId];
  if (!target || target.destroyed) return false;
  await tabsAdapter.update(target.tabId, { active: true });
  return true;
}

export async function activateRun(roomId?: string): Promise<{ state: GameState | null; activated: boolean }> {
  const state = await storage.get();
  if (!state) return { state: null, activated: false };
  const targetRoomId = roomId && state.roomById[roomId] ? roomId : state.player.currentRoomId;
  return { state, activated: await activateRoomTab(state, targetRoomId) };
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
  try {
    const tab = await tabsAdapter.get(tabId);
    if (state.windowId !== null && tab.windowId !== state.windowId) await tabsAdapter.move([tabId], 0, state.windowId);
    await tabsAdapter.group([tabId],state.groupId);
    await syncTopology();
    return true;
  } catch { return false; }
}

export async function spawnVoid(state: GameState): Promise<GameState> {
  if (state.boss.voidActive || state.boss.voidRoomId) return state;
  if (state.groupId === null) throw new Error("Cannot breach a run without a managed tab group.");
  const boss = state.roomById[state.orderedRoomIds.find((id) => state.roomById[id]?.kind === "boss") ?? ""];
  const url = chrome.runtime.getURL(`room.html?run=${state.runId}&room=void-rift`);
  const created = await tabsAdapter.create(url);
  try {
    await tabsAdapter.update(created.id, { pinned: false, active: false });
    if (boss) {
      const bossTab = await tabsAdapter.get(boss.tabId);
      await tabsAdapter.move([created.id], (bossTab.index ?? 0) + 1);
    }
    await tabsAdapter.group([created.id], state.groupId);
    const next = reduceGame(state, { type: "VOID_SPAWNED", payload: { roomId: "void-rift", tabId: created.id } });
    assertGameState(next); await storage.set(next);
    return (await syncTopology()) ?? next;
  } catch (error) {
    await tabsAdapter.remove([created.id]).catch(() => undefined);
    throw error;
  }
}

export async function resetRun(): Promise<void> {
  const state = await storage.get(); if (!state) return;
  const ids = Object.values(state.roomById).filter((room) => !room.destroyed).map((room) => room.tabId);
  await storage.clear();
  if (ids.length) await tabsAdapter.remove(ids);
}
