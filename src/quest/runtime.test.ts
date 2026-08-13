import { beforeEach, describe, expect, it, vi } from "vitest";
import { questStorage } from "./storage";
import { QUEST_SESSION_KEY } from "./session";
import { handleQuestMessage, handleQuestTabRemoved, isQuestMessage } from "./runtime";
import { reduceQuest } from "./reducer";
import type { Quest, ContextRoom } from "./types";
import type { QuestSnapshot } from "./messages";

const local: Record<string, unknown> = {};
const session: Record<string, unknown> = {};
const tabs = new Map<number, chrome.tabs.Tab>();
let nextTab = 100;
const group = vi.fn(async ({ groupId }: chrome.tabs.GroupOptions) => groupId ?? 7);
const create = vi.fn(async (properties: chrome.tabs.CreateProperties) => { const tab = { id: nextTab++, index: tabs.size, windowId: 1, url: properties.url, title: `Page ${tabs.size}` } as chrome.tabs.Tab; tabs.set(tab.id!, tab); return tab; });
const get = vi.fn(async (id: number) => { const tab = tabs.get(id); if (!tab) throw new Error("tab missing"); return tab; });
const remove = vi.fn(async (ids: number[]) => { for (const id of ids) tabs.delete(id); });

function stubChrome() {
  vi.stubGlobal("chrome", {
    runtime: { getURL: (path: string) => `chrome-extension://test/${path}` },
    storage: { local: { get: async (key: string) => ({ [key]: local[key] }), set: async (value: Record<string, unknown>) => Object.assign(local, value), remove: async (key: string) => delete local[key] }, session: { get: async (key: string) => ({ [key]: session[key] }), set: async (value: Record<string, unknown>) => Object.assign(session, value), remove: async (key: string) => delete session[key] } },
    tabs: { query: vi.fn(async (query: chrome.tabs.QueryInfo) => query.groupId === undefined ? [{ id: 1, windowId: 1, groupId: -1, url: "https://example.test", title: "Current" }] : [...tabs.values()].filter((tab) => tab.groupId === query.groupId)), get, create, group, remove, move: vi.fn(async () => undefined) },
    tabGroups: { update: vi.fn(async () => undefined), query: vi.fn(async () => []) },
  });
}

const popup = { url: "chrome-extension://test/popup.html" } as chrome.runtime.MessageSender;

