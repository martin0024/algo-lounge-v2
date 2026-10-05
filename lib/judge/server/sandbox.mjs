import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

export class SandboxUnavailableError extends Error {
  constructor(message) {
    super(message)
    this.name = "SandboxUnavailableError"
    this.sandboxUnavailable = true
  }
}

function onPath(bin) {
  const dirs = (process.env.PATH || "").split(path.delimiter)
  for (const dir of dirs) {
    if (!dir) continue
    const candidate = path.join(dir, bin)
    try {
      fs.accessSync(candidate, fs.constants.X_OK)
      return candidate
    } catch {
      // keep looking
    }
  }
  return null
}

function detectBackend() {
  if (process.platform === "linux") {
    const bwrap = onPath("bwrap")
    if (bwrap) return { kind: "bwrap", bin: bwrap }
    const nsjail = onPath("nsjail")
    if (nsjail) return { kind: "nsjail", bin: nsjail }
    return null
  }
  if (process.platform === "darwin") {
    try {
      fs.accessSync("/usr/bin/sandbox-exec", fs.constants.X_OK)
      return { kind: "sandbox-exec", bin: "/usr/bin/sandbox-exec" }
    } catch {
      return null
    }
  }
  return null
}

const BACKEND = detectBackend()
const ALLOW_UNSANDBOXED = process.env.ALGOLOUNGE_ALLOW_UNSANDBOXED === "1"
let warnedUnsandboxed = false

// macOS dev only: inside the sandbox with a replaced environment, clang can't
// discover the Xcode toolchain (it tries to spawn xcodebuild and fails), so we
// resolve DEVELOPER_DIR / SDKROOT once on the host and pass them in. On Linux
// (the real boundary) clang needs none of this. Best-effort — a failure here
// just leaves native compiles to fend for themselves, as before.
function detectMacToolchainEnv() {
  if (process.platform !== "darwin") return {}
  const env = {}
  const dev = spawnSync("/usr/bin/xcode-select", ["-p"], { encoding: "utf8" })
  if (dev.status === 0 && dev.stdout) env.DEVELOPER_DIR = dev.stdout.trim()
  const sdk = spawnSync("/usr/bin/xcrun", ["--show-sdk-path"], {
    encoding: "utf8",
  })
  if (sdk.status === 0 && sdk.stdout) env.SDKROOT = sdk.stdout.trim()
  return env
}
const MAC_TOOLCHAIN_ENV = detectMacToolchainEnv()

const DEFAULT_RLIMITS = {
  cpu: 30,
  asKb: 2 * 1024 * 1024,
  fsizeKb: 64 * 1024,
  nproc: 256,
}

function withRlimits(argv, rlimits) {
  const r = { ...DEFAULT_RLIMITS, ...(rlimits || {}) }
  const parts = [`ulimit -t ${r.cpu}`, `ulimit -f ${Math.ceil(r.fsizeKb)}`]
  if (process.platform === "linux" && r.asKb) parts.push(`ulimit -v ${r.asKb}`)
  // RLIMIT_NPROC backstop against fork/thread bombs on backends that don't
  // manage a pids cgroup (bwrap, and the unsandboxed fallback). Linux only:
  // RLIMIT_NPROC is per-UID, so the production server must run under a dedicated
  // low-privilege UID or this throttles the server itself — and on macOS (dev),
  // where the login user already has hundreds of processes, a low cap would stop
  // the sandboxed child forking at all (and macOS is not the security boundary).
  if (process.platform === "linux" && r.nproc) {
    parts.push(`ulimit -u ${r.nproc} 2>/dev/null || true`)
  }
  parts.push('exec "$@"')
  return ["/bin/sh", "-c", parts.join("; "), "sh", ...argv]
}

