// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { SidePanel, type PortalItem, type TrailNode } from "./main";
import { Onboarding } from "./onboarding";

const quest = { id: "q", title: "Ship the next release", rootNodeId: "a", currentNodeId: "c", status: "active" as const, createdAt: 1, completedAt: null };
const trail: TrailNode[] = [
  { id: "a", title: "Chrome extensions", url: "https://developer.chrome.com", disposition: "path", status: "live" },
  { id: "b", title: "Side Panel API", url: "https://developer.chrome.com/side-panel", disposition: "path", status: "live" },
  { id: "c", title: "Lifecycle edge cases", url: "https://issues.chromium.org", disposition: "unclassified", status: "live" },
];
const portals: PortalItem[] = [{ id: "p", title: "Animation research", nodeIds: ["b", "c"], status: "sealed" }];
const loot = [{ id: "l", title: "Lifecycle notes", url: "https://developer.chrome.com/lifecycle", note: "Keep this detail" }];
const trackableQuest = { ...quest, currentNodeId: null };

afterEach(() => { document.body.innerHTML = ""; });

describe("Side Panel instrument", () => {
  it("renders one trail and a consequence-clear primary action", () => {
    const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
    act(() => root.render(<SidePanel state="active" quest={quest} trail={trail} portals={portals} loot={loot} />));
    expect(host.querySelectorAll("ol.quest-trail")).toHaveLength(1);
    expect(host.textContent).toContain("Fold this detour");
    expect(host.textContent).not.toContain("Local trail");
    expect(host.querySelectorAll(".ui-topology")).toHaveLength(0);
  });

  it("keeps collections mutually exclusive and restores focus to the requested drawer", () => {
    const onDrawer = vi.fn(); const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
    act(() => root.render(<SidePanel state="active" quest={quest} trail={trail} portals={portals} loot={loot} drawer="portals" onDrawer={onDrawer} />));
    expect(host.querySelectorAll("aside")).toHaveLength(1);
    expect(host.textContent).toContain("Animation research");
    expect(host.querySelector<HTMLButtonElement>('aside button[aria-label="Close portals"]')).toBe(document.activeElement);
  });

  it("renders a required, bounded goal before Begin Quest", () => {
    const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
    act(() => root.render(<SidePanel state="start" quest={null} trail={[]} portals={[]} loot={[]} />));
    const input = host.querySelector<HTMLInputElement>("input")!;
    expect(input.required).toBe(true);
    expect(input.maxLength).toBe(120);
    expect(host.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
  });

  it("exposes the minimal Loot save and drawer affordances", () => {
    const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
    act(() => root.render(<SidePanel state="active" quest={quest} trail={trail} portals={portals} loot={loot} />));
    expect(host.textContent).toContain("Save as Loot");
    expect(host.textContent).toContain("Loot");
  });

  it("renders Track this tab only for a trackable quest", () => {
    const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
    act(() => root.render(<SidePanel state="nothing-to-fold" quest={trackableQuest} trail={[]} portals={portals} loot={loot} trackable />));
    expect(Array.from(host.querySelectorAll("button")).some((button) => button.textContent === "Track this tab")).toBe(true);
    act(() => root.render(<SidePanel state="nothing-to-fold" quest={trackableQuest} trail={[]} portals={portals} loot={loot} />));
    expect(host.textContent).not.toContain("Track this tab");
  });

  it("dispatches the track action", () => {
    const onAction = vi.fn(); const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
    act(() => root.render(<SidePanel state="nothing-to-fold" quest={trackableQuest} trail={[]} portals={portals} loot={loot} trackable onAction={onAction} />));
    act(() => Array.from(host.querySelectorAll<HTMLButtonElement>("button")).find((button) => button.textContent === "Track this tab")?.click());
    expect(onAction).toHaveBeenCalledWith("track");
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
