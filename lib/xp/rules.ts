import type { Difficulty, Language } from "@/lib/languages"
import { languageLabels } from "@/lib/languages"

/**
 * What can put XP on your account. Every event carries a `dedupeKey` that is
 * unique per user, so replaying a submission can never double-pay.
 */
export const xpKinds = [
  "first_solve",
  "language_solve",
  "first_try_bonus",
  "attempt",
  "daily",
  "streak",
  "achievement",
] as const

export type XpKind = (typeof xpKinds)[number]

/** Full value of a question, paid once on the first accepted solve. */
export const BASE_XP: Record<Difficulty, number> = {
  easy: 40,
  medium: 80,
  hard: 140,
}

/** Re-solving a question in a language you haven't used on it yet. */
export const LANGUAGE_SOLVE_RATIO = 0.4

/** Accepted on the very first submission for a question. */
export const FIRST_TRY_BONUS = 15

/** Consolation XP for a failed submission — effort still counts. */
export const ATTEMPT_XP = 5

/** Failed submissions that pay out, per question per day. Blocks farming. */
export const ATTEMPT_DAILY_CAP = 3

/** First submission of the day, whatever the verdict. */
export const DAILY_XP = 10

/** Day-streak bonus, once a day: `min(streak, cap) * per-day`. */
export const STREAK_XP_PER_DAY = 3
export const STREAK_BONUS_MAX_DAYS = 7

export function languageSolveXp(difficulty: Difficulty) {
  return Math.round(BASE_XP[difficulty] * LANGUAGE_SOLVE_RATIO)
}

export function streakXp(streakDays: number) {
  if (streakDays < 2) return 0
  return Math.min(streakDays, STREAK_BONUS_MAX_DAYS) * STREAK_XP_PER_DAY
}

/** Human label for an event, shown in the award toast and the dashboard. */
export function describeXpEvent(
  kind: XpKind,
  context: { language?: Language | null; detail?: string | null } = {}
): string {
  switch (kind) {
    case "first_solve":
      return "First solve"
    case "language_solve":
      return context.language
        ? `Solved again in ${languageLabels[context.language]}`
        : "Solved in a new language"
    case "first_try_bonus":
      return "Accepted first try"
    case "attempt":
      return "Attempt"
    case "daily":
      return "First submission today"
    case "streak":
      return context.detail ? `${context.detail} day streak` : "Day streak"
    case "achievement":
      return context.detail ?? "Achievement"
  }
}
