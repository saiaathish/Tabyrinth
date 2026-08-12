import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameState, RoomKind } from "../game/types";
import { STATE_KEY } from "../platform/chrome-storage";
import { createChromeMock } from "../test/mocks/chrome";

type RoomSpec = { roomId: string; kind: RoomKind; tabId: number };

const makeState = (rooms: RoomSpec[] = [
  { roomId: "entrance", kind: "entrance", tabId: 11 },
  { roomId: "armory", kind: "armory", tabId: 12 },
]): GameState => ({
  schemaVersion: 1,
  runId: "run",
  status: "active",
  groupId: 7,
  windowId: 1,
  roomById: Object.fromEntries(rooms.map((room, index) => [room.roomId, { ...room, visited: index === 0, destroyed: false, completed: false }])),
  roomIdByTabId: Object.fromEntries(rooms.map((room) => [String(room.tabId), room.roomId])),
  orderedRoomIds: rooms.map(({ roomId }) => roomId),
  player: { hp: 3, maxHp: 3, hasBlade: false, hasSigil: false, currentRoomId: rooms[0]!.roomId },
  boss: { hp: 3, maxHp: 3, shieldBroken: false, voidActive: false, voidRoomId: null },
  flags: { tutorialMoveCompleted: false, sigilAdjacencySatisfied: false, bossIntroduced: false },
  metrics: { startedAt: 1, endedAt: null, tabMoves: 0, roomsClosed: 0, actions: 0 },
  revision: 0,
});

const roomSender = (tabId = 11, roomId = "entrance", runId = "run") => ({
  url: `chrome-extension://test/room.html?run=${runId}&room=${roomId}`,
  tab: { id: tabId, url: `chrome-extension://test/room.html?run=${runId}&room=${roomId}` },
}) as chrome.runtime.MessageSender;

