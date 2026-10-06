/**
 * Converts the legacy site's HTML fragments (question descriptions and
 * solution write-ups) into MDX that matches the v2 content style.
 *
 * Pipeline: rehype-parse → hast clean-up → rehype-remark → remark-stringify
 * with remark-mdx, so `{`, `<` and friends come out escaped for MDX.
 */
import type { Element, ElementContent, Root, RootContent, Text } from "hast"
import rehypeParse from "rehype-parse"
import rehypeRemark from "rehype-remark"
import remarkGfm from "remark-gfm"
import remarkMdx from "remark-mdx"
import remarkStringify from "remark-stringify"
import { unified } from "unified"

const SUPERSCRIPT: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "+": "⁺",
  "-": "⁻",
  "=": "⁼",
  "(": "⁽",
  ")": "⁾",
  n: "ⁿ",
  i: "ⁱ",
  k: "ᵏ",
  m: "ᵐ",
  x: "ˣ",
  y: "ʸ",
}
const SUBSCRIPT: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
  "+": "₊",
  "-": "₋",
  "=": "₌",
  "(": "₍",
  ")": "₎",
  a: "ₐ",
  e: "ₑ",
  h: "ₕ",
  i: "ᵢ",
  j: "ⱼ",
  k: "ₖ",
  l: "ₗ",
  m: "ₘ",
  n: "ₙ",
  o: "ₒ",
  p: "ₚ",
  r: "ᵣ",
  s: "ₛ",
  t: "ₜ",
  u: "ᵤ",
  v: "ᵥ",
  x: "ₓ",
}

function mapChars(text: string, table: Record<string, string>): string | null {
  let out = ""
  for (const ch of text.replace(/\s+/g, "")) {
    const mapped = table[ch]
    if (!mapped) return null
    out += mapped
  }
  return out
}

function textOf(node: RootContent | Root | ElementContent): string {
  if (node.type === "text") return node.value
  if (node.type === "element" && node.tagName === "br") return "\n"
  if ("children" in node) {
    return (node.children as ElementContent[]).map(textOf).join("")
  }
  return ""
}

const text = (value: string): Text => ({ type: "text", value })
const el = (
  tagName: string,
  children: ElementContent[],
  properties: Element["properties"] = {}
): Element => ({ type: "element", tagName, properties, children })

/** `10<sup>4</sup>` → `10⁴`, `nums<sub>i</sub>` → `numsᵢ` — markdown has no
 * sup/sub, and inside inline code they would otherwise be flattened to `104`. */
function flattenScripts(node: Root | Element) {
  node.children = node.children.map((child) => {
    if (child.type !== "element") return child
    if (child.tagName === "sup" || child.tagName === "sub") {
      const raw = textOf(child)
      const table = child.tagName === "sup" ? SUPERSCRIPT : SUBSCRIPT
      const mapped = mapChars(raw, table)
      if (mapped !== null) return text(mapped)
      return text(child.tagName === "sup" ? `^(${raw})` : `_${raw}`)
    }
    flattenScripts(child)
    return child
  }) as typeof node.children
}

/** Tags that only carry presentation — keep their content, drop the tag. */
const UNWRAP = new Set(["font", "span", "u", "div"])

function unwrapPresentational(node: Root | Element) {
  const next: (typeof node.children)[number][] = []
  for (const child of node.children) {
    if (child.type === "element") {
      unwrapPresentational(child)
      if (UNWRAP.has(child.tagName)) {
        next.push(...child.children)
        continue
      }
    }
    next.push(child)
  }
  node.children = next as typeof node.children
}

function isHeading(node: RootContent, pattern: RegExp): boolean {
  return (
    node.type === "element" &&
    /^h[1-6]$/.test(node.tagName) &&
    pattern.test(textOf(node).trim())
  )
}

/**
 * The legacy examples are `<ul><li><strong>Input:</strong> … <br>
 * <strong>Output:</strong> …<br><strong>Explanation:</strong> …</li></ul>`.
 * Rewrite each item as v2 does: a bold "Example n" label, an Input/Output
 * code block, then the explanation as prose.
 */
