type AnyListNode = { val: unknown; next: AnyListNode | null }

function buildList(values: unknown[]): AnyListNode | null {
  let head: AnyListNode | null = null
  let tail: AnyListNode | null = null
  for (const val of values) {
    const node: AnyListNode = { val, next: null }
    if (tail) tail.next = node
    else head = node
    tail = node
  }
  return head
}

export function prepare(args: unknown[]): unknown[] {
  return args.map((arg) => (Array.isArray(arg) ? buildList(arg) : arg))
}

export function serialize(result: unknown): unknown {
  if (result === null || result === undefined) return []
  if (typeof result !== "object" || !("next" in result)) return result

  const values: unknown[] = []
  const seen = new Set<AnyListNode>()
  let node: AnyListNode | null = result as AnyListNode
  while (node) {
    if (seen.has(node)) {
      throw new Error("Returned list contains a cycle.")
    }
    seen.add(node)
    values.push(node.val)
    node = node.next
  }
  return values
}
