// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { errorState, SidePanel, userFacingError, type PortalItem, type TrailNode } from "./main";
import { Onboarding } from "./onboarding";

const quest = { id: "q", title: "Ship the next release", rootNodeId: "a", currentNodeId: "c", status: "active" as const, createdAt: 1, completedAt: null };
const completedQuest = { ...quest, status: "complete" as const, currentNodeId: null, completedAt: 2 };
const trail: TrailNode[] = [
  { id: "a", title: "Chrome extensions", url: "https://developer.chrome.com", disposition: "path", status: "live" },
  { id: "b", title: "Side Panel API", url: "https://developer.chrome.com/side-panel", disposition: "path", status: "live" },
  { id: "c", title: "Lifecycle edge cases", url: "https://issues.chromium.org", disposition: "unclassified", status: "live" },
];
const portals: PortalItem[] = [{ id: "p", title: "Animation research", nodeIds: ["b", "c"], status: "sealed" }];
const trackableQuest = { ...quest, currentNodeId: null };

afterEach(() => { document.body.innerHTML = ""; });

describe("Side Panel instrument", () => {
  it("renders one trail and a consequence-clear primary action", () => {
    const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
    act(() => root.render(<SidePanel state="active" quest={quest} trail={trail} portals={portals} />));
    expect(host.querySelectorAll("ol.quest-trail")).toHaveLength(1);
    expect(host.textContent).toContain("Fold this detour");
    expect(host.textContent).not.toContain("Local trail");
    expect(host.querySelectorAll(".ui-topology")).toHaveLength(0);
  });

  it("keeps collections mutually exclusive and restores focus to the requested drawer", () => {
    const onDrawer = vi.fn(); const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
    act(() => root.render(<SidePanel state="active" quest={quest} trail={trail} portals={portals} drawer="portals" onDrawer={onDrawer} />));
    expect(host.querySelectorAll("aside")).toHaveLength(1);
    expect(host.textContent).toContain("Animation research");
    expect(host.querySelector<HTMLButtonElement>('aside button[aria-label="Close portals"]')).toBe(document.activeElement);
  });

  it("renders a required, bounded goal before Begin Quest", () => {
    const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
    act(() => root.render(<SidePanel state="start" quest={null} trail={[]} portals={[]} />));
    const input = host.querySelector<HTMLInputElement>("input")!;
    expect(input.required).toBe(true);
    expect(input.maxLength).toBe(120);
    expect(host.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
  });

  it("removes deprecated Arcade and Loot controls", () => {
    const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
    act(() => root.render(<SidePanel state="active" quest={quest} trail={trail} portals={portals} />));
    expect(host.textContent).not.toContain("Arcade");
    expect(host.textContent).not.toContain("Loot");
  });

  it("renders Track this tab only for a trackable quest", () => {
    const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
    act(() => root.render(<SidePanel state="untracked" quest={trackableQuest} trail={[]} portals={portals} trackable />));
    expect(host.textContent).toContain("OUTSIDE TRAIL");
    expect(host.textContent).toContain("This tab isn't on your Quest yet.");
    expect(host.textContent).toContain("Add it to your Main Path, or return to a tracked tab.");
    expect(host.textContent).toContain("ADD TO MAIN PATH");
    act(() => root.render(<SidePanel state="nothing-to-fold" quest={trackableQuest} trail={[]} portals={portals} />));
    expect(Array.from(host.querySelectorAll("button")).some((button) => button.textContent === "ADD TO MAIN PATH")).toBe(false);
    act(() => root.render(<SidePanel state="nothing-to-fold" quest={trackableQuest} trail={[]} portals={portals} />));
    expect(host.textContent).not.toContain("ADD TO MAIN PATH");
  });

  it("replaces Finish with New Quest after completion", () => {
    const onFinish = vi.fn(); const onNewQuest = vi.fn(); const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
    act(() => root.render(<SidePanel state="complete" quest={completedQuest} trail={[]} portals={portals} onFinish={onFinish} onNewQuest={onNewQuest} />));
    expect(host.textContent).toContain("Quest complete.");
    expect(host.textContent).toContain("New Quest");
    expect(host.textContent).not.toContain("Finish");
    act(() => host.querySelector<HTMLButtonElement>('button.text-control')?.click());
    expect(onNewQuest).toHaveBeenCalledOnce();
    expect(onFinish).not.toHaveBeenCalled();
  });

  it("dispatches the track action", () => {
    const onAction = vi.fn(); const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
    act(() => root.render(<SidePanel state="untracked" quest={trackableQuest} trail={[]} portals={portals} trackable onAction={onAction} />));
    act(() => Array.from(host.querySelectorAll<HTMLButtonElement>("button")).find((button) => button.textContent === "ADD TO MAIN PATH")?.click());
    expect(onAction).toHaveBeenCalledWith("track");
  });

  it("keeps persistent notices in document flow", () => {
    const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
    act(() => root.render(<SidePanel state="unsafe" quest={quest} trail={trail} portals={portals} notice="This tab isn't on your Quest yet." />));
    const notice = host.querySelector<HTMLElement>(".surface-notice")!;
    expect(notice).toBeTruthy();
    expect(notice.getAttribute("role")).toBe("alert");
    expect(notice.compareDocumentPosition(host.querySelector("footer")!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(host.textContent).not.toContain("ORIGIN LOST");
    expect(host.textContent).not.toContain("QUEST_ORIGIN_UNAVAILABLE");
  });

  it("maps unavailable lineage to the recoverable outside-trail state", () => {
    expect(errorState("UNTRACKED_TAB_PARENT_UNAVAILABLE")).toBe("untracked");
    expect(userFacingError("UNTRACKED_TAB_PARENT_UNAVAILABLE")).toBe("This tab isn't on your Quest yet.");
    expect(errorState("UNSUPPORTED_ACTIVE_TAB")).toBe("unsupported");
    expect(userFacingError("UNSUPPORTED_ACTIVE_TAB")).toBe("This tab is unsupported.");
  });

  it("keeps onboarding inline and advances with native buttons", () => {
    const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
    act(() => root.render(<Onboarding />));
    expect(host.querySelector("section.onboarding")).not.toBeNull();
    expect(host.textContent).toContain("Keep the useful path.");
    act(() => host.querySelector<HTMLButtonElement>('button:not(.text-control)')?.click());
    expect(host.textContent).toContain("The trail follows you.");
    expect(host.querySelector('[role="dialog"]')).toBeNull();
  });
});
