import { reduceQuest } from "./reducer";
import { questStorage } from "./storage";
import { createQuestSession, questSessionStorage, type QuestSession, type QuestTabBinding } from "./session";
import type { ContextRoom, Quest, QuestState, SavedTab, SideQuest } from "./types";
import type { QuestMessage, QuestSnapshot } from "./messages";

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const nonEmpty = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const optionalString = (value: unknown): boolean => value === undefined || typeof value === "string";
const stringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === "string");
const onlyKeys = (value: Record<string, unknown>, allowed: readonly string[]): boolean => Object.keys(value).every((key) => allowed.includes(key));
const exactKeys = (value: Record<string, unknown>, expected: readonly string[]): boolean => Object.keys(value).length === expected.length && onlyKeys(value, expected);
const id = () => crypto.randomUUID();
const QUEST_GROUP_TITLE = "TABYRINTH QUEST";
type ReusableTab = { tab: chrome.tabs.Tab; groupId: number };

export function isQuestMessage(value: unknown): value is QuestMessage {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  if (value.type === "GET_QUEST_STATE" || value.type === "RESET_QUEST_SESSION") return exactKeys(value, ["type"]);
  if (value.type === "CREATE_QUEST") return onlyKeys(value, ["type", "title", "description", "rooms"]) && nonEmpty(value.title) && optionalString(value.description) && Array.isArray(value.rooms) && value.rooms.length > 0 && value.rooms.every((room) => isRecord(room) && exactKeys(room, ["title", "objective"]) && nonEmpty(room.title) && nonEmpty(room.objective));
  if (value.type === "CREATE_ROOM") return exactKeys(value, ["type", "questId", "title", "objective"]) && nonEmpty(value.questId) && nonEmpty(value.title) && nonEmpty(value.objective);
  if (["ENTER_CONTEXT_ROOM", "ADD_CURRENT_TAB", "OPEN_SIDE_QUEST", "DELETE_SIDE_QUEST"].includes(value.type)) return exactKeys(value, ["type", "questId", value.type === "OPEN_SIDE_QUEST" || value.type === "DELETE_SIDE_QUEST" ? "sideQuestId" : "roomId"]) && nonEmpty(value.questId) && nonEmpty(value.type === "OPEN_SIDE_QUEST" || value.type === "DELETE_SIDE_QUEST" ? value.sideQuestId : value.roomId);
  if (["LEAVE_CONTEXT_ROOM", "CHECKPOINT_CONTEXT_ROOM"].includes(value.type)) return onlyKeys(value, ["type", "questId", "roomId", "notes"]) && nonEmpty(value.questId) && nonEmpty(value.roomId) && (value.notes === undefined || stringArray(value.notes));
  if (value.type === "STASH_CONTEXT_TAB") return exactKeys(value, ["type", "questId", "roomId", "savedTabId"]) && nonEmpty(value.questId) && nonEmpty(value.roomId) && nonEmpty(value.savedTabId);
  if (value.type === "CAPTURE_LOOT" || value.type === "SAVE_SIDE_QUEST") return onlyKeys(value, ["type", "questId", "roomId", "note"]) && nonEmpty(value.questId) && nonEmpty(value.roomId) && optionalString(value.note);
  if (value.type === "ADD_NOTE_LOOT") return exactKeys(value, ["type", "questId", "roomId", "title", "note"]) && nonEmpty(value.questId) && nonEmpty(value.roomId) && nonEmpty(value.title) && nonEmpty(value.note);
  if (value.type === "MOVE_SIDE_QUEST") return exactKeys(value, ["type", "questId", "sideQuestId", "roomId"]) && nonEmpty(value.questId) && nonEmpty(value.sideQuestId) && nonEmpty(value.roomId);
  if (value.type === "CLEAR_CONTEXT_ROOM") return exactKeys(value, ["type", "questId", "roomId"]) && nonEmpty(value.questId) && nonEmpty(value.roomId);
  return false;
}

