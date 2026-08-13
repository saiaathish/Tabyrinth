import { handleQuestMessage, handleQuestTabRemoved, isQuestMessage, reconcileQuestSession, restoreQuestTab, restoreQuestWorkspace } from "../quest/runtime";
import { parsePortalMessage } from "../portal/messages";
import { beginPortalQuest, capturePortalCreated, capturePortalRemoved, capturePortalUpdated, deletePortal, finishActivePortalQuest, foldPortal, getPortalState, markPortalPath, reconcilePortalSession, renamePortal, savePortalLoot, unsealPortal } from "../portal/runtime";

let registered = false;
let reconcileTimer: ReturnType<typeof setTimeout> | undefined;
let mutationQueue: Promise<void> = Promise.resolve();

function enqueueMutation<T>(task: () => Promise<T>): Promise<T> {
  const result = mutationQueue.then(task);
  mutationQueue = result.then(() => undefined, () => undefined);
  return result;
}

function isPortalSender(sender: chrome.runtime.MessageSender): boolean {
  if (!sender.url) return false;
  try {
    const actual = new URL(sender.url);
    return ["portal.html", "sidepanel.html"].some((page) => {
      const expected = new URL(chrome.runtime.getURL(page));
      return actual.protocol === expected.protocol && actual.host === expected.host && actual.pathname === expected.pathname;
    });
  } catch { return false; }
}

const reconcile = () => {
  if (reconcileTimer) clearTimeout(reconcileTimer);
  reconcileTimer = setTimeout(() => {
    reconcileTimer = undefined;
    void enqueueMutation(async () => {
    });
  }, 50);
};

const reconcileQuest = () => {
  void enqueueMutation(async () => { await reconcilePortalSession(); await reconcileQuestSession(); await restoreQuestWorkspace(); });
};

export function registerServiceWorkerListeners() {
  if (registered) return;
  registered = true;
  chrome.action?.onClicked?.addListener((tab) => { if (tab.windowId !== undefined) void chrome.sidePanel?.open({ windowId: tab.windowId }); });
  chrome.tabs.onMoved.addListener(() => reconcile());
  chrome.tabs.onActivated?.addListener(() => reconcile());
  chrome.tabs.onRemoved.addListener((tabId) => void enqueueMutation(async () => { await handleQuestTabRemoved(tabId); await capturePortalRemoved(tabId); }));
  chrome.tabs.onCreated?.addListener((tab) => void enqueueMutation(() => capturePortalCreated(tab)));
  chrome.tabs.onDetached.addListener((tabId) => void enqueueMutation(async () => { await restoreQuestTab(tabId); }));
  chrome.tabs.onAttached.addListener((tabId) => { reconcile(); void enqueueMutation(async () => { await restoreQuestTab(tabId); }); });
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab.url || tab.title || tab.favIconUrl) void enqueueMutation(() => capturePortalUpdated(tabId, tab));
    if (changeInfo.groupId !== undefined || tab.groupId === -1 || tab.windowId !== undefined) void enqueueMutation(async () => { await restoreQuestTab(tabId); });
    else reconcile();
  });
  chrome.runtime.onStartup?.addListener(reconcileQuest);
  chrome.runtime.onInstalled?.addListener(reconcileQuest);
  reconcileQuest();
}

export async function handleMessage(value: unknown, sender: chrome.runtime.MessageSender) {
  if (isQuestMessage(value)) return enqueueMutation(() => handleQuestMessage(value, sender));
  const portalMessage = parsePortalMessage(value);
  if (portalMessage) {
    if (!isPortalSender(sender)) return undefined;
    return enqueueMutation(async () => {
      if (portalMessage.type === "PORTAL_GET") return getPortalState();
      if (portalMessage.type === "PORTAL_BEGIN") return beginPortalQuest(portalMessage.title);
      if (portalMessage.type === "PORTAL_FINISH") return finishActivePortalQuest(portalMessage.questId);
      if (portalMessage.type === "PORTAL_MARK_PATH") return markPortalPath(portalMessage.nodeId);
      if (portalMessage.type === "PORTAL_SAVE_LOOT") return savePortalLoot(portalMessage.nodeId, portalMessage.note, portalMessage.close);
      if (portalMessage.type === "PORTAL_RENAME") return renamePortal(portalMessage.portalId, portalMessage.title);
      if (portalMessage.type === "PORTAL_DELETE") return deletePortal(portalMessage.portalId);
      if (portalMessage.type === "PORTAL_FOLD") return foldPortal(portalMessage.questId, portalMessage.currentNodeId);
      return unsealPortal(portalMessage.portalId);
    });
  }
  return undefined;
}

registerServiceWorkerListeners();
chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  void handleMessage(message, sender).then(sendResponse).catch((error: unknown) => sendResponse({ error: error instanceof Error ? error.message : String(error) }));
  return true;
});
