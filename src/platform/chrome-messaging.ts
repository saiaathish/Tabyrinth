import type {Message} from "../game/types";
export const sendMessage=(message:Message)=>chrome.runtime.sendMessage(message);
