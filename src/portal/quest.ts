export type PortalQuestStatus = "active" | "complete" | "archived";

/** Durable flagship Quest record. Kept separate from the legacy Arcade workspace model. */
export type PortalQuest = {
  id: string;
  title: string;
  rootNodeId: string;
  currentNodeId: string | null;
  status: PortalQuestStatus;
  createdAt: number;
  completedAt: number | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function isPortalQuest(value: unknown): value is PortalQuest {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  if (keys.length !== 7 || !keys.every((key) => ["id", "title", "rootNodeId", "currentNodeId", "status", "createdAt", "completedAt"].includes(key))) return false;
  return typeof value.id === "string" && value.id.length > 0
    && typeof value.title === "string" && value.title.trim().length > 0 && value.title.length <= 120
    && typeof value.rootNodeId === "string" && value.rootNodeId.length > 0
    && (value.currentNodeId === null || typeof value.currentNodeId === "string")
    && ["active", "complete", "archived"].includes(String(value.status))
    && Number.isFinite(value.createdAt)
    && (value.completedAt === null || Number.isFinite(value.completedAt));
}

export function createPortalQuest(input: { id: string; title: string; rootNodeId: string; createdAt?: number }): PortalQuest {
  const title = input.title.trim();
  if (!title || title.length > 120) throw new Error("INVALID_QUEST_TITLE");
  const createdAt = input.createdAt ?? Date.now();
  return { id: input.id, title, rootNodeId: input.rootNodeId, currentNodeId: input.rootNodeId, status: "active", createdAt, completedAt: null };
}

export function finishPortalQuest(quest: PortalQuest, completedAt = Date.now()): PortalQuest {
  if (quest.status !== "active") throw new Error("QUEST_NOT_ACTIVE");
  return { ...quest, status: "complete", currentNodeId: null, completedAt };
}
