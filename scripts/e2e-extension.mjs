/* global Buffer, URL, WebSocket, console, process, setTimeout */
import { createServer, request } from "node:http";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { once } from "node:events";

const root = resolve(process.cwd());
const dist = resolve(process.env.TABYRINTH_DIST ?? join(root, "dist"));
const chrome = process.env.CHROME_BIN ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const fixture = resolve(process.env.TABYRINTH_FIXTURE ?? join(root, "scripts/e2e-fixtures/index.html"));
const artifactDir = resolve(process.env.TABYRINTH_E2E_ARTIFACT_DIR ?? join(root, "artifacts/e2e"));
const reportPath = join(artifactDir, "report.json");
const screenshotPath = join(artifactDir, "sidepanel.png");
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const getJson = (url) => new Promise((done, fail) => {
  const req = request(url, (res) => {
    let body = "";
    res.setEncoding("utf8");
    res.on("data", (chunk) => { body += chunk; });
    res.on("end", () => (res.statusCode ?? 500) >= 400 ? fail(new Error(`HTTP ${res.statusCode}`)) : done(JSON.parse(body)));
  });
  req.on("error", fail);
  req.end();
});
async function waitFor(fetcher, label, timeout = 15000) {
  const deadline = Date.now() + timeout;
  let last;
  while (Date.now() < deadline) {
    try { return await fetcher(); } catch (error) { last = error; await sleep(150); }
  }
  throw new Error(`${label}: ${last?.message ?? last}`);
}

