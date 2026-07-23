import { z } from "zod"

import { getQuestion, languages } from "@/lib/content"
import {
  runTestsOnServer,
  SERVER_RUN_LANGUAGES,
} from "@/lib/judge/server/verify"

export const maxDuration = 90
const bodySchema = z.object({
  slug: z.string().min(1).max(200),
  language: z.enum(languages),
  code: z.string().min(1).max(64_000),
})

export async function POST(request: Request) {
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
}
