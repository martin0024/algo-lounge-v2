// [[1,4,5],[1,3,4]] → a list of linked-list heads; the merged list is walked
// back into an array.

type Node = { val: unknown; next: Node | null }

function build(values: unknown[]): Node | null {
  let head: Node | null = null
  for (const val of [...values].reverse()) head = { val, next: head }
  return head
}

export function prepare(args: unknown[]): unknown[] {
  return [(args[0] as unknown[][]).map(build)]
}

export function serialize(result: unknown): unknown {
  const values: unknown[] = []
  const seen = new Set<Node>()
  let node = (result ?? null) as Node | null
  while (node) {
    if (seen.has(node)) throw new Error("Returned list contains a cycle.")
    seen.add(node)
    values.push(node.val)
    node = node.next
  }
  return values
}