function senderIsPopup(sender: chrome.runtime.MessageSender): boolean {
  if (!sender.url) return false;
  try {
    const actual = new URL(sender.url);
    const expected = new URL(chrome.runtime.getURL("popup.html"));
    return actual.protocol === expected.protocol && actual.host === expected.host && actual.pathname === expected.pathname;
  } catch { return false; }
}

function usableUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch { return false; }
}

async function activeBrowserTab(): Promise<chrome.tabs.Tab> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs.find((candidate) => candidate.id !== undefined && usableUrl(candidate.url));
  if (!tab || tab.id === undefined || !usableUrl(tab.url)) throw new Error("The active tab is not a savable browser page.");
  return tab;
}


function roomForMessage(state: QuestState, questId: string, roomId: string): ContextRoom {
  const room = state.rooms[roomId];
  if (!room || room.questId !== questId) throw new Error("Context Room does not belong to this Quest.");
  return room;
}

function sanitizeSession(state: QuestState, session: QuestSession): QuestSession {
  const bindings = Object.fromEntries(Object.entries(session.bindings).filter(([, binding]) => {
    const room = state.rooms[binding.roomId];
    return Boolean(room?.tabs.some((tab) => tab.id === binding.savedTabId));
  }));
  const activeQuestId = session.activeQuestId && state.quests[session.activeQuestId]?.status === "active" ? session.activeQuestId : state.activeQuestId;
  const activeRoomId = session.activeRoomId && state.rooms[session.activeRoomId]?.questId === activeQuestId ? session.activeRoomId : state.activeRoomId;
  return { ...session, activeQuestId: activeQuestId ?? null, activeRoomId: activeRoomId ?? null, bindings };
}

function sameSession(a: QuestSession, b: QuestSession): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function save(state: QuestState, session: QuestSession): Promise<QuestSnapshot> {
  await questStorage.set(state);
  await questSessionStorage.set(session);
  return snapshot(state, session);
}

async function saveThenRemove(state: QuestState, session: QuestSession, tabIds: number[]): Promise<QuestSnapshot> {
  const result = await save(state, session);
  if (tabIds.length) await chrome.tabs.remove(tabIds).catch(() => undefined);
  return result;
}

async function snapshot(state: QuestState, session: QuestSession): Promise<QuestSnapshot> {
  const live = Object.values(session.bindings).filter((binding) => binding.roomId === session.activeRoomId).length;
  return { state, activeRoomLiveTabCount: live, groupId: session.groupId };
}

function savedTabFromChrome(tab: chrome.tabs.Tab, savedTabId: string, state: "open" | "stashed"): SavedTab {
  if (tab.id === undefined || !usableUrl(tab.url)) throw new Error("The browser tab cannot be saved.");
  return { id: savedTabId, url: tab.url, title: tab.title?.trim() || tab.url, faviconUrl: tab.favIconUrl, chromeTabId: tab.id, state };
}

async function ensureQuestGroup(session: QuestSession, tab: chrome.tabs.Tab): Promise<QuestSession> {
  if (tab.id === undefined || tab.windowId === undefined) throw new Error("The browser tab has no stable live identity.");
  if (session.windowId !== null && session.windowId !== tab.windowId) throw new Error("Quest workspaces stay within one browser window.");
  let groupId = session.groupId;
  if (groupId !== null && typeof chrome.tabs.query === "function") {
    const groupTabs = await chrome.tabs.query({ groupId });
    if (groupTabs.length === 0) groupId = null;
    const boundIds = new Set(Object.keys(session.bindings).map(Number));
    if (groupId !== null && groupTabs.some((candidate) => candidate.id !== undefined && candidate.id !== tab.id && !boundIds.has(candidate.id))) throw new Error("Quest group contains an unowned tab.");
  }
  if (groupId === null) groupId = await chrome.tabs.group({ tabIds: [tab.id] });
  else await chrome.tabs.group({ tabIds: [tab.id], groupId });
  await chrome.tabGroups.update(groupId, { title: QUEST_GROUP_TITLE, color: "green" });
  return { ...session, groupId, windowId: tab.windowId };
}

