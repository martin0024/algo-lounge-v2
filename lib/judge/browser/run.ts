import type { Language, TestSuite } from "@/lib/content"

import { toSnakeCase } from "../shared/compare"

export type WorkerCase = {
  type: "case"
  index: number
  got?: unknown
  error?: string
  logs: string[]
  timeMs: number
}

export type RunStage = "loading-runtime" | "compiling" | "running"

export interface RunHandle {
  cancel(): void
}

export interface RunOptions {
  language: Language
  code: string
  tests: TestSuite
  harness?: string
  slug?: string
  onStage?: (stage: RunStage) => void
  onCase: (update: WorkerCase) => void
  onDone: () => void
  onFatal: (message: string) => void
}

const JS_TIMEOUT_MS = 5_000
const PY_LOAD_TIMEOUT_MS = 60_000
const PY_TIMEOUT_MS = 10_000

export function runTests(options: RunOptions): RunHandle {
  switch (options.language) {
    case "python":
      return runPython(options)
    case "c":
    case "cpp":
    case "java":
      return runOnServer(options)
    default:
      return runJs(options)
  }
}

function runJs(options: RunOptions): RunHandle {
  const worker = new Worker(new URL("./js-runner.worker.ts", import.meta.url))
  let finished = false

  const finish = () => {
    finished = true
    clearTimeout(timer)
    worker.terminate()
  }

  const timer = setTimeout(() => {
    if (finished) return
    finish()
    options.onFatal(
      `Time limit exceeded (${JS_TIMEOUT_MS / 1000}s) — check for infinite loops.`
    )
  }, JS_TIMEOUT_MS)

  worker.onmessage = (event) => {
    const message = event.data
    if (message.type === "case") {
      options.onCase(message)
    } else if (message.type === "done") {
      finish()
      options.onDone()
    } else if (message.type === "fatal") {
      finish()
      options.onFatal(message.message)
    }
  }
  worker.onerror = (event) => {
    if (finished) return
    finish()
    options.onFatal(event.message || "The code runner crashed unexpectedly.")
  }

  options.onStage?.("running")
  worker.postMessage({
    code: options.code,
    functionName: options.tests.functionName,
    cases: options.tests.cases,
    harness: options.harness,
  })

  return { cancel: finish }
}

let pythonWorker: Worker | null = null
let pythonWorkerBlobUrl: string | null = null
let pythonWorkerPromise: Promise<Worker> | null = null

function disposePythonWorker() {
  if (pythonWorker) {
    pythonWorker.terminate()
    pythonWorker = null
  }
  pythonWorkerPromise = null
  if (pythonWorkerBlobUrl) {
    URL.revokeObjectURL(pythonWorkerBlobUrl)
    pythonWorkerBlobUrl = null
  }
}

function getPythonWorker(): Promise<Worker> {
  if (pythonWorker) return Promise.resolve(pythonWorker)
  if (!pythonWorkerPromise) {
    pythonWorkerPromise = fetch("/workers/python-runner.js")
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to fetch the Python worker (${response.status})`
          )
        }
        return response.text()
      })
      .then((source) => {
        const blob = new Blob([source], { type: "application/javascript" })
        pythonWorkerBlobUrl = URL.createObjectURL(blob)
        pythonWorker = new Worker(pythonWorkerBlobUrl)
        return pythonWorker
      })
      .catch((error) => {
        pythonWorkerPromise = null
        throw error
      })
  }
  return pythonWorkerPromise
}

function runPython(options: RunOptions): RunHandle {
  let worker: Worker | null = null
  let finished = false
  let timer: ReturnType<typeof setTimeout> | null = null

  const finish = (terminate: boolean) => {
    finished = true
    if (timer) clearTimeout(timer)
    if (worker) {
      worker.onmessage = null
      worker.onerror = null
    }
    if (terminate) {
      disposePythonWorker()
      worker = null
    }
  }

  options.onStage?.("loading-runtime")
  timer = setTimeout(() => {
    if (finished) return
    finish(true)
    options.onFatal(
      "Timed out loading the Python runtime — check your connection and try again."
    )
  }, PY_LOAD_TIMEOUT_MS)

  void getPythonWorker()
    .then((nextWorker) => {
      if (finished) {
        if (pythonWorker === nextWorker) disposePythonWorker()
        return
      }
      worker = nextWorker

      worker.onmessage = (event) => {
        const message = event.data
        if (message.type === "ready") {
          if (timer) clearTimeout(timer)
          options.onStage?.("running")
          timer = setTimeout(() => {
            if (finished) return
            finish(true)
            options.onFatal(
              `Time limit exceeded (${PY_TIMEOUT_MS / 1000}s) — check for infinite loops.`
            )
          }, PY_TIMEOUT_MS)
        } else if (message.type === "case") {
          options.onCase(message)
        } else if (message.type === "done") {
          finish(false)
          options.onDone()
        } else if (message.type === "fatal") {
          finish(false)
          options.onFatal(message.message)
        }
      }
      worker.onerror = (event) => {
        if (finished) return
        finish(true)
        options.onFatal(
          event.message ||
            "The Python runner crashed while loading Pyodide — check the Network tab for cdn.jsdelivr.net."
        )
      }

      worker.postMessage({
        code: options.code,
        functionName: toSnakeCase(options.tests.functionName),
        cases: options.tests.cases,
        harness: options.harness,
      })
    })
    .catch((error) => {
      if (finished) return
      finish(true)
      options.onFatal(
        error instanceof Error
          ? error.message
          : "Failed to start the Python runner."
      )
    })

  return { cancel: () => finish(true) }
}

type ServerRunResponse = {
  cases?: { index: number; got?: unknown; error?: string; timeMs: number }[]
  error?: string
}

function runOnServer(options: RunOptions): RunHandle {
  let cancelled = false

  void (async () => {
    if (!options.slug) {
      options.onFatal(
        "Java Run is unavailable here (missing question context)."
      )
      return
    }
    options.onStage?.("running")
    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: options.slug,
          language: options.language,
          code: options.code,
        }),
      })
      if (cancelled) return
      const data = (await response.json()) as ServerRunResponse
      if (!response.ok || data.error) {
        options.onFatal(data.error ?? "The Java runner failed on the server.")
        return
      }
      for (const c of data.cases ?? []) {
        if (cancelled) return
        options.onCase({
          type: "case",
          index: c.index,
          got: c.got,
          error: c.error,
          logs: [],
          timeMs: c.timeMs,
        })
      }
      if (!cancelled) options.onDone()
    } catch {
      if (!cancelled) {
        options.onFatal("Could not reach the server — check your connection.")
      }
    }
  })()

  return {
    cancel: () => {
      cancelled = true
    },
  }
}
