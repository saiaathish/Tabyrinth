import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({ plugins: [react()], build: { rollupOptions: { input: { popup: "popup.html", sidepanel: "sidepanel.html", portal: "portal.html", "service-worker": "src/background/service-worker.ts" }, output: { entryFileNames: (chunk) => chunk.name === "service-worker" ? "service-worker.js" : "assets/[name]-[hash].js" } }, outDir: "dist" } });
