import type { Difficulty, Language } from "@/lib/languages"
import { clubHour, dayKey } from "@/lib/format"

/**
 * Everything an achievement can be judged on, derived once from a user's
 * full submission history. Keeping it a flat snapshot means adding a new
 * achievement is a one-line predicate, not another query.
 */
export type ProgressStats = {
  totalSubmissions: number
  acceptedSubmissions: number
  solvedCount: number
  solvedByDifficulty: Record<Difficulty, number>
  /** Most languages used to solve a single question. */
  maxLanguagesPerQuestion: number
  /** Distinct languages with at least one accepted submission. */
  acceptedLanguages: number
  /** Course weeks/stages where every question is solved. */
  weeksCleared: number
  /** Questions accepted on their very first submission. */
  firstTryAccepts: number
  /** Most submissions sunk into one question. */
  maxAttemptsOnOneQuestion: number
  longestDayStreak: number
  currentDayStreak: number
  /** Longest run of consecutive accepted submissions. */
  longestAcceptRun: number
  /** Submitted between midnight and 5am club time. */
  nightOwl: boolean
}

export type AchievementTier = "bronze" | "silver" | "gold"

export type Achievement = {
  id: string
  name: string
  description: string
  tier: AchievementTier
  xp: number
  /** Key into the icon map in `components/achievement-icon.tsx`. */
  icon: string
  earned: (stats: ProgressStats) => boolean
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-blood",
    name: "First Blood",
    description: "Get your first accepted submission.",
    tier: "bronze",
    xp: 25,
    icon: "target",
    earned: (s) => s.solvedCount >= 1,
  },
  {
    id: "getting-warm",
    name: "Getting Warm",
    description: "Solve 5 different questions.",
    tier: "bronze",
    xp: 50,
    icon: "flame",
    earned: (s) => s.solvedCount >= 5,
  },
  {
    id: "double-digits",
    name: "Double Digits",
    description: "Solve 10 different questions.",
    tier: "silver",
    xp: 100,
    icon: "stack",
    earned: (s) => s.solvedCount >= 10,
  },
  {
    id: "one-shot",
    name: "One Shot",
    description: "Get accepted on your first submission for a question.",
    tier: "bronze",
    xp: 30,
    icon: "crosshair",
    earned: (s) => s.firstTryAccepts >= 1,
  },
  {
    id: "bilingual",
    name: "Bilingual",
    description: "Solve the same question in two languages.",
    tier: "bronze",
    xp: 40,
    icon: "languages",
    earned: (s) => s.maxLanguagesPerQuestion >= 2,
  },
  {
    id: "polyglot",
    name: "Polyglot",
    description: "Solve the same question in three languages.",
    tier: "silver",
    xp: 80,
    icon: "languages",
    earned: (s) => s.maxLanguagesPerQuestion >= 3,
  },
  {
    id: "five-tongues",
    name: "Five Tongues",
    description: "Get an accepted submission in all five languages.",
    tier: "gold",
    xp: 150,
    icon: "world",
    earned: (s) => s.acceptedLanguages >= 5,
  },
  {
    id: "no-fear",
    name: "No Fear",
    description: "Solve a hard question.",
    tier: "silver",
    xp: 60,
    icon: "mountain",
    earned: (s) => s.solvedByDifficulty.hard >= 1,
  },
  {
    id: "clean-sweep",
    name: "Clean Sweep",
    description: "Solve every question in a week.",
    tier: "silver",
    xp: 75,
    icon: "calendar",
    earned: (s) => s.weeksCleared >= 1,
  },
  {
    id: "relentless",
    name: "Relentless",
    description: "Submit 10 times on a single question.",
    tier: "bronze",
    xp: 25,
    icon: "hammer",
    earned: (s) => s.maxAttemptsOnOneQuestion >= 10,
  },
  {
    id: "on-a-roll",
    name: "On a Roll",
    description: "Submit on three days in a row.",
    tier: "bronze",
    xp: 30,
    icon: "bolt",
    earned: (s) => s.longestDayStreak >= 3,
  },
  {
    id: "seven-day-week",
    name: "Seven Day Week",
    description: "Submit on seven days in a row.",
    tier: "gold",
    xp: 75,
    icon: "bolt",
    earned: (s) => s.longestDayStreak >= 7,
  },
  {
    id: "hot-hand",
    name: "Hot Hand",
    description: "Land five accepted submissions in a row.",
    tier: "silver",
    xp: 50,
    icon: "trophy",
    earned: (s) => s.longestAcceptRun >= 5,
  },
  {
    id: "night-owl",
    name: "Night Owl",
    description: "Submit between midnight and 5am.",
    tier: "bronze",
    xp: 20,
    icon: "moon",
    earned: (s) => s.nightOwl,
  },
]

