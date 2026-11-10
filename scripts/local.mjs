import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const port = process.env.ACCOUNTPILOT_PORT || "3000";
const address = `http://localhost:${port}`;
export function canUpdate(status, branch, upstream) {
  if (status.trim())
    return "You have local changes. They have been left untouched. Save them with GitHub Desktop before updating.";
  if (!branch.trim() || branch.trim() === "HEAD")
    return "Select a branch in GitHub Desktop before updating.";
  if (!upstream.trim())
    return "This branch has no GitHub tracking branch. Use GitHub Desktop to publish or select a remote branch.";
  return "";
}
function run(command, args, capture = false) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
  });
  if (result.error || result.status !== 0)
    throw new Error(
      capture
        ? `${command} ${args.join(" ")} failed. Check access to this repository in GitHub Desktop.`
        : `${command} ${args.join(" ")} did not complete. Your files have not been reset. See the error above.`,
    );
  return (result.stdout || "").trim();
}
async function isRunning() {
  try {
    const r = await fetch(`http://127.0.0.1:${port}`, {
      signal: AbortSignal.timeout(1500),
    });
    return r.ok && (await r.text()).includes("AccountPilot");
  } catch {
    return false;
  }
}
function openBrowser() {
  const command =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "explorer.exe"
        : "xdg-open";
  const result = spawnSync(command, [address], { stdio: "ignore" });
  if (result.error || result.status !== 0)
    console.log(`Open ${address} in your browser.`);
}
function install() {
  const lock = createHash("sha256")
    .update(readFileSync(path.join(root, "package-lock.json")))
    .digest("hex");
  const stamp = path.join(root, "node_modules", ".accountpilot-installed-lock");
  if (
    !existsSync(path.join(root, "node_modules", "next", "package.json")) ||
    !existsSync(stamp) ||
    readFileSync(stamp, "utf8") !== lock
  ) {
    console.log(
      "Installing the exact dependencies. This may take a few minutes…",
    );
    run(npm, ["ci"]);
    writeFileSync(stamp, lock);
  }
}
async function main(mode) {
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535)
    throw new Error("Choose a port between 1 and 65535.");
  const major = Number(process.versions.node.split(".")[0]);
  if (major < 22)
    throw new Error(
      "Install Node.js 24 LTS from nodejs.org, then reopen this launcher.",
    );
  if (mode === "update") {
    if (await isRunning())
      throw new Error(
        "AccountPilot is running. Press Control+C in its Terminal window, then open Update AccountPilot.command again.",
      );
    if (!existsSync(path.join(root, ".git")))
      throw new Error(
        "This is a ZIP copy. Open GitHub Desktop, clone oarventures/AccountPilot, and select accountpilot-context-workspace. Launch from that cloned folder for automatic updates. Your ZIP copy has not been changed.",
      );
    const status = run("git", ["status", "--porcelain"], true);
    const branch = run("git", ["rev-parse", "--abbrev-ref", "HEAD"], true);
    const dirtyReason = canUpdate(status, branch, "checking");
    if (dirtyReason) throw new Error(dirtyReason);
    const configured = (key) => {
      const result = spawnSync("git", ["config", "--get", key], {
        cwd: root,
        encoding: "utf8",
      });
      return result.status === 0 ? result.stdout.trim() : "";
    };
    const remote = configured(`branch.${branch}.remote`);
    const mergeRef = configured(`branch.${branch}.merge`);
    const reason = canUpdate(status, branch, remote && mergeRef);
    if (reason) throw new Error(reason);
    if (
      !/^[A-Za-z0-9_.-]+$/.test(remote) ||
      remote.startsWith("-") ||
      remote === "." ||
      !mergeRef.startsWith("refs/heads/")
    )
      throw new Error(
        "Choose a GitHub-tracked branch in GitHub Desktop before updating.",
      );
    console.log(
      `Getting updates for ${branch} without overwriting local work…`,
    );
    // Fetch exactly the configured branch, including in single-branch clones.
    run("git", ["fetch", remote, mergeRef]);
    run("git", ["merge", "--ff-only", "FETCH_HEAD"]);
    install();
    run(npm, ["test"]);
    run(npm, ["run", "build"]);
    console.log("Update verified. Starting AccountPilot…");
  } else if (mode !== "start") throw new Error("Use start or update.");
  if (await isRunning()) {
    console.log("AccountPilot is already running. Opening it.");
    openBrowser();
    return;
  }
  install();
  console.log(
    "Starting AccountPilot on your computer. Keep this window open. Press Control+C to stop.",
  );
  const server = spawn(npm, ["run", "dev", "--", "--port", port], {
    cwd: root,
    stdio: "inherit",
  });
  let exited = false;
  let exitCode = 0;
  server.on("error", (e) => {
    console.error(e.message);
    exited = true;
    exitCode = 1;
  });
  server.on("exit", (code) => {
    exited = true;
    exitCode = code || 0;
  });
  process.on("SIGINT", () => server.kill("SIGINT"));
  process.on("SIGTERM", () => server.kill("SIGTERM"));
  for (let i = 0; i < 90 && !exited; i++) {
    if (await isRunning()) {
      openBrowser();
      break;
    }
    await delay(1000);
  }
  if (!exited && !(await isRunning())) {
    server.kill("SIGTERM");
    throw new Error(
      `The app did not become ready on port ${port}. Check the startup messages above; another app may be using that port.`,
    );
  }
  while (!exited) await delay(500);
  if (exitCode)
    throw new Error(
      `The app stopped with code ${exitCode}. Review the messages above.`,
    );
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main(process.argv[2] || "start").catch((e) => {
    console.error(`\nAccountPilot: ${e.message}\n`);
    process.exitCode = 1;
  });
