"use client"

import * as React from "react"
import type { ReactNode } from "react"

import {
  IconAlertTriangle,
  IconCheck,
  IconChevronDown,
  IconClockX,
  IconHistory,
  IconX,
} from "@tabler/icons-react"

import {
  CIcon,
  CppIcon,
  JavaIcon,
  JavaScriptIcon,
  PythonIcon,
} from "@/components/icons"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSession } from "@/lib/auth-client"
import type { Language } from "@/lib/content"
import { timeAgo } from "@/lib/format"
import { cn } from "@/lib/utils"

type SubmissionStatus = "accepted" | "wrong_answer" | "error" | "timeout"

export type PastSubmission = {
  id: string
  language: Language
  status: SubmissionStatus
  passedCount: number
  totalCount: number
  runtimeMs: number | null
  code: string
  createdAt: string
}

const statusMeta: Record<
  SubmissionStatus,
  { label: string; icon: typeof IconCheck; className: string }
> = {
  accepted: {
    label: "Accepted",
    icon: IconCheck,
    className: "text-emerald-600 dark:text-emerald-400",
  },
  wrong_answer: {
    label: "Wrong answer",
    icon: IconX,
    className: "text-red-600 dark:text-red-400",
  },
  error: {
    label: "Runtime error",
    icon: IconAlertTriangle,
    className: "text-amber-600 dark:text-amber-400",
  },
  timeout: {
    label: "Timeout",
    icon: IconClockX,
    className: "text-slate-600 dark:text-slate-400",
  },
}

const languageIcons: Record<Language, () => ReactNode> = {
  typescript: JavaScriptIcon,
  python: PythonIcon,
  c: CIcon,
  cpp: CppIcon,
  java: JavaIcon,
}

const languageLabels: Record<Language, string> = {
  typescript: "TypeScript",
  python: "Python",
  c: "C",
  cpp: "C++",
  java: "Java",
}

export function SubmissionHistory({
  slug,
  reloadToken,
  onSelect,
}: {
  slug: string
  reloadToken: number
  onSelect: (submission: PastSubmission) => void
}) {
  const { data: session } = useSession()
  const [submissions, setSubmissions] = React.useState<PastSubmission[]>([])

  React.useEffect(() => {
    if (!session) return
    let active = true
    fetch(`/api/submissions?slug=${encodeURIComponent(slug)}`)
      .then((res) => (res.ok ? res.json() : { submissions: [] }))
      .then((data) => {
        if (active) setSubmissions(data.submissions ?? [])
      })
      .catch(() => {
        if (active) setSubmissions([])
      })
    return () => {
      active = false
    }
  }, [slug, session, reloadToken])

  if (!session || submissions.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className="h-8">
            <IconHistory data-icon="inline-start" />
            History
            <span className="ml-1 rounded bg-muted px-1.5 text-xs text-muted-foreground tabular-nums">
              {submissions.length}
            </span>
            <IconChevronDown data-icon="inline-end" className="opacity-60" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="z-[100] w-72">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Your past submissions ({submissions.length})
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto">
          {submissions.map((submission) => {
            const meta = statusMeta[submission.status]
            const Icon = meta.icon
            const LangIcon = languageIcons[submission.language]
            return (
              <DropdownMenuItem
                key={submission.id}
                className="flex items-center gap-2"
                onClick={() => onSelect(submission)}
              >
                <Icon className={cn("size-4 shrink-0", meta.className)} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center gap-1.5 text-sm">
                    <span className={cn("font-medium", meta.className)}>
                      {meta.label}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {submission.passedCount}/{submission.totalCount}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(submission.createdAt)}
                  </span>
                </div>
                <span
                  className="flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-[4px] [&>svg]:h-5 [&>svg]:w-5"
                  title={languageLabels[submission.language]}
                  aria-label={languageLabels[submission.language]}
                >
                  <LangIcon />
                </span>
              </DropdownMenuItem>
            )
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