export const ACHIEVEMENTS_BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]))

export type SubmissionRecord = {
  questionSlug: string
  language: Language
  status: "accepted" | "wrong_answer" | "error" | "timeout"
  createdAt: Date
}

export type QuestionRecord = {
  slug: string
  difficulty: Difficulty
}

/** Fold a full submission history into the snapshot achievements read. */
export function computeStats(
  submissions: SubmissionRecord[],
  questions: QuestionRecord[],
  /** The slugs of every course week/stage (see getUnitSlugGroups). */
  units: string[][]
): ProgressStats {
  const ordered = [...submissions].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  )
  const questionBySlug = new Map(questions.map((q) => [q.slug, q]))

  const attemptsBySlug = new Map<string, number>()
  const acceptedLanguagesBySlug = new Map<string, Set<Language>>()
  const acceptedLanguages = new Set<Language>()
  const firstTrySlugs = new Set<string>()
  const days = new Set<string>()

  let acceptedSubmissions = 0
  let longestAcceptRun = 0
  let currentAcceptRun = 0
  let nightOwl = false

  for (const row of ordered) {
    const attempts = (attemptsBySlug.get(row.questionSlug) ?? 0) + 1
    attemptsBySlug.set(row.questionSlug, attempts)
    days.add(dayKey(row.createdAt))

    const hour = clubHour(row.createdAt)
    if (hour < 5) nightOwl = true

    if (row.status === "accepted") {
      acceptedSubmissions++
      currentAcceptRun++
      longestAcceptRun = Math.max(longestAcceptRun, currentAcceptRun)
      acceptedLanguages.add(row.language)

      const langs =
        acceptedLanguagesBySlug.get(row.questionSlug) ?? new Set<Language>()
      langs.add(row.language)
      acceptedLanguagesBySlug.set(row.questionSlug, langs)

      if (attempts === 1) firstTrySlugs.add(row.questionSlug)
    } else {
      currentAcceptRun = 0
    }
  }

  const solvedSlugs = new Set(acceptedLanguagesBySlug.keys())

  const solvedByDifficulty: Record<Difficulty, number> = {
    easy: 0,
    medium: 0,
    hard: 0,
  }
  for (const slug of solvedSlugs) {
    const question = questionBySlug.get(slug)
    if (question) solvedByDifficulty[question.difficulty]++
  }

  const weeksCleared = units.filter(
    (slugs) => slugs.length > 0 && slugs.every((slug) => solvedSlugs.has(slug))
  ).length

  return {
    totalSubmissions: ordered.length,
    acceptedSubmissions,
    solvedCount: solvedSlugs.size,
    solvedByDifficulty,
    maxLanguagesPerQuestion: Math.max(
      0,
      ...[...acceptedLanguagesBySlug.values()].map((set) => set.size)
    ),
    acceptedLanguages: acceptedLanguages.size,
    weeksCleared,
    firstTryAccepts: firstTrySlugs.size,
    maxAttemptsOnOneQuestion: Math.max(0, ...attemptsBySlug.values()),
    longestDayStreak: longestRun(days),
    currentDayStreak: currentRun(days),
    longestAcceptRun,
    nightOwl,
  }
}

const DAY_MS = 86_400_000

/** Longest run of consecutive calendar days present in the set. */
function longestRun(days: Set<string>): number {
  const sorted = [...days].sort()
  let best = 0
  let run = 0
  let previous: string | null = null

  for (const day of sorted) {
    run = previous !== null && day === nextDay(previous) ? run + 1 : 1
    best = Math.max(best, run)
    previous = day
  }
  return best
}

/** Run of consecutive days ending today (or yesterday — today may be young). */
export function currentRun(days: Set<string>, now = new Date()): number {
  const today = dayKey(now)
  const yesterday = dayKey(new Date(now.getTime() - DAY_MS))

  let cursor = days.has(today) ? today : days.has(yesterday) ? yesterday : null
  if (cursor === null) return 0

  let streak = 0
  while (days.has(cursor)) {
    streak++
    cursor = previousDay(cursor)
  }
  return streak
}

/** Noon UTC is comfortably inside the same club-time day, so ±24h is safe. */
function shiftDay(day: string, deltaMs: number) {
  return dayKey(new Date(new Date(`${day}T12:00:00Z`).getTime() + deltaMs))
}

function nextDay(day: string) {
  return shiftDay(day, DAY_MS)
}

function previousDay(day: string) {
  return shiftDay(day, -DAY_MS)
}