class CdpConnection {
  constructor(url) { this.url = url; this.nextId = 0; this.pending = new Map(); this.contexts = new Map(); }
  async connect() {
    if (typeof WebSocket !== "function") throw new Error("WebSocket is unavailable in the runtime");
    this.socket = new WebSocket(this.url);
    this.socket.onmessage = (event) => {
      const message = JSON.parse(String(event.data));
      if (message.method === "Runtime.executionContextCreated") {
        this.contexts.set(message.params.context.id, message.params.context);
        if (message.params.context.auxData?.isDefault) this.defaultContextId = message.params.context.id;
        return;
      }
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message ?? JSON.stringify(message.error)));
      else pending.resolve(message.result);
    };
    await new Promise((resolvePromise, reject) => {
      this.socket.onopen = resolvePromise;
      this.socket.onerror = () => reject(new Error(`CDP connection failed: ${this.url}`));
    });
  }
  send(method, params = {}) {
    const id = ++this.nextId;
    return new Promise((resolvePromise, reject) => {
      this.pending.set(id, { resolve: resolvePromise, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket?.close(); }
  async evaluate(expression, contextId = this.defaultContextId) {
    const result = await this.send("Runtime.evaluate", { expression, ...(contextId ? { contextId } : {}), awaitPromise: true, returnByValue: true, userGesture: true });
    if (result?.exceptionDetails) {
      const exception = result.exceptionDetails.exception;
      const detail = exception?.description ?? exception?.value ?? result.exceptionDetails.text ?? "Runtime evaluation failed";
      throw new Error(`${detail} [${expression}]`);
    }
    const remote = result?.result;
    if (remote?.subtype === "error") throw new Error(remote.description ?? "Runtime evaluation failed");
    return remote?.value;
  }
}

const manifest = JSON.parse(await readFile(join(dist, "manifest.json"), "utf8"));
if (manifest.manifest_version !== 3 || manifest.background?.service_worker !== "service-worker.js") throw new Error("invalid dist MV3 manifest");
if (!manifest.permissions?.includes("webNavigation")) throw new Error("dist manifest is missing webNavigation");
for (const file of ["manifest.json", "service-worker.js", "sidepanel.html", "portal.html", "popup.html", "room.html"]) await readFile(join(dist, file));
const sidepanelHtml = await readFile(join(dist, "sidepanel.html"), "utf8");
const sidepanelScripts = [...sidepanelHtml.matchAll(/src="([^"]+\.js)"/g)].map((match) => match[1]);
const sidepanelBundle = (await Promise.all(sidepanelScripts.map((file) => readFile(join(dist, file.replace(/^\//, "")), "utf8")))).join("\n");
for (const forbidden of ["Arcade", "Loot", "Save as Loot", "Try Arcade"]) if (sidepanelBundle.includes(forbidden)) throw new Error(`deprecated Side Panel copy leaked into dist: ${forbidden}`);

const fixtureServer = createServer(async (req, res) => {
  try { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(await readFile(fixture)); }
  catch { res.writeHead(404); res.end(); }
});
fixtureServer.listen(0, "127.0.0.1");
await once(fixtureServer, "listening");
const fixturePort = fixtureServer.address().port;
const fixtureUrl = (name) => `http://127.0.0.1:${fixturePort}/?page=${encodeURIComponent(name)}`;
const distServer = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url ?? "/", "http://127.0.0.1").pathname);
    const relative = pathname.replace(/^\/+/, "");
    const filePath = resolve(dist, relative);
    if (filePath !== dist && !filePath.startsWith(`${dist}/`)) { res.writeHead(400); res.end(); return; }
    const body = await readFile(filePath);
    const contentType = pathname.endsWith(".html") ? "text/html; charset=utf-8" : pathname.endsWith(".css") ? "text/css; charset=utf-8" : "application/javascript; charset=utf-8";
    res.writeHead(200, { "content-type": contentType }); res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
distServer.listen(0, "127.0.0.1");
await once(distServer, "listening");
const distPort = distServer.address().port;
const portServer = createServer();
portServer.listen(0, "127.0.0.1");
await once(portServer, "listening");
const cdpPort = portServer.address().port;
await new Promise((done) => portServer.close(done));
const profile = await mkdtemp(join(tmpdir(), "tabyrinth-e2e-"));
const report = { build: process.env.TESTED_BUILD ?? "working-tree", chromeVersion: null, extensionId: null, passed: [], failed: [], unverified: [], screenshots: [] };
let browser;
let browserCdp;
let workerCdp;
let extensionPage;
let previewPage;
let latestEntries = [];
const pass = (label, detail) => { report.passed.push({ label, detail }); console.log(`[PASS] ${label}${detail ? ` — ${detail}` : ""}`); };
const fail = (label, detail) => { report.failed.push({ label, detail }); console.error(`[FAIL] ${label} — ${detail}`); };
const unverified = (label, detail) => { report.unverified.push({ label, detail }); console.log(`[UNVERIFIED] ${label} — ${detail}`); };

try {
  browser = spawn(chrome, [`--user-data-dir=${profile}`, `--remote-debugging-port=${cdpPort}`, `--disable-extensions-except=${dist}`, `--load-extension=${dist}`, "--no-first-run", "--no-default-browser-check", fixtureUrl("root")], { stdio: "ignore" });
  const version = await waitFor(() => getJson(`http://127.0.0.1:${cdpPort}/json/version`), "Chrome CDP did not start");
  report.chromeVersion = version.Browser ?? "unknown";
  latestEntries = await waitFor(async () => {
    const entries = await getJson(`http://127.0.0.1:${cdpPort}/json/list`);
    const worker = entries.find((entry) => entry.type === "service_worker" && /\/(?:service-worker|service_worker)\.js$/.test(entry.url));
    if (!worker) throw new Error("extension service-worker target not discovered");
    return entries;
  }, "extension service-worker target unavailable");
  const worker = latestEntries.find((entry) => entry.type === "service_worker" && /\/(?:service-worker|service_worker)\.js$/.test(entry.url));
  report.extensionId = new URL(worker.url).hostname;
  pass("dist manifest and entrypoints");
  pass("isolated Chrome launched", report.chromeVersion);
  pass("extension service worker discovered", report.extensionId);
  if (latestEntries.some((entry) => entry.url.startsWith(`http://127.0.0.1:${fixturePort}/`))) pass("deterministic fixture loaded");
  else throw new Error("fixture page target not exposed by CDP");

  browserCdp = new CdpConnection(version.webSocketDebuggerUrl);
  await browserCdp.connect();
  workerCdp = new CdpConnection(worker.webSocketDebuggerUrl);
  await workerCdp.connect();
  await workerCdp.send("Runtime.enable");
  const workerContextId = await waitFor(async () => {
    for (const context of workerCdp.contexts.values()) {
      try {
        if (await workerCdp.evaluate("typeof chrome?.tabs?.create", context.id) === "function") return context.id;
      } catch { /* Context may disappear during worker startup. */ }
    }
    throw new Error(`service-worker tabs API unavailable (${[...workerCdp.contexts.keys()].join(",")})`);
  }, "service-worker tabs API unavailable");
  const workerEvaluate = (expression) => workerCdp.evaluate(expression, workerContextId);
  await workerEvaluate(`chrome.tabs.create({ url: chrome.runtime.getURL("popup.html"), active: true })`);
  const extensionEntry = await waitFor(async () => {
    latestEntries = await getJson(`http://127.0.0.1:${cdpPort}/json/list`);
    const entry = latestEntries.find((candidate) => candidate.url === `chrome-extension://${report.extensionId}/popup.html` && candidate.webSocketDebuggerUrl);
    if (!entry) throw new Error("extension popup target unavailable");
    return entry;
  }, "extension popup target unavailable");
  extensionPage = new CdpConnection(extensionEntry.webSocketDebuggerUrl);
  await extensionPage.connect();
  await extensionPage.send("Runtime.enable");
  await extensionPage.send("Page.enable");
  await sleep(150);
  await waitFor(async () => {
    if (await extensionPage.evaluate("document.readyState") !== "complete") throw new Error("extension popup is still loading");
    return true;
  }, "extension popup did not finish loading");
  pass("extension popup messaging page opened");
  const popupContextId = await waitFor(async () => {
    for (const context of extensionPage.contexts.values()) {
      try {
        if (await extensionPage.evaluate("typeof chrome?.runtime?.sendMessage", context.id) === "function") return context.id;
      } catch { /* Context may disappear during popup startup. */ }
    }
    const probe = await extensionPage.evaluate("JSON.stringify({ href: location.href, chrome: typeof chrome, keys: typeof chrome === 'object' ? Object.keys(chrome).slice(0,30) : [], runtime: typeof chrome?.runtime, tabs: typeof chrome?.tabs })");
    throw new Error(`popup runtime API unavailable (${[...extensionPage.contexts.keys()].join(",")}; ${probe})`);
  }, "popup runtime API unavailable");
  const popupEvaluate = (expression) => extensionPage.evaluate(expression, popupContextId);
  const rootTab = await waitFor(async () => {
    const tabs = await workerEvaluate("chrome.tabs.query({})");
    const candidate = tabs.find((tab) => tab.active && tab.id !== undefined) ?? tabs.find((tab) => tab.id !== undefined);
    if (!candidate) throw new Error(`initial fixture tab not found: ${JSON.stringify(tabs)}`);
    return candidate;
  }, "initial fixture tab unavailable");
  if (!rootTab?.id) throw new Error("initial fixture tab not found");
  const sendPortal = (message) => popupEvaluate(`chrome.runtime.sendMessage(${JSON.stringify(message)})`);
  const beginResult = await sendPortal({ type: "PORTAL_BEGIN", title: "E2E Quest" });
  if (beginResult?.error) throw new Error(beginResult.error);
  const began = await waitFor(async () => {
    const result = await sendPortal({ type: "PORTAL_GET" });
    if (!result?.quest || !result.currentNodeId) throw new Error("Quest root not persisted");
    return result;
  }, "Quest root not persisted");
  const rootNodeId = began.currentNodeId;
  pass("Begin Quest persists active fixture root");

  const navigatedUrl = fixtureUrl("same-tab");
  await workerEvaluate(`chrome.tabs.update(${rootTab.id}, { url: ${JSON.stringify(navigatedUrl)}, active: true })`);
  const sameTab = await waitFor(async () => {
    const result = await sendPortal({ type: "PORTAL_GET" });
    const node = result.graph?.nodes?.[rootNodeId];
    if (node?.url !== navigatedUrl || result.currentNodeId !== rootNodeId) throw new Error("same-tab binding was not preserved");
    return result;
  }, "same-tab binding was not preserved");
  pass("same-tab navigation preserves stable node identity", sameTab.graph.nodes[rootNodeId].url);

  const childUrl = fixtureUrl("explicit-track");
  const childTab = await workerEvaluate(`chrome.tabs.create({ url: ${JSON.stringify(childUrl)}, active: true })`);
  if (!childTab?.id) throw new Error("second fixture tab was not created");
  await waitFor(async () => {
    const result = await sendPortal({ type: "PORTAL_GET" });
    if (result.currentNodeId !== null || result.activeTabSupported !== true) throw new Error("second tab was not exposed as untracked web tab");
    return result;
  }, "second tab was not exposed as untracked web tab");
  pass("second tab is exposed as an untracked web tab");

  const trackedResult = await sendPortal({ type: "PORTAL_TRACK_CURRENT" });
  if (trackedResult?.error) throw new Error(trackedResult.error);
  const tracked = await waitFor(async () => {
    const result = await sendPortal({ type: "PORTAL_GET" });
    const childNode = result.currentNodeId && result.graph?.nodes?.[result.currentNodeId];
    if (!childNode || childNode.parentNodeId !== rootNodeId || !result.graph.tabBindings[String(childTab.id)]) throw new Error("explicit second-tab tracking was not persisted");
    return result;
  }, "explicit second-tab tracking was not persisted");
  pass("explicit Add to Main Path tracks second tab", tracked.currentNodeId);

  const previewCreated = await browserCdp.send("Target.createTarget", { url: `http://127.0.0.1:${distPort}/sidepanel.html?preview=1`, background: true });
  const previewEntry = await waitFor(async () => {
    latestEntries = await getJson(`http://127.0.0.1:${cdpPort}/json/list`);
    const entry = latestEntries.find((candidate) => candidate.id === previewCreated.targetId && candidate.webSocketDebuggerUrl);
    if (!entry) throw new Error("Side Panel preview target unavailable");
    return entry;
  }, "Side Panel preview target unavailable");
  previewPage = new CdpConnection(previewEntry.webSocketDebuggerUrl);
  await previewPage.connect();
  await previewPage.send("Runtime.enable");
  await previewPage.send("Page.enable");
  await waitFor(async () => {
    if (await previewPage.evaluate("document.readyState") !== "complete") throw new Error("Side Panel preview is still loading");
    return true;
  }, "Side Panel preview did not finish loading");
  const previewText = await previewPage.evaluate("document.body.innerText");
  if (/Arcade|Loot|Save as Loot|Try Arcade/.test(previewText)) throw new Error("deprecated Side Panel copy rendered");
  pass("generated Side Panel preview rendered without deprecated copy");
  const screenshot = await previewPage.send("Page.captureScreenshot", { format: "png" });
  await mkdir(artifactDir, { recursive: true });
  await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));
  report.screenshots.push(screenshotPath);
  pass("generated Side Panel preview screenshot captured", screenshotPath);
  unverified("Chrome browser chrome Side Panel shell", "The automated path validates the generated extension page and MV3 runtime; Chrome's native side-panel container is not exposed as a CDP DOM target.");
  report.scenarios = { beginQuest: true, sameTabNavigation: true, explicitSecondTabTracking: true, serviceWorkerDiscovery: true, nativeSidePanelShell: false };
} catch (error) {
  fail("generated extension E2E", error instanceof Error ? error.message : String(error));
  if (latestEntries.length) console.error(`[INFO] CDP targets: ${latestEntries.map((entry) => `${entry.type}:${entry.url}`).join(" | ")}`);
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  await mkdir(artifactDir, { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  previewPage?.close();
  workerCdp?.close();
  browserCdp?.close();
  if (browser && !browser.killed) { browser.kill("SIGTERM"); await Promise.race([once(browser, "exit"), sleep(2000)]); }
  fixtureServer.close();
  distServer.close();
  await rm(profile, { recursive: true, force: true });
  if (report.failed.length) process.exitCode = 1;
  console.log(`E2E_REPORT ${reportPath}`);
  console.log(`E2E_SUMMARY passed=${report.passed.length} failed=${report.failed.length} unverified=${report.unverified.length}`);
}
