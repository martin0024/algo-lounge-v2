/**
 * Content test suite — every question in content/questions:
 *
 *   1. loads through lib/content (frontmatter + tests.json schemas, harness)
 *   2. question.mdx and solution.mdx compile with the site's MDX pipeline
 *   3. every TypeScript / Python code block in solution.mdx that defines the
 *      entry point is submitted to the real server judge and must be accepted
 *   4. both starters load in the judge without a fatal error
 *
 *   npm run content:test [-- slug …] [--jobs 6]
 */
import path from "node:path"

import { compile } from "@mdx-js/mdx"
import matter from "gray-matter"
import rehypePrettyCode from "rehype-pretty-code"
import remarkGfm from "remark-gfm"

import {
  getQuestion,
  getQuestionSlugs,
  type Language,
  type Question,
} from "../lib/content"
import { toSnakeCase } from "../lib/judge/shared/compare"
import { verifySubmission } from "../lib/judge/server/verify"

const argv = process.argv.slice(2)
const jobsAt = argv.indexOf("--jobs")
const jobs = jobsAt >= 0 ? Number(argv[jobsAt + 1]) : 6
const only = argv.filter(
  (a, i) => !a.startsWith("--") && argv[i - 1] !== "--jobs"
)

const FENCE_LANGUAGE: Record<string, Language> = {
  ts: "typescript",
  typescript: "typescript",
  py: "python",
  python: "python",
}

function codeBlocks(mdx: string): { language: Language; code: string }[] {
  const blocks: { language: Language; code: string }[] = []
  for (const m of mdx.matchAll(/^```(\w+)[^\n]*\n([\s\S]*?)^```/gm)) {
    const language = FENCE_LANGUAGE[m[1]]
    if (language) blocks.push({ language, code: m[2] })
  }
  return blocks
}

/** A block is a full solution when it defines the entry point. */
function definesEntry(language: Language, code: string, functionName: string) {
  const name = language === "python" ? toSnakeCase(functionName) : functionName
  const pattern =
    language === "python"
      ? `^(def|class)\\s+${name}\\b`
      : `^export\\s+(function|class)\\s+${name}\\b`
  return new RegExp(pattern, "m").test(code)
}

/**
 * Solutions may lean on classes the starter defines (ListNode, GraphNode…),
 * exactly as they would in the editor. Prepend the starter's class prelude
 * (everything before its first function) when a block uses those classes
 * without defining them.
 */
function withStarterClasses(language: Language, code: string, starter: string) {
  const firstFunction =
    language === "python" ? /^(async\s+)?def\s/m : /^export\s+function\s/m
  const classPattern =
    language === "python" ? /^class\s+(\w+)/gm : /^export\s+class\s+(\w+)/gm
  const at = starter.search(firstFunction)
  const prelude = at < 0 ? "" : starter.slice(0, at).trim()
  const names = [...prelude.matchAll(classPattern)].map((m) => m[1])
  const defines = [...code.matchAll(classPattern)].some((m) =>
    names.includes(m[1])
  )
  const uses = names.some((n) => new RegExp(`\\b${n}\\b`).test(code))
  return names.length > 0 && !defines && uses ? `${prelude}\n\n\n${code}` : code
}

async function compileMdx(source: string) {
  await compile(matter(source).content, {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      [
        rehypePrettyCode,
        {
          themes: {
            light: "github-light-default",
            dark: "github-dark-default",
          },
          keepBackground: false,
        },
      ],
    ],
  })
}

type Result = { slug: string; problems: string[]; solutions: number }

async function testQuestion(slug: string): Promise<Result> {
  const problems: string[] = []
  let question: Question | null
  try {
    question = getQuestion(slug)
  } catch (error) {
    return {
      slug,
      problems: [`load: ${(error as Error).message}`],
      solutions: 0,
    }
  }
  if (!question) return { slug, problems: ["load: not found"], solutions: 0 }

  const dir = path.join(process.cwd(), "content", "questions", slug)
  for (const file of ["question.mdx", "solution.mdx"]) {
    try {
      const { readFileSync } = await import("node:fs")
      await compileMdx(readFileSync(path.join(dir, file), "utf8"))
    } catch (error) {
      problems.push(`${file}: ${(error as Error).message.split("\n")[0]}`)
    }
  }

  const { tests, harness, starters, solution } = question
  const solutions = codeBlocks(solution).filter((b) =>
    definesEntry(b.language, b.code, tests.functionName)
  )
  if (!solutions.some((b) => b.language === "python")) {
    problems.push("solution.mdx has no runnable Python solution")
  }

  for (const block of solutions) {
    const verdict = await verifySubmission({
      language: block.language,
      code: withStarterClasses(
        block.language,
        block.code,
        starters[block.language]
      ),
      tests,
      harness: harness[block.language],
    })
    if (verdict.status !== "accepted") {
      const firstBad = verdict.cases.find((c) => c.status !== "pass")
      problems.push(
        `${block.language} solution: ${verdict.status} ` +
          `(${verdict.passedCount}/${verdict.totalCount})` +
          (verdict.message ? ` — ${verdict.message}` : "") +
          (firstBad
            ? ` — case ${firstBad.index + 1}: ${
                firstBad.error ??
                `got ${JSON.stringify(firstBad.got)}, expected ${JSON.stringify(
                  tests.cases[firstBad.index].expected
                )}`
              }`.slice(0, 300)
            : "")
      )
    }
  }

  for (const language of ["typescript", "python"] as const) {
    const verdict = await verifySubmission({
      language,
      code: starters[language],
      tests,
      harness: harness[language],
    })
    // A starter is expected to fail the tests, but it must load and run.
    if (verdict.cases.length === 0) {
      problems.push(`${language} starter does not load: ${verdict.message}`)
    }
  }

  return { slug, problems, solutions: solutions.length }
}

async function main() {
  const slugs = (only.length > 0 ? only : getQuestionSlugs()).sort()
  const results: Result[] = []
  let next = 0
  const started = Date.now()
  await Promise.all(
    Array.from({ length: Math.min(jobs, slugs.length) }, async () => {
      while (next < slugs.length) {
        const slug = slugs[next++]
        const result = await testQuestion(slug)
        results.push(result)
        const mark = result.problems.length === 0 ? "✓" : "✗"
        console.log(
          `${mark} ${slug} (${result.solutions} solution${result.solutions === 1 ? "" : "s"})`
        )
        for (const p of result.problems) console.log(`    ${p}`)
      }
    })
  )

  const failed = results.filter((r) => r.problems.length > 0)
  const blocks = results.reduce((n, r) => n + r.solutions, 0)
  console.log(
    `\n${results.length - failed.length}/${results.length} questions pass ` +
      `(${blocks} solutions judged) in ${Math.round((Date.now() - started) / 1000)}s`
  )
  if (failed.length > 0) {
    console.log(`Failing: ${failed.map((r) => r.slug).join(", ")}`)
    process.exit(1)
  }
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
