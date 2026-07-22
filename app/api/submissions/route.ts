import { and, desc, eq } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { submissions } from "@/lib/db/schema"

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return Response.json(
      { error: "Sign in to view submissions." },
      { status: 401 }
    )
  }

  const slug = new URL(request.url).searchParams.get("slug")
  if (!slug) {
    return Response.json({ error: "Missing slug." }, { status: 400 })
  }

  const rows = await db
    .select({
      id: submissions.id,
      language: submissions.language,
      status: submissions.status,
      passedCount: submissions.passedCount,
      totalCount: submissions.totalCount,
      runtimeMs: submissions.runtimeMs,
      code: submissions.code,
      createdAt: submissions.createdAt,
    })
    .from(submissions)
    .where(
      and(
        eq(submissions.userId, session.user.id),
        eq(submissions.questionSlug, slug)
      )
    )
    .orderBy(desc(submissions.createdAt))
    .limit(50)

  return Response.json({ submissions: rows })
}
