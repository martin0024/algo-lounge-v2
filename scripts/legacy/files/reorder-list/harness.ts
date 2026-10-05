// Linked list in, reordered in place: the answer is the list read from the
// original head, whatever the function returns.

type Node = { val: unknown; next: Node | null }

export function prepare(args: unknown[]): unknown[] {
  let head: Node | null = null
  for (const val of [...(args[0] as unknown[])].reverse()) {
    head = { val, next: head }
  }
  return [head]
}

export function serialize(_result: unknown, args: unknown[]): unknown {
  const values: unknown[] = []
  const seen = new Set<Node>()
  let node = args[0] as Node | null
  while (node) {
    if (seen.has(node)) throw new Error("The reordered list contains a cycle.")
    seen.add(node)
    values.push(node.val)
    node = node.next
  }
  return values
}
