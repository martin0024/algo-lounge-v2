const job = await new Promise((resolve) => {
  process.once("message", resolve)
})
const { language, code, functionName, cases, timeLimitMs, harness } = job

function errorText(value) {
  if (value && typeof value === "object" && "message" in value) {
    return (value.name ? value.name + ": " : "") + value.message
  }
  return String(value)
}

async function runJs() {
  const [{ getQuickJS }, sucrase] = await Promise.all([
    import("quickjs-emscripten"),
    import("sucrase"),
  ])

  let compiled
  let compiledHarness = null
  try {
    compiled = sucrase.transform(code, {
      transforms: ["typescript", "imports"],
    }).code
    if (harness) {
      compiledHarness = sucrase.transform(harness, {
        transforms: ["typescript", "imports"],
      }).code
    }
  } catch (error) {
    return { fatal: errorText(error) }
  }

  const QuickJS = await getQuickJS()
  const runtime = QuickJS.newRuntime()
  runtime.setMemoryLimit(128 * 1024 * 1024)
  let deadline = Date.now() + timeLimitMs
  runtime.setInterruptHandler(() => Date.now() > deadline)
  const vm = runtime.newContext()

  const setup =
    "globalThis.__mod = { exports: {} };\n" +
    "globalThis.__hmod = { exports: {} };\n" +
    "(function (exports, module, require) {\n" +
    compiled +
    "\n})(__mod.exports, __mod, function () { throw new Error('Imports are not available in the runner'); });\n" +
    (compiledHarness
      ? "(function (exports, module, require) {\n" +
        compiledHarness +
        "\n})(__hmod.exports, __hmod, function () { throw new Error('Imports are not available in the harness'); });\n"
      : "") +
    `typeof (__mod.exports[${JSON.stringify(functionName)}] ?? __mod.exports.default) === "function" ? "ok" : "missing";`

  const setupResult = vm.evalCode(setup)
  if (setupResult.error) {
    const message = errorText(vm.dump(setupResult.error))
    setupResult.error.dispose()
    vm.dispose()
    runtime.dispose()
    return { fatal: message }
  }
  const setupOk = vm.dump(setupResult.value)
  setupResult.value.dispose()
  if (setupOk !== "ok") {
    vm.dispose()
    runtime.dispose()
    return {
      fatal: `Export a function named "${functionName}" — keep the signature from the starter code.`,
    }
  }

  const results = []
  for (let index = 0; index < cases.length; index++) {
    deadline = Date.now() + timeLimitMs
    const call =
      "JSON.stringify((function () {\n" +
      `  var fn = __mod.exports[${JSON.stringify(functionName)}] ?? __mod.exports.default;\n` +
      "  var prep = __hmod.exports.prepare;\n" +
      "  var ser = __hmod.exports.serialize;\n" +
      "  var inv = __hmod.exports.invoke;\n" +
      `  var args = ${JSON.stringify(cases[index].input)};\n` +
      "  if (typeof prep === 'function') args = prep(args);\n" +
      "  var r = typeof inv === 'function' ? inv(fn, args, __mod.exports) : fn.apply(null, args);\n" +
      "  var out = typeof ser === 'function' ? ser(r, args) : r;\n" +
      "  return out === undefined ? null : out;\n" +
      "})())"
    const start = performance.now()
    const result = vm.evalCode(call)
    const timeMs = performance.now() - start
    if (result.error) {
      const message = errorText(vm.dump(result.error))
      result.error.dispose()
      results.push({ index, error: message, timeMs })
    } else {
      const json = vm.dump(result.value)
      result.value.dispose()
      let got = null
      try {
        got = JSON.parse(json)
      } catch {
        got = String(json)
      }
      results.push({ index, got, timeMs })
    }
  }

  vm.dispose()
  runtime.dispose()
  return { results }
}

// Pyodide-in-Node bridges Python to the host JS scope (`import js` → process →
// child_process/fs/net), so it is NOT a host-isolation boundary. We therefore
// run it the same way as native code: a standalone driver process wrapped in
// the OS sandbox (no network, scrubbed env, writes confined to a temp dir,
// CPU/mem rlimits, project tree never mounted). This replaces the former
// in-process Pyodide, which gave any Python submission full host RCE.
const PYODIDE_LOAD_BUDGET_MS = 25_000

