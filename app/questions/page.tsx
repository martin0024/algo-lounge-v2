import type { Metadata } from "next"
import { headers } from "next/headers"
import Link from "next/link"
import type { ReactNode } from "react"

import {
  IconCalendar,
  IconCircleCheck,
  IconCircleDashed,
} from "@tabler/icons-react"
import { and, eq, inArray } from "drizzle-orm"

import { DifficultyBadge } from "@/components/difficulty-badge"
import { QuestionLink } from "@/components/question-link"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { auth } from "@/lib/auth"
import {
  courseLabel,
  getAllQuestions,
  getCourses,
  type QuestionMeta,
} from "@/lib/content"
import { db } from "@/lib/db"
import { submissions } from "@/lib/db/schema"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Questions",
}

type Section = {
  id: string
  title: string
  description?: string
  questions: QuestionMeta[]
}

function CourseTab({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1 text-sm whitespace-nowrap transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background/60 text-muted-foreground hover:border-primary/50 hover:text-foreground"
      )}
    >
      {children}
    </Link>
  )
}

async function getSolvedSlugs(
  slugs: string[]
): Promise<{ signedIn: boolean; solved: Set<string> }> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || slugs.length === 0) {
    return { signedIn: !!session, solved: new Set() }
  }

  const rows = await db
    .selectDistinct({ questionSlug: submissions.questionSlug })
    .from(submissions)
    .where(
      and(
        eq(submissions.userId, session.user.id),
        eq(submissions.status, "accepted"),
        inArray(submissions.questionSlug, slugs)
      )
    )

  return { signedIn: true, solved: new Set(rows.map((r) => r.questionSlug)) }
}

const ALL = "all"

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string }>
}) {
  const { course: requested } = await searchParams
  const courses = getCourses()
  const showAll = requested === ALL
  const course = showAll
    ? null
    : (courses.find((c) => c.id === requested) ?? courses[0] ?? null)

  const sections: Section[] = course
    ? course.units.map((unit) => ({
        id: unit.id,
        title: unit.title,
        description: course.kind === "semester" ? undefined : unit.description,
        questions: unit.questions,
      }))
    : [{ id: "all", title: "All questions", questions: getAllQuestions() }]

  const allSlugs = [
    ...new Set(sections.flatMap((s) => s.questions.map((q) => q.slug))),
  ]
  const { signedIn, solved } = await getSolvedSlugs(allSlugs)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Questions</h1>
      <p className="mt-2 text-muted-foreground">
        {course
          ? course.kind === "semester"
            ? `${course.title}`
            : course.description
          : `Every question from every semester, A to Z.`}
      </p>

      <nav
        aria-label="Semesters"
        className="-mx-1 mt-6 flex gap-1.5 overflow-x-auto px-1 pb-1"
      >
        {courses.map((c) => (
          <CourseTab
            key={c.id}
            href={`/questions?course=${c.id}`}
            active={c.id === course?.id}
          >
            {courseLabel(c)}
          </CourseTab>
        ))}
        <CourseTab href={`/questions?course=${ALL}`} active={showAll}>
          All questions
        </CourseTab>
      </nav>

      <div className="mt-8 flex flex-col gap-10">
        {sections.map((section) => {
          const solvedInSection = section.questions.filter((q) =>
            solved.has(q.slug)
          ).length

          return (
            <section key={section.id} id={section.id} className="scroll-mt-28">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <IconCalendar className="size-4" />
                {section.title}
                {signedIn && (
                  <span
                    className="ml-auto tabular-nums"
                    aria-label={`${solvedInSection} of ${section.questions.length} solved`}
                  >
                    {solvedInSection}/{section.questions.length} solved
                  </span>
                )}
              </h2>
              {section.description ? (
                <p className="-mt-1 mb-3 text-sm text-muted-foreground">
                  {section.description}
                </p>
              ) : null}
              <Card className="gap-0 divide-y overflow-hidden p-0 shadow-xs dark:shadow-none">
                {section.questions.map((question) => {
                  const isSolved = solved.has(question.slug)

                  return (
                    <QuestionLink
                      key={question.slug}
                      href={`/questions/${question.slug}`}
                      className="group flex w-full items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/60"
                    >
                      {signedIn &&
                        (isSolved ? (
                          <IconCircleCheck
                            className="dark:text-green-6d00 size-5 shrink-0 text-green-500"
                            aria-label="Solved"
                          />
                        ) : (
                          <IconCircleDashed
                            className="size-5 shrink-0 text-muted-foreground/40"
                            aria-hidden
                          />
                        ))}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium transition-colors">
                          {question.title}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {question.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-xs font-normal"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <DifficultyBadge difficulty={question.difficulty} />
                    </QuestionLink>
                  )
                })}
              </Card>
            </section>
          )
        })}
      </div>
    </div>
  )
}
