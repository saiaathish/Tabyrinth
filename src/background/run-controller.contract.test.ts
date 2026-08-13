import { afterEach, describe, expect, it, vi } from "vitest";
import { INITIAL_ROOMS } from "../game/constants";
import { STATE_KEY } from "../platform/chrome-storage";
import { createChromeMock } from "../test/mocks/chrome";
import { startRun, syncTopology } from "./run-controller";
import type { GameState } from "../game/types";

describe("run controller contract", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("creates exactly five managed rooms and activates Entrance after persistence", async () => {
    const mock = createChromeMock();
    let nextId = 101;
    const create = vi.fn(async (properties: chrome.tabs.CreateProperties) => {
      void properties;
      const id = nextId++;
      const tab = { id, index: id - 101, groupId: -1, windowId: 4 };
      mock.tabs.set(id, tab);
      return tab;
    });
    const updateGroup = vi.fn(async (groupId: number, properties: chrome.tabGroups.UpdateProperties) => {
      void groupId;
      void properties;
    });
    mock.chrome.tabs.create = create as typeof mock.chrome.tabs.create;
    mock.chrome.tabGroups.update = updateGroup as unknown as typeof mock.chrome.tabGroups.update;
    vi.stubGlobal("chrome", mock.chrome);

    const result = await startRun();
    const expectedIds = [101, 102, 103, 104, 105];

    expect(create).toHaveBeenCalledTimes(5);
    expect(create.mock.calls.map(([properties]) => properties)).toEqual(
      INITIAL_ROOMS.map(({ roomId }) => ({ url: `chrome-extension://test/room.html?run=${result.runId}&room=${roomId}`, active: false })),
    );
    expect(mock.grouped).toEqual([{ ids: expectedIds, groupId: undefined }]);
    expect(updateGroup).toHaveBeenCalledWith(1, { title: "TABYRINTH", color: "green" });
    expect(result.orderedRoomIds).toEqual(INITIAL_ROOMS.map(({ roomId }) => roomId));
    expect(result.roomIdByTabId).toEqual(Object.fromEntries(expectedIds.map((id, index) => [String(id), INITIAL_ROOMS[index]!.roomId])));
    expect(result.player.currentRoomId).toBe("entrance");
    expect(mock.session[STATE_KEY]).toEqual(result);
    expect(mock.update).toHaveBeenCalledTimes(1);
    expect(mock.update).toHaveBeenCalledWith(101, { active: true });
  });

  it("cleans up partially created rooms when Start Run fails", async () => {
    const mock = createChromeMock();
    let nextId = 201;
    mock.chrome.tabs.create = vi.fn(async (properties: chrome.tabs.CreateProperties) => {
      if (nextId === 203) throw new Error("create failed");
      const id = nextId++;
      mock.tabs.set(id, { id, index: id - 201, groupId: -1, windowId: 4 });
      return { id, index: id - 201, windowId: 4, url: properties.url };
    }) as typeof mock.chrome.tabs.create;
    vi.stubGlobal("chrome", mock.chrome);

    await expect(startRun()).rejects.toThrow("create failed");
    expect(mock.removed).toEqual([[201, 202]]);
    expect(mock.session[STATE_KEY]).toBeUndefined();
  });

  it("cleans up rooms when Entrance activation fails", async () => {
    const mock = createChromeMock();
    mock.update.mockRejectedValueOnce(new Error("activation failed"));
    vi.stubGlobal("chrome", mock.chrome);

    await expect(startRun()).rejects.toThrow("activation failed");
    expect(mock.removed).toHaveLength(1);
    expect(mock.removed[0]).toHaveLength(5);
    expect(mock.session[STATE_KEY]).toBeUndefined();
  });

  it("still removes created rooms when rollback storage reads fail", async () => {
    const mock = createChromeMock();
    const get = mock.chrome.storage.session.get;
    mock.chrome.storage.session.get = vi.fn()
      .mockImplementationOnce(get)
      .mockRejectedValueOnce(new Error("rollback read failed"));
    mock.update.mockRejectedValueOnce(new Error("activation failed"));
    vi.stubGlobal("chrome", mock.chrome);

    await expect(startRun()).rejects.toThrow("activation failed");
    expect(mock.removed).toHaveLength(1);
    expect(mock.removed[0]).toHaveLength(5);
  });

  it("still removes created rooms when rollback storage clears fail", async () => {
    const mock = createChromeMock();
    mock.chrome.storage.session.remove = vi.fn().mockRejectedValueOnce(new Error("rollback clear failed"));
    mock.update.mockRejectedValueOnce(new Error("activation failed"));
    vi.stubGlobal("chrome", mock.chrome);

    await expect(startRun()).rejects.toThrow("activation failed");
    expect(mock.removed).toHaveLength(1);
    expect(mock.removed[0]).toHaveLength(5);
  });

  it("syncs topology for Chrome group id zero", async () => {
    const mock = createChromeMock();
    const state: GameState = {
      schemaVersion: 1,
      runId: "run",
      status: "active",
      groupId: 0,
      windowId: 1,
      roomById: {
        entrance: { roomId: "entrance", kind: "entrance", tabId: 11, visited: true, destroyed: false, completed: false },
        armory: { roomId: "armory", kind: "armory", tabId: 12, visited: false, destroyed: false, completed: false },
      },
      roomIdByTabId: { "11": "entrance", "12": "armory" },
      orderedRoomIds: ["entrance", "armory"],
      player: { hp: 3, maxHp: 3, hasBlade: false, hasSigil: false, currentRoomId: "entrance" },
      boss: { hp: 3, maxHp: 3, shieldBroken: false, voidActive: false, voidRoomId: null },
      flags: { tutorialMoveCompleted: false, sigilAdjacencySatisfied: false, bossIntroduced: false },
      metrics: { startedAt: 1, endedAt: null, tabMoves: 0, roomsClosed: 0, actions: 0 },
      revision: 0,
    };
    mock.session[STATE_KEY] = state;
    mock.tabs.set(11, { id: 11, index: 1, groupId: 0, windowId: 1 });
    mock.tabs.set(12, { id: 12, index: 0, groupId: 0, windowId: 1 });
    vi.stubGlobal("chrome", mock.chrome);

    const next = await syncTopology();

    expect(next?.orderedRoomIds).toEqual(["armory", "entrance"]);
    expect(next?.metrics.tabMoves).toBe(1);
    expect(mock.session[STATE_KEY]).toEqual(next);
  });
});
