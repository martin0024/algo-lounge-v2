import fs from "node:fs"
import path from "node:path"

import matter from "gray-matter"
import { z } from "zod"

const QUESTIONS_DIR = path.join(process.cwd(), "content", "questions")

export const difficultySchema = z.enum(["easy", "medium", "hard"])
export type Difficulty = z.infer<typeof difficultySchema>

const questionMetaSchema = z.object({
  title: z.string(),
  week: z.number().int().positive(),
  difficulty: difficultySchema,
  tags: z.array(z.string()).default([]),
  order: z.number().int().default(0),
})

export type QuestionMeta = z.infer<typeof questionMetaSchema> & {
  slug: string
}

export const languages = ["typescript", "python", "c", "cpp", "java"] as const
export type Language = (typeof languages)[number]

export const languageLabels: Record<Language, string> = {
  typescript: "TypeScript",
  python: "Python",
  c: "C",
  cpp: "C++",
  java: "Java",
}

const testCaseSchema = z.object({
  input: z.array(z.unknown()),
  expected: z.unknown(),
})

const testSuiteSchema = z.object({
  functionName: z.string(),
  args: z.array(z.string()).optional(),
  harness: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  compare: z.enum(["ordered", "unordered"]).default("ordered"),
  cases: z.array(testCaseSchema).min(1),
})

export type TestSuite = z.infer<typeof testSuiteSchema>
export type TestCase = z.infer<typeof testCaseSchema>

export type Harness = Partial<Record<Language, string>>

export type Question = {
  meta: QuestionMeta
  description: string
  solution: string
  starters: Record<Language, string>
  tests: TestSuite
  harness: Harness
}

function readStarter(dir: string, file: string, label: string): string {
  const p = path.join(dir, file)
  if (fs.existsSync(p)) return fs.readFileSync(p, "utf8")
  return `// ${label} starter is not available for this question yet.\n`
}

export function getQuestionSlugs(): string[] {
  return fs
    .readdirSync(QUESTIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
}

function readQuestionMeta(slug: string): QuestionMeta {
  const raw = fs.readFileSync(
    path.join(QUESTIONS_DIR, slug, "question.mdx"),
    "utf8"
  )
  const { data } = matter(raw)
  const parsed = questionMetaSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(
      `Invalid frontmatter in content/questions/${slug}/question.mdx: ${parsed.error.message}`
    )
  }
  return { ...parsed.data, slug }
}

export function getAllQuestions(): QuestionMeta[] {
  return getQuestionSlugs()
    .map(readQuestionMeta)
    .sort(
      (a, b) =>
        a.week - b.week || a.order - b.order || a.slug.localeCompare(b.slug)
    )
}

export function getQuestionsByWeek(): Map<number, QuestionMeta[]> {
  const byWeek = new Map<number, QuestionMeta[]>()
  for (const question of getAllQuestions()) {
    const group = byWeek.get(question.week) ?? []
    group.push(question)
    byWeek.set(question.week, group)
  }
  return byWeek
}

export function getQuestion(slug: string): Question | null {
  const dir = path.join(QUESTIONS_DIR, slug)
  if (!fs.existsSync(path.join(dir, "question.mdx"))) return null

  const meta = readQuestionMeta(slug)
  const { content: description } = matter(
    fs.readFileSync(path.join(dir, "question.mdx"), "utf8")
  )
  const { content: solution } = matter(
    fs.readFileSync(path.join(dir, "solution.mdx"), "utf8")
  )

  const tests = testSuiteSchema.parse(
    JSON.parse(fs.readFileSync(path.join(dir, "tests.json"), "utf8"))
  )

  const harness: Harness = {}
  const sharedDir = path.join(process.cwd(), "content", "harnesses")
  const candidates: [keyof Harness, string, string | null][] = [
    [
      "typescript",
      path.join(dir, "harness.ts"),
      tests.harness ? path.join(sharedDir, `${tests.harness}.ts`) : null,
    ],
    [
      "python",
      path.join(dir, "harness.py"),
      tests.harness ? path.join(sharedDir, `${tests.harness}.py`) : null,
    ],
    [
      "c",
      path.join(dir, "harness.c"),
      tests.harness ? path.join(sharedDir, `${tests.harness}.c`) : null,
    ],
    [
      "cpp",
      path.join(dir, "harness.cpp"),
      tests.harness ? path.join(sharedDir, `${tests.harness}.cpp`) : null,
    ],
    [
      "java",
      path.join(dir, "Main.java"),
      tests.harness ? path.join(sharedDir, `${tests.harness}.java`) : null,
    ],
  ]
  for (const [language, local, shared] of candidates) {
    if (fs.existsSync(local)) {
      harness[language] = fs.readFileSync(local, "utf8")
    } else if (shared) {
      if (!fs.existsSync(shared)) {
        if (language === "typescript" || language === "python") {
          throw new Error(
            `Question "${slug}" references shared harness "${tests.harness}" but ${shared} does not exist.`
          )
        }
        continue
      }
      harness[language] = fs.readFileSync(shared, "utf8")
    }
  }

  return {
    meta,
    description,
    solution,
    starters: {
      typescript: fs.readFileSync(path.join(dir, "starter.ts"), "utf8"),
      python: fs.readFileSync(path.join(dir, "starter.py"), "utf8"),
      c: readStarter(dir, "starter.c", "C"),
      cpp: readStarter(dir, "starter.cpp", "C++"),
      java: readStarter(dir, "starter.java", "Java"),
    },
    tests,
    harness,
  }
}