function bwrapArgv({ workDir, setenv, toolchainPaths, readPaths }, backend) {
  const args = [
    "--unshare-all",
    "--die-with-parent",
    "--new-session",
    "--clearenv",
    "--setenv",
    "PATH",
    "/usr/bin:/bin",
    "--setenv",
    "HOME",
    workDir,
    "--setenv",
    "TMPDIR",
    workDir,
    "--proc",
    "/proc",
    "--dev",
    "/dev",
    "--tmpfs",
    "/tmp",
    "--ro-bind",
    "/usr",
    "/usr",
    "--ro-bind-try",
    "/bin",
    "/bin",
    "--ro-bind-try",
    "/sbin",
    "/sbin",
    "--ro-bind-try",
    "/lib",
    "/lib",
    "--ro-bind-try",
    "/lib64",
    "/lib64",
    "--ro-bind-try",
    "/etc/alternatives",
    "/etc/alternatives",
  ]
  for (const [key, value] of Object.entries(setenv || {})) {
    if (value != null) args.push("--setenv", key, String(value))
  }
  for (const p of new Set([...(toolchainPaths || []), ...(readPaths || [])])) {
    if (p) args.push("--ro-bind-try", p, p)
  }
  args.push("--bind", workDir, workDir, "--chdir", workDir, "--")
  return [backend.bin, ...args]
}

// A persistent empty directory used as the nsjail chroot root. We deliberately
// do NOT chroot to "/" — that would expose the whole host filesystem (including
// the project tree + .env.local) read-only to untrusted native code. Mount
// points for the explicit ro binds below are created by nsjail inside this
// empty root, so only the toolchain and workDir are reachable.
let nsjailRoot = null
function nsjailChrootRoot() {
  if (nsjailRoot) return nsjailRoot
  nsjailRoot = fs.mkdtempSync(path.join(os.tmpdir(), "algojail-root-"))
  return nsjailRoot
}

function nsjailArgv({ workDir, setenv, toolchainPaths, readPaths, rlimits }, backend) {
  const r = { ...DEFAULT_RLIMITS, ...(rlimits || {}) }
  const args = [
    "-Mo",
    "--quiet",
    "--chroot",
    nsjailChrootRoot(),
    "--cwd",
    workDir,
    "--bindmount",
    `${workDir}:${workDir}`,
    "--bindmount_ro",
    "/usr:/usr",
    "--bindmount_ro",
    "/bin:/bin",
    "--bindmount_ro",
    "/lib:/lib",
    "--bindmount_ro",
    "/lib64:/lib64",
    "--bindmount_ro",
    "/dev/null:/dev/null",
    "--bindmount_ro",
    "/dev/urandom:/dev/urandom",
    "--bindmount_ro",
    "/etc/alternatives:/etc/alternatives",
    "--iface_no_lo",
    "--rlimit_cpu",
    String(r.cpu),
    "--rlimit_fsize",
    String(Math.ceil(r.fsizeKb / 1024)),
    "--cgroup_pids_max",
    String(r.nproc),
    "--cgroup_mem_max",
    String(r.asKb ? r.asKb * 1024 : 2 * 1024 * 1024 * 1024),
    "--env",
    "PATH=/usr/bin:/bin",
    "--env",
    `HOME=${workDir}`,
  ]
  // Only cap address space when a real limit is given: Node/V8 and the JVM
  // reserve enormous virtual space, so --rlimit_as 0 (or a small value) breaks
  // them. Those runtimes rely on --cgroup_mem_max above instead.
  if (r.asKb) {
    args.push("--rlimit_as", String(Math.ceil(r.asKb / 1024)))
  }
  for (const [key, value] of Object.entries(setenv || {})) {
    if (value != null) args.push("--env", `${key}=${value}`)
  }
  for (const p of new Set([...(toolchainPaths || []), ...(readPaths || [])])) {
    if (p) args.push("--bindmount_ro", `${p}:${p}`)
  }
  args.push("--")
  return [backend.bin, ...args]
}

