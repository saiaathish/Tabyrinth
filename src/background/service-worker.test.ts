import { beforeEach, describe, expect, it, vi } from "vitest";
import { createChromeMock } from "../test/mocks/chrome";
import { STATE_KEY } from "../platform/chrome-storage";
import { activateRun } from "./run-controller";
import type { GameState } from "../game/types";

const state = (tabId=11) => ({ schemaVersion:1 as const, runId:"run", status:"active" as const, groupId:7, windowId:1, roomById:{entrance:{roomId:"entrance",kind:"entrance" as const,tabId,visited:true,destroyed:false,completed:false}}, roomIdByTabId:{[String(tabId)]:"entrance"}, orderedRoomIds:["entrance"], player:{hp:3,maxHp:3,hasBlade:false,hasSigil:false,currentRoomId:"entrance"}, boss:{hp:3,maxHp:3,shieldBroken:false,voidActive:false,voidRoomId:null}, flags:{tutorialMoveCompleted:false,sigilAdjacencySatisfied:false,bossIntroduced:false}, metrics:{startedAt:1,endedAt:null,tabMoves:0,roomsClosed:0,actions:0}, revision:0 });

const popupSender = { url: "chrome-extension://test/popup.html" } as chrome.runtime.MessageSender;
const roomSender = (tabId=11, roomId="entrance") => ({ url:`chrome-extension://test/room.html?run=run&room=${roomId}`, tab:{id:tabId,url:`chrome-extension://test/room.html?run=run&room=${roomId}`} }) as chrome.runtime.MessageSender;

describe("service worker lifecycle",()=>{
  beforeEach(()=>vi.resetModules());

  it("returns truthful activation results", async()=>{
    const mock=createChromeMock(); vi.stubGlobal("chrome",mock.chrome); mock.session[STATE_KEY]=state();
    expect(await activateRun()).toEqual({ state: mock.session[STATE_KEY], activated: true });
    expect(mock.update).toHaveBeenCalledWith(11,{active:true});
    expect(await activateRun("missing")).toEqual({ state: mock.session[STATE_KEY], activated: true });
    delete mock.session[STATE_KEY];
    expect(await activateRun()).toEqual({ state: null, activated: false });
    mock.session[STATE_KEY] = state();
    mock.update.mockRejectedValueOnce(new Error("tab missing"));
    await expect(activateRun()).rejects.toThrow("tab missing");
  });

  it("registers each browser listener once",async()=>{
    const mock=createChromeMock(); vi.stubGlobal("chrome",mock.chrome);
    await import("./service-worker");
    const counts=Object.values(mock.listeners).map((listener)=>listener.listeners.length);
    expect(counts).toEqual([1,1,1,1,1,1]);
  });

  it("rejects gameplay actions from unrelated tabs",async()=>{
    const mock=createChromeMock(); vi.stubGlobal("chrome",mock.chrome); mock.session[STATE_KEY]=state();
    const worker=await import("./service-worker");
    const result=await worker.handleMessage({type:"GAME_ACTION",runId:"run",action:{type:"MOVE_PLAYER",payload:{toRoomId:"entrance"}}},roomSender(999));
    expect(result).toEqual({ error: "This room is no longer managed." });
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
    mock.tabs.set(11,{id:11,index:3,groupId:-1,windowId:2});
    (mock.session[STATE_KEY] as ReturnType<typeof state>).orderedRoomIds=["entrance"];
    await import("./service-worker");
    mock.listeners.detached.listeners[0]!(11,{oldWindowId:1,oldPosition:0});
    await new Promise((resolve)=>setTimeout(resolve,0));
    expect(mock.moved).toEqual([{ids:[11],index:0,windowId:1}]);
    expect(mock.calls.slice(0,2)).toEqual(["move","group"]);
    expect(mock.grouped).toEqual([{ids:[11],groupId:7}]);
    expect((mock.session[STATE_KEY] as ReturnType<typeof state>).orderedRoomIds).toEqual(["entrance"]);
  });

  it("closes only the registered room and rejects senderless gameplay",async()=>{
    const mock=createChromeMock(); vi.stubGlobal("chrome",mock.chrome); mock.session[STATE_KEY]=state();
    const worker=await import("./service-worker");
    mock.listeners.removed.listeners[0]!(11);
    await new Promise((resolve)=>setTimeout(resolve,0));
    expect(mock.session[STATE_KEY]).toBeUndefined();
    mock.session[STATE_KEY]=state();
    await worker.handleMessage({type:"GAME_ACTION",runId:"run",action:{type:"MOVE_PLAYER",payload:{toRoomId:"entrance"}}},{} as chrome.runtime.MessageSender);
    expect(mock.session[STATE_KEY]).toEqual(state());
  });

  it("does not resurrect reset state when tab removal callbacks arrive late", async () => {
    const mock=createChromeMock(); vi.stubGlobal("chrome",mock.chrome); mock.session[STATE_KEY]=state();
    const worker=await import("./service-worker");
    const remove = mock.chrome.tabs.remove;
    mock.chrome.tabs.remove = async (ids:number[]) => { await remove(ids); mock.listeners.removed.listeners[0]!(ids[0]!); };
    await worker.handleMessage({type:"RESET_RUN"},popupSender);
    await new Promise((resolve)=>setTimeout(resolve,0));
    expect(mock.session[STATE_KEY]).toBeUndefined();
  });

  it("creates and registers one managed Void tab after Break Seal", async () => {
    const mock=createChromeMock(); vi.stubGlobal("chrome",mock.chrome);
    const initial = state() as unknown as GameState;
    initial.status = "boss";
    initial.player.currentRoomId = "boss";
    initial.player.hasBlade = true;
    initial.player.hasSigil = true;
    initial.roomById.boss = { roomId: "boss", kind: "boss", tabId: 12, visited: true, destroyed: false, completed: false };
    initial.roomById.vault = { roomId: "vault", kind: "vault", tabId: 13, visited: true, destroyed: false, completed: true };
    initial.roomIdByTabId["12"] = "boss";
    initial.roomIdByTabId["13"] = "vault";
    initial.orderedRoomIds = ["entrance", "vault", "boss"];
    mock.tabs.set(12, { id: 12, index: 1, groupId: 7, windowId: 1 });
    mock.session[STATE_KEY] = initial;
    const worker=await import("./service-worker");
    await worker.handleMessage({type:"GAME_ACTION",runId:"run",action:{type:"BREAK_SEAL"}},roomSender(12,"boss"));
    const next = mock.session[STATE_KEY] as ReturnType<typeof state>;
    expect(next.boss.voidActive).toBe(true);
    expect(next.boss.voidRoomId).toBe("void-rift");
    expect(mock.grouped).toHaveLength(1);
    expect(mock.grouped[0]?.groupId).toBe(7);
    expect(mock.grouped[0]?.ids).toHaveLength(1);
  });
});
