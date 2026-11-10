import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const child = spawn(
  process.execPath,
  [fileURLToPath(new URL("./local.mjs", import.meta.url)), "start"],
  {
    stdio: "inherit",
    env: { ...process.env, ACCOUNTPILOT_ENABLE_LOCAL_DEMO: "true" },
  },
);
child.on("error", () => {
  console.error("Could not start the local fictional demo.");
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code || 0;
});
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