function sbplPath(p) {
  return p.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

function realpathOr(p) {
  try {
    return fs.realpathSync(p)
  } catch {
    return p
  }
}

// macOS sandbox-exec is the DEV backend only (Linux bwrap/nsjail is the real
// security boundary — no PID namespace here). It stays allow-by-default because
// deny-by-default for arbitrary native binaries + Node on macOS is brittle
// (endless mach-lookups), but we subtract the concrete exfil/abuse primitives a
// review flagged: network, reads of the project tree and the user's home
// (~/.ssh, ~/.aws, keychains, …), signalling other processes, inspecting other
// processes, and writes anywhere but the per-run workDir. `readPaths` are then
// re-allowed for reading (Node binary + node_modules/pyodide + the driver),
// since those legitimately live under the project/home that we just denied.
function sandboxExecArgv({ workDir, readPaths }, backend) {
  const projectDir = process.cwd()
  const home = os.homedir()
  const realWork = realpathOr(workDir)

  const reads = []
  for (const p of new Set([...(readPaths || [])])) {
    if (!p) continue
    const rp = realpathOr(p)
    reads.push(`  (subpath "${sbplPath(p)}")`, `  (literal "${sbplPath(p)}")`)
    if (rp !== p) {
      reads.push(`  (subpath "${sbplPath(rp)}")`, `  (literal "${sbplPath(rp)}")`)
    }
  }

  // Deny only file CONTENTS (file-read-data), not metadata, on the project tree
  // and the user's home: Node must lstat the path components to resolve the
  // driver script, so a full `file-read*` deny would block it from even
  // starting. Seatbelt is last-match-wins *within a subtype*, so the re-allow
  // for readPaths below must also be `file-read-data` (a `file-read*` allow does
  // NOT override a `file-read-data` deny).
  const profile = [
    "(version 1)",
    "(allow default)",
    "(deny network*)",
    `(deny file-read-data (subpath "${sbplPath(projectDir)}"))`,
    `(deny file-read-data (subpath "${sbplPath(home)}"))`,
    '(deny file-read* (subpath "/etc"))',
    '(deny file-read* (subpath "/private/etc"))',
    ...(reads.length ? ["(allow file-read-data", ...reads, ")"] : []),
    // Block signalling other processes (a same-UID DoS primitive). We do NOT
    // deny process-info*: libuv inspects its own process at startup and a denial
    // SIGTRAPs Node when it runs under a replaced environment.
    "(deny signal)",
    "(deny file-write*)",
    "(allow file-write*",
    `  (subpath "${sbplPath(workDir)}")`,
    `  (subpath "${sbplPath(realWork)}")`,
    '  (literal "/dev/null")',
    '  (literal "/dev/stdout")',
    '  (literal "/dev/stderr")',
    '  (literal "/dev/dtracehelper"))',
  ].join("\n")
  return [backend.bin, "-p", profile]
}

export function sandboxedSpawnSync(argv, opts = {}) {
  const { workDir, input, timeout, maxBuffer, rlimits } = opts
  const spawnOpts = {
    encoding: "utf8",
    input,
    timeout,
    maxBuffer,
    cwd: workDir,
    // On timeout, SIGKILL (not the default SIGTERM, which untrusted code can
    // trap and ignore to outlive its time budget).
    killSignal: "SIGKILL",
  }

  if (!BACKEND) {
    if (!ALLOW_UNSANDBOXED) {
      throw new SandboxUnavailableError(
        "No OS sandbox backend available (need bwrap/nsjail on Linux or sandbox-exec on macOS)."
      )
    }
    if (!warnedUnsandboxed) {
      warnedUnsandboxed = true
      console.warn(
        "[algolounge] WARNING: running native code WITHOUT an OS sandbox " +
          "(ALGOLOUNGE_ALLOW_UNSANDBOXED=1). Untrusted code has host access. " +
          "Do NOT use this in production."
      )
    }
    const inner = withRlimits(argv, rlimits)
    return spawnSync(inner[0], inner.slice(1), {
      ...spawnOpts,
      env: {
        PATH: process.env.PATH || "/usr/bin:/bin",
        HOME: workDir,
        TMPDIR: workDir,
        ...(opts.setenv || {}),
      },
    })
  }

  const inner = withRlimits(argv, rlimits)
  let wrapper
  if (BACKEND.kind === "bwrap") {
    wrapper = bwrapArgv(opts, BACKEND)
  } else if (BACKEND.kind === "nsjail") {
    wrapper = nsjailArgv(opts, BACKEND)
  } else {
    wrapper = sandboxExecArgv(opts, BACKEND)
  }

  const full = [...wrapper, ...inner]
  const env =
    BACKEND.kind === "sandbox-exec"
      ? {
          PATH: process.env.PATH || "/usr/bin:/bin",
          HOME: workDir,
          TMPDIR: workDir,
          LANG: process.env.LANG,
          ...MAC_TOOLCHAIN_ENV,
          ...(opts.setenv || {}),
        }
      : undefined
  return spawnSync(full[0], full.slice(1), { ...spawnOpts, env })
}

export function sandboxBackendKind() {
  return BACKEND ? BACKEND.kind : ALLOW_UNSANDBOXED ? "none-allowed" : "none"
}
