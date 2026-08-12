import { afterEach, describe, expect, it, vi } from "vitest";
import { INITIAL_ROOMS } from "../game/constants";
import { STATE_KEY } from "../platform/chrome-storage";
import { createChromeMock } from "../test/mocks/chrome";
import { startRun } from "./run-controller";

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
});
