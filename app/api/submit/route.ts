import { z } from "zod"

import { auth } from "@/lib/auth"
import { getQuestion, languages } from "@/lib/content"
import { db } from "@/lib/db"
import { submissions } from "@/lib/db/schema"
import {
  SERVER_SUBMIT_LANGUAGES,
  verifySubmission,
} from "@/lib/judge/server/verify"

export const maxDuration = 90

const bodySchema = z.object({
  slug: z.string().min(1).max(200),
  language: z.enum(languages),
  code: z.string().min(1).max(64_000),
})

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return Response.json({ error: "Sign in to submit." }, { status: 401 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({ error: "Invalid submission." }, { status: 400 })
  }
  const { slug, language, code } = parsed.data

  if (!SERVER_SUBMIT_LANGUAGES.includes(language)) {
    return Response.json(
      {
        error:
          "Submit for C/C++ is coming soon. Use Run to test your solution in the browser.",
      },
      { status: 400 }
    )
  }

  const question = getQuestion(slug)
  if (!question) {
    return Response.json({ error: "Unknown question." }, { status: 404 })
  }

  const verdict = await verifySubmission({
    language,
    code,
    tests: question.tests,
    harness: question.harness[language],
  })

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

  return Response.json({ id: row.id, ...verdict })
}
