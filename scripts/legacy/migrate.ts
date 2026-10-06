/**
 * Migrates questions and courses from the legacy AlgoLounge repo
 * (github.com/achneerov/algolounge — Angular + Python-only JSON questions)
 * into v2's content/ tree.
 *
 *   npm run legacy:migrate -- <path-to-legacy-repo> [--only a,b] [--dry] [--verbose]
 *
 * Every question is tested while it is migrated (see evaluate.py): each legacy
 * test must pass the reference solution under the legacy prepare/verify, and
 * the v2 `expected` values are the reference solution's answers as the v2
 * judge sees them. A question with any failing case is not written.
 *
 * Re-runnable: questions it generated (frontmatter `migratedFrom`) are
 * regenerated; questions authored directly in v2 are never touched.
 */
import fs from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"

import matter from "gray-matter"

import { resultsMatch } from "../../lib/judge/shared/compare"

import { htmlToMdx } from "./html-to-mdx"
import { overrides, type Override } from "./overrides"
import {
  asNode,
  designStarters,
  functionStarters,
  inferType,
  PY_NODE,
  TS_NODE,
  merge,
  toCamel,
  toSnake,
  type DesignMethod,
  type Ty,
} from "./starters"

const ROOT = process.cwd()
const QUESTIONS_DIR = path.join(ROOT, "content", "questions")
const COURSES_DIR = path.join(ROOT, "content", "courses")
const HARNESS_DIR = path.join(ROOT, "content", "harnesses")
const LEGACY_DIR = path.join(ROOT, "scripts", "legacy")
const FILES_DIR = path.join(LEGACY_DIR, "files")

// ─── CLI ────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2)
const flag = (name: string) => argv.includes(name)
const option = (name: string) => {
  const i = argv.indexOf(name)
  return i >= 0 ? argv[i + 1] : undefined
}
const repo = argv.find(
  (a, i) => !a.startsWith("--") && argv[i - 1] !== "--only"
)
if (!repo) {
  console.error(
    "usage: npm run legacy:migrate -- <legacy-repo> [--only a,b] [--dry] [--verbose]"
  )
  process.exit(1)
}
const only = option("--only")?.split(",")
const dry = flag("--dry")
const verbose = flag("--verbose")

// ─── Legacy data ────────────────────────────────────────────────────────────

type LegacyCase = {
  id: number
  input: Record<string, unknown>
  output: unknown
}
type LegacyQuestion = {
  filename: string
  title: string
  difficulty: "Easy" | "Medium" | "Hard"
  tags: string[]
  description: string
  entry_function: string
  template: string
  solution_text: string
  solution_code: string
  prepare: string
  verify: string
  test_cases: LegacyCase[]
}
type LegacyCourse = {
  filename: string
  course_name: string
  course_description: string
  badge: string
  units: Record<
    string,
    {
      title: string
      description?: string
      questions: { filename: string; urls?: { url: string }[] }[]
    }
  >
}

const legacyQuestionsDir = path.join(repo, "public", "questions")
const legacyCoursesDir = path.join(repo, "public", "courses")

function loadLegacyQuestions(): LegacyQuestion[] {
  return (
    fs
      .readdirSync(legacyQuestionsDir)
      .filter((f) => f.endsWith(".json") && f !== "index.json")
      // Finder-style duplicates ("move-zeroes 2.json") are stray copies.
      .filter((f) => !/ \d+\.json$/.test(f))
      .map((f) =>
        JSON.parse(fs.readFileSync(path.join(legacyQuestionsDir, f), "utf8"))
      )
  )
}

function loadLegacyCourses(): LegacyCourse[] {
  return fs
    .readdirSync(legacyCoursesDir)
    .filter((f) => f.endsWith(".json") && f !== "index.json")
    .map((f) =>
      JSON.parse(fs.readFileSync(path.join(legacyCoursesDir, f), "utf8"))
    )
}

// ─── Python (Pyodide — the same runtime the v2 judge uses) ──────────────────

