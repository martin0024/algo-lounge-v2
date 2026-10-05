import { spawn } from "node:child_process"
import path from "node:path"

import type { Language, TestSuite } from "@/lib/content"
import { resultsMatch, toSnakeCase } from "@/lib/judge/shared/compare"

export type VerdictCase = {
  index: number
  status: "pass" | "fail" | "error"
  got?: unknown
  error?: string
  timeMs: number
}

export type Verdict = {
  status: "accepted" | "wrong_answer" | "error" | "timeout"
  passedCount: number
  totalCount: number
  runtimeMs: number | null
  message?: string
  cases: VerdictCase[]
}

type WorkerOutcome =
  | { fatal: string }
  | {
      results: {
        index: number
        got?: unknown
        error?: string
        timeMs: number
      }[]
    }
  | { timedOut: true }

const WORKER_PATH = path.join(
  process.cwd(),
  "lib",
  "judge",
  "server",
  "worker.mjs"
)

const SECRET_KEY = /SECRET|PASSWORD|TOKEN|_KEY|CLIENT_ID|DATABASE_URL/i
function scrubbedEnv(): NodeJS.ProcessEnv {
  const out: Record<string, string | undefined> = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (SECRET_KEY.test(key)) continue
    out[key] = value
  }
  return out as NodeJS.ProcessEnv
}

const WALL_MS: Record<Language, number> = {
  typescript: 15_000,
  python: 60_000,
  c: 30_000,
  cpp: 30_000,
  java: 60_000,
}
const CASE_MS: Record<Language, number> = {
  typescript: 3_000,
  python: 5_000,
  c: 5_000,
  cpp: 5_000,
  java: 10_000,
}

export const SERVER_SUBMIT_LANGUAGES: Language[] = [
  "typescript",
  "python",
  "java",
  "c",
  "cpp",
]

export const SERVER_RUN_LANGUAGES: Language[] = ["c", "cpp", "java"]

export type ServerRunCase = {
  index: number
  got?: unknown
  error?: string
  timeMs: number
}

export async function runTestsOnServer({
  language,
  code,
  tests,
  harness,
}: {
  language: Language
  code: string
  tests: TestSuite
  harness?: string
}): Promise<{ cases: ServerRunCase[] } | { fatal: string }> {
  const functionName =
    language === "python" ? toSnakeCase(tests.functionName) : tests.functionName
  const outcome = await runInWorker(
    language,
    code,
    functionName,
    tests.cases,
    harness
  )
  if ("timedOut" in outcome) {
    return { fatal: "Time limit exceeded — check for infinite loops." }
  }
  if ("fatal" in outcome) {
    return { fatal: outcome.fatal }
  }
  return {
    cases: outcome.results.map((r) => ({
      index: r.index,
      got: r.got,
      error: r.error,
      timeMs: r.timeMs,
    })),
  }
}

function runInWorker(
  language: Language,
  code: string,
  functionName: string,
  cases: TestSuite["cases"],
  harness: string | undefined
): Promise<WorkerOutcome> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [WORKER_PATH], {
      stdio: ["ignore", "ignore", "pipe", "ipc"],
      env: scrubbedEnv(),
      // Own process group, so we can SIGKILL the WHOLE tree below. On Linux the
      // sandbox (bwrap PID ns + --die-with-parent) already reaps children; on
      // macOS there is no PID namespace, so a native grandchild would otherwise
      // be reparented to launchd and outlive a kill of the worker alone.
      detached: true,
    })
    let settled = false
    const killTree = () => {
      try {
        if (child.pid) process.kill(-child.pid, "SIGKILL")
      } catch {
        // group already gone, or no permission — fall back to the direct child
      }
      try {
        child.kill("SIGKILL")
      } catch {
        // already dead
      }
    }
    const settle = (outcome: WorkerOutcome) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      killTree()
      resolve(outcome)
    }
    const timer = setTimeout(
      () => settle({ timedOut: true }),
      WALL_MS[language]
    )
    child.once("message", (message) => settle(message as WorkerOutcome))
    child.once("error", (error) => settle({ fatal: error.message }))
    child.once("exit", (exitCode) => {
      if (exitCode !== 0 && exitCode !== null) {
        settle({ fatal: `Sandbox exited with code ${exitCode}` })
      }
    })
    child.send({
      language,
      code,
      functionName,
      cases,
      timeLimitMs: CASE_MS[language],
      harness,
    })
  })
}

export async function verifySubmission({
  language,
  code,
  tests,
  harness,
}: {
  language: Language
  code: string
  tests: TestSuite
  harness?: string
}): Promise<Verdict> {
  const functionName =
    language === "python" ? toSnakeCase(tests.functionName) : tests.functionName

  const outcome = await runInWorker(
    language,
    code,
    functionName,
    tests.cases,
    harness
  )
  const totalCount = tests.cases.length

  if ("timedOut" in outcome) {
    return {
      status: "timeout",
      passedCount: 0,
      totalCount,
      runtimeMs: null,
      message: "Time limit exceeded — check for infinite loops.",
      cases: [],
    }
  }

  if ("fatal" in outcome) {
    return {
      status: "error",
      passedCount: 0,
      totalCount,
      runtimeMs: null,
      message: outcome.fatal,
      cases: [],
    }
  }

  const cases: VerdictCase[] = outcome.results.map((result) => {
    if (result.error !== undefined) {
      return {
        index: result.index,
        status: "error",
        error: result.error,
        timeMs: result.timeMs,
      }
    }
    const pass = resultsMatch(
      tests.cases[result.index].expected,
      result.got,
      tests.compare
    )
    return {
      index: result.index,
      status: pass ? "pass" : "fail",
      got: result.got,
      timeMs: result.timeMs,
    }
  })

  const passedCount = cases.filter((c) => c.status === "pass").length
  const interrupted = cases.some(
    (c) => c.status === "error" && /interrupted/i.test(c.error ?? "")
  )
  const status =
    passedCount === totalCount
      ? "accepted"
      : interrupted
        ? "timeout"
        : cases.some((c) => c.status === "error")
          ? "error"
          : "wrong_answer"

  return {
    status,
    passedCount,
    totalCount,
    runtimeMs:
      cases.length > 0 ? Math.max(...cases.map((c) => c.timeMs)) : null,
    cases,
  }
}
