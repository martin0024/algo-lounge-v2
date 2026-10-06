/**
 * Starter-code generation for migrated questions. The legacy site only had an
 * untyped Python template, so parameter/return types are inferred from the
 * test data (every case's inputs and regenerated answers).
 */

export type Ty =
  | { k: "int" | "float" | "bool" | "str" | "null" | "any" | "never" }
  | { k: "list"; of: Ty }
  | { k: "dict"; of: Ty }
  | { k: "opt"; of: Ty }
  | { k: "node"; name: "TreeNode" | "ListNode" }

const NEVER: Ty = { k: "never" }
const ANY: Ty = { k: "any" }

function of(value: unknown): Ty {
  if (value === null) return { k: "null" }
  if (typeof value === "boolean") return { k: "bool" }
  if (typeof value === "number") {
    return Number.isInteger(value) ? { k: "int" } : { k: "float" }
  }
  if (typeof value === "string") return { k: "str" }
  if (Array.isArray(value)) {
    return { k: "list", of: value.map(of).reduce(merge, NEVER) }
  }
  if (typeof value === "object") {
    return { k: "dict", of: Object.values(value).map(of).reduce(merge, NEVER) }
  }
  return ANY
}

export function merge(a: Ty, b: Ty): Ty {
  if (a.k === "never") return b
  if (b.k === "never") return a
  if (a.k === "any" || b.k === "any") return ANY
  if (a.k === "null" && b.k === "null") return a
  if (a.k === "null") return b.k === "opt" ? b : { k: "opt", of: b }
  if (b.k === "null") return merge(b, a)
  if (a.k === "opt" || b.k === "opt") {
    const inner = merge(a.k === "opt" ? a.of : a, b.k === "opt" ? b.of : b)
    return inner.k === "any" ? ANY : { k: "opt", of: inner }
  }
  if (a.k === b.k) {
    if (a.k === "list" || a.k === "dict") {
      return { k: a.k, of: merge(a.of, (b as typeof a).of) }
    }
    return a
  }
  if (
    (a.k === "int" && b.k === "float") ||
    (a.k === "float" && b.k === "int")
  ) {
    return { k: "float" }
  }
  return ANY
}

export const inferType = (values: unknown[]): Ty =>
  values.map(of).reduce(merge, NEVER)

/** Swap list-shaped types for the node class a harness builds from them. */
export function asNode(ty: Ty, name: "TreeNode" | "ListNode"): Ty {
  if (ty.k === "list" || ty.k === "never")
    return { k: "opt", of: { k: "node", name } }
  if (ty.k === "opt" && ty.of.k === "list")
    return { k: "opt", of: { k: "node", name } }
  return ty
}

export function toTs(ty: Ty): string {
  switch (ty.k) {
    case "int":
    case "float":
      return "number"
    case "bool":
      return "boolean"
    case "str":
      return "string"
    case "null":
      return "null"
    case "any":
    case "never":
      return "unknown"
    case "node":
      return ty.name
    case "opt":
      return `${toTs(ty.of)} | null`
    case "list": {
      const inner = toTs(ty.of)
      return /[ |]/.test(inner) ? `(${inner})[]` : `${inner}[]`
    }
    case "dict":
      return `Record<string, ${toTs(ty.of)}>`
  }
}

export function toPy(ty: Ty): string {
  switch (ty.k) {
    case "int":
      return "int"
    case "float":
      return "float"
    case "bool":
      return "bool"
    case "str":
      return "str"
    case "null":
      return "None"
    case "any":
    case "never":
      return "object"
    case "node":
      return ty.name
    case "opt":
      return `${toPy(ty.of)} | None`
    case "list":
      return ty.of.k === "never" ? "list" : `list[${toPy(ty.of)}]`
    case "dict":
      return `dict[str, ${toPy(ty.of)}]`
  }
}

function zeroTs(ty: Ty): string {
  switch (ty.k) {
    case "int":
    case "float":
      return "0"
    case "bool":
      return "false"
    case "str":
      return '""'
    case "list":
      return "[]"
    case "dict":
      return "{}"
    default:
      return "null"
  }
}

function zeroPy(ty: Ty): string {
  switch (ty.k) {
    case "int":
      return "0"
    case "float":
      return "0.0"
    case "bool":
      return "False"
    case "str":
      return '""'
    case "list":
      return "[]"
    case "dict":
      return "{}"
    default:
      return "None"
  }
}

export const toSnake = (name: string) =>
  /^[A-Z]/.test(name)
    ? name
    : name.replace(/[A-Z]/g, (ch) => `_${ch.toLowerCase()}`)

export const toCamel = (name: string) =>
  name.replace(/_+([a-zA-Z0-9])/g, (_, ch: string) => ch.toUpperCase())

