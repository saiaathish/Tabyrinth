/* global process, console */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const dist = resolve(process.argv[2] ?? "dist");
const manifestPath = join(dist, "manifest.json");
const requiredPages = ["sidepanel.html", "portal.html", "popup.html"];
const fail = (message) => {
  console.error(`Extension validation failed: ${message}`);
  process.exitCode = 1;
};

if (!existsSync(manifestPath)) {
  fail(`missing ${manifestPath}`);
} else {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (error) {
    fail(`manifest is not valid JSON (${error instanceof Error ? error.message : String(error)})`);
  }

  if (manifest) {
    if (manifest.manifest_version !== 3) fail("manifest_version must be 3");
    if (typeof manifest.name !== "string" || !manifest.name.trim()) fail("name is required");
    if (typeof manifest.description !== "string" || manifest.description.trim().length < 20 || manifest.description.length > 132) fail("description must be 20-132 characters");
    if (typeof manifest.version !== "string" || !/^\d+(?:\.\d+){1,3}(?:[-+][0-9A-Za-z.-]+)?$/.test(manifest.version)) fail("version must be a Chrome-compatible numeric version");
    if (typeof manifest.minimum_chrome_version !== "string" || !/^\d+(?:\.\d+){0,3}$/.test(manifest.minimum_chrome_version)) fail("minimum_chrome_version must be declared");
    if (manifest.background?.service_worker !== "service-worker.js") fail("background.service_worker must point to service-worker.js");
    if (manifest.background?.type !== "module") fail("background.type must be module");
    if (manifest.side_panel?.default_path !== "sidepanel.html") fail("side_panel.default_path must point to sidepanel.html");
    if (manifest.action?.default_popup) fail("toolbar action must not retain a popup; Side Panel is the primary surface");
    if (!Array.isArray(manifest.permissions)) fail("permissions must be an array");
    if (manifest.permissions?.some((permission) => typeof permission !== "string" || permission.includes("://") || permission === "<all_urls>")) fail("host permissions are forbidden");

    for (const file of ["service-worker.js", ...requiredPages]) if (!existsSync(join(dist, file))) fail(`missing emitted entrypoint ${file}`);
    for (const page of requiredPages) {
      const html = readFileSync(join(dist, page), "utf8");
      if (!/<script[^>]+src="\/assets\/[^"]+\.js"[^>]*><\/script>/.test(html)) fail(`${page} does not reference a bundled local module`);
      if (/https?:\/\//.test(html)) fail(`${page} contains a remote URL in its document shell`);
    }
  }
}

if (!process.exitCode) console.log(`Extension validation passed: ${dist}`);