type OldResult = { pass: boolean; shown?: string; error?: string }
type NewResult = { input?: unknown[]; got?: unknown; error?: string }

async function loadPython() {
  const require = createRequire(import.meta.url)
  const { loadPyodide } = await import("pyodide")
  const pyodide = await loadPyodide({
    indexURL: path.dirname(require.resolve("pyodide")),
  })
  pyodide.setStdout({ batched: () => {} })
  pyodide.setStderr({ batched: () => {} })
  pyodide.runPython(
    fs.readFileSync(path.join(LEGACY_DIR, "evaluate.py"), "utf8")
  )
  const evaluate = pyodide.globals.get("evaluate")
  const rename = pyodide.globals.get("rename_identifier")
  const strip = pyodide.globals.get("strip_function")
  return {
    evaluate: (spec: object): { old: OldResult[]; new: NewResult[] } =>
      JSON.parse(evaluate(JSON.stringify(spec))),
    rename: (source: string, from: string, to: string): string =>
      rename(source, from, to),
    stripFunction: (source: string, name: string): string =>
      strip(source, name),
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const readIf = (file: string) =>
  fs.existsSync(file) ? fs.readFileSync(file, "utf8") : undefined

/** Keys the legacy prepare() reads, in the order it passes them. */
function prepareKeys(prepare: string): string[] {
  const keys: string[] = []
  for (const m of prepare.matchAll(
    /test_case_input(?:\[['"](\w+)['"]\]|\.get\(['"](\w+)['"])/g
  )) {
    const key = m[1] ?? m[2]
    if (!keys.includes(key)) keys.push(key)
  }
  return keys
}

/** Parameter names from `def entry(a, b=1, *, c: int)` in the template. */
function templateParams(template: string, entry: string): string[] | null {
  const m = new RegExp(`def\\s+${entry}\\s*\\(([^)]*)\\)`).exec(template)
  if (!m) return null
  return m[1]
    .split(",")
    .map((p) => p.split(/[:=]/)[0].trim())
    .filter((p) => p && p !== "self" && !p.startsWith("*"))
}

/** Method signatures (`def name(self, a, b)`) of `className` in a template. */
function templateMethods(
  template: string,
  className: string
): Map<string, string[]> {
  const methods = new Map<string, string[]>()
  const start = template.search(new RegExp(`^class\\s+${className}\\b`, "m"))
  if (start < 0) return methods
  const rest = template.slice(start)
  const headerEnd = rest.indexOf("\n") + 1
  // The class body ends at the next line that isn't indented.
  const end = headerEnd > 0 ? rest.slice(headerEnd).search(/^\S/m) : -1
  const body = end < 0 ? rest : rest.slice(0, headerEnd + end)
  for (const m of body.matchAll(/def\s+(\w+)\s*\(\s*self\s*(?:,([^)]*))?\)/g)) {
    methods.set(
      m[1],
      (m[2] ?? "")
        .split(",")
        .map((p) => p.split(/[:=]/)[0].trim())
        .filter(Boolean)
    )
  }
  return methods
}

/** Everything in a starter before its first top-level function: the class
 * definitions (ListNode, TreeNode, given classes) the solution builds on. */
function preludeOf(starter: string, firstFunction: RegExp): string {
  const at = starter.search(firstFunction)
  return (at < 0 ? "" : starter.slice(0, at)).trim()
}

/** Prepend `prelude` when the code uses its classes without defining them. */
function withPrelude(
  code: string,
  prelude: string,
  classPattern: RegExp
): string {
  const names = [...prelude.matchAll(classPattern)].map((m) => m[1])
  if (names.length === 0) return code
  const defines = [...code.matchAll(classPattern)].some((m) =>
    names.includes(m[1])
  )
  const uses = names.some((n) => new RegExp(`\\b${n}\\b`).test(code))
  return !defines && uses ? `${prelude}\n\n\n${code.trim()}\n` : code
}

const kebab = (tag: string) =>
  tag
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

const isGenerated = (slug: string) => {
  const file = path.join(QUESTIONS_DIR, slug, "question.mdx")
  if (!fs.existsSync(file)) return true
  return "migratedFrom" in matter(fs.readFileSync(file, "utf8")).data
}

/** Legacy booleans were sometimes the strings "true"/"false". */
const normalizeLegacy = (value: unknown): unknown =>
  value === "true" ? true : value === "false" ? false : value

/** Loose equality for the review diff: legacy data used "true"/"false"
 * strings and 0/1 for booleans, and float answers are compared with tolerance. */
function looseEqual(a: unknown, b: unknown): boolean {
  const norm = (v: unknown): unknown => {
    if (v === "true") return true
    if (v === "false") return false
    if (typeof v === "boolean") return v
    return v
  }
  a = norm(a)
  b = norm(b)
  if (typeof a === "boolean" && typeof b === "number") return Number(a) === b
  if (typeof b === "boolean" && typeof a === "number") return Number(b) === a
  if (typeof a === "number" && typeof b === "number")
    return Math.abs(a - b) < 1e-6
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => looseEqual(x, b[i]))
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a)
    return (
      ka.length === Object.keys(b).length &&
      ka.every((k) => looseEqual((a as never)[k], (b as never)[k]))
    )
  }
  return a === b
}

function stringifyTests(tests: object): string {
  // One field / one case per line, like the hand-written tests.json files.
  const { cases, ...head } = tests as { cases: unknown[] }
  const fields = Object.entries(head).map(
    ([key, value]) =>
      `  ${JSON.stringify(key)}: ${JSON.stringify(value).replace(/","/g, '", "')}`
  )
  const caseLines = cases.map((c) => "    " + JSON.stringify(c)).join(",\n")
  return `{\n${fields.join(",\n")},\n  "cases": [\n${caseLines}\n  ]\n}\n`
}

// ─── Per-question migration ─────────────────────────────────────────────────

type Outcome =
  | {
      slug: string
      status: "written" | "dry"
      rewritten: number
      total: number
      notes: string[]
    }
  | { slug: string; status: "kept"; reason: string }
  | { slug: string; status: "skipped"; reason: string }
  | { slug: string; status: "failed"; reason: string; details: string[] }

async function migrateQuestion(
  q: LegacyQuestion,
  py: Awaited<ReturnType<typeof loadPython>>
): Promise<Outcome> {
  const slug = q.filename
  const o: Override = overrides[slug] ?? {}
  if (o.skip) return { slug, status: "skipped", reason: o.skip }
  if (!isGenerated(slug)) {
    return { slug, status: "kept", reason: "authored directly in v2" }
  }

  const files = path.join(FILES_DIR, slug)
  const design = o.design
  const functionName =
    o.functionName ?? design?.className ?? toCamel(q.entry_function)
  const pyName = toSnake(functionName)

  // Reference solution: the legacy one, or a hand-written replacement.
  const handPy = readIf(path.join(files, "solution.py"))
  const legacyPy = q.solution_code.trim() ? q.solution_code : undefined
  if (!handPy && !legacyPy) {
    return {
      slug,
      status: "failed",
      reason:
        "no reference solution (add scripts/legacy/files/<slug>/solution.py)",
      details: [],
    }
  }
  const harnessName = o.harness ?? (design ? "design" : undefined)
  const nodeName =
    o.node ??
    (harnessName === "binary-tree"
      ? "TreeNode"
      : harnessName === "linked-list"
        ? "ListNode"
        : null)
  // The legacy runtime defined TreeNode/ListNode next to the user's code; in
  // v2 the starter does. Reference solutions get the starter's classes so
  // every published solution runs as-is.
  const handStarterPy = readIf(path.join(files, "starter.py"))
  const handStarterTs = readIf(path.join(files, "starter.ts"))
  const pyPrelude = handStarterPy
    ? preludeOf(handStarterPy, /^(async\s+)?def\s/m)
    : nodeName
      ? PY_NODE[nodeName]
      : ""
  const tsPrelude = handStarterTs
    ? preludeOf(handStarterTs, /^export\s+function\s/m)
    : nodeName
      ? TS_NODE[nodeName]
      : ""
  const newSolution = withPrelude(
    (o.prelude ? o.prelude.trim() + "\n\n" : "") +
      (handPy ??
        (/^[A-Z]/.test(pyName)
          ? // Class answer: drop the legacy test driver, keep the classes.
            py.stripFunction(legacyPy!, q.entry_function)
          : py.rename(legacyPy!, q.entry_function, pyName))),
    pyPrelude,
    /^class\s+(\w+)/gm
  )
  // The legacy check needs the legacy entry name to exist.
  const oldSolution =
    legacyPy && !o.oldSolutionFromFiles
      ? legacyPy
      : newSolution +
        (pyName !== q.entry_function && !design
          ? `\n\n${q.entry_function} = ${pyName}\n`
          : "")

  const localHarnessPy = readIf(path.join(files, "harness.py"))
  const harnessPy =
    localHarnessPy ??
    (harnessName
      ? readIf(path.join(HARNESS_DIR, `${harnessName}.py`))
      : undefined)

  const argKeys = o.argKeys ?? prepareKeys(q.prepare)
  const result = py.evaluate({
    cases: q.test_cases,
    oldEntry: o.oldEntry ?? q.entry_function,
    oldSolution,
    prepare: q.prepare,
    verify: q.verify,
    newSolution,
    pyName,
    harness: harnessPy ?? "",
    convert: o.convert ?? (design ? DESIGN_CONVERT[design.from] : ""),
    argKeys,
  })

  const dropped = new Set(o.dropCases ?? [])
  const wrongLegacy = new Set(o.legacyExpectedWrong ?? [])
  const problems: string[] = []
  result.old.forEach((r, i) => {
    if (dropped.has(i) || o.checkAgainstLegacyExpected) return
    if (!r.pass && !wrongLegacy.has(i)) {
      problems.push(
        `case ${i + 1} fails the legacy check: ${r.error ?? r.shown}`
      )
    }
    if (r.pass && wrongLegacy.has(i)) {
      problems.push(
        `case ${i + 1} is marked legacyExpectedWrong but passes the legacy check`
      )
    }
  })
  result.new.forEach((r, i) => {
    if (dropped.has(i)) return
    if (r.error) {
      problems.push(`case ${i + 1} fails under v2: ${r.error}`)
    } else if (
      o.checkAgainstLegacyExpected &&
      !looseEqual(r.got, q.test_cases[i].output)
    ) {
      problems.push(
        `case ${i + 1}: got ${JSON.stringify(r.got)}, legacy expected ${JSON.stringify(q.test_cases[i].output)}`
      )
    }
  })
  if (problems.length > 0) {
    return {
      slug,
      status: "failed",
      reason: "tests did not pass",
      details: problems,
    }
  }

  const keep = result.new
    .map((r, i) => ({ r, i }))
    .filter(({ i }) => !dropped.has(i))
  const cases = keep.map(({ r, i }) => {
    // Answers valid in any order: keep the legacy ordering when it is an
    // equivalent answer — it was written for humans to read.
    const legacy = normalizeLegacy(q.test_cases[i].output)
    const expected =
      o.compare &&
      o.compare !== "ordered" &&
      !wrongLegacy.has(i) &&
      resultsMatch(legacy, r.got, o.compare)
        ? legacy
        : r.got
    return { input: r.input!, expected }
  })

  const notes: string[] = []
  let rewritten = 0
  for (const i of wrongLegacy) {
    notes.push(
      `case ${i + 1}: legacy expected ${JSON.stringify(q.test_cases[i].output)} was wrong → ${JSON.stringify(result.new[i].got)}`
    )
  }
  keep.forEach(({ r, i }) => {
    if (wrongLegacy.has(i)) return
    if (!looseEqual(r.got, q.test_cases[i].output)) {
      rewritten++
      if (verbose) {
        notes.push(
          `case ${i + 1}: legacy ${JSON.stringify(q.test_cases[i].output)} → ${JSON.stringify(r.got)}`
        )
      }
    }
  })

  // ── starters ──
  let starterTs = handStarterTs
  let starterPy = handStarterPy
  const argNames =
    o.args ??
    (design
      ? ["operations", "arguments"]
      : (() => {
          const fromTemplate = templateParams(q.template, q.entry_function)
          return fromTemplate && fromTemplate.length === cases[0].input.length
            ? fromTemplate.map(toCamel)
            : argKeys.map(toCamel)
        })())

  if (!starterTs || !starterPy) {
    let generated: { ts: string; py: string }
    if (design) {
      generated = generateDesignStarters(q, design.className, cases)
    } else {
      const params = argNames.map((name, index) => {
        let ty = inferType(cases.map((c) => c.input[index]))
        if (nodeName) ty = asNode(ty, nodeName)
        return { name, ty }
      })
      let returns = inferType(cases.map((c) => c.expected))
      if (nodeName && o.returnsNode) returns = asNode(returns, nodeName)
      if (o.returnType) returns = o.returnType
      if (o.paramTypes) {
        o.paramTypes.forEach((ty, i) => ty && (params[i].ty = ty))
      }
      generated = functionStarters({ name: functionName, params, returns })
    }
    starterTs ??= generated.ts
    starterPy ??= generated.py
  }

  // ── tests.json ──
  const tests: Record<string, unknown> = { functionName, args: argNames }
  if (!localHarnessPy && harnessName) tests.harness = harnessName
  if (o.compare) tests.compare = o.compare
  tests.cases = cases

  // ── MDX ──
  const description = await htmlToMdx(q.description, { dropFirstTitle: true })
  const formatNote = o.note ?? testFormatNote(harnessName, !!o.returnsNode)
  const question = matter.stringify(
    description +
      (formatNote ? `\n> **How the tests work:** ${formatNote}\n` : ""),
    {
      title: q.title,
      difficulty: q.difficulty.toLowerCase(),
      tags: [...new Set(q.tags.map(kebab))],
      migratedFrom: `algolounge:${slug}`,
    }
  )

  const handTsRaw = readIf(path.join(files, "solution.ts"))
  const handTs =
    handTsRaw && withPrelude(handTsRaw, tsPrelude, /^export\s+class\s+(\w+)/gm)
  const writeup = q.solution_text.trim()
    ? await htmlToMdx(q.solution_text)
    : "## Reference solution\n"
  const code =
    (handTs ? "```typescript\n" + handTs.trim() + "\n```\n\n" : "") +
    "```python\n" +
    newSolution.trim() +
    "\n```\n"
  const solution = matter.stringify(writeup + "\n" + code, {
    title: `${q.title} — Solution`,
  })

  if (dry) return { slug, status: "dry", rewritten, total: cases.length, notes }

  const dir = path.join(QUESTIONS_DIR, slug)
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, "question.mdx"), question)
  fs.writeFileSync(path.join(dir, "solution.mdx"), solution)
  fs.writeFileSync(path.join(dir, "starter.ts"), starterTs)
  fs.writeFileSync(path.join(dir, "starter.py"), starterPy)
  fs.writeFileSync(path.join(dir, "tests.json"), stringifyTests(tests))
  for (const extra of ["harness.ts", "harness.py"]) {
    const src = path.join(files, extra)
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dir, extra))
  }
  return { slug, status: "written", rewritten, total: cases.length, notes }
}

