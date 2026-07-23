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

const DEFAULT_RLIMITS = {
  cpu: 30,
  asKb: 2 * 1024 * 1024,
  fsizeKb: 64 * 1024,
  nproc: 128,
}

function withRlimits(argv, rlimits) {
  const r = { ...DEFAULT_RLIMITS, ...(rlimits || {}) }
  const parts = [`ulimit -t ${r.cpu}`, `ulimit -f ${Math.ceil(r.fsizeKb)}`]
  if (process.platform === "linux" && r.asKb) parts.push(`ulimit -v ${r.asKb}`)
  parts.push('exec "$@"')
  return ["/bin/sh", "-c", parts.join("; "), "sh", ...argv]
}

function bwrapArgv({ workDir, setenv, toolchainPaths }, backend) {
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
  for (const p of toolchainPaths || []) {
    if (p) args.push("--ro-bind-try", p, p)
  }
  args.push("--bind", workDir, workDir, "--chdir", workDir, "--")
  return [backend.bin, ...args]
}

function nsjailArgv({ workDir, setenv, toolchainPaths, rlimits }, backend) {
  const r = { ...DEFAULT_RLIMITS, ...(rlimits || {}) }
  const args = [
    "-Mo",
    "--quiet",
    "--chroot",
    "/",
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
    "--iface_no_lo",
    "--rlimit_as",
    String(Math.ceil(r.asKb / 1024)),
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
  for (const [key, value] of Object.entries(setenv || {})) {
    if (value != null) args.push("--env", `${key}=${value}`)
  }
  for (const p of toolchainPaths || []) {
    if (p) args.push("--bindmount_ro", `${p}:${p}`)
  }
  args.push("--")
  return [backend.bin, ...args]
}

function sbplPath(p) {
  return p.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

function sandboxExecArgv({ workDir }, backend) {
  const projectDir = process.cwd()
  let tmpRoot
  try {
    tmpRoot = fs.realpathSync(os.tmpdir())
  } catch {
    tmpRoot = os.tmpdir()
  }
  const profile = [
    "(version 1)",
    "(allow default)",
    "(deny network*)",
    `(deny file-read* (subpath "${sbplPath(projectDir)}"))`,
    '(deny file-read* (subpath "/etc"))',
    '(deny file-read* (subpath "/private/etc"))',
    "(deny file-write*)",
    "(allow file-write*",
    `  (subpath "${sbplPath(workDir)}")`,
    `  (subpath "${sbplPath(tmpRoot)}")`,
    '  (literal "/dev/null")',
    '  (literal "/dev/stdout")',
    '  (literal "/dev/stderr")',
    '  (subpath "/private/tmp"))',
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
          ...(opts.setenv || {}),
        }
      : undefined
  return spawnSync(full[0], full.slice(1), { ...spawnOpts, env })
}

export function sandboxBackendKind() {
  return BACKEND ? BACKEND.kind : ALLOW_UNSANDBOXED ? "none-allowed" : "none"
}
