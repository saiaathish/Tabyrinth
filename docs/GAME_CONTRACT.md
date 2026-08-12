# Game contract

`GameState` and `GameAction` in `src/game/types.ts` define the shared foundation contract. UI sends intents through runtime messages; service-worker controllers validate, reduce, and persist state. `orderedRoomIds` reflects actual managed tab indices.
 # TABYRINTH Wave 1 Game Contract

 - Extension owns exactly five room tabs per run, grouped under `TABYRINTH`.
 - `chrome.storage.session` stores active run state, including tabId-to-roomId mapping.
 - Actual managed tab indices are authoritative. `tabs.onMoved` syncs topology; unrelated tab events are ignored.
 - Closing a managed room removes only that room from topology. Closing Void clears Void state.
 - Reset clears active run and closes only tabs belonging to that run.
 - Reducer is the only mutation path for game state. Service worker persists reducer output after wake/event handling.
 - Gate 1 still requires manual Chrome drag validation; mocked tests cannot prove browser behavior.
