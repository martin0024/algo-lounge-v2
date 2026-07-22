"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import * as React from "react"

import {
  IconCalendar,
  IconList,
  IconSearch,
} from "@tabler/icons-react"

import { DifficultyBadge } from "@/components/difficulty-badge"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import type { Difficulty } from "@/lib/content"
import { cn } from "@/lib/utils"

export type QuestionNavWeek = {
  week: number
  questions: { slug: string; title: string; difficulty: Difficulty }[]
}

export function QuestionNav({ weeks }: { weeks: QuestionNavWeek[] }) {
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const query = search.trim().toLowerCase()
  const filteredWeeks = React.useMemo(
    () =>
      weeks
        .map(({ week, questions }) => ({
          week,
          questions: questions.filter((question) => {
            if (!query) return true
            return (
              question.title.toLowerCase().includes(query) ||
              question.slug.toLowerCase().includes(query) ||
              question.difficulty.includes(query)
            )
          }),
        }))
        .filter((week) => week.questions.length > 0),
    [query, weeks]
  )

  const totalQuestions = weeks.reduce(
    (count, week) => count + week.questions.length,
    0
  )
  const visibleQuestions = filteredWeeks.reduce(
    (count, week) => count + week.questions.length,
    0
  )

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      setSearch("")
    }
  }

  return (
    <Drawer
      swipeDirection="left"
      open={open}
      onOpenChange={handleOpenChange}
      showSwipeHandle
    >
      <DrawerTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            aria-label="Browse all problems"
            className="shrink-0 border-border/80 bg-background/80 shadow-sm"
          />
        }
      >
        <IconList data-icon="inline-start" />
        <span className="hidden sm:inline">Problems</span>
        <span className="sm:hidden">List</span>
      </DrawerTrigger>
      <DrawerContent className="data-[swipe-axis=x]:sm:[--drawer-content-width:22rem]">
        <DrawerHeader className="gap-3 border-b border-border/80 pb-4">
          <div>
            <DrawerTitle className="flex items-center gap-2">
              <IconList className="size-5" />
              List of Problems
            </DrawerTitle>
            <DrawerDescription>
              {query
                ? `${visibleQuestions} of ${totalQuestions} questions`
                : `${totalQuestions} questions across ${weeks.length} weeks`}
            </DrawerDescription>
          </div>
          <InputGroup className="mt-2">
            <InputGroupAddon>
              <IconSearch />
            </InputGroupAddon>
            <InputGroupInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title or difficulty…"
              aria-label="Search problems"
            />
          </InputGroup>
        </DrawerHeader>

        <ScrollArea className="min-h-0 flex-1">
          <nav className="flex flex-col gap-4 p-3">
            {filteredWeeks.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                No problems match &ldquo;{search.trim()}&rdquo;.
              </p>
            ) : (
              filteredWeeks.map(({ week, questions }, weekIndex) => (
                <div key={week}>
                  {weekIndex > 0 ? <Separator className="mb-4" /> : null}
                  <div className="flex items-center gap-2 px-2 pb-2 text-sm font-semibold text-muted-foreground">
                    <IconCalendar className="size-4" />
                    Week {week}
                  </div>
                  <div className="flex flex-col gap-1">
                    {questions.map((question) => {
                      const href = `/questions/${question.slug}`
                      const active = pathname === href
                      return (
                        <Link
                          key={question.slug}
                          href={href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex items-center gap-2 rounded-xl border px-2.5 py-2 transition-colors",
                            active
                              ? "border-primary bg-primary"
                              : "border-transparent hover:border-border"
                          )}
                        >
                          <span
                            className={cn(
                              "min-w-0 flex-1 truncate text-sm",
                              active
                                ? "font-medium text-white"
                                : "text-foreground/90"
                            )}
                          >
                            {question.title}
                          </span>
                          <DifficultyBadge difficulty={question.difficulty} />
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </nav>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  )
}