describe("Quest runtime", () => {
  beforeEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); vi.unstubAllGlobals(); for (const key of Object.keys(local)) delete local[key]; for (const key of Object.keys(session)) delete session[key]; tabs.clear(); nextTab = 100; stubChrome(); });

  it("accepts only the Quest message contract", () => { expect(isQuestMessage({ type: "GET_QUEST_STATE" })).toBe(true); expect(isQuestMessage({ type: "CREATE_QUEST", title: "x", rooms: [] })).toBe(false); expect(isQuestMessage({ type: "GET_STATE" })).toBe(false); });

  it("creates Quest and ordered rooms durably", async () => {
    const result = await handleQuestMessage({ type: "CREATE_QUEST", title: "Ship", rooms: [{ title: "Build", objective: "Implement" }, { title: "Submit", objective: "Deliver" }] }, popup) as QuestSnapshot;
    expect(result.state.quests[result.state.activeQuestId!]?.roomIds.map((id) => result.state.rooms[id]?.title)).toEqual(["Build", "Submit"]);
    expect((local["tabyrinth.questState"] as { schemaVersion: number }).schemaVersion).toBe(1);
  });

  it("restores a saved URL and never persists its Chrome tab ID", async () => {
    const created = await handleQuestMessage({ type: "CREATE_QUEST", title: "Ship", rooms: [{ title: "Build", objective: "Implement" }] }, popup) as QuestSnapshot;
    const questId = created.state.activeQuestId!; const roomId = created.state.quests[questId]!.roomIds[0]!;
    const entered = await handleQuestMessage({ type: "ENTER_CONTEXT_ROOM", questId, roomId }, popup) as QuestSnapshot;
    expect(entered.state.activeRoomId).toBe(roomId);
    await handleQuestMessage({ type: "ADD_CURRENT_TAB", questId, roomId }, popup);
    expect((local["tabyrinth.questState"] as { rooms: Record<string, { tabs: Array<{ chromeTabId?: number }> }> }).rooms[roomId]!.tabs[0]!.chromeTabId).toBeUndefined();
    expect(Object.keys((session[QUEST_SESSION_KEY] as { bindings: Record<string, unknown> }).bindings)).toHaveLength(1);
  });

  it("rejects duplicate URL capture and stashes removed controlled tabs", async () => {
    const created = await handleQuestMessage({ type: "CREATE_QUEST", title: "Ship", rooms: [{ title: "Build", objective: "Implement" }] }, popup) as QuestSnapshot;
    const questId = created.state.activeQuestId!; const roomId = created.state.quests[questId]!.roomIds[0]!;
    await handleQuestMessage({ type: "ENTER_CONTEXT_ROOM", questId, roomId }, popup);
    await handleQuestMessage({ type: "ADD_CURRENT_TAB", questId, roomId }, popup);
    await expect(handleQuestMessage({ type: "ADD_CURRENT_TAB", questId, roomId }, popup)).resolves.toMatchObject({ state: { rooms: { [roomId]: { tabs: [{ url: "https://example.test" }] } } } });
    const bindingId = Number(Object.keys((session[QUEST_SESSION_KEY] as { bindings: Record<string, unknown> }).bindings)[0]);
    await handleQuestTabRemoved(bindingId);
    const state = await questStorage.get();
    expect(state.rooms[roomId]!.tabs[0]!.state).toBe("stashed");
  });

  it("does not accept Quest mutations from an unrelated sender", async () => {
    const result = await handleQuestMessage({ type: "CREATE_QUEST", title: "Nope", rooms: [{ title: "Room", objective: "Work" }] }, { url: "chrome-extension://test/room.html" } as chrome.runtime.MessageSender);
    expect(result).toBeUndefined(); expect(Object.keys(local)).toHaveLength(0);
  });

  it("checkpoints, clears, and unlocks the next room while retaining the first room", async () => {
    const created = await handleQuestMessage({ type: "CREATE_QUEST", title: "Ship", rooms: [{ title: "Build", objective: "Implement" }, { title: "Submit", objective: "Deliver" }] }, popup) as QuestSnapshot;
    const questId = created.state.activeQuestId!; const [first, second] = created.state.quests[questId]!.roomIds;
    await handleQuestMessage({ type: "ENTER_CONTEXT_ROOM", questId, roomId: first! }, popup);
    const cleared = await handleQuestMessage({ type: "CLEAR_CONTEXT_ROOM", questId, roomId: first! }, popup) as QuestSnapshot;
    expect(cleared.state.rooms[first!]!.status).toBe("complete");
    expect(cleared.state.rooms[second!]!.status).toBe("available");
    expect(cleared.state.quests[questId]!.status).toBe("active");
  });

  it("reuses a matching grouped URL after the session binding is lost", async () => {
    const created = await handleQuestMessage({ type: "CREATE_QUEST", title: "Ship", rooms: [{ title: "Build", objective: "Implement" }] }, popup) as QuestSnapshot;
    const questId = created.state.activeQuestId!; const roomId = created.state.quests[questId]!.roomIds[0]!;
    await handleQuestMessage({ type: "ENTER_CONTEXT_ROOM", questId, roomId }, popup);
    await handleQuestMessage({ type: "ADD_CURRENT_TAB", questId, roomId }, popup);
    const bindingId = Number(Object.keys(session[QUEST_SESSION_KEY] ? (session[QUEST_SESSION_KEY] as { bindings: Record<string, unknown> }).bindings : {})[0]);
    const saved = (local["tabyrinth.questState"] as { rooms: Record<string, { tabs: Array<{ id: string; url: string; title: string; state: "open" | "stashed" }> }> }).rooms[roomId]!.tabs[0]!;
    delete (session[QUEST_SESSION_KEY] as { bindings: Record<string, unknown> }).bindings[String(bindingId)];
    tabs.set(100, { id: 100, index: 1, windowId: 1, groupId: 7, url: saved.url, title: saved.title } as chrome.tabs.Tab);
    const restored = await handleQuestMessage({ type: "ENTER_CONTEXT_ROOM", questId, roomId }, popup) as QuestSnapshot;
    expect(restored.activeRoomLiveTabCount).toBe(1);
    expect(create).toHaveBeenCalledTimes(0);
  });

  it("opens a Side Quest in the active room and binds it without duplicating a saved URL", async () => {
    const created = await handleQuestMessage({ type: "CREATE_QUEST", title: "Ship", rooms: [{ title: "Build", objective: "Implement" }] }, popup) as QuestSnapshot;
    const questId = created.state.activeQuestId!; const roomId = created.state.quests[questId]!.roomIds[0]!;
    await handleQuestMessage({ type: "ENTER_CONTEXT_ROOM", questId, roomId }, popup);
    const saved = await handleQuestMessage({ type: "SAVE_SIDE_QUEST", questId, roomId, note: "Later" }, popup) as QuestSnapshot;
    const sideQuestId = Object.keys(saved.state.sideQuests)[0]!;
    const opened = await handleQuestMessage({ type: "OPEN_SIDE_QUEST", questId, sideQuestId }, popup) as QuestSnapshot;
    expect(opened.activeRoomLiveTabCount).toBe(1);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("rejects cross-Quest Side Quest operations", async () => {
    const first = await handleQuestMessage({ type: "CREATE_QUEST", title: "First", rooms: [{ title: "Build", objective: "Implement" }] }, popup) as QuestSnapshot;
    const firstQuest = first.state.activeQuestId!; const firstRoom = first.state.quests[firstQuest]!.roomIds[0]!;
    await handleQuestMessage({ type: "ENTER_CONTEXT_ROOM", questId: firstQuest, roomId: firstRoom }, popup);
    const withSide = await handleQuestMessage({ type: "SAVE_SIDE_QUEST", questId: firstQuest, roomId: firstRoom }, popup) as QuestSnapshot;
    const sideQuestId = Object.keys(withSide.state.sideQuests)[0]!;
    const secondQuest: Quest = { id: "second-quest", title: "Second", roomIds: [], status: "active", createdAt: 2 };
    const secondRoom: ContextRoom = { id: "second-room", questId: secondQuest.id, title: "Build", objective: "Implement", status: "available", tabs: [], loot: [], notes: [], order: 0, createdAt: 2 };
    const expanded = reduceQuest(withSide.state, { type: "QUEST_CREATED", payload: { quest: secondQuest } });
    const withSecond = reduceQuest(expanded, { type: "ROOM_CREATED", payload: { room: secondRoom } });
    await questStorage.set(withSecond);
    await expect(handleQuestMessage({ type: "OPEN_SIDE_QUEST", questId: secondQuest.id, sideQuestId }, popup)).resolves.toMatchObject({ error: "Side Quest does not belong to this Quest." });
    await expect(handleQuestMessage({ type: "MOVE_SIDE_QUEST", questId: secondQuest.id, sideQuestId, roomId: secondRoom.id }, popup)).resolves.toMatchObject({ error: "Side Quest does not belong to this Quest." });
  });
});
