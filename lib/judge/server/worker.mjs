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
      `  var args = ${JSON.stringify(cases[index].input)};\n` +
      "  if (typeof prep === 'function') args = prep(args);\n" +
      "  var r = fn.apply(null, args);\n" +
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

async function runPython() {
  const { createRequire } = await import("node:module")
  const { dirname } = await import("node:path")
  const require = createRequire(import.meta.url)
  const indexURL = dirname(require.resolve("pyodide"))
  const { loadPyodide } = await import("pyodide")
  const pyodide = await loadPyodide({ indexURL })
  pyodide.setStdout({ batched: () => {} })
  pyodide.setStderr({ batched: () => {} })

  pyodide.globals.set("_user_code", code)
  pyodide.globals.set("_fn_name", functionName)
  pyodide.globals.set("_harness_code", harness || "")
  try {
    await pyodide.runPythonAsync(
      [
        "import json",
        "_ns = {}",
        "exec(_user_code, _ns)",
        "if _fn_name not in _ns or not callable(_ns[_fn_name]):",
        "    raise NameError('Define a function named ' + repr(_fn_name) + ' — keep the signature from the starter code.')",
        "_fn = _ns[_fn_name]",
        "_hns = {}",
        "if _harness_code:",
        "    exec(_harness_code, _hns)",
        "_h_prepare = _hns.get('prepare')",
        "_h_serialize = _hns.get('serialize')",
      ].join("\n")
    )
  } catch (error) {
    return { fatal: errorText(error) }
  }

  const results = []
  for (let index = 0; index < cases.length; index++) {
    pyodide.globals.set("_args_json", JSON.stringify(cases[index].input))
    const start = performance.now()
    try {
      const gotJson = await pyodide.runPythonAsync(
        [
          "_args = json.loads(_args_json)",
          "if _h_prepare: _args = _h_prepare(_args)",
          "_result = _fn(*_args)",
          "json.dumps(_h_serialize(_result, _args) if _h_serialize else _result)",
        ].join("\n")
      )
      results.push({
        index,
        got: JSON.parse(gotJson),
        timeMs: performance.now() - start,
      })
    } catch (error) {
      results.push({
        index,
        error: errorText(error),
        timeMs: performance.now() - start,
      })
    }
  }
  return { results }
}

const outcome = await (language === "python" ? runPython() : runJs()).catch(
  (error) => ({ fatal: errorText(error) })
)
process.send(outcome, () => process.exit(0))