async function getControlledTab(session: QuestSession, binding: QuestTabBinding, expectedUrl?: string): Promise<chrome.tabs.Tab | null> {
  try {
    if (session.windowId === null || session.groupId === null) return null;
    const tab = await chrome.tabs.get(binding.tabId);
    if (tab.id !== binding.tabId) return null;
    if (expectedUrl !== undefined && tab.url !== expectedUrl) return null;
    if (session.windowId !== null && tab.windowId !== session.windowId) return null;
    if (session.groupId !== null && tab.groupId !== session.groupId) return null;
    return tab;
  } catch { return null; }
}

async function questGroupIds(session: QuestSession): Promise<number[]> {
  if (session.groupId !== null) {
    try {
      const groupTabs = await chrome.tabs.query({ groupId: session.groupId });
      if (groupTabs.length > 0) return [session.groupId];
    } catch { /* Fall through to the title-based recovery path. */ }
  }
  if (typeof chrome.tabGroups?.query !== "function") return [];
  const groups = await chrome.tabGroups.query({ title: QUEST_GROUP_TITLE });
  return groups.map((group) => group.id).filter((groupId): groupId is number => typeof groupId === "number");
}

async function findReusableTab(session: QuestSession, savedTab: SavedTab, allowedUrls = new Set([savedTab.url])): Promise<ReusableTab | null> {
  const groupIds = await questGroupIds(session);
  const boundIds = new Set(Object.keys(session.bindings).map(Number));
  for (const groupId of groupIds) {
    const candidates = await chrome.tabs.query({ groupId });
    let safeGroup = true;
    for (const tab of candidates) {
      if (tab.id === undefined || (!boundIds.has(tab.id) && (!usableUrl(tab.url) || !allowedUrls.has(tab.url)))) {
        safeGroup = false;
        break;
      }
    }
    if (!safeGroup) continue;
    const candidate = candidates.find((tab) => tab.id !== undefined && !boundIds.has(tab.id) && tab.url === savedTab.url && (session.windowId === null || tab.windowId === session.windowId));
    if (candidate) return { tab: candidate, groupId };
  }
  return null;
}

async function removeOwnedBindings(session: QuestSession, roomId?: string): Promise<{ session: QuestSession; tabIds: number[] }> {
  const state = await questStorage.get();
  const owned = Object.values(session.bindings).filter((binding) => roomId === undefined || binding.roomId === roomId);
  const liveIds: number[] = [];
  for (const binding of owned) {
    const expectedUrl = state.rooms[binding.roomId]?.tabs.find((tab) => tab.id === binding.savedTabId)?.url;
    if (expectedUrl && await getControlledTab(session, binding, expectedUrl)) liveIds.push(binding.tabId);
  }
  const bindings = { ...session.bindings };
  for (const binding of owned) delete bindings[String(binding.tabId)];
  return { session: { ...session, bindings, groupId: Object.keys(bindings).length ? session.groupId : null, windowId: Object.keys(bindings).length ? session.windowId : null }, tabIds: liveIds };
}

async function checkpointRoom(state: QuestState, session: QuestSession, roomId: string, notes: string[] | undefined, stash: boolean): Promise<{ state: QuestState; session: QuestSession; tabIds: number[] }> {
  const room = state.rooms[roomId];
  if (!room) throw new Error("Context Room not found.");
  const bindings = Object.values(session.bindings).filter((binding) => binding.roomId === roomId);
  const liveBySavedId = new Map<string, chrome.tabs.Tab>();
  const nextBindings = { ...session.bindings };
  for (const binding of bindings) {
    const expected = room.tabs.find((savedTab) => savedTab.id === binding.savedTabId)?.url;
    const tab = await getControlledTab(session, binding, expected);
    if (tab) liveBySavedId.set(binding.savedTabId, tab);
    else delete nextBindings[String(binding.tabId)];
  }
  const tabs = room.tabs.map((savedTab) => {
    const tab = liveBySavedId.get(savedTab.id);
    return tab ? savedTabFromChrome(tab, savedTab.id, stash ? "stashed" : "open") : { ...savedTab, state: "stashed" as const };
  });
  const nextState = reduceQuest(state, { type: "ROOM_CHECKPOINTED", payload: { roomId, tabs, notes: notes ?? room.notes, checkpointedAt: Date.now() } });
  let nextSession = { ...session, bindings: nextBindings };
  let tabIds: number[] = [];
  if (stash) {
    const removed = await removeOwnedBindings(nextSession, roomId);
    nextSession = removed.session;
    tabIds = removed.tabIds;
  }
  return { state: nextState, session: nextSession, tabIds };
}