function testFormatNote(harness: string | undefined, returnsNode: boolean) {
  switch (harness) {
    case "binary-tree":
      return (
        "trees are written as level-order arrays — `[1,null,2]` is a root `1` " +
        "with a right child `2`. Your function receives real `TreeNode` objects" +
        (returnsNode
          ? ", and the tree you return is read back into an array."
          : ".")
      )
    case "linked-list":
      return (
        "lists are written as arrays — `[1,2,3]` is the chain `1 → 2 → 3`. " +
        "Your function receives real `ListNode` objects" +
        (returnsNode
          ? ", and the list you return is read back into an array."
          : ".")
      )
    case "design":
      return (
        "each test is a sequence of calls. `operations[i]` is the method called " +
        "with `arguments[i]`; the first entry constructs the class. The expected " +
        "output lists what every call returns — `null` for the constructor and " +
        "for methods that return nothing."
      )
    case "in-place":
      return "the answer is checked by reading your modified input, not your return value."
    default:
      return undefined
  }
}

// Legacy design questions came in three shapes; all become LeetCode-style
// [operations, arguments] logs driven by content/harnesses/design.
const DESIGN_CONVERT: Record<string, string> = {
  // {operations: ["Stack", "push", …], values|arguments: [[], [1], …]}
  log: `
def convert(inp):
    ops = inp["operations"]
    vals = inp.get("values", inp.get("arguments"))
    return [ops, [list(v) for v in vals]]
`,
  // {operations: ["MyHashMap()", "put(1, 1)", 'insert("apple")', …]}
  calls: `
import ast, re
def convert(inp):
    ops, args = [], []
    for call in inp["operations"]:
        m = re.match(r"\\s*(\\w+)\\s*\\((.*)\\)\\s*$", call)
        name, inner = (m.group(1), m.group(2)) if m else (call.strip(), "")
        ops.append(name)
        args.append(list(ast.literal_eval("(" + inner + ",)")) if inner.strip() else [])
    return [ops, args]
`,
}

