/// <reference lib="webworker" />

import { transform } from "sucrase"

type InMessage = {
  code: string
  functionName: string
  cases: { input: unknown[] }[]
  harness?: string
}

const post = (message: unknown) => self.postMessage(message)

function formatLogArg(value: unknown): string {
  if (typeof value === "string") return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function toPlain(value: unknown): unknown {
  if (value === undefined) return null
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return String(value)
  }
}

function loadModule(source: string): Record<string, unknown> {
  const compiled = transform(source, {
    transforms: ["typescript", "imports"],
  }).code
  const moduleObject = { exports: {} as Record<string, unknown> }
  const factory = new Function("exports", "module", "require", compiled)
  factory(moduleObject.exports, moduleObject, () => {
    throw new Error("Imports are not available in the runner")
  })
  return moduleObject.exports
}

self.onmessage = (event: MessageEvent<InMessage>) => {
  const { code, functionName, cases, harness } = event.data

  const logs: string[] = []
  const capture = (...args: unknown[]) => {
    logs.push(args.map(formatLogArg).join(" "))
  }
  console.log = console.info = console.warn = console.error = capture

  let fn: (...args: unknown[]) => unknown
  let prepare: ((args: unknown[]) => unknown[]) | undefined
  let serialize: ((result: unknown, args: unknown[]) => unknown) | undefined
  try {
    const exports = loadModule(code)
    const candidate = exports[functionName] ?? exports.default
    if (typeof candidate !== "function") {
      throw new Error(
        `Export a function named "${functionName}" — keep the signature from the starter code.`
      )
    }
    fn = candidate as (...args: unknown[]) => unknown

    if (harness) {
      const harnessExports = loadModule(harness)
      if (typeof harnessExports.prepare === "function") {
        prepare = harnessExports.prepare as typeof prepare
      }
      if (typeof harnessExports.serialize === "function") {
        serialize = harnessExports.serialize as typeof serialize
      }
    }
  } catch (error) {
    post({
      type: "fatal",
      message: error instanceof Error ? error.message : String(error),
    })
    return
  }

  for (let index = 0; index < cases.length; index++) {
    logs.length = 0
    const start = performance.now()
    try {
      const args = structuredClone(cases[index].input) as unknown[]
      const prepared = prepare ? prepare(args) : args
      const got = fn(...prepared)
      post({
        type: "case",
        index,
        got: serialize ? serialize(got, prepared) : toPlain(got),
        logs: [...logs],
        timeMs: performance.now() - start,
      })
    } catch (error) {
      post({
        type: "case",
        index,
        error: error instanceof Error ? error.message : String(error),
        logs: [...logs],
        timeMs: performance.now() - start,
      })
    }
  }

  post({ type: "done" })
}
