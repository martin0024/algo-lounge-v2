"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export type BreadcrumbQuestion = {
  slug: string
  title: string
  week: number
}

export function HeaderPathDivider() {
  const pathname = usePathname()
  if (!pathname.startsWith("/questions/")) return null
  return <div className="mx-1 hidden h-8 w-px bg-border sm:block" />
}

export function BreadcrumbNav({
  questions,
}: {
  questions: BreadcrumbQuestion[]
}) {
  const pathname = usePathname()
  const slug = pathname.match(/^\/questions\/([^/]+)$/)?.[1]
  const current = slug ? questions.find((q) => q.slug === slug) : null

  if (!pathname.startsWith("/questions") && pathname !== "/") {
    return null
  }

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="gap-2 text-base">
        {current ? (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/questions" />}>
                Questions
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink
                render={<Link href={`/questions#week-${current.week}`} />}
              >
                Week {current.week}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="truncate">{current.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : (
          <BreadcrumbItem>
            {pathname === "/questions" ? (
              <BreadcrumbPage>Questions</BreadcrumbPage>
            ) : (
              <BreadcrumbLink render={<Link href="/questions" />}>
                Questions
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
