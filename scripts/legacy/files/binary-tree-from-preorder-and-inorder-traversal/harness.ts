// Plain arrays in; the returned tree is read back as a level-order array.

type Node = { val: unknown; left: Node | null; right: Node | null }

export function serialize(result: unknown): unknown {
  if (result === null || result === undefined) return []
  const values: unknown[] = []
  const queue: (Node | null)[] = [result as Node]
  while (queue.length > 0) {
    const node = queue.shift()!
    if (!node) {
      values.push(null)
      continue
    }
    values.push(node.val)
    queue.push(node.left ?? null, node.right ?? null)
  }
  while (values.length > 0 && values[values.length - 1] === null) values.pop()
  return values
}