describe("service worker security and lifecycle contracts", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllGlobals());

  it("rejects malformed and over-posted messages before mutating storage", async () => {
    const mock = createChromeMock();
    const initial = makeState();
    mock.session[STATE_KEY] = initial;
    vi.stubGlobal("chrome", mock.chrome);
    const { handleMessage } = await import("./service-worker");

    const malformed = [
      null,
      {},
      { type: "GET_STATE", extra: true },
      { type: "GAME_ACTION", action: { type: "TAKE_BLADE" } },
      { type: "GAME_ACTION", runId: "run", action: { type: "RUN_RESET" } },
      { type: "GAME_ACTION", runId: "run", action: { type: "MOVE_PLAYER", payload: { toRoomId: "armory", extra: true } } },
      { type: "GAME_ACTION", runId: "run", action: { type: "TAKE_BLADE" }, extra: true },
    ];

    for (const message of malformed) await expect(handleMessage(message, roomSender())).resolves.toBeUndefined();
    expect(mock.session[STATE_KEY]).toEqual(initial);
    expect(mock.update).not.toHaveBeenCalled();
  });

  it("rejects stale runs, forged room identity, and room-disallowed actions", async () => {
    const mock = createChromeMock();
    const initial = makeState();
    mock.session[STATE_KEY] = initial;
    vi.stubGlobal("chrome", mock.chrome);
    const { handleMessage } = await import("./service-worker");

    await handleMessage({ type: "GAME_ACTION", runId: "stale", action: { type: "MOVE_PLAYER", payload: { toRoomId: "armory" } } }, roomSender());
    await handleMessage({ type: "GAME_ACTION", runId: "run", action: { type: "MOVE_PLAYER", payload: { toRoomId: "armory" } } }, roomSender(11, "armory"));
    await handleMessage({ type: "GAME_ACTION", runId: "run", action: { type: "TAKE_BLADE" } }, roomSender());

    expect(mock.session[STATE_KEY]).toEqual(initial);
    expect(mock.update).not.toHaveBeenCalled();
  });

  it("returns live state only to the popup or the registered room tab", async () => {
    const mock = createChromeMock();
    const initial = makeState();
    mock.session[STATE_KEY] = initial;
    vi.stubGlobal("chrome", mock.chrome);
    const { handleMessage } = await import("./service-worker");

    await expect(handleMessage({ type: "GET_STATE" }, { url: "chrome-extension://test/popup.html" } as chrome.runtime.MessageSender)).resolves.toEqual(initial);
    await expect(handleMessage({ type: "GET_STATE" }, roomSender())).resolves.toEqual(initial);
    await expect(handleMessage({ type: "GET_STATE" }, roomSender(999))).resolves.toBeNull();
    await expect(handleMessage({ type: "GET_STATE" }, roomSender(11, "armory"))).resolves.toBeNull();
  });

  it("activates the destination tab after a valid portal move", async () => {
    const mock = createChromeMock();
    mock.session[STATE_KEY] = makeState();
    vi.stubGlobal("chrome", mock.chrome);
    const { handleMessage } = await import("./service-worker");

    const next = await handleMessage(
      { type: "GAME_ACTION", runId: "run", action: { type: "MOVE_PLAYER", payload: { toRoomId: "armory" } } },
      roomSender(),
    ) as GameState;

    expect(next.player.currentRoomId).toBe("armory");
    expect(mock.session[STATE_KEY]).toEqual(next);
    expect(mock.update).toHaveBeenCalledWith(12, { active: true });
  });

  it("does not persist a portal move when destination activation fails", async () => {
    const mock = createChromeMock();
    const initial = makeState();
    mock.session[STATE_KEY] = initial;
    mock.update.mockRejectedValueOnce(new Error("destination unavailable"));
    vi.stubGlobal("chrome", mock.chrome);
    const { handleMessage } = await import("./service-worker");

    await expect(handleMessage(
      { type: "GAME_ACTION", runId: "run", action: { type: "MOVE_PLAYER", payload: { toRoomId: "armory" } } },
      roomSender(),
    )).rejects.toThrow("destination unavailable");

    expect(mock.session[STATE_KEY]).toEqual(initial);
    expect((mock.session[STATE_KEY] as GameState).player.currentRoomId).toBe("entrance");
    expect((mock.session[STATE_KEY] as GameState).revision).toBe(0);
  });

  it("uses managed tab order as topology after onMoved", async () => {
    const mock = createChromeMock();
    mock.session[STATE_KEY] = makeState();
    mock.tabs.set(11, { id: 11, index: 1, groupId: 7, windowId: 1 });
    mock.tabs.set(12, { id: 12, index: 0, groupId: 7, windowId: 1 });
    vi.stubGlobal("chrome", mock.chrome);
    await import("./service-worker");

    mock.listeners.moved.listeners[0]!(12);
    await new Promise((resolve) => setTimeout(resolve, 80));

    const next = mock.session[STATE_KEY] as GameState;
    expect(next.orderedRoomIds).toEqual(["armory", "entrance"]);
    expect(next.metrics.tabMoves).toBe(1);
  });

  it("does not let an unrelated event cancel a managed topology reconciliation", async () => {
    const mock = createChromeMock();
    mock.session[STATE_KEY] = makeState();
    mock.tabs.set(11, { id: 11, index: 1, groupId: 7, windowId: 1 });
    mock.tabs.set(12, { id: 12, index: 0, groupId: 7, windowId: 1 });
    vi.stubGlobal("chrome", mock.chrome);
    await import("./service-worker");

    mock.listeners.moved.listeners[0]!(12);
    mock.listeners.moved.listeners[0]!(999);
    await new Promise((resolve) => setTimeout(resolve, 80));

    expect((mock.session[STATE_KEY] as GameState).orderedRoomIds).toEqual(["armory", "entrance"]);
  });

  it("closes a managed Void through onRemoved and clears only rift state", async () => {
    const mock = createChromeMock();
    const state = makeState([
      { roomId: "entrance", kind: "entrance", tabId: 11 },
      { roomId: "boss", kind: "boss", tabId: 12 },
      { roomId: "void-rift", kind: "void", tabId: 13 },
    ]);
    state.status = "boss";
    state.player.currentRoomId = "boss";
    state.boss = { ...state.boss, shieldBroken: true, voidActive: true, voidRoomId: "void-rift" };
    mock.session[STATE_KEY] = state;
    vi.stubGlobal("chrome", mock.chrome);
    await import("./service-worker");

    mock.listeners.removed.listeners[0]!(13);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const next = mock.session[STATE_KEY] as GameState;
    expect(next.boss.voidActive).toBe(false);
    expect(next.boss.voidRoomId).toBeNull();
    expect(next.roomById["void-rift"]?.destroyed).toBe(true);
    expect(next.orderedRoomIds).toEqual(["entrance", "boss"]);
    expect(next.roomIdByTabId["13"]).toBeUndefined();
  });

  it("serializes concurrent managed removals without losing either closure", async () => {
    const mock = createChromeMock();
    const state = makeState([
      { roomId: "entrance", kind: "entrance", tabId: 11 },
      { roomId: "armory", kind: "armory", tabId: 12 },
      { roomId: "boss", kind: "boss", tabId: 13 },
    ]);
    mock.session[STATE_KEY] = state;
    vi.stubGlobal("chrome", mock.chrome);
    await import("./service-worker");

    mock.listeners.removed.listeners[0]!(11);
    mock.listeners.removed.listeners[0]!(12);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const next = mock.session[STATE_KEY] as GameState;
    expect(next.roomById.entrance.destroyed).toBe(true);
    expect(next.roomById.armory.destroyed).toBe(true);
    expect(next.orderedRoomIds).toEqual(["boss"]);
    expect(next.player.currentRoomId).toBe("boss");
  });

  it("rejects privileged Start and Reset requests sent by a room page", async () => {
    const mock = createChromeMock();
    const initial = makeState();
    mock.session[STATE_KEY] = initial;
    vi.stubGlobal("chrome", mock.chrome);
    const { handleMessage } = await import("./service-worker");

    await handleMessage({ type: "RESET_RUN" }, roomSender());
    expect(mock.session[STATE_KEY]).toEqual(initial);
    expect(mock.removed).toEqual([]);

    delete mock.session[STATE_KEY];
    await handleMessage({ type: "START_RUN" }, roomSender());
    expect(mock.session[STATE_KEY]).toBeUndefined();
    expect(mock.grouped).toEqual([]);
  });
});
