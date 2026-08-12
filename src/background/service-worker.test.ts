import { beforeEach, describe, expect, it, vi } from "vitest";
import { createChromeMock } from "../test/mocks/chrome";
import { STATE_KEY } from "../platform/chrome-storage";

const state = (tabId=11) => ({ schemaVersion:1 as const, runId:"run", status:"active" as const, groupId:7, windowId:1, roomById:{entrance:{roomId:"entrance",kind:"entrance" as const,tabId,visited:true,destroyed:false,completed:false}}, roomIdByTabId:{[String(tabId)]:"entrance"}, orderedRoomIds:["entrance"], player:{hp:3,maxHp:3,hasBlade:false,hasSigil:false,currentRoomId:"entrance"}, boss:{hp:3,maxHp:3,shieldBroken:false,voidActive:false,voidRoomId:null}, flags:{tutorialMoveCompleted:false,sigilAdjacencySatisfied:false,bossIntroduced:false}, metrics:{startedAt:1,endedAt:null,tabMoves:0,roomsClosed:0,actions:0}, revision:0 });

describe("service worker lifecycle",()=>{
  beforeEach(()=>vi.resetModules());

  it("registers each browser listener once",async()=>{
    const mock=createChromeMock(); vi.stubGlobal("chrome",mock.chrome);
    await import("./service-worker");
    const counts=Object.values(mock.listeners).map((listener)=>listener.listeners.length);
    expect(counts).toEqual([1,1,1,1,1]);
  });

  it("rejects gameplay actions from unrelated tabs",async()=>{
    const mock=createChromeMock(); vi.stubGlobal("chrome",mock.chrome); mock.session[STATE_KEY]=state();
    const worker=await import("./service-worker");
    const result=await worker.handleMessage({type:"GAME_ACTION",action:{type:"RUN_RESET"}},{tab:{id:999}} as chrome.runtime.MessageSender);
    expect(result).toEqual(mock.session[STATE_KEY]);
    expect(mock.session[STATE_KEY]).toEqual(state());
  });

  it("ignores every lifecycle event for an unrelated tab",async()=>{
    const mock=createChromeMock(); vi.stubGlobal("chrome",mock.chrome); mock.session[STATE_KEY]=state();
    await import("./service-worker");
    mock.listeners.moved.listeners[0]!(999);
    mock.listeners.removed.listeners[0]!(999);
    mock.listeners.detached.listeners[0]!(999,{oldWindowId:1,oldPosition:0});
    mock.listeners.attached.listeners[0]!(999,{newWindowId:2,newPosition:0});
    mock.listeners.updated.listeners[0]!(999,{},{} as chrome.tabs.Tab);
    await new Promise((resolve)=>setTimeout(resolve,70));
    expect(mock.session[STATE_KEY]).toEqual(state());
    expect(mock.grouped).toEqual([]);
  });

  it("restores only a registered detached tab",async()=>{
    const mock=createChromeMock(); vi.stubGlobal("chrome",mock.chrome); mock.session[STATE_KEY]=state();
    await import("./service-worker");
    mock.listeners.detached.listeners[0]!(11,{oldWindowId:1,oldPosition:0});
    await new Promise((resolve)=>setTimeout(resolve,0));
    expect(mock.grouped).toEqual([{ids:[11],groupId:7}]);
  });

  it("closes only the registered room and rejects senderless gameplay",async()=>{
    const mock=createChromeMock(); vi.stubGlobal("chrome",mock.chrome); mock.session[STATE_KEY]=state();
    const worker=await import("./service-worker");
    mock.listeners.removed.listeners[0]!(11);
    await new Promise((resolve)=>setTimeout(resolve,0));
    expect((mock.session[STATE_KEY] as ReturnType<typeof state>).roomById.entrance.destroyed).toBe(true);
    mock.session[STATE_KEY]=state();
    await worker.handleMessage({type:"GAME_ACTION",action:{type:"RUN_RESET"}},{} as chrome.runtime.MessageSender);
    expect(mock.session[STATE_KEY]).toEqual(state());
  });
});
