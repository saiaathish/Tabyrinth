import { afterEach, describe, expect, it, vi } from "vitest";
import { createChromeMock } from "../test/mocks/chrome";
import { STATE_KEY, storage } from "./chrome-storage";

describe("session storage validation", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("clears corrupt persisted data instead of exposing a partial run", async () => {
    const mock = createChromeMock();
    mock.session[STATE_KEY] = { schemaVersion: 1, runId: "run", orderedRoomIds: ["entrance"] };
    vi.stubGlobal("chrome", mock.chrome);

    await expect(storage.get()).resolves.toBeNull();
    expect(mock.session[STATE_KEY]).toBeUndefined();
  });
});