async function restoreRoom(state: QuestState, session: QuestSession, roomId: string): Promise<{ state: QuestState; session: QuestSession }> {
  const room = state.rooms[roomId];
  if (!room || room.status === "locked" || room.status === "complete") throw new Error("This Context Room is not available.");
  let nextSession = { ...session, bindings: { ...session.bindings } };
  const createdTabIds: number[] = [];
  const roomBindings = new Map(Object.values(nextSession.bindings).filter((binding) => binding.roomId === roomId).map((binding) => [binding.savedTabId, binding]));
  try {
    for (const savedTab of room.tabs) {
      let binding = roomBindings.get(savedTab.id);
      let tab = binding ? await getControlledTab(nextSession, binding, savedTab.url) : null;
      if (!tab) {
        if (binding) delete nextSession.bindings[String(binding.tabId)];
        const reusable = await findReusableTab(nextSession, savedTab, new Set(room.tabs.map((candidate) => candidate.url)));
        if (reusable) {
          tab = reusable.tab;
          nextSession = { ...nextSession, groupId: reusable.groupId, windowId: tab.windowId ?? nextSession.windowId };
          binding = { tabId: tab.id!, roomId, savedTabId: savedTab.id, ownership: "explicit" };
          nextSession.bindings[String(tab.id)] = binding;
        } else {
          if (!usableUrl(savedTab.url)) throw new Error(`Cannot restore invalid URL: ${savedTab.title}`);
          tab = await chrome.tabs.create({ url: savedTab.url, active: false });
          if (tab.id === undefined) throw new Error("Chrome did not return a restored tab identity.");
          createdTabIds.push(tab.id);
          binding = { tabId: tab.id, roomId, savedTabId: savedTab.id, ownership: "created" };
          nextSession.bindings[String(tab.id)] = binding;
        }
      }
      nextSession = await ensureQuestGroup(nextSession, tab);
    }
  } catch (error) {
    if (createdTabIds.length) await chrome.tabs.remove(createdTabIds).catch(() => undefined);
    throw error;
  }
  const openTabs = room.tabs.map((savedTab) => ({ ...savedTab, state: "open" as const }));
  let nextState = reduceQuest(state, { type: "ROOM_CHECKPOINTED", payload: { roomId, tabs: openTabs, notes: room.notes, checkpointedAt: Date.now() } });
  nextState = reduceQuest(nextState, { type: "ROOM_ENTERED", payload: { roomId, checkpointedAt: Date.now() } });
  nextSession.activeQuestId = room.questId;
  nextSession.activeRoomId = roomId;
  return { state: nextState, session: nextSession };
}

async function handleCreateQuest(message: Extract<QuestMessage, { type: "CREATE_QUEST" }>): Promise<QuestSnapshot> {
  const state = await questStorage.get();
  const now = Date.now();
  const questId = id();
  const quest: Quest = { id: questId, title: message.title.trim(), description: message.description?.trim() || undefined, roomIds: [], status: "active", createdAt: now };
  let nextState = reduceQuest(state, { type: "QUEST_CREATED", payload: { quest } });
  for (const [order, input] of message.rooms.entries()) {
    const room: ContextRoom = { id: id(), questId, title: input.title.trim(), objective: input.objective.trim(), status: order === 0 ? "available" : "locked", tabs: [], loot: [], notes: [], order, createdAt: now };
    nextState = reduceQuest(nextState, { type: "ROOM_CREATED", payload: { room } });
  }
  nextState = { ...nextState, activeQuestId: questId, activeRoomId: null };
  const session = createQuestSession();
  session.activeQuestId = questId;
  return save(nextState, session);
}

