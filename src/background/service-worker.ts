import { activateRoomTab, activateRun, resetRun, restoreManagedTab, spawnVoid, startRun, syncTopology } from "./run-controller";
import { storage } from "../platform/chrome-storage";
import { reduceGame } from "../game/reducer";
import type { GameState, Message, RoomGameAction, RoomKind } from "../game/types";

let registered = false;
let reconcileTimer: ReturnType<typeof setTimeout> | undefined;
let mutationQueue: Promise<void> = Promise.resolve();

const roomActionTypes: Record<RoomKind, ReadonlySet<RoomGameAction["type"]>> = {
  entrance: new Set(["MOVE_PLAYER"]),
  armory: new Set(["MOVE_PLAYER", "TAKE_BLADE"]),
  sanctum: new Set(["MOVE_PLAYER", "RESTORE_HEALTH"]),
  vault: new Set(["MOVE_PLAYER", "TAKE_SIGIL"]),
  boss: new Set(["MOVE_PLAYER", "BREAK_SEAL", "ATTACK_BOSS"]),
  void: new Set(["MOVE_PLAYER"]),
};

function enqueueMutation<T>(task: () => Promise<T>): Promise<T> {
  const result = mutationQueue.then(task);
  mutationQueue = result.then(() => undefined, () => undefined);
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key) => keys.includes(key));
}

function parseRoomAction(value: unknown): RoomGameAction | null {
  if (!isRecord(value) || typeof value.type !== "string") return null;
  if (value.type === "MOVE_PLAYER") {
    if (!hasOnlyKeys(value, ["type", "payload"]) || !isRecord(value.payload) || !hasOnlyKeys(value.payload, ["toRoomId"]) || typeof value.payload.toRoomId !== "string" || value.payload.toRoomId.length === 0) return null;
    return { type: "MOVE_PLAYER", payload: { toRoomId: value.payload.toRoomId } };
  }
  if (!["RESTORE_HEALTH", "TAKE_BLADE", "TAKE_SIGIL", "BREAK_SEAL", "ATTACK_BOSS"].includes(value.type) || !hasOnlyKeys(value, ["type"])) return null;
  return { type: value.type } as RoomGameAction;
}

function parseMessage(value: unknown): Message | null {
  if (!isRecord(value) || typeof value.type !== "string") return null;
  if (value.type === "GET_STATE" || value.type === "START_RUN" || value.type === "RESET_RUN") return hasOnlyKeys(value, ["type"]) ? { type: value.type } : null;
  if (value.type === "ACTIVATE_RUN") {
    if (value.roomId === undefined && hasOnlyKeys(value, ["type"])) return { type: "ACTIVATE_RUN" };
    return typeof value.roomId === "string" && value.roomId.length > 0 && hasOnlyKeys(value, ["type", "roomId"]) ? { type: "ACTIVATE_RUN", roomId: value.roomId } : null;
  }
  if (value.type !== "GAME_ACTION" || typeof value.runId !== "string" || value.runId.length === 0 || !hasOnlyKeys(value, ["type", "runId", "action"])) return null;
  const action = parseRoomAction(value.action);
  return action ? { type: "GAME_ACTION", runId: value.runId, action } : null;
}

const managedRoom = async (tabId: number) => {
  const state = await storage.get();
  return state?.roomIdByTabId[String(tabId)] ? state : null;
};

function senderRoomId(state: GameState, sender: chrome.runtime.MessageSender): string | null {
  const tabId = sender.tab?.id;
  if (tabId === undefined) return null;
  const roomId = state.roomIdByTabId[String(tabId)];
  if (!roomId) return null;
  const senderUrl = sender.url ?? sender.tab?.url;
  if (!senderUrl) return null;
  try {
    const actual = new URL(senderUrl);
    const expected = new URL(chrome.runtime.getURL("room.html"));
    if (actual.protocol !== expected.protocol || actual.host !== expected.host || actual.pathname !== expected.pathname) return null;
    if (actual.searchParams.get("run") !== state.runId || actual.searchParams.get("room") !== roomId) return null;
  } catch {
    return null;
  }
  return roomId;
}

