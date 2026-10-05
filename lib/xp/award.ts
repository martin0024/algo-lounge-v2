import { eq, sql } from "drizzle-orm"

import { getAllQuestions, getUnitSlugGroups } from "@/lib/content"
import { db } from "@/lib/db"
import { submissions, userAchievements, xpEvents } from "@/lib/db/schema"
import { dayKey } from "@/lib/format"
import type { Difficulty, Language } from "@/lib/languages"
import {
  ACHIEVEMENTS,
  computeStats,
  currentRun,
  type Achievement,
} from "@/lib/xp/achievements"
import { levelProgress, type LevelProgress } from "@/lib/xp/levels"
import {
  ATTEMPT_DAILY_CAP,
  ATTEMPT_XP,
  BASE_XP,
  DAILY_XP,
  FIRST_TRY_BONUS,
  describeXpEvent,
  languageSolveXp,
  streakXp,
  type XpKind,
} from "@/lib/xp/rules"

export type AwardedEvent = {
  kind: XpKind
  amount: number
  label: string
}

export type UnlockedAchievement = Pick<
  Achievement,
  "id" | "name" | "description" | "tier" | "xp" | "icon"
>

export type XpAward = {
  /** XP actually granted by this submission (0 when nothing new happened). */
  gained: number
  events: AwardedEvent[]
  achievements: UnlockedAchievement[]
  before: LevelProgress
  after: LevelProgress
  leveledUp: boolean
}

type PendingEvent = {
  kind: XpKind
  amount: number
  dedupeKey: string
  language?: Language | null
  detail?: string | null
  questionSlug?: string | null
  submissionId?: string | null
}

/**
 * Grade a freshly recorded submission and pay out.
 *
 * Everything is derived from the submissions table rather than from incoming
 * parameters, so the result is the same no matter how often it runs — the
 * unique `dedupe_key` per event does the rest.
 */
