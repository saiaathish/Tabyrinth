import { assertGameState } from "../game/invariants";
import type { GameState } from "../game/types";

export const STATE_KEY = "tabyrinth.activeRun";

export const storage = {
  async get(): Promise<GameState | null> {
    const result = await chrome.storage.session.get(STATE_KEY);
    const value: unknown = result[STATE_KEY];
    if (value === undefined) return null;
    try {
      assertGameState(value);
      return value;
    } catch {
      await chrome.storage.session.remove(STATE_KEY);
      return null;
    }
  },
  async set(state: GameState) {
    assertGameState(state);
    await chrome.storage.session.set({ [STATE_KEY]: state });
  },
  async clear() {
    await chrome.storage.session.remove(STATE_KEY);
  },
};
