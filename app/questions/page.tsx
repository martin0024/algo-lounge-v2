import type { Metadata } from "next"
import Link from "next/link"

import { IconCalendar, IconChevronRight } from "@tabler/icons-react"

import { DifficultyBadge } from "@/components/difficulty-badge"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { getQuestionsByWeek } from "@/lib/content"

export const metadata: Metadata = {
  title: "Questions",
}

export default function QuestionsPage() {
  const weeks = getQuestionsByWeek()

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Questions</h1>
      <p className="mt-2 text-muted-foreground">
        One batch of questions per week. Pick one and start solving.
      </p>

      <div className="mt-8 flex flex-col gap-10">
        {[...weeks.entries()].map(([week, questions]) => (
          <section key={week} id={`week-${week}`} className="scroll-mt-28">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <IconCalendar className="size-4" />
              Week {week}
            </h2>
            <Card className="gap-0 divide-y overflow-hidden p-0 shadow-xs dark:shadow-none">
              {questions.map((question) => (
                <Link
                  key={question.slug}
                  href={`/questions/${question.slug}`}
                  className="group flex w-full items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/60"
                >
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
                  <IconChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </Card>
          </section>
        ))}
      </div>
    </div>
  )
}
