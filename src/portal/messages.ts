export type PortalMessage =
  | { type: "PORTAL_GET" }
  | { type: "PORTAL_TRACK_CURRENT" }
  | { type: "PORTAL_BEGIN"; title: string }
  | { type: "PORTAL_FINISH"; questId: string }
  | { type: "PORTAL_MARK_PATH"; nodeId: string }
  | { type: "PORTAL_SAVE_LOOT"; nodeId: string; note?: string; close?: boolean }
  | { type: "PORTAL_RENAME"; portalId: string; title: string }
  | { type: "PORTAL_DELETE"; portalId: string }
  | { type: "PORTAL_FOLD"; questId: string; currentNodeId: string }
  | { type: "PORTAL_UNSEAL"; portalId: string };

const record = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const string = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const keys = (v: Record<string, unknown>, expected: string[]) => Object.keys(v).length === expected.length && Object.keys(v).every((k) => expected.includes(k));

export function parsePortalMessage(value: unknown): PortalMessage | null {
  if (!record(value) || typeof value.type !== "string") return null;
  if (value.type === "PORTAL_GET" && keys(value, ["type"])) return { type: "PORTAL_GET" };
  if (value.type === "PORTAL_TRACK_CURRENT" && keys(value, ["type"])) return { type: "PORTAL_TRACK_CURRENT" };
  if (value.type === "PORTAL_BEGIN" && string(value.title) && value.title.trim().length > 0 && value.title.trim().length <= 120 && keys(value, ["type", "title"])) return { type: "PORTAL_BEGIN", title: value.title.trim() };
  if (value.type === "PORTAL_FINISH" && string(value.questId) && keys(value, ["type", "questId"])) return { type: "PORTAL_FINISH", questId: value.questId };
  if (value.type === "PORTAL_MARK_PATH" && string(value.nodeId) && keys(value, ["type", "nodeId"])) return { type: "PORTAL_MARK_PATH", nodeId: value.nodeId };
  if (value.type === "PORTAL_SAVE_LOOT" && string(value.nodeId)
    && (value.note === undefined || (typeof value.note === "string" && value.note.trim().length <= 160))
    && (value.close === undefined || typeof value.close === "boolean")
    && keys(value, ["type", "nodeId", ...(value.note === undefined ? [] : ["note"]), ...(value.close === undefined ? [] : ["close"])])) {
    const note = value.note?.trim();
    return { type: "PORTAL_SAVE_LOOT", nodeId: value.nodeId, ...(note ? { note } : {}), ...(value.close === undefined ? {} : { close: value.close }) };
  }
  if (value.type === "PORTAL_RENAME" && string(value.portalId) && string(value.title) && value.title.trim().length > 0 && value.title.trim().length <= 120 && keys(value, ["type", "portalId", "title"])) return { type: "PORTAL_RENAME", portalId: value.portalId, title: value.title.trim() };
  if (value.type === "PORTAL_DELETE" && string(value.portalId) && keys(value, ["type", "portalId"])) return { type: "PORTAL_DELETE", portalId: value.portalId };
  if (value.type === "PORTAL_FOLD" && string(value.questId) && string(value.currentNodeId) && keys(value, ["type", "questId", "currentNodeId"])) return { type: "PORTAL_FOLD", questId: value.questId, currentNodeId: value.currentNodeId };
  if (value.type === "PORTAL_UNSEAL" && string(value.portalId) && keys(value, ["type", "portalId"])) return { type: "PORTAL_UNSEAL", portalId: value.portalId };
  return null;
}

export const isPortalMessage = (value: unknown): value is PortalMessage => parsePortalMessage(value) !== null;
