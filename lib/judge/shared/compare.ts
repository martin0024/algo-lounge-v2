/** camelCase → snake_case for Python. PascalCase names are classes (design
 * questions) and keep their spelling in every language. */
export function toSnakeCase(name: string): string {
  if (/^[A-Z]/.test(name)) return name
  return name.replace(/[A-Z]/g, (ch) => `_${ch.toLowerCase()}`)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true

  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => deepEqual(item, b[i]))
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = Object.keys(a)
    if (keys.length !== Object.keys(b).length) return false
    return keys.every((key) => deepEqual(a[key], b[key]))
  }

  return false
}

export const compareModes = [
  "ordered",
  "unordered",
  "unordered-nested",
  "approx",
] as const
export type CompareMode = (typeof compareModes)[number]

/** Order-free canonical form: every array (at any depth) becomes the sorted
 * list of its members' canonical JSON. */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return JSON.stringify(value.map(canonicalJson).sort())
  }
  return JSON.stringify(value)
}

/** Deep equality where numbers only need to agree to ~5 significant decimals. */
function approxEqual(a: unknown, b: unknown): boolean {
  if (typeof a === "number" && typeof b === "number") {
    return Math.abs(a - b) <= 1e-5 * Math.max(1, Math.abs(a), Math.abs(b))
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return (
      a.length === b.length && a.every((item, i) => approxEqual(item, b[i]))
    )
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = Object.keys(a)
    if (keys.length !== Object.keys(b).length) return false
    return keys.every((key) => approxEqual(a[key], b[key]))
  }
  return Object.is(a, b)
}

/**
 * - `ordered`: exact deep equality (the default).
 * - `unordered`: the top-level list may come back in any order.
 * - `unordered-nested`: every list, at any depth, may be in any order
 *   (3sum triplets, subsets, anagram groups…).
 * - `approx`: floating-point answers match within 1e-5 (relative for big values).
 */
export function resultsMatch(
  expected: unknown,
  got: unknown,
  compare: CompareMode
): boolean {
  if (compare === "approx") return approxEqual(expected, got)
  if (Array.isArray(expected) && Array.isArray(got)) {
    if (compare === "unordered") {
      if (expected.length !== got.length) return false
      const key = (value: unknown) => JSON.stringify(value)
      return (
        JSON.stringify(expected.map(key).sort()) ===
        JSON.stringify(got.map(key).sort())
      )
    }
    if (compare === "unordered-nested") {
      return canonicalJson(expected) === canonicalJson(got)
    }
  }
  return deepEqual(expected, got)
}
