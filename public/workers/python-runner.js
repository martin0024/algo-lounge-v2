/**
 * Browser Python runner for lib/judge/browser/run.ts.
 * Stays in public/ as a classic worker so it can importScripts Pyodide from the CDN.
 */

const PYODIDE_BASE = "https://cdn.jsdelivr.net/pyodide/v0.28.3/full/"

importScripts(PYODIDE_BASE + "pyodide.js")

let pyodidePromise = null

function getPyodide() {
  if (!pyodidePromise) {
    pyodidePromise = loadPyodide({ indexURL: PYODIDE_BASE })
  }
  return pyodidePromise
}

function cleanError(error) {
  const message = error && error.message ? error.message : String(error)
  const lines = message.split("\n")
  const execIndex = lines.findIndex((line) => line.includes('File "<exec>"'))
  if (execIndex > 0) {
    return ["Traceback (most recent call last):"]
      .concat(lines.slice(execIndex))
      .join("\n")
      .trim()
  }
  return message.trim()
}

self.onmessage = async (event) => {
  const { code, functionName, cases, harness } = event.data

  let pyodide
  try {
    pyodide = await getPyodide()
  } catch (error) {
    self.postMessage({
      type: "fatal",
      message:
        "Failed to load the Python runtime: " +
        (error && error.message ? error.message : error),
    })
    return
  }

  self.postMessage({ type: "ready" })

  const logs = []
  pyodide.setStdout({ batched: (text) => logs.push(text) })
  pyodide.setStderr({ batched: (text) => logs.push(text) })

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
    self.postMessage({ type: "fatal", message: cleanError(error) })
    return
  }

  for (let index = 0; index < cases.length; index++) {
    logs.length = 0
    const start = performance.now()
    pyodide.globals.set("_args_json", JSON.stringify(cases[index].input))
    try {
      const gotJson = await pyodide.runPythonAsync(
        [
          "_args = json.loads(_args_json)",
          "if _h_prepare: _args = _h_prepare(_args)",
          "_result = _fn(*_args)",
          "json.dumps(_h_serialize(_result, _args) if _h_serialize else _result)",
        ].join("\n")
      )
      self.postMessage({
        type: "case",
        index,
        got: JSON.parse(gotJson),
        logs: logs.slice(),
        timeMs: performance.now() - start,
      })
    } catch (error) {
      self.postMessage({
        type: "case",
        index,
        error: cleanError(error),
        logs: logs.slice(),
        timeMs: performance.now() - start,
      })
    }
  }

  self.postMessage({ type: "done" })
}