async function runPython() {
  const { createRequire } = await import("node:module")
  const fs = await import("node:fs")
  const os = await import("node:os")
  const path = await import("node:path")
  const { sandboxedSpawnSync } = await import("./sandbox.mjs")

  const require = createRequire(import.meta.url)
  const indexDir = path.dirname(require.resolve("pyodide"))
  const driver = path.join(process.cwd(), "lib", "judge", "server", "pyodide-driver.mjs")
  const nodeBin = fs.realpathSync(process.execPath)

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "algopy-"))
  const jobFile = path.join(dir, "job.json")
  const resultsFile = path.join(dir, "results.jsonl")
  try {
    fs.writeFileSync(
      jobFile,
      JSON.stringify({ code, functionName, cases, harness: harness || "" })
    )
    fs.writeFileSync(resultsFile, "")

    // One process runs every case; the wall budget covers Pyodide load plus the
    // per-case allowance, and stays under the parent's WALL_MS so the inner
    // timeout fires first and we recover partial (line-buffered) results.
    const wallMs = Math.min(
      55_000,
      PYODIDE_LOAD_BUDGET_MS + cases.length * timeLimitMs
    )
    // asKb is 0 (no `ulimit -v`): Node/V8 + the WASM heap reserve a huge virtual
    // address space, so an address-space cap crashes the runtime on startup —
    // same reason the Java path disables it. Memory is bounded by the sandbox
    // backend's cgroup (nsjail) / the host cgroup (bwrap), like native code.
    const run = sandboxedSpawnSync(
      [nodeBin, driver, jobFile, indexDir, resultsFile],
      {
        workDir: dir,
        timeout: wallMs,
        maxBuffer: 16 * 1024 * 1024,
        readPaths: [nodeBin, indexDir, driver],
        toolchainPaths: [nodeBin, indexDir, driver],
        rlimits: { cpu: Math.ceil(wallMs / 1000) + 5, asKb: 0, fsizeKb: 64 * 1024, nproc: 64 },
      }
    )

    const timedOut = run.error && run.error.code === "ETIMEDOUT"
    const byIndex = new Map()
    for (const line of fs.readFileSync(resultsFile, "utf8").split("\n")) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        const r = JSON.parse(trimmed)
        byIndex.set(r.index, r)
      } catch {
        // partial final line from a kill mid-write — ignore
      }
    }

    // Nothing ran and the process failed outside a timeout → a setup/load
    // failure (bad user code at import, Pyodide failed to load). Report fatal.
    if (byIndex.size === 0 && !timedOut && run.status !== 0) {
      if (run.error && !timedOut) return { fatal: errorText(run.error) }
      const stderr = run.stderr || ""
      const marker = stderr.indexOf("__ALGOLOUNGE_FATAL__")
      const message =
        marker >= 0
          ? stderr.slice(marker + "__ALGOLOUNGE_FATAL__".length).trim()
          : stderr.trim() || `Python runner exited with code ${run.status}`
      return { fatal: message }
    }

    const results = []
    for (let index = 0; index < cases.length; index++) {
      const r = byIndex.get(index)
      if (r) {
        results.push(r)
      } else {
        results.push({
          index,
          error: timedOut
            ? "Time limit exceeded — check for infinite loops."
            : "Did not run (the Python runner stopped early).",
          timeMs: 0,
        })
      }
    }
    return { results }
  } finally {
    try {
      fs.rmSync(dir, { recursive: true, force: true })
    } catch {
      // best-effort cleanup
    }
  }
}

