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

export type RunStage = "loading-runtime" | "running"

export interface RunHandle {
  cancel(): void
}

export interface RunOptions {
  language: Language
  code: string
  tests: TestSuite
  harness?: string
  onStage?: (stage: RunStage) => void
  onCase: (update: WorkerCase) => void
  onDone: () => void
  onFatal: (message: string) => void
}

const JS_TIMEOUT_MS = 5_000
const PY_LOAD_TIMEOUT_MS = 60_000
const PY_TIMEOUT_MS = 10_000

export function runTests(options: RunOptions): RunHandle {
  return options.language === "python" ? runPython(options) : runJs(options)
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

function runPython(options: RunOptions): RunHandle {
  if (!pythonWorker) {
    pythonWorker = new Worker("/workers/python-runner.js")
  }
  const worker = pythonWorker
  let finished = false
  let timer: ReturnType<typeof setTimeout> | null = null

  const finish = (terminate: boolean) => {
    finished = true
    if (timer) clearTimeout(timer)
    worker.onmessage = null
    worker.onerror = null
    if (terminate) {
      worker.terminate()
      if (pythonWorker === worker) pythonWorker = null
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
      event.message || "The Python runner crashed — is the CDN reachable?"
    )
  }

  worker.postMessage({
    code: options.code,
    functionName: toSnakeCase(options.tests.functionName),
    cases: options.tests.cases,
    harness: options.harness,
  })

  return { cancel: () => finish(true) }
}
