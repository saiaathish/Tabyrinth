import { startRun, syncTopology, resetRun, restoreManagedTab } from "./run-controller";
import { storage } from "../platform/chrome-storage";
import { reduceGame } from "../game/reducer";
import type { GameAction, Message } from "../game/types";

let registered = false;
let reconcileTimer: ReturnType<typeof setTimeout> | undefined;

const managedRoom = async (tabId:number) => {
  const state=await storage.get();
  return state?.roomIdByTabId[String(tabId)] ? state : null;
};

const reconcile = (tabId?:number) => {
  if (reconcileTimer) clearTimeout(reconcileTimer);
  reconcileTimer=setTimeout(async()=>{
    reconcileTimer=undefined;
    if (tabId===undefined || await managedRoom(tabId)) await syncTopology();
  }, 50);
};

async function onRemoved(tabId:number) {
  const state=await managedRoom(tabId); if(!state) return;
  const room=state.roomIdByTabId[String(tabId)];
  const next=room===state.boss.voidRoomId ? reduceGame(state,{type:"VOID_CLOSED"}) : reduceGame(state,{type:"ROOM_CLOSED",payload:{roomId:room}});
  await storage.set(next);
}

export function registerServiceWorkerListeners() {
  if (registered) return; registered=true;
  chrome.tabs.onMoved.addListener((tabId)=>reconcile(tabId));
  chrome.tabs.onRemoved.addListener((tabId)=>void onRemoved(tabId));
  chrome.tabs.onDetached.addListener((tabId)=>void restoreManagedTab(tabId));
  chrome.tabs.onAttached.addListener((tabId)=>reconcile(tabId));
  chrome.tabs.onUpdated.addListener((tabId)=>reconcile(tabId));
}

export async function handleMessage(message:Message, sender:chrome.runtime.MessageSender) {
  if(message.type==="START_RUN") return startRun();
  if(message.type==="GET_STATE") return storage.get();
  if(message.type==="RESET_RUN") { await resetRun(); return null; }
  if(message.type==="GAME_ACTION") {
    const state=await storage.get();
    if(!state || (sender.tab?.id!==undefined && state.roomIdByTabId[String(sender.tab.id)]===undefined)) return state;
    const next=reduceGame(state,message.action as GameAction); await storage.set(next); return next;
  }
}

registerServiceWorkerListeners();
chrome.runtime.onMessage.addListener((message:Message,sender,sendResponse)=>{ void handleMessage(message,sender).then(sendResponse).catch(e=>sendResponse({error:String(e)})); return true; });