export async function awardForSubmission({
  userId,
  submissionId,
}: {
  userId: string
  submissionId: string
}): Promise<XpAward> {
  const history = await db
    .select({
      id: submissions.id,
      questionSlug: submissions.questionSlug,
      language: submissions.language,
      status: submissions.status,
      createdAt: submissions.createdAt,
    })
    .from(submissions)
    .where(eq(submissions.userId, userId))

  const questions = getAllQuestions()
  const current = history.find((row) => row.id === submissionId)
  // The question the submission points at, not one the caller told us about.
  const question = current
    ? questions.find((q) => q.slug === current.questionSlug)
    : undefined

  if (!current || !question) {
    if (current && !question) {
      console.warn(`[xp] no content for question ${current.questionSlug}`)
    }
    const progress = levelProgress(await totalXp(userId))
    return {
      gained: 0,
      events: [],
      achievements: [],
      before: progress,
      after: progress,
      leveledUp: false,
    }
  }

  // Grade what's actually recorded, so a mistaken or replayed call can't be
  // talked into paying for something that didn't happen.
  const slug = current.questionSlug
  const language: Language = current.language
  const difficulty: Difficulty = question.difficulty

  // Everything except the row we're grading — it was just inserted, so it is
  // the newest one.
  const earlier = history.filter((row) => row.id !== submissionId)
  const pending: PendingEvent[] = []
  const today = dayKey(current.createdAt)

  // 1. First submission of the day, whatever the verdict.
  const submittedEarlierToday = earlier.some(
    (row) => dayKey(row.createdAt) === today
  )
  if (!submittedEarlierToday) {
    pending.push({
      kind: "daily",
      amount: DAILY_XP,
      dedupeKey: `daily:${today}`,
    })

    // 2. Day-streak bonus, paid alongside the first submission of the day.
    const days = new Set(history.map((row) => dayKey(row.createdAt)))
    const streak = currentRun(days, current.createdAt)
    const bonus = streakXp(streak)
    if (bonus > 0) {
      pending.push({
        kind: "streak",
        amount: bonus,
        dedupeKey: `streak:${today}`,
        detail: String(streak),
      })
    }
  }

  if (current.status === "accepted") {
    const acceptedBefore = earlier.filter(
      (row) => row.questionSlug === slug && row.status === "accepted"
    )
    const solvedBefore = acceptedBefore.length > 0
    const solvedInThisLanguageBefore = acceptedBefore.some(
      (row) => row.language === language
    )

    // 3. Solving pays once per (question, language). The first one is worth
    //    full value; later languages are worth a fraction of it.
    if (!solvedInThisLanguageBefore) {
      pending.push({
        kind: solvedBefore ? "language_solve" : "first_solve",
        amount: solvedBefore
          ? languageSolveXp(difficulty)
          : BASE_XP[difficulty],
        dedupeKey: `solve:${slug}:${language}`,
        language,
        questionSlug: slug,
        submissionId,
      })
    }

    // 4. Nailed it without a single failed attempt on this question.
    const attemptedBefore = earlier.some((row) => row.questionSlug === slug)
    if (!attemptedBefore) {
      pending.push({
        kind: "first_try_bonus",
        amount: FIRST_TRY_BONUS,
        dedupeKey: `firsttry:${slug}`,
        questionSlug: slug,
        submissionId,
      })
    }
  } else {
    // 5. Failed attempts still pay, but only a few times per question per day.
    const failedToday = earlier.filter(
      (row) =>
        row.questionSlug === slug &&
        row.status !== "accepted" &&
        dayKey(row.createdAt) === today
    ).length

    if (failedToday < ATTEMPT_DAILY_CAP) {
      pending.push({
        kind: "attempt",
        amount: ATTEMPT_XP,
        dedupeKey: `attempt:${slug}:${today}:${failedToday + 1}`,
        language,
        questionSlug: slug,
        submissionId,
      })
    }
  }

  // 6. Achievements, judged against the whole history including this run.
  const stats = computeStats(
    history,
    questions.map((q) => ({ slug: q.slug, difficulty: q.difficulty })),
    getUnitSlugGroups()
  )

  const alreadyUnlocked = new Set(
    (
      await db
        .select({ id: userAchievements.achievementId })
        .from(userAchievements)
        .where(eq(userAchievements.userId, userId))
    ).map((row) => row.id)
  )

  const newlyEarned = ACHIEVEMENTS.filter(
    (achievement) =>
      !alreadyUnlocked.has(achievement.id) && achievement.earned(stats)
  )

  for (const achievement of newlyEarned) {
    pending.push({
      kind: "achievement",
      amount: achievement.xp,
      dedupeKey: `ach:${achievement.id}`,
      detail: achievement.name,
    })
  }

  const before = levelProgress(await totalXp(userId))

  const inserted = await db.transaction(async (tx) => {
    if (newlyEarned.length > 0) {
      await tx
        .insert(userAchievements)
        .values(
          newlyEarned.map((achievement) => ({
            userId,
            achievementId: achievement.id,
          }))
        )
        .onConflictDoNothing()
    }

    if (pending.length === 0) return []

    // `onConflictDoNothing` + `returning` gives us exactly the events that were
    // new, so a retried request reports a truthful "+0 XP".
    return tx
      .insert(xpEvents)
      .values(
        pending.map((event) => ({
          userId,
          kind: event.kind,
          amount: event.amount,
          questionSlug: event.questionSlug ?? null,
          language: event.language ?? null,
          submissionId: event.submissionId ?? null,
          detail: event.detail ?? null,
          dedupeKey: event.dedupeKey,
        }))
      )
      .onConflictDoNothing()
      .returning({
        kind: xpEvents.kind,
        amount: xpEvents.amount,
        language: xpEvents.language,
        detail: xpEvents.detail,
        dedupeKey: xpEvents.dedupeKey,
      })
  })

  const events: AwardedEvent[] = inserted.map((event) => ({
    kind: event.kind,
    amount: event.amount,
    label: describeXpEvent(event.kind, {
      language: event.language,
      detail: event.detail,
    }),
  }))

  const gained = events.reduce((sum, event) => sum + event.amount, 0)
  const after = levelProgress(before.xp + gained)

  // Only report achievements whose XP event actually landed — on a retried
  // request the unlock row exists but nothing new was paid.
  const paidKeys = new Set(inserted.map((event) => event.dedupeKey))

  return {
    gained,
    events,
    achievements: newlyEarned
      .filter((achievement) => paidKeys.has(`ach:${achievement.id}`))
      .map(({ id, name, description, tier, xp, icon }) => ({
        id,
        name,
        description,
        tier,
        xp,
        icon,
      })),
    before,
    after,
    leveledUp: after.level > before.level,
  }
}

export async function totalXp(userId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${xpEvents.amount}), 0)::int` })
    .from(xpEvents)
    .where(eq(xpEvents.userId, userId))

  return row?.total ?? 0
}

/** Used by the achievements grid to show which ones are already unlocked. */
export async function unlockedAchievementIds(userId: string) {
  const rows = await db
    .select({
      id: userAchievements.achievementId,
      unlockedAt: userAchievements.unlockedAt,
    })
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId))

  return rows
}
