// scripts/dev.mjs
import { spawn } from "node:child_process";

console.log("[dev.mjs] Starting Next.js with auto-assigned port...");

const child = spawn("npx", ["next", "dev", "-H", "0.0.0.0"], {
  stdio: "inherit",
  shell: false,
  env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=12288" }
});

child.on("error", (err) => {
  console.error("[dev.mjs] Failed to start:", err.message);
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
