import Link from "next/link"

import { IconArrowRight } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { getAllQuestions, getQuestionsByWeek } from "@/lib/content"

export default function HomePage() {
  const questions = getAllQuestions()
  const weeks = getQuestionsByWeek()

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Sharpen your algorithms,{" "}
        <span className="text-primary">one week at a time</span>
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground">
        A curated set of coding questions organized by week, with an in-browser
        editor and instant test feedback. No setup — just open a question and
        start solving.
      </p>
      <p className="text-sm text-muted-foreground">
        {questions.length} questions across {weeks.size} weeks — and counting.
      </p>
      <Button size="lg" render={<Link href="/questions" />}>
        Browse questions
        <IconArrowRight data-icon="inline-end" />
      </Button>
    </div>
  )
}