const C_MAIN = `#include <stdio.h>
#include <stdlib.h>
extern char *al_solve(const char *args_json);
int main(int argc, char **argv) {
  size_t cap = 1 << 16, len = 0; char *b = (char *)malloc(cap); int c;
  while ((c = getchar()) != EOF) { if (len + 1 >= cap) { cap <<= 1; b = (char *)realloc(b, cap); } b[len++] = (char)c; }
  b[len] = 0;
  char *o = al_solve(b);
  FILE *f = fopen(argc > 1 ? argv[1] : "out.json", "w");
  if (!f) return 1;
  fputs(o ? o : "null", f); fclose(f); return 0;
}
`
const CPP_MAIN = `#include <cstdio>
#include <string>
extern std::string al_solve(const std::string &args_json);
int main(int argc, char **argv) {
  std::string in; int c; while ((c = getchar()) != EOF) in.push_back((char)c);
  std::string o = al_solve(in);
  FILE *f = fopen(argc > 1 ? argv[1] : "out.json", "w");
  if (!f) return 1;
  fputs(o.c_str(), f); fclose(f); return 0;
}
`

async function runCompiled(lang) {
  const fs = await import("node:fs")
  const os = await import("node:os")
  const path = await import("node:path")
  const { sandboxedSpawnSync } = await import("./sandbox.mjs")

  const isC = lang === "c"
  const ext = isC ? "c" : "cpp"
  const wasmDir = path.join(process.cwd(), "public", "wasm")
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "algocc-"))
  const clean = (s) =>
    (s || "")
      .split(dir + path.sep)
      .join("")
      .split(dir)
      .join("")
      .split(`user.${ext}`)
      .join("your code")
      .split(`harness.${ext}`)
      .join("harness")
      .split(`main.${ext}`)
      .join("runner")
      .trim()
  try {
    fs.writeFileSync(path.join(dir, `main.${ext}`), isC ? C_MAIN : CPP_MAIN)
    fs.writeFileSync(path.join(dir, `harness.${ext}`), harness || "")
    fs.writeFileSync(path.join(dir, `user.${ext}`), code)

    if (isC) {
      fs.copyFileSync(path.join(wasmDir, "cJSON.c"), path.join(dir, "cJSON.c"))
      fs.copyFileSync(path.join(wasmDir, "cJSON.h"), path.join(dir, "cJSON.h"))
    } else {
      fs.copyFileSync(
        path.join(wasmDir, "json.hpp"),
        path.join(dir, "json.hpp")
      )
    }

    const bin = path.join(dir, "prog")
    const sources = [
      path.join(dir, `main.${ext}`),
      path.join(dir, `harness.${ext}`),
      path.join(dir, `user.${ext}`),
    ]
    if (isC) sources.push(path.join(dir, "cJSON.c"))
    const args = [
      isC ? "clang" : "clang++",
      ...sources,
      ...(isC ? [] : ["-std=c++20"]),
      "-I" + dir,
      "-O2",
      "-o",
      bin,
    ]
    const compile = sandboxedSpawnSync(args, {
      workDir: dir,
      timeout: 60_000,
      rlimits: { cpu: 60, asKb: 4 * 1024 * 1024, fsizeKb: 256 * 1024 },
    })
    if (compile.error) {
      return { fatal: "Compilation failed: " + errorText(compile.error) }
    }
    if (compile.status !== 0) {
      return { fatal: clean(compile.stderr) || "Compilation failed." }
    }

    const outFile = path.join(dir, "out.json")
    const results = []
    for (let index = 0; index < cases.length; index++) {
      const start = performance.now()
      const run = sandboxedSpawnSync([bin, outFile], {
        workDir: dir,
        input: JSON.stringify(cases[index].input),
        timeout: timeLimitMs,
        maxBuffer: 16 * 1024 * 1024,
        rlimits: { cpu: 10, asKb: 512 * 1024, fsizeKb: 16 * 1024, nproc: 64 },
      })
      const timeMs = performance.now() - start
      if (run.error) {
        results.push({
          index,
          error:
            run.error.code === "ETIMEDOUT"
              ? "Time limit exceeded — check for infinite loops."
              : errorText(run.error),
          timeMs,
        })
        continue
      }
      if (run.status !== 0) {
        results.push({
          index,
          error: (
            run.stderr || `Program exited with code ${run.status} (crash?)`
          ).trim(),
          timeMs,
        })
        continue
      }
      try {
        results.push({
          index,
          got: JSON.parse(fs.readFileSync(outFile, "utf8")),
          timeMs,
        })
      } catch (error) {
        results.push({ index, error: errorText(error), timeMs })
      }
    }
    return { results }
  } finally {
    try {
      fs.rmSync(dir, { recursive: true, force: true })
    } catch {
      // best-effort cleanup
    }
  }
}