async function stashContextTab(state: QuestState, session: QuestSession, message: Extract<QuestMessage, { type: "STASH_CONTEXT_TAB" }>): Promise<QuestSnapshot> {
  const room = roomForMessage(state, message.questId, message.roomId);
  if (state.activeRoomId !== room.id) throw new Error("Enter this Context Room before stashing a tab.");
  const saved = room.tabs.find((tab) => tab.id === message.savedTabId);
  if (!saved) throw new Error("Saved tab not found.");
  const binding = Object.values(session.bindings).find((candidate) => candidate.roomId === room.id && candidate.savedTabId === saved.id);
  let tabToRemove: number | null = null;
  if (binding) {
    const controlled = await getControlledTab(session, binding, saved.url);
    if (controlled) tabToRemove = binding.tabId;
    const bindings = { ...session.bindings };
    delete bindings[String(binding.tabId)];
    session = { ...session, bindings };
  }
  state = reduceQuest(state, { type: "ROOM_CHECKPOINTED", payload: { roomId: room.id, tabs: room.tabs.map((tab) => tab.id === saved.id ? { ...tab, state: "stashed" as const } : tab), notes: room.notes, checkpointedAt: Date.now() } });
  const result = await save(state, session);
  if (tabToRemove !== null) await chrome.tabs.remove([tabToRemove]).catch(() => undefined);
  return result;
}

async function handleAddCurrentTab(state: QuestState, session: QuestSession, message: Extract<QuestMessage, { type: "ADD_CURRENT_TAB" }>): Promise<QuestSnapshot> {
    const room = state.rooms[message.roomId];
  if (!room || room.questId !== message.questId) throw new Error("Context Room not found.");
  if (state.activeRoomId !== room.id) throw new Error("Enter this Context Room before adding browser work.");
  const tab = await activeBrowserTab();
  if (tab.id === undefined) throw new Error("The active browser tab cannot be managed.");
  const existing = session.bindings[String(tab.id)];
    if (existing) {
    if (existing.roomId !== room.id) throw new Error("That tab already belongs to another Context Room.");
    return snapshot(state, session);
  }
  if (room.tabs.some((savedTab) => savedTab.url === tab.url)) throw new Error("That page is already saved in this Context Room.");
  const nextSession = await ensureQuestGroup(session, tab);
  const savedTab: SavedTab = savedTabFromChrome(tab, id(), "open");
  nextSession.bindings[String(tab.id)] = { tabId: tab.id, roomId: room.id, savedTabId: savedTab.id, ownership: "explicit" };
  const nextState = reduceQuest(state, { type: "TAB_SAVED", payload: { roomId: room.id, tab: savedTab } });
  return save(nextState, nextSession);
}

async function handleLoot(state: QuestState, session: QuestSession, message: Extract<QuestMessage, { type: "CAPTURE_LOOT" }>): Promise<QuestSnapshot> {
  const room = state.rooms[message.roomId];
  if (!room || room.questId !== message.questId) throw new Error("Context Room not found.");
  if (state.activeRoomId !== room.id) throw new Error("Enter this Context Room before capturing Loot.");
  const tab = await activeBrowserTab();
  const item = { id: id(), roomId: room.id, type: "link" as const, title: tab.title?.trim() || tab.url!, url: tab.url, note: message.note?.trim() || undefined, createdAt: Date.now() };
  const nextState = reduceQuest(state, { type: "LOOT_ADDED", payload: { item } });
  if (nextState === state) throw new Error("That page is already captured as Loot in this room.");
  return save(nextState, session);
}

async function handleSideQuest(state: QuestState, session: QuestSession, message: Extract<QuestMessage, { type: "SAVE_SIDE_QUEST" }>): Promise<QuestSnapshot> {
  const room = state.rooms[message.roomId];
  if (!room || room.questId !== message.questId) throw new Error("Context Room not found.");
  if (state.activeRoomId !== room.id) throw new Error("Enter this Context Room before saving a Side Quest.");
  const tab = await activeBrowserTab();
  const note = message.note?.trim() || undefined;
  const sideQuest: SideQuest = { id: id(), questId: room.questId, roomId: room.id, title: tab.title?.trim() || tab.url!, url: tab.url, note, objective: note || "Return to this useful thread later.", status: "saved", createdAt: Date.now() };
  const nextState = reduceQuest(state, { type: "SIDE_QUEST_SAVED", payload: { sideQuest } });
  return save(nextState, session);
}