function isPopupSender(sender: chrome.runtime.MessageSender): boolean {
  if (!sender.url) return false;
  try {
    const actual = new URL(sender.url);
    const expected = new URL(chrome.runtime.getURL("popup.html"));
    return actual.protocol === expected.protocol && actual.host === expected.host && actual.pathname === expected.pathname;
  } catch {
    return false;
  }
}

const reconcile = () => {
  if (reconcileTimer) clearTimeout(reconcileTimer);
  reconcileTimer = setTimeout(() => {
    reconcileTimer = undefined;
    void enqueueMutation(async () => {
      await syncTopology();
    });
  }, 50);
};

async function onRemoved(tabId: number) {
  const state = await managedRoom(tabId);
  if (!state) return;
  const room = state.roomIdByTabId[String(tabId)];
  let next = reduceGame(state, { type: "ROOM_CLOSED", payload: { roomId: room } });
  if (room === state.boss.voidRoomId) next = reduceGame(next, { type: "VOID_CLOSED" });
  if (next.orderedRoomIds.length === 0) await storage.clear();
  else await storage.set(next);
}

async function handleGameAction(message: Extract<Message, { type: "GAME_ACTION" }>, sender: chrome.runtime.MessageSender) {
  const state = await storage.get();
  if (!state) return { error: "There is no active run." };
  if (message.runId !== state.runId) return { error: "That room belongs to an older run." };
  const roomId = senderRoomId(state, sender);
  const room = roomId ? state.roomById[roomId] : undefined;
  if (!room || room.destroyed) return { error: "This room is no longer managed." };
  if (roomId !== state.player.currentRoomId) return { error: "Only the active room can act." };
  if (!roomActionTypes[room.kind].has(message.action.type)) return { error: "That action does not belong in this room." };
  const next = reduceGame(state, message.action);
  if (next === state) return { error: "The dungeon rejected that action." };
  if (message.action.type === "BREAK_SEAL" && next !== state && next.boss.shieldBroken) return spawnVoid(next);
  await storage.set(next);
  if (message.action.type === "MOVE_PLAYER") await activateRoomTab(next);
  return next;
}

export function registerServiceWorkerListeners() {
  if (registered) return;
  registered = true;
  chrome.tabs.onMoved.addListener(() => reconcile());
  chrome.tabs.onRemoved.addListener((tabId) => void enqueueMutation(() => onRemoved(tabId)));
  chrome.tabs.onDetached.addListener((tabId) => void enqueueMutation(() => restoreManagedTab(tabId)));
  chrome.tabs.onAttached.addListener(() => reconcile());
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.groupId === -1 || tab.groupId === -1) void enqueueMutation(async () => { if (await managedRoom(tabId)) await restoreManagedTab(tabId); });
    else reconcile();
  });
}

export async function handleMessage(value: unknown, sender: chrome.runtime.MessageSender) {
  const message = parseMessage(value);
  if (!message) return undefined;
  if (message.type === "GET_STATE") return enqueueMutation(async () => {
    const state = await storage.get();
    if (!state || isPopupSender(sender) || senderRoomId(state, sender)) return state;
    return null;
  });
  if (message.type === "START_RUN") return isPopupSender(sender) ? enqueueMutation(startRun) : undefined;
  if (message.type === "RESET_RUN") return isPopupSender(sender) ? enqueueMutation(async () => { await resetRun(); return null; }) : undefined;
  if (message.type === "ACTIVATE_RUN") return isPopupSender(sender) ? enqueueMutation(() => activateRun(message.roomId)) : undefined;
  return enqueueMutation(() => handleGameAction(message, sender));
}

registerServiceWorkerListeners();
chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  void handleMessage(message, sender).then(sendResponse).catch((error: unknown) => sendResponse({ error: error instanceof Error ? error.message : String(error) }));
  return true;
});
