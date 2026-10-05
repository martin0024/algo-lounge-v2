// Standalone Pyodide driver, executed as its own process INSIDE the OS sandbox
// (bwrap / nsjail / sandbox-exec), exactly like the compiled C/C++/Java binaries.
//
// Rationale: Pyodide-in-Node deliberately bridges Python to the host JS scope
// (`import js` → `process` → `child_process`/`fs`/`net`), so Pyodide's WASM
// boundary is NOT a host-isolation boundary. The only real containment is the
// OS sandbox the native languages already use — so we run Python under it too.
//
// This process is intentionally isolated from the project tree: it is spawned
// with the sandbox binding only the Node binary, node_modules/pyodide, and a
// per-run temp workDir. The job is read from a file in workDir and results are
// written back line-by-line (one JSON object per case) so that if the sandbox
// kills us on the wall-clock/CPU budget, the parent can still recover the cases
// that finished and mark the rest as timed out.
//
// argv: node pyodide-driver.mjs <jobFile> <pyodideIndexDir> <resultsFile>

import fs from "node:fs"
import { pathToFileURL } from "node:url"
import path from "node:path"

function errorText(value) {
  if (value && typeof value === "object" && "message" in value) {
    return (value.name ? value.name + ": " : "") + value.message
  }
  return String(value)
}

async function main() {
  const [jobFile, indexDir, resultsFile] = process.argv.slice(2)
  const job = JSON.parse(fs.readFileSync(jobFile, "utf8"))
  const { code, functionName, cases, harness } = job

  const out = fs.openSync(resultsFile, "w")
  const emit = (obj) => {
    fs.writeSync(out, JSON.stringify(obj) + "\n")
    fs.fsyncSync(out)
  }

  // Import Pyodide by absolute path — node_modules is not on the module
  // resolution path from this sandboxed temp dir.
  const pyodideEntry = pathToFileURL(path.join(indexDir, "pyodide.mjs")).href
  const { loadPyodide } = await import(pyodideEntry)
  const pyodide = await loadPyodide({ indexURL: indexDir })
  pyodide.setStdout({ batched: () => {} })
  pyodide.setStderr({ batched: () => {} })

  pyodide.globals.set("_user_code", code)
  pyodide.globals.set("_fn_name", functionName)
  pyodide.globals.set("_harness_code", harness || "")
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
      "_h_invoke = _hns.get('invoke')",
    ].join("\n")
  )

  for (let index = 0; index < cases.length; index++) {
    pyodide.globals.set("_args_json", JSON.stringify(cases[index].input))
    const start = performance.now()
    try {
      const gotJson = await pyodide.runPythonAsync(
        [
          "_args = json.loads(_args_json)",
          "if _h_prepare: _args = _h_prepare(_args)",
          "_result = _h_invoke(_fn, _args, _ns) if _h_invoke else _fn(*_args)",
          "json.dumps(_h_serialize(_result, _args) if _h_serialize else _result)",
        ].join("\n")
      )
      emit({ index, got: JSON.parse(gotJson), timeMs: performance.now() - start })
    } catch (error) {
      emit({ index, error: errorText(error), timeMs: performance.now() - start })
    }
  }
  fs.closeSync(out)
}

main().then(
  () => process.exit(0),
  (error) => {
    // A setup failure (bad user code at import, Pyodide load failure) — surface
    // it on stderr so the parent can report it as a fatal error.
    process.stderr.write("__ALGOLOUNGE_FATAL__" + errorText(error))
    process.exit(3)
  }
)