async function openSideQuest(state: QuestState, session: QuestSession, message: Extract<QuestMessage, { type: "OPEN_SIDE_QUEST" }>): Promise<QuestSnapshot> {
  const sideQuest = state.sideQuests[message.sideQuestId];
  if (!sideQuest || sideQuest.questId !== message.questId) throw new Error("Side Quest does not belong to this Quest.");
  if (!sideQuest.url || !usableUrl(sideQuest.url)) throw new Error("This Side Quest has no savable URL.");
  const room = roomForMessage(state, sideQuest.questId, sideQuest.roomId);
  if (state.activeRoomId !== room.id) throw new Error("Enter the Side Quest's Context Room before opening it.");
  const reusable = await findReusableTab(session, { id: id(), url: sideQuest.url, title: sideQuest.title, state: "stashed" });
  const tab = reusable?.tab ?? await chrome.tabs.create({ url: sideQuest.url, active: true });
  if (tab.id === undefined) throw new Error("Chrome did not return a Side Quest tab identity.");
  const nextSession = await ensureQuestGroup({ ...session, groupId: reusable?.groupId ?? session.groupId }, tab);
  const savedTab = room.tabs.find((candidate) => candidate.url === sideQuest.url);
  if (!savedTab) {
    const created = savedTabFromChrome(tab, id(), "open");
    nextSession.bindings[String(tab.id)] = { tabId: tab.id, roomId: room.id, savedTabId: created.id, ownership: reusable ? "explicit" : "created" };
    state = reduceQuest(state, { type: "TAB_SAVED", payload: { roomId: room.id, tab: created } });
  } else {
    nextSession.bindings[String(tab.id)] = { tabId: tab.id, roomId: room.id, savedTabId: savedTab.id, ownership: reusable ? "explicit" : "created" };
  }
  return save(state, nextSession);
}

async function handleNoteLoot(state: QuestState, session: QuestSession, message: Extract<QuestMessage, { type: "ADD_NOTE_LOOT" }>): Promise<QuestSnapshot> {
  const room = state.rooms[message.roomId];
  if (!room || room.questId !== message.questId) throw new Error("Context Room not found.");
  if (state.activeRoomId !== room.id) throw new Error("Enter this Context Room before saving Loot.");
  if (!nonEmpty(message.title) || !nonEmpty(message.note)) throw new Error("A note Loot item needs a title and note.");
  const item = { id: id(), roomId: room.id, type: "note" as const, title: message.title.trim(), note: message.note.trim(), createdAt: Date.now() };
  return save(reduceQuest(state, { type: "LOOT_ADDED", payload: { item } }), session);
}

