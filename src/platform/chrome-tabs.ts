export type ManagedTab={id:number;index:number;groupId?:number;windowId:number};
export const tabsAdapter={
  create:async (url:string)=>{const tab=await chrome.tabs.create({url,active:false}); if(tab.id===undefined) throw new Error("Chrome did not return created tab id"); return {...tab,id:tab.id};},
  query:(query:chrome.tabs.QueryInfo)=>chrome.tabs.query(query),
  get:(id:number)=>chrome.tabs.get(id),
  group:(tabIds:number[],groupId?:number)=>chrome.tabs.group({tabIds:tabIds as [number,...number[]], ...(groupId===undefined?{}:{groupId})}),
  updateGroup:(groupId:number,title:string)=>chrome.tabGroups.update(groupId,{title,color:"green"}),
  move:(tabIds:number[],index:number,windowId?:number)=>chrome.tabs.move(tabIds,{index,...(windowId===undefined?{}:{windowId})}),
  remove:(ids:number[])=>chrome.tabs.remove(ids),
  update:(id:number,info:chrome.tabs.UpdateProperties & {title?:string})=>chrome.tabs.update(id,info as unknown as chrome.tabs.UpdateProperties),
};
