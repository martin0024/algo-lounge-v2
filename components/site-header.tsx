import Link from "next/link"

import { BreadcrumbNav, HeaderPathDivider } from "@/components/breadcrumb-nav"
import { HeaderActions } from "@/components/header-actions"
import { getAllQuestions, getQuestionPlacements } from "@/lib/content"

export function SiteHeader() {
  const placements = getQuestionPlacements()
  const breadcrumbQuestions = getAllQuestions().map(({ slug, title }) => {
    const placement = placements.get(slug)
    return {
      slug,
      title,
      unit: placement
        ? {
            href: `/questions?course=${placement.courseId}#${placement.unitId}`,
            // Outside the current semester, say which course the week is from.
            label: placement.isCurrent
              ? placement.unitTitle
              : `${placement.courseLabel} · ${placement.unitTitle}`,
          }
        : null,
    }
  })

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 pt-5">
        <div className="mx-auto flex h-12 w-[calc(100%-2.5rem)] max-w-screen-2xl items-center gap-3 px-4 sm:px-5">
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

          <HeaderActions />
        </div>
      </header>
      {/* Matches question page `100svh - 5.5rem` so fixed header doesn't overlap content */}
      <div className="h-[5.5rem] shrink-0" aria-hidden />
    </>
  )
}