export async function handleQuestMessage(message: QuestMessage, sender: chrome.runtime.MessageSender): Promise<QuestSnapshot | { error: string } | undefined> {
  if (!senderIsPopup(sender)) return undefined;
  try {
    let state = await questStorage.get();
    let session = await questSessionStorage.get();
    const sanitized = sanitizeSession(state, session);
    if (!sameSession(session, sanitized)) { session = sanitized; await questSessionStorage.set(session); }
    if (message.type === "GET_QUEST_STATE") return snapshot(state, session);
    if (message.type === "RESET_QUEST_SESSION") { const removed = await removeOwnedBindings(session); await questSessionStorage.clear(); if (removed.tabIds.length) await chrome.tabs.remove(removed.tabIds).catch(() => undefined); return snapshot(state, createQuestSession()); }
    if (message.type === "CREATE_QUEST") { const removed = await removeOwnedBindings(session); await questSessionStorage.clear(); if (removed.tabIds.length) await chrome.tabs.remove(removed.tabIds).catch(() => undefined); return handleCreateQuest(message); }
    if (message.type === "CREATE_ROOM") {
      const quest = state.quests[message.questId];
      if (!quest) throw new Error("Quest not found.");
      const room: ContextRoom = { id: id(), questId: quest.id, title: message.title.trim(), objective: message.objective.trim(), status: quest.roomIds.length === 0 ? "available" : "locked", tabs: [], loot: [], notes: [], order: quest.roomIds.length, createdAt: Date.now() };
      state = reduceQuest(state, { type: "ROOM_CREATED", payload: { room } });
      return save(state, session);
    }
    if (message.type === "ENTER_CONTEXT_ROOM") {
      roomForMessage(state, message.questId, message.roomId);
      if (state.activeRoomId && state.activeRoomId !== message.roomId) {
        const previousRoomId = state.activeRoomId;
        const checkpoint = await checkpointRoom(state, session, previousRoomId, undefined, true);
        state = reduceQuest(checkpoint.state, { type: "ROOM_LEFT", payload: { roomId: previousRoomId } });
        session = { ...checkpoint.session, activeRoomId: null };
        await saveThenRemove(state, session, checkpoint.tabIds);
      }
      ({ state, session } = await restoreRoom(state, session, message.roomId));
      return save(state, session);
    }
    if (message.type === "LEAVE_CONTEXT_ROOM") {
      const room = roomForMessage(state, message.questId, message.roomId);
      if (state.activeRoomId !== room.id) throw new Error("Enter this Context Room before leaving it.");
      const checkpoint = await checkpointRoom(state, session, room.id, message.notes, true);
      state = reduceQuest(checkpoint.state, { type: "ROOM_LEFT", payload: { roomId: room.id } });
      session = { ...checkpoint.session, activeRoomId: null };
      const result = await saveThenRemove(state, session, checkpoint.tabIds);
      return result;
    }
    if (message.type === "CHECKPOINT_CONTEXT_ROOM") {
      const room = roomForMessage(state, message.questId, message.roomId);
      if (state.activeRoomId !== room.id) throw new Error("Enter this Context Room before checkpointing it.");
      ({ state, session } = await checkpointRoom(state, session, room.id, message.notes, false));
      return save(state, session);
    }
    if (message.type === "STASH_CONTEXT_TAB") return await stashContextTab(state, session, message);
    if (message.type === "ADD_CURRENT_TAB") return await handleAddCurrentTab(state, session, message);
    if (message.type === "CAPTURE_LOOT") return await handleLoot(state, session, message);
    if (message.type === "ADD_NOTE_LOOT") return await handleNoteLoot(state, session, message);
    if (message.type === "SAVE_SIDE_QUEST") return await handleSideQuest(state, session, message);
    if (message.type === "OPEN_SIDE_QUEST") return await openSideQuest(state, session, message);
    if (message.type === "DELETE_SIDE_QUEST") {
      const sideQuest = state.sideQuests[message.sideQuestId];
      if (!sideQuest || sideQuest.questId !== message.questId) throw new Error("Side Quest does not belong to this Quest.");
      state = reduceQuest(state, { type: "SIDE_QUEST_DELETED", payload: { sideQuestId: message.sideQuestId } });
      return save(state, session);
    }
    if (message.type === "MOVE_SIDE_QUEST") {
      const sideQuest = state.sideQuests[message.sideQuestId];
      roomForMessage(state, message.questId, message.roomId);
      if (!sideQuest || sideQuest.questId !== message.questId) throw new Error("Side Quest does not belong to this Quest.");
      state = reduceQuest(state, { type: "SIDE_QUEST_MOVED", payload: { sideQuestId: message.sideQuestId, roomId: message.roomId } });
      return save(state, session);
    }
    if (message.type === "CLEAR_CONTEXT_ROOM") {
      const room = roomForMessage(state, message.questId, message.roomId);
      if (state.activeRoomId !== room.id) throw new Error("Enter this Context Room before clearing it.");
      const checkpoint = await checkpointRoom(state, session, message.roomId, room.notes, true);
      state = checkpoint.state;
      session = checkpoint.session;
      state = reduceQuest(state, { type: "ROOM_CLEARED", payload: { roomId: message.roomId } });
      if (session.activeRoomId === message.roomId) session = { ...session, activeRoomId: state.activeRoomId };
      return saveThenRemove(state, session, checkpoint.tabIds);
    }
    return undefined;
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

export async function handleQuestTabRemoved(tabId: number): Promise<void> {
  const session = await questSessionStorage.get();
  const binding = session.bindings[String(tabId)];
  if (!binding) return;
  const nextBindings = { ...session.bindings };
  delete nextBindings[String(tabId)];
  await questSessionStorage.set({ ...session, bindings: nextBindings, groupId: Object.keys(nextBindings).length ? session.groupId : null, windowId: Object.keys(nextBindings).length ? session.windowId : null });
  const state = await questStorage.get();
  const room = state.rooms[binding.roomId];
  if (!room) return;
  const nextTabs = room.tabs.map((tab) => tab.id === binding.savedTabId ? { ...tab, state: "stashed" as const } : tab);
  if (room.tabs.some((tab, index) => tab.state !== nextTabs[index]?.state)) await questStorage.set(reduceQuest(state, { type: "ROOM_CHECKPOINTED", payload: { roomId: room.id, tabs: nextTabs, notes: room.notes, checkpointedAt: Date.now() } }));
}

export async function reconcileQuestSession(): Promise<void> {
  let state = await questStorage.get();
  const session = await questSessionStorage.get();
  const nextBindings = { ...session.bindings };
  const staleByRoom = new Set<string>();
  for (const binding of Object.values(session.bindings)) {
    const room = state.rooms[binding.roomId];
    const saved = room?.tabs.find((tab) => tab.id === binding.savedTabId);
    const live = session.groupId !== null && session.windowId !== null && saved
      ? await getControlledTab(session, binding, saved.url)
      : null;
    if (!room || !saved || !live) {
      delete nextBindings[String(binding.tabId)];
      if (room && saved) staleByRoom.add(room.id);
    }
  }
  for (const roomId of staleByRoom) {
    const room = state.rooms[roomId];
    if (!room) continue;
    const tabs = room.tabs.map((tab) => Object.values(session.bindings).some((binding) => binding.roomId === roomId && binding.savedTabId === tab.id && !nextBindings[String(binding.tabId)]) ? { ...tab, state: "stashed" as const } : { ...tab });
    state = reduceQuest(state, { type: "ROOM_CHECKPOINTED", payload: { roomId, tabs, notes: room.notes, checkpointedAt: Date.now() } });
  }
  const nextSession = { ...session, bindings: nextBindings, groupId: Object.keys(nextBindings).length ? session.groupId : null, windowId: Object.keys(nextBindings).length ? session.windowId : null };
  if (!sameSession(session, nextSession)) await questSessionStorage.set(nextSession);
  if (staleByRoom.size > 0) await questStorage.set(state);
}

export async function restoreQuestWorkspace(): Promise<void> {
  const state = await questStorage.get();
  const session = await questSessionStorage.get();
  if (!state.activeRoomId || !state.activeQuestId) return;
  const room = state.rooms[state.activeRoomId];
  if (!room || room.questId !== state.activeQuestId || room.status !== "active") return;
  const restored = await restoreRoom(state, session, room.id);
  await save(restored.state, restored.session);
}

export async function restoreQuestTab(tabId: number): Promise<boolean> {
  const session = await questSessionStorage.get();
  const binding = session.bindings[String(tabId)];
  if (!binding || session.groupId === null || session.windowId === null) return false;
  try {
    const tab = await chrome.tabs.get(tabId);
    const state = await questStorage.get();
    const saved = state.rooms[binding.roomId]?.tabs.find((candidate) => candidate.id === binding.savedTabId);
    if (!saved || tab.url !== saved.url) {
      const bindings = { ...session.bindings };
      delete bindings[String(tabId)];
      await questSessionStorage.set({ ...session, bindings });
      return false;
    }
    if (tab.windowId !== session.windowId) await chrome.tabs.move(tabId, { windowId: session.windowId, index: 0 });
    await chrome.tabs.group({ tabIds: [tabId], groupId: session.groupId });
    return true;
  } catch { return false; }
}

export async function getQuestSessionForDebug(): Promise<QuestSession> {
  return questSessionStorage.get();
}
