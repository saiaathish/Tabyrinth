import { vi } from "vitest";

type Listener<T extends (...args:any[])=>void> = { addListener(fn:T):void; listeners:T[] };

const event = <T extends (...args:any[])=>void>():Listener<T> => {
  const listeners:T[]=[];
  return { listeners, addListener(fn:T){ if(!listeners.includes(fn)) listeners.push(fn); } };
};

export function createChromeMock() {
  const listeners={ moved:event<(id:number)=>void>(), removed:event<(id:number)=>void>(), detached:event<(id:number,info:{oldWindowId:number,oldPosition:number})=>void>(), attached:event<(id:number,info:{newWindowId:number,newPosition:number})=>void>(), updated:event<(id:number,changeInfo:object,tab:chrome.tabs.Tab)=>void>() };
  const tabs = new Map<number, {id:number; index:number; groupId:number; windowId:number}>();
  const session: Record<string, unknown> = {};
  const removed:number[][]=[];
  const grouped:{ids:number[];groupId?:number}[]=[];
  const updated:{id:number;info:unknown}[]=[];
  const moved:{ids:number[];index:number;windowId?:number}[]=[];
  const update = vi.fn(async(id:number,info:chrome.tabs.UpdateProperties)=>{updated.push({id,info}); return undefined;});
  const chromeMock = { storage: { session: { get: async (key:string) => ({[key]: session[key]}), set: async (value:Record<string,unknown>) => Object.assign(session,value), remove: async (key:string) => delete session[key] } },
    runtime: { getURL:(path:string)=>`chrome-extension://test/${path}`, onMessage:event<(message:unknown,sender:chrome.runtime.MessageSender,sendResponse:(value:unknown)=>void)=>boolean>() },
    tabs: { onMoved:listeners.moved, onRemoved:listeners.removed, onDetached:listeners.detached, onAttached:listeners.attached, onUpdated:listeners.updated, query: async () => [...tabs.values()], get: async (id:number)=>tabs.get(id), create:async()=>({id:Date.now(),index:tabs.size,windowId:1}), group:async({tabIds,groupId}:{tabIds:[number,...number[]],groupId?:number})=>{grouped.push({ids:[...tabIds],groupId});return groupId??1}, move:async(tabIds:number[],options:{index:number;windowId?:number})=>{moved.push({ids:[...tabIds],...options});return []}, remove:async(ids:number[])=>{removed.push(ids)}, update },
    tabGroups: { update: async () => undefined } };
  return { tabs, session, removed, grouped, updated, moved, update, listeners, chrome:chromeMock };
}