function generateDesignStarters(
  q: LegacyQuestion,
  className: string,
  cases: { input: unknown[]; expected: unknown }[]
) {
  const ctorArgs: unknown[][] = []
  const calls = new Map<string, { args: unknown[][]; results: unknown[] }>()
  for (const c of cases) {
    const [ops, args] = c.input as [string[], unknown[][]]
    const results = c.expected as unknown[]
    ops.forEach((op, i) => {
      if (i === 0) {
        ctorArgs.push(args[0])
        return
      }
      const entry = calls.get(op) ?? { args: [], results: [] }
      entry.args.push(args[i])
      entry.results.push(results[i])
      calls.set(op, entry)
    })
  }
  const templateSigs = templateMethods(q.template, className)
  const paramsFor = (names: string[] | undefined, samples: unknown[][]) => {
    const count = Math.max(0, ...samples.map((s) => s.length))
    return Array.from({ length: count }, (_, i) => ({
      name: toCamel(names?.[i] ?? `arg${i}`),
      ty: inferType(samples.map((s) => s[i])),
    }))
  }
  const ctorParams = paramsFor(templateSigs.get("__init__"), ctorArgs)
  // Keep the template's method order; methods the tests never call still
  // belong in the starter.
  const order = [
    ...[...templateSigs.keys()].filter(
      (m) => m !== "__init__" && !m.startsWith("_")
    ),
    ...[...calls.keys()].filter((m) => !templateSigs.has(m)),
  ]
  const methods: DesignMethod[] = order.map((name) => {
    const seen = calls.get(name)
    const returns: Ty = seen
      ? seen.results.map((r) => inferType([r])).reduce(merge, { k: "never" })
      : { k: "never" }
    return {
      name,
      params: seen
        ? paramsFor(templateSigs.get(name), seen.args)
        : (templateSigs.get(name) ?? []).map((n) => ({
            name: toCamel(n),
            ty: { k: "any" } as Ty,
          })),
      returns,
    }
  })
  return designStarters(className, ctorParams, methods)
}

