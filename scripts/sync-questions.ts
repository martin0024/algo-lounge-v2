import "./load-env"

import { notInArray } from "drizzle-orm"

import { getAllQuestions } from "../lib/content"
import { db } from "../lib/db"
import { questions } from "../lib/db/schema"

async function main() {
  const all = getAllQuestions()
  if (all.length === 0) {
    throw new Error(
      "No questions found in content/questions — refusing to sync an empty set."
    )
  }

  for (const meta of all) {
    await db
      .insert(questions)
      .values({
        slug: meta.slug,
        title: meta.title,
        difficulty: meta.difficulty,
        tags: meta.tags,
        syncedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: questions.slug,
        set: {
          title: meta.title,
          difficulty: meta.difficulty,
          tags: meta.tags,
          syncedAt: new Date(),
        },
      })
  }

  const removed = await db
    .delete(questions)
    .where(
      notInArray(
        questions.slug,
        all.map((q) => q.slug)
      )
    )
    .returning({ slug: questions.slug })

  console.log(
    `Synced ${all.length} questions` +
      (removed.length > 0
        ? `, removed ${removed.map((r) => r.slug).join(", ")}`
        : "")
  )
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
