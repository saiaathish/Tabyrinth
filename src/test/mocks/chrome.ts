export function createChromeMock() {
  const listeners: { moved: Array<(id:number)=>void>; removed: Array<(id:number)=>void> } = { moved: [], removed: [] };
  const tabs = new Map<number, {id:number; index:number; groupId:number; windowId:number}>();
  const session: Record<string, unknown> = {};
  return { tabs, session, chrome: { storage: { session: { get: async (key:string) => ({[key]: session[key]}), set: async (value:Record<string,unknown>) => Object.assign(session,value), remove: async (key:string) => delete session[key] } }, tabs: { onMoved: { addListener: (fn:(id:number)=>void) => listeners.moved.push(fn) }, onRemoved: { addListener: (fn:(id:number)=>void) => listeners.removed.push(fn) }, query: async () => [...tabs.values()] }, tabGroups: { update: async () => undefined } } };
}
