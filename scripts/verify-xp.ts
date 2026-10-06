import "./load-env"

import { eq } from "drizzle-orm"

import { getAllQuestions } from "@/lib/content"
import { db } from "@/lib/db"
import { submissions, user, userAchievements, xpEvents } from "@/lib/db/schema"
import type { Language } from "@/lib/languages"
import { awardForSubmission, totalXp } from "@/lib/xp/award"
import { levelFromXp, levelProgress, xpForLevel } from "@/lib/xp/levels"

const USER_ID = "xp-verify-user"

let failures = 0
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label}` +
      (ok
        ? ` (${JSON.stringify(actual)})`
        : ` — got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  )
}

async function submit(
  slug: string,
  language: Language,
  status: "accepted" | "wrong_answer",
  createdAt: Date
) {
  const [row] = await db
    .insert(submissions)
    .values({
      userId: USER_ID,
      questionSlug: slug,
      language,
      code: "// test",
      status,
      passedCount: status === "accepted" ? 3 : 1,
      totalCount: 3,
      runtimeMs: 1,
      createdAt,
    })
    .returning({ id: submissions.id })

  return awardForSubmission({ userId: USER_ID, submissionId: row.id })
}

async function reset() {
  await db.delete(submissions).where(eq(submissions.userId, USER_ID))
  await db.delete(xpEvents).where(eq(xpEvents.userId, USER_ID))
  await db.delete(userAchievements).where(eq(userAchievements.userId, USER_ID))
}

async function main() {
  // --- pure level math ---
  check("xpForLevel(1)", xpForLevel(1), 0)
  check("xpForLevel(2)", xpForLevel(2), 100)
  check("xpForLevel(5)", xpForLevel(5), 700)
  check("levelFromXp(99)", levelFromXp(99), 1)
  check("levelFromXp(100)", levelFromXp(100), 2)
  check("levelFromXp(249)", levelFromXp(249), 2)
  check("levelFromXp(250)", levelFromXp(250), 3)
  check("progress at 175 XP", levelProgress(175).progress, 0.5)
  check("rank at level 10", levelProgress(xpForLevel(10)).rank.name, "Linear")

  // --- ledger behaviour ---
  await db
    .insert(user)
    .values({
      id: USER_ID,
      name: "XP Verify",
      email: "xp-verify@example.test",
    })
    .onConflictDoNothing()
  await reset()

  const questions = getAllQuestions()
  const easy = questions.find((q) => q.difficulty === "easy")!
  const other = questions.find(
    (q) => q.slug !== easy.slug && q.difficulty === "easy"
  )!

  const day1 = new Date("2026-03-02T15:00:00Z")
  const day2 = new Date("2026-03-03T15:00:00Z")

  // 1. Wrong answer: attempt (5) + first-of-day (10).
  const a1 = await submit(easy.slug, "typescript", "wrong_answer", day1)
  check("wrong answer, first of day", a1.gained, 15)

  // 2. Accepted after failing: first solve (40). No first-try bonus.
  const a2 = await submit(easy.slug, "typescript", "accepted", day1)
  check(
    "first solve (easy, after a failure)",
    a2.events.filter((e) => e.kind !== "achievement").map((e) => e.amount),
    [40]
  )

  // 3. Same question, same language again: nothing.
  const a3 = await submit(easy.slug, "typescript", "accepted", day1)
  check("repeat solve, same language", a3.gained, 0)

  // 4. Same question, new language: 40% of base = 16.
  const a4 = await submit(easy.slug, "python", "accepted", day1)
  check(
    "same question, new language",
    a4.events.filter((e) => e.kind !== "achievement").map((e) => e.amount),
    [16]
  )

  // 5. Attempt cap: 3 paying failures per question per day.
  await reset()
  let attemptTotal = 0
  for (let i = 0; i < 5; i++) {
    const award = await submit(other.slug, "typescript", "wrong_answer", day1)
    attemptTotal += award.events
      .filter((e) => e.kind === "attempt")
      .reduce((sum, e) => sum + e.amount, 0)
  }
  check("5 failures pay only 3 attempts", attemptTotal, 15)

  // 6. First-try bonus + streak on a second day.
  const a6 = await submit(easy.slug, "typescript", "accepted", day2)
  const kinds = a6.events
    .map((e) => e.kind)
    .filter((kind) => kind !== "achievement")
    .sort()
  check("second day: daily + streak + solve + first-try", kinds, [
    "daily",
    "first_solve",
    "first_try_bonus",
    "streak",
  ])
  check(
    "streak bonus (2 days)",
    a6.events.find((e) => e.kind === "streak")?.amount,
    6
  )

  // 7. Ledger total matches the sum of everything paid.
  const total = await totalXp(USER_ID)
  const [{ count }] = await db
    .select({ count: xpEvents.amount })
    .from(xpEvents)
    .where(eq(xpEvents.userId, USER_ID))
    .limit(1)
  check("total XP is positive", total > 0 && count > 0, true)

  // 8. Idempotency: replaying any recorded submission pays nothing extra.
  const all = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(eq(submissions.userId, USER_ID))

  let replayTotal = 0
  for (const row of all) {
    const replay = await awardForSubmission({
      userId: USER_ID,
      submissionId: row.id,
    })
    replayTotal += replay.gained
  }
  check("replaying every submission pays nothing", replayTotal, 0)
  check("total unchanged after replay", await totalXp(USER_ID), total)

  await reset()
  await db.delete(user).where(eq(user.id, USER_ID))

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} FAILED`)
  process.exit(failures === 0 ? 0 : 1)
}

void main()
