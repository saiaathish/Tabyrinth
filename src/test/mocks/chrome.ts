import { vi } from "vitest";

type Listener<T extends (...args: never[]) => void> = { addListener(fn:T):void; listeners:T[] };

const event = <T extends (...args: never[]) => void>():Listener<T> => {
  const listeners:T[]=[];
  return { listeners, addListener(fn:T){ if(!listeners.includes(fn)) listeners.push(fn); } };
};

export function createChromeMock() {
  const listeners={ moved:event<(id:number)=>void>(), removed:event<(id:number)=>void>(), activated:event<(activeInfo:{tabId:number;windowId:number})=>void>(), detached:event<(id:number,info:{oldWindowId:number,oldPosition:number})=>void>(), attached:event<(id:number,info:{newWindowId:number,newPosition:number})=>void>(), updated:event<(id:number,changeInfo:{groupId?:number},tab:chrome.tabs.Tab)=>void>() };
  const tabs = new Map<number, {id:number; index:number; groupId:number; windowId:number}>();
  let nextTabId = 100;
  const session: Record<string, unknown> = {};
  const created:string[]=[];
  const removed:number[][]=[];
  const grouped:{ids:number[];groupId?:number}[]=[];
  const updated:{id:number;info:unknown}[]=[];
  const moved:{ids:number[];index:number;windowId?:number}[]=[];
  const calls:string[]=[];
  const update = vi.fn(async(id:number,info:chrome.tabs.UpdateProperties)=>{updated.push({id,info}); return undefined;});
  const chromeMock = { storage: { local: { get: async (key:string) => ({[key]: session[key]}), set: async (value:Record<string,unknown>) => Object.assign(session,value), remove: async (key:string) => delete session[key] }, session: { get: async (key:string) => ({[key]: session[key]}), set: async (value:Record<string,unknown>) => Object.assign(session,value), remove: async (key:string) => delete session[key] } },
    runtime: { getURL:(path:string)=>`chrome-extension://test/${path}`, onMessage:event<(message:unknown,sender:chrome.runtime.MessageSender,sendResponse:(value:unknown)=>void)=>boolean>(), onStartup:event<()=>void>(), onInstalled:event<(details:chrome.runtime.InstalledDetails)=>void>() },
    tabs: { onMoved:listeners.moved, onRemoved:listeners.removed, onActivated:listeners.activated, onDetached:listeners.detached, onAttached:listeners.attached, onUpdated:listeners.updated, query: async (query:chrome.tabs.QueryInfo) => [...tabs.values()].filter((tab) => query.groupId === undefined || tab.groupId === query.groupId).sort((a,b)=>a.index-b.index), get: async (id:number)=>tabs.get(id), create:async(properties:chrome.tabs.CreateProperties)=>{const id=nextTabId++; const index=tabs.size; created.push(String(properties.url ?? "")); tabs.set(id,{id,index,groupId:-1,windowId:1});return {id,index,windowId:1}}, group:async({tabIds,groupId}:{tabIds:[number,...number[]],groupId?:number})=>{calls.push("group"); const targetWindow=[...tabs.values()].find((tab)=>tab.groupId===groupId)?.windowId ?? tabs.get(tabIds[0])?.windowId; if ([...tabIds].some((id)=>tabs.get(id)?.windowId!==targetWindow)) throw new Error("cross-window group"); [...tabIds].forEach((id)=>{const tab=tabs.get(id);if(tab)tab.groupId=groupId??1}); grouped.push({ids:[...tabIds],groupId});return groupId??1}, move:async(tabIds:number[],options:{index:number;windowId?:number})=>{calls.push("move"); tabIds.forEach((id)=>{const tab=tabs.get(id);if(tab){tab.windowId=options.windowId??tab.windowId;tab.index=options.index}});moved.push({ids:[...tabIds],...options});return []}, remove:async(ids:number[])=>{removed.push(ids)}, update },
    tabGroups: { update: async () => undefined } };
  return { tabs, session, created, removed, grouped, updated, moved, update, calls, listeners, chrome:chromeMock };
}
