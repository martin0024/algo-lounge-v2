"use client"

import dynamic from "next/dynamic"
import * as React from "react"

import {
  IconAlertTriangle,
  IconCheck,
  IconLoader2,
  IconListNumbers,
  IconPlayerPlay,
  IconRefresh,
  IconSend,
  IconTrophy,
  IconX,
  IconListCheck,
} from "@tabler/icons-react"

import { LanguageSelect } from "@/components/language-select"
import {
  SubmissionHistory,
  type PastSubmission,
} from "@/components/submission-history"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { signIn, useSession } from "@/lib/auth-client"
import type { Language, TestSuite } from "@/lib/content"
import {
  runTests,
  type RunHandle,
  type RunStage,
  type WorkerCase,
} from "@/lib/judge/browser/run"
import { resultsMatch } from "@/lib/judge/shared/compare"
import {
  formatNamedInputs,
  formatTestValue,
  getArgNames,
} from "@/lib/judge/shared/test-case-display"
import { cn } from "@/lib/utils"

const CodeEditor = dynamic(
  () => import("@/components/code-editor").then((mod) => mod.CodeEditor),
  {
    ssr: false,
    loading: () => (
      <div className="p-4 font-mono text-xs text-muted-foreground">
        Loading editor…
      </div>
    ),
  }
)

type CaseView =
  | { status: "idle" | "running" }
  | { status: "pass" | "fail"; got: unknown; logs: string[]; timeMs: number }
  | { status: "error"; message: string; logs: string[]; timeMs: number }

type SubmitVerdict = {
  status: "accepted" | "wrong_answer" | "error" | "timeout"
  passedCount: number
  totalCount: number
  message?: string
  cases: {
    index: number
    status: "pass" | "fail" | "error"
    got?: unknown
    error?: string
    timeMs: number
  }[]
}

const draftKey = (slug: string, language: Language) =>
  `algolounge:draft:${slug}:${language}`

