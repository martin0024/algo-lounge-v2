"use client"

import * as React from "react"
import Link from "next/link"

import {
  IconAlertTriangle,
  IconArrowRight,
  IconCheck,
  IconClockX,
  IconX,
} from "@tabler/icons-react"

import type { RecentSubmission, VerdictKey } from "@/app/dashboard/actions"
import { CodePreview, LanguageMark } from "@/components/dashboard/code-preview"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { timeAgo } from "@/lib/format"
import { cn } from "@/lib/utils"

const verdictMeta: Record<
  VerdictKey,
  { label: string; icon: typeof IconCheck; chip: string }
> = {
  accepted: {
    label: "Accepted",
    icon: IconCheck,
    chip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  wrong_answer: {
    label: "Wrong answer",
    icon: IconX,
    chip: "bg-red-500/15 text-red-600 dark:text-red-400",
  },
  error: {
    label: "Runtime error",
    icon: IconAlertTriangle,
    chip: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
  timeout: {
    label: "Timeout",
    icon: IconClockX,
    chip: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
  },
}

export function RecentSubmissions({
  submissions,
}: {
  submissions: RecentSubmission[]
}) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const selected =
    submissions.find((submission) => submission.id === selectedId) ?? null
  const meta = selected ? verdictMeta[selected.status] : null

  return (
    <>
      <div className="-mx-2 mt-3">
        {submissions.map((row) => {
          const rowMeta = verdictMeta[row.status]
          return (
            <button
              key={row.id}
              type="button"
              onClick={() => setSelectedId(row.id)}
              className="group flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-muted/60"
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg",
                  rowMeta.chip
                )}
              >
                <rowMeta.icon className="size-4" stroke={2.25} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium transition-colors group-hover:text-primary">
                  {row.questionTitle}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {rowMeta.label}
                </div>
              </div>
              <Badge
                variant="secondary"
                className="hidden gap-1.5 border-transparent pr-2 text-[11px] font-normal sm:inline-flex"
              >
                <LanguageMark language={row.language} />
              </Badge>
              <span className="w-14 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                {timeAgo(row.createdAt)}
              </span>
            </button>
          )
        })}
      </div>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
      >
        {selected && meta ? (
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="pr-8">
                {selected.questionTitle}
              </DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                <span>Submitted {timeAgo(selected.createdAt)}</span>
                <span aria-hidden>·</span>
                <LanguageMark language={selected.language} />
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium",
                  meta.chip
                )}
              >
                <meta.icon className="size-3.5" stroke={2.25} />
                {meta.label}
              </span>
              <Badge variant="secondary" className="font-normal tabular-nums">
                {selected.passedCount}/{selected.totalCount} tests
              </Badge>
              {selected.runtimeMs != null ? (
                <Badge variant="secondary" className="font-normal tabular-nums">
                  {Math.round(selected.runtimeMs)} ms
                </Badge>
              ) : null}
            </div>

            <CodePreview code={selected.code} language={selected.language} />

            <DialogFooter className="sm:justify-between">
              <DialogClose render={<Button variant="outline" />}>
                Close
              </DialogClose>
              <Button
                nativeButton={false}
                render={<Link href={`/questions/${selected.questionSlug}`} />}
              >
                Open question
                <IconArrowRight data-icon="inline-end" />
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  )
}
