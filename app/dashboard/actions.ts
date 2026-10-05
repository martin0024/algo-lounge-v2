import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { desc, eq } from "drizzle-orm"

import type { ActivityDay } from "@/components/dashboard/activity-chart"
import { auth } from "@/lib/auth"
import {
  courseLabel,
  getAllQuestions,
  getCurrentCourse,
  languages,
  type Language,
} from "@/lib/content"
import { db } from "@/lib/db"
import { submissions } from "@/lib/db/schema"
import { dayKey } from "@/lib/format"
import { getXpProfile, type XpProfile } from "@/lib/xp/profile"

const DAYS_SHOWN = 35

export type VerdictKey = "accepted" | "wrong_answer" | "error" | "timeout"

export type RecentSubmission = {
  id: string
  questionSlug: string
  questionTitle: string
  language: Language
  status: VerdictKey
  passedCount: number
  totalCount: number
  runtimeMs: number | null
  code: string
  createdAt: string
}

export type DashboardStats = {
  firstName: string
  totalSubmissions: number
  tiles: { label: string; value: string; flame?: boolean }[]
  days: ActivityDay[]
  verdictCounts: { key: VerdictKey; count: number }[]
  maxVerdict: number
  languageCounts: { lang: Language; count: number }[]
  /** Progress through the current semester, week by week. */
  course: {
    id: string
    label: string
    weeks: { id: string; title: string; total: number; solved: number }[]
  } | null
  recent: RecentSubmission[]
  xp: XpProfile
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/")

  const rows = await db
    .select({
      questionSlug: submissions.questionSlug,
      language: submissions.language,
      status: submissions.status,
      createdAt: submissions.createdAt,
    })
    .from(submissions)
    .where(eq(submissions.userId, session.user.id))
    .orderBy(desc(submissions.createdAt))

  const questions = getAllQuestions()
  const titleBySlug = new Map(questions.map((q) => [q.slug, q.title]))

  const totalSubmissions = rows.length
  const solvedSlugs = new Set(
    rows.filter((r) => r.status === "accepted").map((r) => r.questionSlug)
  )
  const acceptedCount = rows.filter((r) => r.status === "accepted").length
  const acceptanceRate =
    totalSubmissions > 0
      ? Math.round((acceptedCount / totalSubmissions) * 100)
      : 0

  const verdictCounts = (
    ["accepted", "wrong_answer", "error", "timeout"] as VerdictKey[]
  ).map((key) => ({
    key,
    count: rows.filter((r) => r.status === key).length,
  }))
  const maxVerdict = Math.max(1, ...verdictCounts.map((v) => v.count))

  const byDay = new Map<string, { total: number; accepted: number }>()
  for (const row of rows) {
    const key = dayKey(row.createdAt)
    const entry = byDay.get(key) ?? { total: 0, accepted: 0 }
    entry.total += 1
    if (row.status === "accepted") entry.accepted += 1
    byDay.set(key, entry)
  }

  const days: ActivityDay[] = []
  for (let i = DAYS_SHOWN - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86_400_000)
    const key = dayKey(date)
    const entry = byDay.get(key)
    days.push({
      iso: key,
      label: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      total: entry?.total ?? 0,
      accepted: entry?.accepted ?? 0,
    })
  }

  let streak = 0
  for (let i = 0; ; i++) {
    const key = dayKey(new Date(Date.now() - i * 86_400_000))
    if (byDay.has(key)) streak++
    else if (i === 0) continue
    else break
  }

  const current = getCurrentCourse()
  const course = current && {
    id: current.id,
    label: courseLabel(current),
    weeks: current.units.map((unit) => ({
      id: unit.id,
      title: unit.title,
      total: unit.questions.length,
      solved: unit.questions.filter((q) => solvedSlugs.has(q.slug)).length,
    })),
  }

  const languageCounts = languages
    .map((lang) => ({
      lang,
      count: rows.filter((r) => r.language === lang).length,
    }))
    .filter((entry) => entry.count > 0)

  const recentRows = await db
    .select({
      id: submissions.id,
      questionSlug: submissions.questionSlug,
      language: submissions.language,
      status: submissions.status,
      passedCount: submissions.passedCount,
      totalCount: submissions.totalCount,
      runtimeMs: submissions.runtimeMs,
      code: submissions.code,
      createdAt: submissions.createdAt,
    })
    .from(submissions)
    .where(eq(submissions.userId, session.user.id))
    .orderBy(desc(submissions.createdAt))
    .limit(8)

  const recent: RecentSubmission[] = recentRows.map((row) => ({
    id: row.id,
    questionSlug: row.questionSlug,
    questionTitle: titleBySlug.get(row.questionSlug) ?? row.questionSlug,
    language: row.language,
    status: row.status as VerdictKey,
    passedCount: row.passedCount,
    totalCount: row.totalCount,
    runtimeMs: row.runtimeMs,
    code: row.code,
    createdAt: row.createdAt.toISOString(),
  }))

  const tiles = [
    {
      label: "Problems solved",
      value: `${solvedSlugs.size}/${questions.length}`,
    },
    { label: "Submissions", value: String(totalSubmissions) },
    { label: "Acceptance rate", value: `${acceptanceRate}%` },
    {
      label: "Day streak",
      value: String(streak),
      flame: streak > 0,
    },
  ]

  return {
    xp: await getXpProfile(session.user.id),
    firstName: session.user.name.split(" ")[0] ?? session.user.name,
    totalSubmissions,
    tiles,
    days,
    verdictCounts,
    maxVerdict,
    languageCounts,
    course,
    recent,
  }
}
