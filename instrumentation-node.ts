// Node.js-only half of the startup hook (see instrumentation.ts).
//
// This module is imported ONLY from the `NEXT_RUNTIME === "nodejs"` branch of
// register(), so the Edge instrumentation bundle never references it — that's
// what fixes the "module not supported in the Edge Runtime" build error.
//
// The `node:*` modules are imported DYNAMICALLY inside the function on purpose:
// with a static `import { spawn } from "node:child_process"`, Turbopack tries to
// statically trace the spawn("node", [WORKER]) call as a bundled module and
// fails to resolve the process.cwd()-derived path. Keeping them dynamic makes
// those bindings opaque to that tracer, so the path stays a plain runtime value.
export async function startRegenWorker() {
  // run.sh manages the worker itself and signals so by exporting REGEN_AGENTS
  // (it also sets REGEN_<AGENT>_CMD for npx fallbacks). When that var is defined
  // we must NOT spawn a second worker — run.sh owns it. When it is undefined the
  // app was started another way, so the server takes responsibility here.
  if (process.env.REGEN_AGENTS !== undefined) return;

  const { spawnSync, spawn } = await import("node:child_process");
  const { writeFile, readFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const { openSync } = await import("node:fs");

  const ROOT = process.cwd();
  const PID_FILE = path.join(ROOT, ".regen-worker.pid");
  const WORKER = path.join(ROOT, "worker", "regen-worker.mjs");
  const PORT = process.env.PORT || "3000";
  const LOG = path.join(ROOT, `.regen-worker-${PORT}.log`);
  const log = (msg: string) => console.log(`[regen-instrumentation] ${msg}`);

  const isAlive = (pid: number) => {
    try { process.kill(pid, 0); return true; } catch { return false; }
  };

  // Dev restarts re-run register() in a fresh process; the previous detached
  // worker survives. Skip spawning if the recorded worker is still alive so we
  // don't accumulate orphans (and don't end up with two workers racing claims).
  try {
    const prev = Number((await readFile(PID_FILE, "utf8")).trim());
    if (prev && isAlive(prev)) { log(`worker already running (pid ${prev})`); return; }
  } catch { /* no/stale pid file — fall through and start one */ }

  // Resolve which agent CLIs are usable, mirroring run.sh: a global binary, or
  // `npx --no-install <bin>` for a local/cached install (no surprise downloads).
  // Exporting REGEN_AGENTS / REGEN_<AGENT>_CMD keeps the /api/regenerate
  // availability check honest and feeds the worker the right invocation.
  const onPath = (bin: string) => spawnSync("sh", ["-c", `command -v ${bin}`], { stdio: "ignore" }).status === 0;
  const npxHas = (bin: string) => spawnSync("npx", ["--no-install", bin, "--version"], { stdio: "ignore", timeout: 30_000 }).status === 0;
  const resolved: string[] = [];
  for (const bin of ["claude", "codex"]) {
    const envVar = `REGEN_${bin.toUpperCase()}_CMD`;
    if (onPath(bin)) { process.env[envVar] = bin; resolved.push(bin); }
    else if (npxHas(bin)) { process.env[envVar] = `npx --no-install ${bin}`; resolved.push(bin); }
  }
  process.env.REGEN_AGENTS = resolved.join(",");
  if (resolved.length === 0) {
    log("no generation-agent CLI ('claude' or 'codex') found — clip regeneration is disabled until one is installed.");
    return;
  }

  const env = {
    ...process.env,
    CEREBRA_URL: process.env.CEREBRA_URL || `http://localhost:${PORT}`,
  };

  // spawn()'s stdio accepts file descriptors (numbers), not stream objects, so
  // open the log append-mode and hand its fd to the detached child.
  const logFd = openSync(LOG, "a");
  // Use process.execPath (the running Node binary) rather than the literal
  // "node": it pins the worker to the same runtime instead of relying on PATH,
  // and it stops Turbopack from recognizing the spawn("node", [script]) pattern
  // and trying to bundle/resolve WORKER as a module at build time.
  const child = spawn(process.execPath, [WORKER], {
    cwd: ROOT,
    env,
    stdio: ["ignore", logFd, logFd],
    detached: true,
  });
  child.unref();
  if (child.pid) await writeFile(PID_FILE, String(child.pid));
  log(`started clip-regeneration worker (pid ${child.pid}, agents: ${resolved.join(",")}, log: ${path.relative(ROOT, LOG)})`);
}
