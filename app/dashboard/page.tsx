import type { Metadata } from "next"
import Link from "next/link"
import type { ReactNode } from "react"

import {
  IconAlertTriangle,
  IconArrowRight,
  IconCheck,
  IconCircleCheck,
  IconClockX,
  IconCode,
  IconFlame,
  IconPercentage,
  IconTarget,
  IconX,
} from "@tabler/icons-react"

import { getDashboardStats, type VerdictKey } from "@/app/dashboard/actions"
import { ActivityChart } from "@/components/dashboard/activity-chart"
import { RecentSubmissions } from "@/components/dashboard/recent-submissions"
import { XpPanel } from "@/components/dashboard/xp-panel"
import { XP_UI_ENABLED } from "@/lib/xp/config"
import {
  CIcon,
  CppIcon,
  JavaIcon,
  JavaScriptIcon,
  PythonIcon,
} from "@/components/icons"
import { Button } from "@/components/ui/button"
import type { Language } from "@/lib/content"
import { languageLabels } from "@/lib/content"
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

const tileIcons = [
  IconCircleCheck,
  IconCode,
  IconPercentage,
  IconFlame,
] as const

const languageIcons: Record<Language, () => ReactNode> = {
  typescript: JavaScriptIcon,
  python: PythonIcon,
  c: CIcon,
  cpp: CppIcon,
  java: JavaIcon,
}

function Panel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("lounge-panel rounded-2xl p-5", className)}>
      {children}
    </section>
  )
}

function PanelHeading({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="mb-1">
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      {description ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
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
    course,
    recent,
    xp,
  } = await getDashboardStats()
  const weeks = course?.weeks ?? []

  const maxLanguage = Math.max(1, ...languageCounts.map((l) => l.count))
  const solvedWeeks = weeks.filter(
    (w) => w.solved === w.total && w.total > 0
  ).length

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Hey, {firstName}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {totalSubmissions === 0
              ? "Your progress will show up here once you start solving."
              : solvedWeeks > 0
                ? `${solvedWeeks} week${solvedWeeks === 1 ? "" : "s"} cleared · keep the streak going.`
                : "Track solves, streaks, and recent attempts in one place."}
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/questions" />}>
          {totalSubmissions === 0 ? "Start solving" : "Continue solving"}
          <IconArrowRight data-icon="inline-end" />
        </Button>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((tile, index) => {
          const Icon = tileIcons[index] ?? IconTarget
          return (
            <div
              key={tile.label}
              className="lounge-panel rounded-2xl px-4 py-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {tile.label}
                </span>
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {tile.flame ? (
                    <img
                      src="/flame.gif"
                      alt=""
                      width={16}
                      height={16}
                      className="size-4"
                      aria-hidden
                    />
                  ) : (
                    <Icon className="size-3.5" />
                  )}
                </span>
              </div>
              <div className="mt-3 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
                {tile.value}
              </div>
            </div>
          )
        })}
      </div>

      {XP_UI_ENABLED && (
        <Panel className="mt-3">
          <XpPanel profile={xp} />
        </Panel>
      )}

      {totalSubmissions === 0 ? (
        <Panel className="mt-3 px-6 py-14 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <IconTarget className="size-6" />
          </div>
          <p className="mt-4 text-lg font-semibold tracking-tight">
            No submissions yet
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
            Pick a problem from this week&apos;s batch. Once you run or submit,
            your activity, verdicts, and streak land here.
          </p>
          <Button
            className="mt-6"
            nativeButton={false}
            render={<Link href="/questions" />}
          >
            Browse questions
            <IconArrowRight data-icon="inline-end" />
          </Button>
        </Panel>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <div className="grid gap-3 md:grid-cols-5">
            <Panel className="md:col-span-3">
              <PanelHeading
                title="Submission activity"
                description="Last 5 weeks · hover a day for detail"
              />
              <ActivityChart days={days} />
            </Panel>

            <Panel className="md:col-span-2">
              <PanelHeading title="Verdicts" description="All time" />
              <div className="mt-5 flex flex-col gap-3.5">
                {verdictCounts.map(({ key, count }) => {
                  const meta = verdictMeta[key]
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-lg",
                          meta.chip
                        )}
                      >
                        <meta.icon className="size-3.5" stroke={2.25} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm">{meta.label}</span>
                          <span className="text-sm font-semibold tabular-nums">
                            {count}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full transition-[width]",
                              meta.bar
                            )}
                            style={{
                              width: `${(count / maxVerdict) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Panel>
          </div>

          <div className="grid gap-3 md:grid-cols-5">
            <Panel className="md:col-span-2">
              <PanelHeading
                title="Weekly progress"
                description={
                  course
                    ? `${course.label} · solved per week`
                    : "No semester yet"
                }
              />
              <div className="mt-5 flex flex-col gap-4">
                {weeks.map(({ id, title, total, solved }) => {
                  const pct = (solved / Math.max(1, total)) * 100
                  const done = solved === total && total > 0
                  return (
                    <div key={id}>
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <Link
                          href={`/questions?course=${course?.id}#${id}`}
                          className="font-medium transition-colors hover:text-primary"
                        >
                          {title}
                        </Link>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 tabular-nums",
                            done
                              ? "font-medium text-emerald-600 dark:text-emerald-400"
                              : "text-muted-foreground"
                          )}
                        >
                          {solved}/{total}
                          {done ? (
                            <IconCircleCheck className="size-3.5" />
                          ) : null}
                        </span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary/10">
                        <div
                          className={cn(
                            "h-full rounded-full transition-[width]",
                            done ? "bg-emerald-500" : "bg-primary"
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {languageCounts.length > 0 ? (
                <>
                  <div className="my-5 h-px bg-border/70" />
                  <PanelHeading title="Languages" />
                  <div className="mt-4 flex flex-col gap-3">
                    {languageCounts.map(({ lang, count }) => {
                      const Icon = languageIcons[lang]
                      return (
                        <div key={lang} className="flex items-center gap-3">
                          <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted [&>svg]:h-4 [&>svg]:w-4">
                            <Icon />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2 text-sm">
                              <span>{languageLabels[lang]}</span>
                              <span className="font-medium text-muted-foreground tabular-nums">
                                {count}
                              </span>
                            </div>
                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-foreground/70"
                                style={{
                                  width: `${(count / maxLanguage) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : null}
            </Panel>

            <Panel className="md:col-span-3">
              <PanelHeading
                title="Recent submissions"
                description="Click a row to view code and details"
              />
              <RecentSubmissions submissions={recent} />
            </Panel>
          </div>
        </div>
      )}
    </div>
  )
}