export const TS_NODE: Record<"TreeNode" | "ListNode", string> = {
  TreeNode: `export class TreeNode {
  val: number
  left: TreeNode | null
  right: TreeNode | null

  constructor(val = 0, left: TreeNode | null = null, right: TreeNode | null = null) {
    this.val = val
    this.left = left
    this.right = right
  }
}
`,
  ListNode: `export class ListNode {
  val: number
  next: ListNode | null

  constructor(val = 0, next: ListNode | null = null) {
    this.val = val
    this.next = next
  }
}
`,
}

export const PY_NODE: Record<"TreeNode" | "ListNode", string> = {
  TreeNode: `class TreeNode:
    def __init__(self, val: int = 0, left: "TreeNode | None" = None, right: "TreeNode | None" = None):
        self.val = val
        self.left = left
        self.right = right
`,
  ListNode: `class ListNode:
    def __init__(self, val: int = 0, next: "ListNode | None" = None):
        self.val = val
        self.next = next
`,
}

function nodesUsed(types: Ty[]): ("TreeNode" | "ListNode")[] {
  const found = new Set<"TreeNode" | "ListNode">()
  const walk = (ty: Ty) => {
    if (ty.k === "node") found.add(ty.name)
    if ("of" in ty) walk(ty.of)
  }
  types.forEach(walk)
  return [...found].sort()
}

export type Signature = {
  name: string // camelCase (TS) — Python gets toSnake(name)
  params: { name: string; ty: Ty }[]
  returns: Ty
}

export function functionStarters(sig: Signature): { ts: string; py: string } {
  const types = [...sig.params.map((p) => p.ty), sig.returns]
  const nodes = nodesUsed(types)

  // A `null` return type means "returns nothing" (in-place questions).
  const isVoid = sig.returns.k === "null"
  const tsParams = sig.params.map((p) => `${p.name}: ${toTs(p.ty)}`).join(", ")
  const ts =
    nodes.map((n) => TS_NODE[n] + "\n").join("") +
    (isVoid ? "/** Do not return anything — modify the input in place. */\n" : "") +
    `export function ${sig.name}(${tsParams}): ${isVoid ? "void" : toTs(sig.returns)} {\n` +
    `  // Your code here\n` +
    (isVoid ? "" : `  return ${zeroTs(sig.returns)}\n`) +
    `}\n`

  const pyParams = sig.params
    .map((p) => `${toSnake(p.name)}: ${toPy(p.ty)}`)
    .join(", ")
  const py =
    nodes.map((n) => PY_NODE[n] + "\n\n").join("") +
    `def ${toSnake(sig.name)}(${pyParams}) -> ${toPy(sig.returns)}:\n` +
    (isVoid ? `    """Do not return anything — modify the input in place."""\n` : "") +
    `    # Your code here\n` +
    (isVoid ? "    pass\n" : `    return ${zeroPy(sig.returns)}\n`)

  return { ts, py }
}

export type DesignMethod = {
  name: string
  params: { name: string; ty: Ty }[]
  returns: Ty // "null" → void
}

export function designStarters(
  className: string,
  ctorParams: { name: string; ty: Ty }[],
  methods: DesignMethod[]
): { ts: string; py: string } {
  const tsVoid = (ty: Ty) =>
    ty.k === "null" || ty.k === "never" ? "void" : toTs(ty)
  const tsMethods = methods
    .map((m) => {
      const params = m.params.map((p) => `${p.name}: ${toTs(p.ty)}`).join(", ")
      const ret = tsVoid(m.returns)
      const body =
        ret === "void"
          ? "    // Your code here\n"
          : `    // Your code here\n    return ${zeroTs(m.returns)}\n`
      return `  ${m.name}(${params}): ${ret} {\n${body}  }`
    })
    .join("\n\n")
  const ctor = ctorParams.map((p) => `${p.name}: ${toTs(p.ty)}`).join(", ")
  const ts =
    `export class ${className} {\n` +
    `  constructor(${ctor}) {\n    // Your code here\n  }\n\n` +
    tsMethods +
    `\n}\n`

  const pyVoid = (ty: Ty) =>
    ty.k === "null" || ty.k === "never" ? "None" : toPy(ty)
  const pyMethods = methods
    .map((m) => {
      const params = [
        "self",
        ...m.params.map((p) => `${p.name}: ${toPy(p.ty)}`),
      ].join(", ")
      const ret = pyVoid(m.returns)
      const body =
        ret === "None"
          ? "        pass\n"
          : `        return ${zeroPy(m.returns)}\n`
      return `    def ${m.name}(${params}) -> ${ret}:\n        # Your code here\n${body}`
    })
    .join("\n")
  const pyCtor = [
    "self",
    ...ctorParams.map((p) => `${p.name}: ${toPy(p.ty)}`),
  ].join(", ")
  const py =
    `class ${className}:\n` +
    `    def __init__(${pyCtor}):\n        # Your code here\n        pass\n\n` +
    pyMethods

  return { ts, py }
}
