import Link from "next/link"

import {
  BreadcrumbNav,
  HeaderPathDivider,
} from "@/components/breadcrumb-nav"
import { ThemeToggle } from "@/components/theme-toggle"
import { UserMenu } from "@/components/user-menu"
import { getQuestionsByWeek } from "@/lib/content"

export function SiteHeader() {
  const weeks = [...getQuestionsByWeek().entries()].map(
    ([week, questions]) => ({
      week,
      questions: questions.map(({ slug, title, difficulty }) => ({
        slug,
        title,
        difficulty,
      })),
    })
  )

  const breadcrumbQuestions = weeks.flatMap(({ week, questions }) =>
    questions.map((question) => ({ ...question, week }))
  )

  return (
    <header className="sticky top-0 z-50 pt-2">
      <div className="lounge-panel m-5 mx-auto flex w-full max-w-screen-2xl items-center gap-3 rounded-2xl px-4 sm:px-5">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2.5 pr-2"
        >
          <h1 className="text-xl font-semibold tracking-tight">
            Algo<span className="text-primary">Lounge</span>
          </h1>
        </Link>

        <HeaderPathDivider />
        <BreadcrumbNav questions={breadcrumbQuestions} />

        <div className="ml-auto flex items-center gap-2">
          <UserMenu />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