function rewriteExamples(root: Root) {
  const out: RootContent[] = []
  const children = root.children
  for (let i = 0; i < children.length; i++) {
    const node = children[i]
    out.push(node)
    if (!isHeading(node, /^examples?:?$/i)) continue

    // Skip whitespace text nodes between the heading and the list.
    let j = i + 1
    while (
      j < children.length &&
      children[j].type === "text" &&
      !(children[j] as Text).value.trim()
    ) {
      j++
    }
    const list = children[j]
    if (
      !list ||
      list.type !== "element" ||
      (list.tagName !== "ul" && list.tagName !== "ol")
    ) {
      continue
    }
    const items = list.children.filter(
      (c): c is Element => c.type === "element" && c.tagName === "li"
    )
    if (!items.every((li) => /^\s*Input\s*:/i.test(textOf(li)))) continue

    items.forEach((li, index) => {
      const lines = textOf(li)
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
      const io: string[] = []
      const prose: string[] = []
      for (const line of lines) {
        const match = /^(Input|Output)\s*:\s*(.*)$/i.exec(line)
        if (match && prose.length === 0) {
          const label = match[1][0].toUpperCase() + match[1].slice(1)
          io.push(`${`${label}:`.padEnd(7)} ${match[2]}`)
        } else {
          prose.push(line.replace(/^Explanation\s*:\s*/i, ""))
        }
      }
      out.push(el("p", [el("strong", [text(`Example ${index + 1}`)])]))
      out.push(el("pre", [el("code", [text(io.join("\n"))])]))
      if (prose.length > 0) out.push(el("p", [text(prose.join(" "))]))
    })
    i = j
  }
  root.children = out
}

/** Legacy sections are `<h3>`; v2 uses `##`. Drop trailing colons too. */
function normalizeHeadings(root: Root, dropFirstTitle: boolean) {
  if (dropFirstTitle) {
    const first = root.children.findIndex(
      (c) => c.type === "element" || (c.type === "text" && c.value.trim())
    )
    const node = root.children[first]
    if (node && node.type === "element" && /^h[1-3]$/.test(node.tagName)) {
      root.children.splice(first, 1)
    }
  }
  const visit = (node: Root | Element) => {
    for (const child of node.children) {
      if (child.type !== "element") continue
      if (/^h[1-6]$/.test(child.tagName)) {
        const level = Math.min(6, Math.max(2, Number(child.tagName[1]) - 1))
        child.tagName = `h${level}`
        const last = child.children.at(-1)
        if (last && last.type === "text") {
          last.value = last.value.replace(/\s*:\s*$/, "")
        }
      }
      visit(child)
    }
  }
  visit(root)
}

/** `<strong>Follow-up:&nbsp;</strong>Can…` — whitespace hugging the inside of
 * an emphasis tag makes invalid markdown emphasis; move it outside. */
function tidyWhitespace(node: Root | Element) {
  const next: (typeof node.children)[number][] = []
  for (const child of node.children) {
    if (child.type === "text") {
      child.value = child.value.replace(/\u00a0/g, " ")
      next.push(child)
      continue
    }
    if (child.type !== "element") {
      next.push(child)
      continue
    }
    tidyWhitespace(child)
    if (["strong", "b", "em", "i"].includes(child.tagName)) {
      const first = child.children[0]
      const last = child.children.at(-1)
      let lead = ""
      let trail = ""
      if (first?.type === "text") {
        lead = /^\s*/.exec(first.value)![0]
        first.value = first.value.slice(lead.length)
      }
      if (last?.type === "text") {
        trail = /\s*$/.exec(last.value)![0]
        last.value = last.value.slice(0, last.value.length - trail.length)
      }
      if (lead) next.push(text(" "))
      next.push(child)
      if (trail) next.push(text(" "))
      continue
    }
    next.push(child)
  }
  node.children = next as typeof node.children
}

function cleanup(options: { dropFirstTitle: boolean }) {
  return (tree: Root) => {
    tidyWhitespace(tree)
    unwrapPresentational(tree)
    flattenScripts(tree)
    normalizeHeadings(tree, options.dropFirstTitle)
    rewriteExamples(tree)
  }
}

export async function htmlToMdx(
  html: string,
  options: { dropFirstTitle?: boolean } = {}
): Promise<string> {
  const file = await unified()
    .use(rehypeParse, { fragment: true })
    .use(cleanup, { dropFirstTitle: options.dropFirstTitle ?? false })
    .use(rehypeRemark)
    .use(remarkGfm)
    .use(remarkMdx)
    .use(remarkStringify, {
      bullet: "-",
      emphasis: "*",
      strong: "*",
      fence: "`",
      fences: true,
      rule: "-",
    })
    .process(html)
  return String(file).trim() + "\n"
}
