import { activateRoomTab, activateRun, resetRun, restoreManagedTab, spawnVoid, startRun, syncTopology } from "./run-controller";
import { storage } from "../platform/chrome-storage";
import { reduceGame } from "../game/reducer";
import type { GameState, Message, RoomGameAction, RoomKind } from "../game/types";
import { handleQuestMessage, handleQuestTabRemoved, isQuestMessage, reconcileQuestSession, restoreQuestTab, restoreQuestWorkspace } from "../quest/runtime";
import { parsePortalMessage } from "../portal/messages";
import { beginPortalQuest, capturePortalCreated, capturePortalRemoved, capturePortalUpdated, deletePortal, finishActivePortalQuest, foldPortal, getPortalState, markPortalPath, renamePortal, savePortalLoot, unsealPortal } from "../portal/runtime";
import { portalStorage } from "../portal/storage";
import { portalReducer } from "../portal/reducer";

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

function isPortalSender(sender: chrome.runtime.MessageSender): boolean {
  if (!sender.url) return false;
  try {
    const actual = new URL(sender.url);
    return ["portal.html", "sidepanel.html"].some((page) => {
      const expected = new URL(chrome.runtime.getURL(page));
      return actual.protocol === expected.protocol && actual.host === expected.host && actual.pathname === expected.pathname;
    });
  } catch { return false; }
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

const reconcileQuest = () => {
  void enqueueMutation(async () => { await reconcileQuestSession(); await restoreQuestWorkspace(); });
};

async function onRemoved(tabId: number) {
  const portalSession = await portalStorage.getSession();
  const portalId = Object.entries(portalSession.portalTabIds).find(([, id]) => id === tabId)?.[0];
  if (portalId) {
    delete portalSession.portalTabIds[portalId];
    await portalStorage.setSession(portalSession);
    const portalState = await portalStorage.get();
    const removedPortal = portalState.portals[portalId];
    if (removedPortal?.status === "sealed" || removedPortal?.status === "error") await portalStorage.set(portalReducer(portalState, { type: "PORTAL_TAB_LOST", portalId }));
  }
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
  if (message.action.type === "MOVE_PLAYER") {
    await activateRoomTab(next);
    try {
      await storage.set(next);
    } catch (error) {
      await activateRoomTab(state).catch(() => false);
      throw error;
    }
  } else {
    await storage.set(next);
  }
  return next;
}

export function registerServiceWorkerListeners() {
  if (registered) return;
  registered = true;
  chrome.action?.onClicked?.addListener((tab) => { if (tab.windowId !== undefined) void chrome.sidePanel?.open({ windowId: tab.windowId }); });
  chrome.tabs.onMoved.addListener(() => reconcile());
  chrome.tabs.onActivated?.addListener(() => reconcile());
  chrome.tabs.onRemoved.addListener((tabId) => void enqueueMutation(async () => { await onRemoved(tabId); await handleQuestTabRemoved(tabId); await capturePortalRemoved(tabId); }));
  chrome.tabs.onCreated?.addListener((tab) => void enqueueMutation(() => capturePortalCreated(tab)));
  chrome.tabs.onDetached.addListener((tabId) => void enqueueMutation(async () => { await restoreManagedTab(tabId); await restoreQuestTab(tabId); }));
  chrome.tabs.onAttached.addListener((tabId) => { reconcile(); void enqueueMutation(async () => { await restoreQuestTab(tabId); }); });
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab.url || tab.title || tab.favIconUrl) void enqueueMutation(() => capturePortalUpdated(tabId, tab));
    if (changeInfo.groupId !== undefined || tab.groupId === -1 || tab.windowId !== undefined) void enqueueMutation(async () => { if (await managedRoom(tabId)) await restoreManagedTab(tabId); await restoreQuestTab(tabId); });
    else reconcile();
  });
  chrome.runtime.onStartup?.addListener(reconcileQuest);
  chrome.runtime.onInstalled?.addListener(reconcileQuest);
  reconcileQuest();
}

export async function handleMessage(value: unknown, sender: chrome.runtime.MessageSender) {
  if (isQuestMessage(value)) return enqueueMutation(() => handleQuestMessage(value, sender));
  const portalMessage = parsePortalMessage(value);
  if (portalMessage) {
    if (!isPortalSender(sender)) return undefined;
    return enqueueMutation(async () => {
      if (portalMessage.type === "PORTAL_GET") return getPortalState();
      if (portalMessage.type === "PORTAL_BEGIN") return beginPortalQuest(portalMessage.title);
      if (portalMessage.type === "PORTAL_FINISH") return finishActivePortalQuest(portalMessage.questId);
      if (portalMessage.type === "PORTAL_MARK_PATH") return markPortalPath(portalMessage.nodeId);
      if (portalMessage.type === "PORTAL_SAVE_LOOT") return savePortalLoot(portalMessage.nodeId, portalMessage.note, portalMessage.close);
      if (portalMessage.type === "PORTAL_RENAME") return renamePortal(portalMessage.portalId, portalMessage.title);
      if (portalMessage.type === "PORTAL_DELETE") return deletePortal(portalMessage.portalId);
      if (portalMessage.type === "PORTAL_FOLD") return foldPortal(portalMessage.questId, portalMessage.currentNodeId);
      return unsealPortal(portalMessage.portalId);
    });
  }
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
