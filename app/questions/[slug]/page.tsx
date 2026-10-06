import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { DifficultyBadge } from "@/components/difficulty-badge"
import { QuestionGate } from "@/components/question-gate"
import { QuestionNav } from "@/components/question-nav"
import { QuestionWorkspace } from "@/components/question-workspace"
import { Badge } from "@/components/ui/badge"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  courseLabel,
  getCourses,
  getQuestion,
  getQuestionPlacements,
  getQuestionSlugs,
} from "@/lib/content"
import { Mdx } from "@/lib/mdx"

export function generateStaticParams() {
  return getQuestionSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const question = getQuestion(slug)
  return { title: question?.meta.title ?? "Question" }
}

export default async function QuestionPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const question = getQuestion(slug)
  if (!question) notFound()

  const { meta, tests } = question

  // The drawer lists the course this question belongs to (or the current
  // semester, for questions outside every course).
  const courses = getCourses()
  const placement = getQuestionPlacements().get(slug)
  const course =
    courses.find((c) => c.id === placement?.courseId) ?? courses[0] ?? null
  const sections = (course?.units ?? []).map((unit) => ({
    id: unit.id,
    title: unit.title,
    questions: unit.questions.map(({ slug, title, difficulty }) => ({
      slug,
      title,
      difficulty,
    })),
  }))

  return (
    <div className="flex h-[calc(100svh-5.5rem)] flex-col">
      <QuestionGate />
      <div className="flex items-center gap-3 px-4 py-2.5">
        <QuestionNav
          courseLabel={course ? courseLabel(course) : "Questions"}
          sections={sections}
        />
        <h1 className="text-base font-semibold tracking-tight">{meta.title}</h1>
        <DifficultyBadge difficulty={meta.difficulty} />
        <div className="ml-auto hidden gap-1.5 sm:flex">
          {meta.tags.map((tag) => (
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

      <ResizablePanelGroup
        orientation="horizontal"
        className="min-h-0 flex-1 px-3 pb-3"
      >
        <ResizablePanel
          defaultSize="45"
          minSize="25"
          className="overflow-hidden rounded-xl border bg-card shadow-xs dark:shadow-none"
        >
          <Tabs
            defaultValue="description"
            className="flex h-full flex-col gap-0"
          >
            <TabsList className="m-2 grid w-auto grid-cols-2 self-stretch">
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="solution">Solution</TabsTrigger>
            </TabsList>
            <TabsContent
              value="description"
              className="min-h-0 flex-1 overflow-y-auto px-5 pb-8"
            >
              <article className="prose prose-sm max-w-none dark:prose-invert">
                <Mdx source={question.description} />
              </article>
            </TabsContent>
            <TabsContent
              value="solution"
              className="min-h-0 flex-1 overflow-y-auto px-5 pb-8"
            >
              <article className="prose prose-sm max-w-none dark:prose-invert">
                <Mdx source={question.solution} />
              </article>
            </TabsContent>
          </Tabs>
        </ResizablePanel>

        <ResizableHandle className="w-3 bg-transparent" />

        <ResizablePanel defaultSize="55" minSize="30">
          <QuestionWorkspace
            slug={slug}
            starters={question.starters}
            tests={tests}
            harness={question.harness}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
