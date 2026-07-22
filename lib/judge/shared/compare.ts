export function toSnakeCase(name: string): string {
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

export function resultsMatch(
  expected: unknown,
  got: unknown,
  compare: "ordered" | "unordered"
): boolean {
  if (
    compare === "unordered" &&
    Array.isArray(expected) &&
    Array.isArray(got)
  ) {
    if (expected.length !== got.length) return false
    const key = (value: unknown) => JSON.stringify(value)
    return (
      JSON.stringify(expected.map(key).sort()) ===
      JSON.stringify(got.map(key).sort())
    )
  }
  return deepEqual(expected, got)
}
