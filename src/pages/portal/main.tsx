import React from "react";
import { createRoot } from "react-dom/client";
import { Button, Signal } from "../../ui";
import type { Portal } from "../../portal/types";
import "../surfaces.css";

type PortalView = Portal;

/**
 * A restrained adaptation of React Bits' Folder silhouette (reactbits.dev).
 * Business interaction remains outside this decorative artifact; see THIRD_PARTY_NOTICES.md.
 */
function FoldedArtifact({ count, open }: { count: number; open: boolean }) {
  const leaves = Array.from({ length: Math.min(3, Math.max(1, count)) });
  return <div className="folded-artifact" data-open={open} aria-hidden="true">
    <div className="folder-tab" />
    {leaves.map((_, index) => <span key={index} style={{ "--leaf": index } as React.CSSProperties} />)}
    <div className="folder-face"><b>{String(count).padStart(2, "0")}</b></div>
  </div>;
}

function displayTitle(value: string | null | undefined) { return value?.trim() || "Untitled page"; }
function host(value: string | null | undefined) { try { return value ? new URL(value).hostname.replace(/^www\./, "") : ""; } catch { return ""; } }

export function PortalPage() {
  const [portal, setPortal] = React.useState<PortalView | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const [loadError, setLoadError] = React.useState("");
  const portalId = new URLSearchParams(window.location.search).get("portal");
  const load = React.useCallback(async () => {
    setLoadError("");
    const result = await chrome.runtime.sendMessage({ type: "PORTAL_GET" });
    if (result?.error) throw new Error(result.error);
    const next = portalId ? result?.state?.portals?.[portalId] : null;
    setPortal(next ?? null);
  }, [portalId]);
  React.useEffect(() => {
    let alive = true;
    const timer = window.setTimeout(() => {
      void load().catch((error) => { if (alive) setLoadError(error instanceof Error ? error.message : "PORTAL_UNAVAILABLE"); }).finally(() => { if (alive) setLoading(false); });
    }, 0);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [load]);

  const unseal = async () => {
    if (!portalId) return;
    setBusy(true); setNotice("Restoring trail…");
    try {
      const result = await chrome.runtime.sendMessage({ type: "PORTAL_UNSEAL", portalId });
      if (result?.error) throw new Error(result.error);
      if (!result?.ok) { setNotice(`Partial restore · ${result?.restoredNodeIds?.length ?? 0}/${portal?.nodeIds.length ?? 0}`); await load(); return; }
      setNotice("Branch restored.");
      await load();
    } catch (error) { setNotice(error instanceof Error ? error.message.replaceAll("_", " ").toLowerCase() : "Restore paused."); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!portalId || !window.confirm("Delete this Portal? Saved branch data will be removed.")) return;
    setBusy(true);
    try {
      const result = await chrome.runtime.sendMessage({ type: "PORTAL_DELETE", portalId });
      if (result?.error) throw new Error(result.error);
      setPortal(null); setNotice("Portal deleted.");
    } catch (error) { setNotice(error instanceof Error ? error.message.replaceAll("_", " ").toLowerCase() : "Delete failed."); } finally { setBusy(false); }
  };

  if (loading) return <main className="surface portal portal-loading" aria-busy="true"><span className="wordmark">TABYRINTH</span><div className="instrument-loading" role="status"><span />Opening Portal…</div></main>;
  if (!portal) return <main className="surface portal" aria-labelledby="portal-title"><header className="instrument-header"><span className="wordmark">TABYRINTH</span><Signal label="UNAVAILABLE" state="danger" /></header><section className="portal-empty"><h1 id="portal-title">Portal unavailable.</h1><p>{loadError ? "Saved data could not be read." : "This Portal no longer exists."}</p><p className="muted">This tab can be closed from Chrome.</p></section>{loadError && <p className="surface-notice" role="alert">{loadError.replaceAll("_", " ").toLowerCase()}</p>}{notice && <p className="surface-notice" role="status">{notice}</p>}</main>;

  const nodes = portal.snapshot.nodeIds.map((id) => portal.snapshot.nodes[id]).filter(Boolean);
  const origin = portal.snapshot.nodes[portal.originNodeId];
  const partial = portal.restoreStatus === "partial" || Boolean(portal.error);
  const restoring = portal.status === "restoring" || busy;
  return <main className="surface portal" aria-labelledby="portal-title">
    <header className="instrument-header"><span className="wordmark">TABYRINTH</span><Signal label={restoring ? "RESTORING" : partial ? "PARTIAL" : portal.status.toUpperCase()} state={partial ? "danger" : restoring ? "warning" : "active"} /></header>
    <section className="portal-identity">
      <FoldedArtifact count={portal.nodeIds.length} open={portal.status === "open"} />
      <div><p>{portal.nodeIds.length} pages sealed</p><h1 id="portal-title">{portal.title}</h1></div>
    </section>
    <p className="portal-fork">Forked from <strong>{displayTitle(origin?.title)}</strong>{host(origin?.url) && <span> · {host(origin.url)}</span>}</p>
    <ol className="portal-contents" aria-label="Sealed pages">
      {nodes.map((node, index) => <li key={node.id}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{displayTitle(node.title)}</strong><small>{host(node.url)}</small></div></li>)}
    </ol>
    <section className="portal-actions">
      {partial && <p className="portal-recovery" role="alert">{portal.restoredNodeIds.length}/{portal.nodeIds.length} restored. Retry will skip opened pages.</p>}
      {portal.status === "open" ? <span className="muted">Branch restored</span> : <Button disabled={restoring} onClick={() => void unseal()}>{restoring ? "Restoring…" : partial ? "Retry unseal" : "Unseal branch"}</Button>}
      <button type="button" className="text-control danger-control" disabled={busy} onClick={() => void remove()}>Delete Portal</button>
    </section>
    {notice && <p className="surface-notice" role={partial ? "alert" : "status"} aria-live="polite">{notice}</p>}
  </main>;
}

function PortalPreview() {
  return <main className="surface portal" aria-labelledby="portal-title"><header className="instrument-header"><span className="wordmark">TABYRINTH</span><Signal label="SEALED" state="active" /></header><section className="portal-identity"><FoldedArtifact count={3} open={false} /><div><p>3 pages sealed</p><h1 id="portal-title">Animation research</h1></div></section><p className="portal-fork">Forked from <strong>Side Panel API</strong><span> · developer.chrome.com</span></p><ol className="portal-contents" aria-label="Sealed pages">{["View Transitions guide", "Reduced motion patterns", "Animation performance"].map((title, index) => <li key={title}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{title}</strong><small>{index === 2 ? "web.dev" : "developer.chrome.com"}</small></div></li>)}</ol><section className="portal-actions"><Button>Unseal branch</Button><button type="button" className="text-control danger-control">Delete Portal</button></section></main>;
}

const rootElement = document.getElementById("root");
if (rootElement) createRoot(rootElement).render(new URLSearchParams(window.location.search).has("preview") ? <PortalPreview /> : <PortalPage />);
