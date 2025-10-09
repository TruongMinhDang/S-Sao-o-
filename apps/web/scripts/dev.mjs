// Chuyển "9002 0.0.0.0" thành -p/-H cho next dev
import { spawn } from "node:child_process";

const args = process.argv.slice(2);
let port = process.env.PORT || 3000;
let host = process.env.HOSTNAME || "0.0.0.0";

for (const a of args) {
  if (/^\d+$/.test(a)) port = a;
  else if (a.includes(".")) host = a;
}

const child = spawn(
  "npx",
  ["next", "dev", "-p", String(port), "-H", host],
  { stdio: "inherit", shell: true }
);
child.on("exit", (code) => process.exit(code ?? 0));
