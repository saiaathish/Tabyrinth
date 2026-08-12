import type {GameState} from "../game/types";
export const STATE_KEY="tabyrinth.activeRun";
export const storage={async get():Promise<GameState|null>{const r=await chrome.storage.session.get(STATE_KEY);return (r[STATE_KEY] as GameState|undefined)??null},async set(state:GameState){await chrome.storage.session.set({[STATE_KEY]:state})},async clear(){await chrome.storage.session.remove(STATE_KEY)}};
