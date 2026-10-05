import { z } from "zod"

import { auth } from "@/lib/auth"
import { getQuestion, languages } from "@/lib/content"
import {
  runTestsOnServer,
  SERVER_RUN_LANGUAGES,
} from "@/lib/judge/server/verify"
import {
  acquireJudgeSlot,
  rateLimit,
  releaseJudgeSlot,
} from "@/lib/rate-limit"

export const maxDuration = 90
const bodySchema = z.object({
  // Slug is used to look up a question directory on disk, so constrain it to
  // the same charset content authoring uses — no path separators / traversal.
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/),
  language: z.enum(languages),
  code: z.string().min(1).max(64_000),
})

export async function POST(request: Request) {
  // Run compiles + executes native code on the server, so it must not be an
  // open, anonymous endpoint. Require a session like Submit does.
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return Response.json({ error: "Sign in to run code." }, { status: 401 })
  }

  const limit = rateLimit(`run:${session.user.id}`, 30, 60_000)
  if (!limit.ok) {
    return Response.json(
      { error: "Too many runs — slow down a moment." },
      {
        status: 429,
        headers: { "retry-after": String(Math.ceil(limit.retryAfterMs / 1000)) },
      }
    )
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({ error: "Invalid request." }, { status: 400 })
  }
  const { slug, language, code } = parsed.data

  if (!SERVER_RUN_LANGUAGES.includes(language)) {
    return Response.json(
      { error: `${language} runs in the browser, not on the server.` },
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
  try {
    const result = await runTestsOnServer({
      language,
      code,
      tests: question.tests,
      harness: question.harness[language],
    })

    if ("fatal" in result) {
      return Response.json({ error: result.fatal }, { status: 200 })
    }
    return Response.json({ cases: result.cases })
  } finally {
    releaseJudgeSlot()
  }
}
