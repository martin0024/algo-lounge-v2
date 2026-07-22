import type { Metadata } from "next"
import Link from "next/link"

import {
  IconAlertTriangle,
  IconArrowRight,
  IconCheck,
  IconClockX,
  IconX,
} from "@tabler/icons-react"

import { getDashboardStats, type VerdictKey } from "@/app/dashboard/actions"
import { ActivityChart } from "@/components/dashboard/activity-chart"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { timeAgo } from "@/lib/format"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Dashboard" }

const verdictMeta: Record<
  VerdictKey,
  { label: string; icon: typeof IconCheck; chip: string; bar: string }
> = {
  accepted: {
    label: "Accepted",
    icon: IconCheck,
    chip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500",
  },
  wrong_answer: {
    label: "Wrong answer",
    icon: IconX,
    chip: "bg-red-500/15 text-red-600 dark:text-red-400",
    bar: "bg-red-500",
  },
  error: {
    label: "Runtime error",
    icon: IconAlertTriangle,
    chip: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
  },
  timeout: {
    label: "Timeout",
    icon: IconClockX,
    chip: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
    bar: "bg-slate-500 dark:bg-slate-400",
  },
}

export default async function DashboardPage() {
  const {
    firstName,
    totalSubmissions,
    tiles,
    days,
    verdictCounts,
    maxVerdict,
    languageCounts,
    weeks,
    recent,
  } = await getDashboardStats()

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your progress, {firstName}.
          </p>
        </div>
        <Button size="sm" render={<Link href="/questions" />}>
          Solve something
          <IconArrowRight data-icon="inline-end" />
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="lounge-panel rounded-2xl px-4 py-3.5"
          >
            <div className="text-xs text-muted-foreground">{tile.label}</div>
            <div className="mt-1 flex items-center gap-1.5 text-2xl font-semibold tracking-tight">
              {tile.flame ? (
                <img
                  src="/flame.gif"
                  alt=""
                  width={22}
                  height={22}
                  className="size-[1.35rem] shrink-0"
                  aria-hidden
                />
              ) : null}
              {tile.value}
            </div>
          </div>
        ))}
      </div>

      {totalSubmissions === 0 ? (
        <div className="lounge-panel mt-3 rounded-[1.35rem] p-10 text-center">
          <p className="text-lg font-medium">No submissions yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Solve your first problem and this page comes alive.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <section className="lounge-panel rounded-2xl p-4 lg:col-span-2">
              <h2 className="text-sm font-semibold">Submission activity</h2>
              <p className="text-xs text-muted-foreground">Last 5 weeks</p>
              <ActivityChart days={days} />
            </section>

            <section className="lounge-panel rounded-2xl p-4">
              <h2 className="text-sm font-semibold">Verdicts</h2>
              <p className="text-xs text-muted-foreground">All time</p>
              <div className="mt-4 flex flex-col gap-3">
                {verdictCounts.map(({ key, count }) => {
                  const meta = verdictMeta[key]
                  return (
                    <div key={key} className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-md",
                          meta.chip
                        )}
                      >
                        <meta.icon className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xs">{meta.label}</span>
                          <span className="text-xs font-medium text-muted-foreground tabular-nums">
                            {count}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn("h-full rounded-full", meta.bar)}
                            style={{ width: `${(count / maxVerdict) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <h2 className="mt-6 text-sm font-semibold">Languages</h2>
              <div className="mt-3 flex flex-col gap-2">
                {languageCounts.map(({ lang, count }) => (
                  <div
                    key={lang}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="capitalize">{lang}</span>
                    <span className="font-medium text-muted-foreground tabular-nums">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <section className="lounge-panel rounded-2xl p-4">
              <h2 className="text-sm font-semibold">Weekly progress</h2>
              <p className="text-xs text-muted-foreground">
                Solved per week of content
              </p>
              <div className="mt-4 flex flex-col gap-3.5">
                {weeks.map(({ week, total, solved }) => (
                  <div key={week}>
                    <div className="flex items-baseline justify-between text-xs">
                      <Link
                        href={`/questions#week-${week}`}
                        className="hover:text-primary"
                      >
                        Week {week}
                      </Link>
                      <span className="font-medium text-muted-foreground tabular-nums">
                        {solved}/{total}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-primary/15">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${(solved / Math.max(1, total)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="lounge-panel rounded-2xl p-4 lg:col-span-2">
              <h2 className="text-sm font-semibold">Recent submissions</h2>
              <p className="text-xs text-muted-foreground">Latest 8</p>
              <div className="mt-3 flex flex-col divide-y divide-border/60">
                {recent.map((row, index) => {
                  const meta = verdictMeta[row.status]
                  return (
                    <Link
                      key={index}
                      href={`/questions/${row.questionSlug}`}
                      className="group flex items-center gap-3 py-2.5"
                    >
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-md",
                          meta.chip
                        )}
                      >
                        <meta.icon className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm group-hover:text-primary">
                        {row.questionTitle}
                      </span>
                      <Badge
                        variant="secondary"
                        className="text-[11px] font-normal capitalize"
                      >
                        {row.language}
                      </Badge>
                      <span className="w-16 text-right text-xs text-muted-foreground tabular-nums">
                        {timeAgo(row.createdAt)}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