export function QuestionWorkspace({
  slug,
  starters,
  tests,
  harness,
}: {
  slug: string
  starters: Record<Language, string>
  tests: TestSuite
  harness?: Partial<Record<Language, string>>
}) {
  const [language, setLanguage] = React.useState<Language>("typescript")
  const [code, setCode] = React.useState<Record<Language, string>>(starters)
  const [cases, setCases] = React.useState<CaseView[]>(() =>
    tests.cases.map(() => ({ status: "idle" }))
  )
  const [running, setRunning] = React.useState(false)
  const [stage, setStage] = React.useState<RunStage | null>(null)
  const [fatal, setFatal] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [verdict, setVerdict] = React.useState<SubmitVerdict | null>(null)
  const [historyToken, setHistoryToken] = React.useState(0)
  const runRef = React.useRef<RunHandle | null>(null)
  const { data: session } = useSession()

  React.useEffect(() => {
    const saved = localStorage.getItem(draftKey(slug, language))
    if (saved !== null) {
      setCode((prev) =>
        prev[language] === saved ? prev : { ...prev, [language]: saved }
      )
    }
  }, [slug, language])

  React.useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(draftKey(slug, language), code[language])
    }, 400)
    return () => clearTimeout(timer)
  }, [code, language, slug])

  React.useEffect(() => () => runRef.current?.cancel(), [])

  const handleCodeChange = React.useCallback(
    (next: string) => {
      setCode((prev) => ({ ...prev, [language]: next }))
    },
    [language]
  )

  function handleReset() {
    localStorage.removeItem(draftKey(slug, language))
    setCode((prev) => ({ ...prev, [language]: starters[language] }))
  }

  function handleSelectSubmission(submission: PastSubmission) {
    const target = submission.language
    localStorage.setItem(draftKey(slug, target), submission.code)
    setLanguage(target)
    setCode((prev) => ({ ...prev, [target]: submission.code }))
    setVerdict(null)
    setFatal(null)
    setCases(tests.cases.map(() => ({ status: "idle" })))
  }

  function loginWithDiscord() {
    const callbackURL =
      typeof window !== "undefined" ? window.location.pathname : "/questions"
    signIn.social({ provider: "discord", callbackURL })
  }

  async function handleSubmit() {
    if (!code[language].trim()) {
      setVerdict(null)
      setFatal("Write some code before submitting.")
      return
    }
    if (!session) {
      loginWithDiscord()
      return
    }
    runRef.current?.cancel()
    setFatal(null)
    setVerdict(null)
    setSubmitting(true)
    setCases(tests.cases.map(() => ({ status: "running" })))
    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, language, code: code[language] }),
      })
      if (response.status === 401) {
        loginWithDiscord()
        return
      }
      const data = await response.json()
      if (!response.ok) {
        setFatal(data.error ?? "Submission failed — try again.")
        setCases(tests.cases.map(() => ({ status: "idle" })))
        return
      }
      const result = data as SubmitVerdict
      setVerdict(result)
      setHistoryToken((n) => n + 1)
      setCases(
        tests.cases.map((_, index) => {
          const caseResult = result.cases.find((c) => c.index === index)
          if (!caseResult) return { status: "idle" }
          if (caseResult.status === "error") {
            return {
              status: "error",
              message: caseResult.error ?? "Error",
              logs: [],
              timeMs: caseResult.timeMs,
            }
          }
          return {
            status: caseResult.status,
            got: caseResult.got,
            logs: [],
            timeMs: caseResult.timeMs,
          }
        })
      )
    } catch {
      setFatal("Could not reach the server — check your connection.")
      setCases(tests.cases.map(() => ({ status: "idle" })))
    } finally {
      setSubmitting(false)
    }
  }

  function handleRun() {
    if (!code[language].trim()) {
      setVerdict(null)
      setFatal("Write some code before running.")
      return
    }
    runRef.current?.cancel()
    setFatal(null)
    setVerdict(null)
    setRunning(true)
    setCases(tests.cases.map(() => ({ status: "running" })))

    runRef.current = runTests({
      language,
      code: code[language],
      tests,
      harness: harness?.[language],
      onStage: setStage,
      onCase: (update: WorkerCase) => {
        setCases((prev) =>
          prev.map((current, index) => {
            if (index !== update.index) return current
            if (update.error !== undefined) {
              return {
                status: "error",
                message: update.error,
                logs: update.logs,
                timeMs: update.timeMs,
              }
            }
            const pass = resultsMatch(
              tests.cases[update.index].expected,
              update.got,
              tests.compare
            )
            return {
              status: pass ? "pass" : "fail",
              got: update.got,
              logs: update.logs,
              timeMs: update.timeMs,
            }
          })
        )
      },
      onDone: () => {
        setRunning(false)
        setStage(null)
      },
      onFatal: (message) => {
        setRunning(false)
        setStage(null)
        setFatal(message)
        setCases((prev) =>
          prev.map((current) =>
            current.status === "running" ? { status: "idle" } : current
          )
        )
      },
    })
  }

  const isEmpty = !code[language].trim()
  const argNames = getArgNames(tests.args, tests.cases[0]?.input.length ?? 0)
  const settled = cases.filter(
    (c) => c.status === "pass" || c.status === "fail" || c.status === "error"
  ).length
  const passed = cases.filter((c) => c.status === "pass").length
  const hasRun = settled > 0

  return (
    <ResizablePanelGroup orientation="vertical">
      <ResizablePanel
        defaultSize="60"
        minSize="30"
        className="overflow-hidden rounded-xl border bg-card shadow-xs dark:shadow-none"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-2 border-b px-2 py-1.5">
            <LanguageSelect value={language} onValueChange={setLanguage} />
            <SubmissionHistory
              slug={slug}
              reloadToken={historyToken}
              onSelect={handleSelectSubmission}
            />
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleReset}
                title="Reset to starter code"
                aria-label="Reset to starter code"
              >
                <IconRefresh />
              </Button>
              <Button
                size="sm"
                onClick={handleRun}
                disabled={running || submitting || isEmpty}
              >
                {running ? (
                  <IconLoader2
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                ) : (
                  <IconPlayerPlay data-icon="inline-start" />
                )}
                {stage === "loading-runtime" ? "Loading Python…" : "Run"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSubmit}
                disabled={running || submitting || isEmpty}
                title={
                  isEmpty
                    ? "Write some code first"
                    : session
                      ? "Verify on the server and record the result"
                      : "Sign in to submit"
                }
              >
                {submitting ? (
                  <IconLoader2
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                ) : (
                  <IconSend data-icon="inline-start" />
                )}
                {submitting ? "Verifying…" : "Submit"}
              </Button>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <CodeEditor
              key={`${slug}:${language}`}
              value={code[language]}
              language={language}
              onChange={handleCodeChange}
            />
          </div>
        </div>
      </ResizablePanel>

      <ResizableHandle className="bg-transparent aria-[orientation=horizontal]:h-3" />

      <ResizablePanel
        defaultSize="40"
        minSize="15"
        className="overflow-hidden rounded-xl border bg-card shadow-xs dark:shadow-none"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-2 border-b px-4 py-2">
            <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              {hasRun ? (
                <IconListCheck className="size-4" />
              ) : (
                <IconListNumbers className="size-4" />
              )}
              {hasRun
                ? "Results"
                : "List of test cases (" + tests.cases.length + ")"}
            </span>
            {hasRun && !running && (
              <Badge
                variant="outline"
                className={cn(
                  "border-transparent",
                  passed === cases.length
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    : "bg-red-500/15 text-red-700 dark:text-red-400"
                )}
              >
                {passed}/{cases.length} passed
              </Badge>
            )}
            {running && stage === "running" && (
              <span className="text-xs text-muted-foreground">running…</span>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {verdict && (
              <div
                className={cn(
                  "mb-2 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs",
                  verdict.status === "accepted"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "border-red-500/30 bg-red-500/10 text-white dark:text-white"
                )}
              >
                {verdict.status === "accepted" ? (
                  <IconTrophy className="mt-0.5 size-4 shrink-0" />
                ) : (
                  <IconAlertTriangle className="mt-0.5 size-4 shrink-0" />
                )}
                <div>
                  <div className="font-semibold">
                    {verdict.status === "accepted" && "Accepted"}
                    {verdict.status === "wrong_answer" && "Wrong answer"}
                    {verdict.status === "error" && "Runtime error"}
                    {verdict.status === "timeout" && "Time limit exceeded"}
                    {verdict.passedCount}/{verdict.totalCount} passed, verified
                    on the server
                  </div>
                  {verdict.message && (
                    <pre className="mt-1 font-mono whitespace-pre-wrap">
                      {verdict.message}
                    </pre>
                  )}
                </div>
              </div>
            )}
            {fatal && (
              <div className="mb-2 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-400">
                <IconAlertTriangle className="mt-0.5 size-4 shrink-0" />
                <pre className="font-mono whitespace-pre-wrap">{fatal}</pre>
              </div>
            )}
            <div className="flex flex-col gap-2">
              {tests.cases.map((testCase, index) => {
                const view = cases[index]
                const namedInputs = formatNamedInputs(
                  testCase.input,
                  argNames,
                  language
                )
                const showOutput =
                  view.status === "pass" || view.status === "fail"

                return (
                  <div
                    key={index}
                    className={cn(
                      "rounded-lg border bg-muted/30 p-3 text-xs transition-colors",
                      view.status === "pass" &&
                        "border-emerald-500/30 bg-emerald-500/[0.07]",
                      (view.status === "fail" || view.status === "error") &&
                        "border-red-500/30 bg-red-500/[0.07]"
                    )}
                  >
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      {view.status === "pass" && (
                        <IconCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                      )}
                      {(view.status === "fail" || view.status === "error") && (
                        <IconX className="size-3.5 text-red-600 dark:text-red-400" />
                      )}
                      {view.status === "running" && (
                        <IconLoader2 className="size-3.5 animate-spin" />
                      )}
                      <span>Case {index + 1}</span>
                      {"timeMs" in view && (
                        <span className="ml-auto">
                          {view.timeMs < 1 ? "<1" : Math.round(view.timeMs)}ms
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-col gap-1 font-mono text-[13px] leading-relaxed">
                      {namedInputs.map((line) => (
                        <div key={line}>{line}</div>
                      ))}
                    </div>
                    {showOutput && (
                      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-[13px]">
                        <span
                          className={cn(
                            view.status === "pass"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          )}
                        >
                          output: {formatTestValue(view.got)}
                        </span>
                        {view.status === "fail" && (
                          <span className="text-muted-foreground">
                            expected: {formatTestValue(testCase.expected)}
                          </span>
                        )}
                      </div>
                    )}
                    {view.status === "error" && (
                      <pre className="mt-0.5 whitespace-pre-wrap text-red-600 dark:text-red-400">
                        {view.message}
                      </pre>
                    )}
                    {(view.status === "pass" ||
                      view.status === "fail" ||
                      view.status === "error") &&
                      view.logs.length > 0 && (
                        <pre className="mt-1 border-t pt-1 whitespace-pre-wrap text-muted-foreground">
                          {view.logs.join("\n")}
                        </pre>
                      )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