// ─── Courses ────────────────────────────────────────────────────────────────

const COURSE_IDS: Record<string, string> = {
  algotimefall2025: "algotime-fall-2025",
  algotimewinter2026: "algotime-winter-2026",
  algotimesummer2026: "algotime-summer-2026",
  algotimefall2026: "algotime-fall-2026",
  foundations: "foundations",
  helloworld2025: "hello-world-2025",
}

function migrateCourse(course: LegacyCourse, available: Set<string>) {
  const id = COURSE_IDS[course.filename] ?? kebab(course.filename)
  const term = /(fall|winter|summer|spring)\s*(\d{4})/i.exec(course.course_name)
  const kind = term
    ? "semester"
    : /competition/i.test(course.badge)
      ? "competition"
      : "track"
  const missing: string[] = []
  const weekNumber = (title: string) =>
    Number(/^week\s+(\d+)/i.exec(title)?.[1] ?? Number.NaN)
  const units = Object.values(course.units)
    .map((unit, i) => {
      const questions = unit.questions.map((q) => q.filename)
      missing.push(...questions.filter((s) => !available.has(s)))
      return {
        title: unit.title?.trim() || `Stage ${i + 1}`,
        ...(unit.description ? { description: unit.description } : {}),
        questions,
      }
    })
    // Some legacy semesters kept placeholder weeks with no questions.
    .filter((unit) => unit.questions.length > 0)
  // …and some listed their weeks newest-first. Semesters read Week 1 → n.
  if (
    kind === "semester" &&
    units.every((u) => !Number.isNaN(weekNumber(u.title)))
  ) {
    units.sort((a, b) => weekNumber(a.title) - weekNumber(b.title))
  }
  const data = {
    title: course.course_name.replace(/^Algotime/, "AlgoTime"),
    description: course.course_description,
    kind,
    ...(term
      ? { term: { season: term[1].toLowerCase(), year: Number(term[2]) } }
      : {}),
    units,
  }
  return { id, data, missing }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const legacy = loadLegacyQuestions().filter(
    (q) => !only || only.includes(q.filename)
  )
  console.log(`Loading Pyodide and ${legacy.length} legacy questions…`)
  const py = await loadPython()

  const outcomes: Outcome[] = []
  for (const q of legacy) {
    const outcome = await migrateQuestion(q, py)
    outcomes.push(outcome)
    if ("reason" in outcome) {
      console.log(
        outcome.status === "failed"
          ? `✗ ${outcome.slug}: ${outcome.reason}`
          : `– ${outcome.slug}: ${outcome.status} (${outcome.reason})`
      )
    } else if (outcome.status === "dry" || verbose || outcome.rewritten > 0) {
      console.log(
        `✓ ${outcome.slug} (${outcome.total} cases` +
          (outcome.rewritten
            ? `, ${outcome.rewritten} differ from legacy expected`
            : "") +
          ")"
      )
    }
    if (outcome.status === "failed") {
      for (const d of outcome.details.slice(0, 4)) console.log(`    ${d}`)
    }
    if ("notes" in outcome)
      for (const n of outcome.notes) console.log(`    ${n}`)
  }

  if (!only) {
    const available = new Set(
      fs
        .readdirSync(QUESTIONS_DIR)
        .filter((d) =>
          fs.existsSync(path.join(QUESTIONS_DIR, d, "question.mdx"))
        )
    )
    if (!dry) fs.mkdirSync(COURSES_DIR, { recursive: true })
    for (const course of loadLegacyCourses()) {
      const { id, data, missing } = migrateCourse(course, available)
      if (missing.length > 0) {
        console.log(
          `✗ course ${id}: missing questions ${[...new Set(missing)].join(", ")}`
        )
      }
      if (!dry) {
        fs.writeFileSync(
          path.join(COURSES_DIR, `${id}.json`),
          JSON.stringify(data, null, 2) + "\n"
        )
      }
    }
  }

  const count = (s: Outcome["status"]) =>
    outcomes.filter((o) => o.status === s).length
  console.log(
    `\n${count("written") + count("dry")} migrated, ${count("kept")} kept (v2-authored), ` +
      `${count("skipped")} skipped, ${count("failed")} failed`
  )
  process.exit(count("failed") > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
