import React from "react";
import { createRoot } from "react-dom/client";

function App() {
  const [windowId, setWindowId] = React.useState<number | null>(null);
  const [busy, setBusy] = React.useState(true);
  const [error, setError] = React.useState("");
  React.useEffect(() => {
    void chrome.windows.getCurrent().then((win) => {
      setWindowId(win.id ?? null);
      setBusy(false);
    }).catch(() => { setError("Close this popup, then open TABYRINTH again."); setBusy(false); });
  }, []);
  const open = () => {
    if (windowId === null) return;
    setBusy(true);
    void chrome.sidePanel.open({ windowId }).catch(() => setError("Side Panel did not open. Try the TABYRINTH toolbar icon again.")).finally(() => setBusy(false));
  };
  return <main style={{ padding: 24, fontFamily: "ui-sans-serif, system-ui", background: "#090c0b", color: "#f0ecdf", minHeight: "100vh" }}><h1>TABYRINTH</h1><p>Fold rabbit holes. Keep the trail.</p>{error && <p role="alert">{error}</p>}<button type="button" disabled={busy || windowId === null} onClick={open}>{busy ? "Opening…" : "Open Side Panel"} →</button></main>;
}

createRoot(document.getElementById("root")!).render(<App />);
