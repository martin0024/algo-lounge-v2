import { z } from "zod"

import { auth } from "@/lib/auth"
import { getQuestion, languages } from "@/lib/content"
import { db } from "@/lib/db"
import { submissions } from "@/lib/db/schema"
import {
  SERVER_SUBMIT_LANGUAGES,
  verifySubmission,
} from "@/lib/judge/server/verify"
import { awardForSubmission, type XpAward } from "@/lib/xp/award"
import { acquireJudgeSlot, rateLimit, releaseJudgeSlot } from "@/lib/rate-limit"

export const maxDuration = 90

const bodySchema = z.object({
  // Slug looks up a question directory on disk — constrain to the authoring
  // charset so it can't contain path separators / traversal sequences.
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/),
  language: z.enum(languages),
  code: z.string().min(1).max(64_000),
})

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return Response.json({ error: "Sign in to submit." }, { status: 401 })
  }

  const limit = rateLimit(`submit:${session.user.id}`, 20, 60_000)
  if (!limit.ok) {
    return Response.json(
      { error: "Too many submissions — slow down a moment." },
      {
        status: 429,
        headers: { "retry-after": String(Math.ceil(limit.retryAfterMs / 1000)) },
      }
    )
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({ error: "Invalid submission." }, { status: 400 })
  }
  const { slug, language, code } = parsed.data

  if (!SERVER_SUBMIT_LANGUAGES.includes(language)) {
    return Response.json(
      { error: `Submit is not available for ${language} yet.` },
      { status: 400 }
    )
  }

  const question = getQuestion(slug)
  if (!question) {
    return Response.json({ error: "Unknown question." }, { status: 404 })
  }

  if (!acquireJudgeSlot()) {
    return Response.json(
      { error: "The judge is busy — try again in a few seconds." },
      { status: 503, headers: { "retry-after": "5" } }
    )
  }
  let verdict
  try {
    verdict = await verifySubmission({
      language,
      code,
      tests: question.tests,
      harness: question.harness[language],
    })
  } finally {
    releaseJudgeSlot()
  }

  const [row] = await db
    .insert(submissions)
    .values({
      userId: session.user.id,
      questionSlug: slug,
      language,
      code,
      status: verdict.status,
      passedCount: verdict.passedCount,
      totalCount: verdict.totalCount,
      runtimeMs: verdict.runtimeMs,
    })
    .returning({ id: submissions.id })

  // XP awarding is disabled by default (set XP_ENABLED=1 to turn it back on).
  // When off, the submit path records the submission but hands out no XP.
  // XP is a bonus on top of the verdict — never fail a valid submission over it.
  let xp: XpAward | null = null
  if (process.env.XP_ENABLED === "1") {
    try {
      xp = await awardForSubmission({
        userId: session.user.id,
        submissionId: row.id,
      })
    } catch (error) {
      console.error("[xp] award failed", error)
    }
  }

  return Response.json({ id: row.id, ...verdict, xp })
}
