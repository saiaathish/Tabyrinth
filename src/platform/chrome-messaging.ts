import type {Message} from "../game/types";
import type {QuestMessage} from "../quest/messages";

export type ExtensionMessage = Message | QuestMessage;
export const sendMessage=(message:ExtensionMessage)=>chrome.runtime.sendMessage(message);
