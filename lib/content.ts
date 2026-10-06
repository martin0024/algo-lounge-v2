import fs from "node:fs"
import path from "node:path"

import matter from "gray-matter"
import { z } from "zod"

import { compareModes } from "@/lib/judge/shared/compare"
import { difficulties, languageLabels, languages } from "@/lib/languages"
import type { Difficulty, Language } from "@/lib/languages"

const QUESTIONS_DIR = path.join(process.cwd(), "content", "questions")

// Re-exported so existing imports keep working; the definitions live in
// `lib/languages.ts` so client code can reach them without `node:fs`.
export { difficulties, languageLabels, languages }
export type { Difficulty, Language }

export const difficultySchema = z.enum(difficulties)

// Where a question sits (semester, week) lives in content/courses — one
// question can be part of several semesters.
const questionMetaSchema = z.object({
  title: z.string(),
  difficulty: difficultySchema,
  tags: z.array(z.string()).default([]),
})

export type QuestionMeta = z.infer<typeof questionMetaSchema> & {
  slug: string
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
  compare: z.enum(compareModes).default("ordered"),
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
    .sort((a, b) => a.title.localeCompare(b.title))
}

// ─── Courses (semesters, tracks, competitions) ──────────────────────────────

const COURSES_DIR = path.join(process.cwd(), "content", "courses")

const seasons = ["winter", "spring", "summer", "fall"] as const

const courseSchema = z.object({
  title: z.string(),
  description: z.string().default(""),
  kind: z.enum(["semester", "track", "competition"]),
  term: z
    .object({ season: z.enum(seasons), year: z.number().int() })
    .optional(),
  units: z
    .array(
      z.object({
        title: z.string(),
        description: z.string().optional(),
        questions: z.array(z.string()).min(1),
      })
    )
    .min(1),
})

/** Units in display order — for semesters that is newest week first. */
export type CourseUnit = {
  /** URL fragment for the unit, from its title ("Week 3" → "week-3"). */
  id: string
  title: string
  description?: string
  questions: QuestionMeta[]
}

export type Course = {
  id: string
  title: string
  description: string
  kind: "semester" | "track" | "competition"
  term?: { season: (typeof seasons)[number]; year: number }
  units: CourseUnit[]
}

const unitSlug = (title: string) =>
  title
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

function uniqueId(base: string, taken: Set<string>): string {
  let id = base
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`
  taken.add(id)
  return id
}

const kindOrder = { semester: 0, track: 1, competition: 2 } as const
const termKey = (c: Course) =>
  c.term ? c.term.year * 10 + seasons.indexOf(c.term.season) : 0

/** All courses: semesters newest first, then tracks, then competitions. */
export function getCourses(): Course[] {
  if (!fs.existsSync(COURSES_DIR)) return []
  const bySlug = new Map(getAllQuestions().map((q) => [q.slug, q]))
  return fs
    .readdirSync(COURSES_DIR)
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      const id = file.replace(/\.json$/, "")
      const parsed = courseSchema.safeParse(
        JSON.parse(fs.readFileSync(path.join(COURSES_DIR, file), "utf8"))
      )
      if (!parsed.success) {
        throw new Error(
          `Invalid course content/courses/${file}: ${parsed.error.message}`
        )
      }
      const ids = new Set<string>()
      const units = parsed.data.units.map((unit, i) => ({
        id: uniqueId(unitSlug(unit.title) || `unit-${i + 1}`, ids),
        title: unit.title,
        description: unit.description,
        questions: unit.questions.map((slug) => {
          const meta = bySlug.get(slug)
          if (!meta) {
            throw new Error(
              `content/courses/${file} (${unit.title}) lists "${slug}", which is not in content/questions.`
            )
          }
          return meta
        }),
      }))
      // Course files list weeks in order (Week 1 first); semesters are shown
      // newest week first so the current one is on top. Tracks and
      // competitions keep their teaching order.
      if (parsed.data.kind === "semester") units.reverse()
      return { id, ...parsed.data, units }
    })
    .sort(
      (a, b) =>
        kindOrder[a.kind] - kindOrder[b.kind] ||
        termKey(b) - termKey(a) ||
        a.title.localeCompare(b.title)
    )
}

export function getCourse(id: string): Course | null {
  return getCourses().find((course) => course.id === id) ?? null
}

/** The course the site leads with: the newest semester. */
export function getCurrentCourse(): Course | null {
  return getCourses()[0] ?? null
}

/** "Fall 2026" for semesters, the title otherwise. */
export function courseLabel(course: Pick<Course, "title" | "term">): string {
  if (!course.term) return course.title
  const season = course.term.season
  return `${season[0].toUpperCase()}${season.slice(1)} ${course.term.year}`
}

export type QuestionPlacement = {
  courseId: string
  courseLabel: string
  isCurrent: boolean
  unitId: string
  unitTitle: string
}

/**
 * Where a question is "from": its week in the current semester if it is part
 * of it, otherwise its first appearance in the newest course that lists it.
 * Questions in no course have no placement.
 */
export function getQuestionPlacements(): Map<string, QuestionPlacement> {
  const placements = new Map<string, QuestionPlacement>()
  const courses = getCourses()
  const current = courses[0]
  for (const course of courses) {
    for (const unit of course.units) {
      for (const question of unit.questions) {
        if (placements.has(question.slug)) continue
        placements.set(question.slug, {
          courseId: course.id,
          courseLabel: courseLabel(course),
          isCurrent: course === current,
          unitId: unit.id,
          unitTitle: unit.title,
        })
      }
    }
  }
  return placements
}

/** Every unit (week / stage) of every course, as lists of slugs — the
 * groups the "clear a week" achievement is judged on. */
export function getUnitSlugGroups(): string[][] {
  const seen = new Set<string>()
  const groups: string[][] = []
  for (const course of getCourses()) {
    for (const unit of course.units) {
      const slugs = unit.questions.map((q) => q.slug)
      const key = [...slugs].sort().join(",")
      if (seen.has(key)) continue
      seen.add(key)
      groups.push(slugs)
    }
  }
  return groups
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
