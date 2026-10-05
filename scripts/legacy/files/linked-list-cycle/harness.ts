// [values, pos] → a linked list whose tail links back to node `pos`
// (-1: no cycle). The function only receives the head.

type Node = { val: unknown; next: Node | null }

let nodes: Node[] = []

export function prepare(args: unknown[]): unknown[] {
  const [values, pos] = args as [unknown[], number]
  nodes = values.map((val) => ({ val, next: null }))
  for (let i = 0; i + 1 < nodes.length; i++) nodes[i].next = nodes[i + 1]
  if (nodes.length > 0 && pos >= 0 && pos < nodes.length) {
    nodes[nodes.length - 1].next = nodes[pos]
  }
  return [nodes[0] ?? null]
}