async function runJava() {
  const fs = await import("node:fs")
  const os = await import("node:os")
  const path = await import("node:path")
  const { sandboxedSpawnSync } = await import("./sandbox.mjs")

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "algojava-"))
  const sep = path.delimiter
  const gsonJar = path.join(dir, "gson.jar")
  fs.copyFileSync(path.join(process.cwd(), "public", "gson.jar"), gsonJar)

  const toolchainPaths = []
  if (process.env.JAVA_HOME) toolchainPaths.push(process.env.JAVA_HOME)
  const setenv = process.env.JAVA_HOME
    ? { JAVA_HOME: process.env.JAVA_HOME }
    : {}

  try {
    fs.writeFileSync(path.join(dir, "Solution.java"), code)
    fs.writeFileSync(path.join(dir, "Main.java"), harness || "")

    const compile = sandboxedSpawnSync(
      [
        "javac",
        "-proc:none",
        "-cp",
        gsonJar,
        "-d",
        dir,
        path.join(dir, "Main.java"),
        path.join(dir, "Solution.java"),
      ],
      {
        workDir: dir,
        timeout: 60_000,
        toolchainPaths,
        setenv,
        rlimits: { cpu: 60, asKb: 0, fsizeKb: 256 * 1024 },
      }
    )
    if (compile.error) {
      return { fatal: "Compilation failed: " + errorText(compile.error) }
    }
    if (compile.status !== 0) {
      // Strip the temp dir from diagnostics so the user sees "Solution.java:3:…".
      const diagnostics = (compile.stderr || "Compilation failed.")
        .split(dir + path.sep)
        .join("")
        .split(dir)
        .join("")
        .trim()
      return { fatal: diagnostics }
    }

    const classpath = gsonJar + sep + dir
    const results = []
    for (let index = 0; index < cases.length; index++) {
      const start = performance.now()
      const run = sandboxedSpawnSync(
        [
          "java",
          "-XX:-UsePerfData",
          "-Xmx256m",
          "-cp",
          classpath,
          "Main",
          JSON.stringify(cases[index].input),
        ],
        {
          workDir: dir,
          timeout: timeLimitMs,
          maxBuffer: 16 * 1024 * 1024,
          toolchainPaths,
          setenv,
          rlimits: { cpu: 15, asKb: 0, fsizeKb: 16 * 1024 },
        }
      )
      const timeMs = performance.now() - start
      if (run.error) {
        const msg =
          run.error.code === "ETIMEDOUT"
            ? "Time limit exceeded — check for infinite loops."
            : errorText(run.error)
        results.push({ index, error: msg, timeMs })
        continue
      }
      if (run.status !== 0) {
        results.push({
          index,
          error: (
            run.stderr || `Program exited with code ${run.status}`
          ).trim(),
          timeMs,
        })
        continue
      }
      const out = (run.stdout || "").trim()
      try {
        results.push({ index, got: JSON.parse(out), timeMs })
      } catch {
        results.push({
          index,
          error: "Harness did not produce valid JSON:\n" + out.slice(0, 400),
          timeMs,
        })
      }
    }
    return { results }
  } finally {
    try {
      fs.rmSync(dir, { recursive: true, force: true })
    } catch {
      // best-effort cleanup
    }
  }
}

const runner =
  language === "python"
    ? runPython
    : language === "java"
      ? runJava
      : language === "c" || language === "cpp"
        ? () => runCompiled(language)
        : runJs
const outcome = await runner().catch((error) => {
  if (error && error.sandboxUnavailable) {
    return {
      fatal:
        "Native execution is temporarily unavailable (no sandbox on this host).",
    }
  }
  return { fatal: errorText(error) }
})
process.send(outcome, () => process.exit(0))
