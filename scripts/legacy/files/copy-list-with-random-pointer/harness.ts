// [[val, randomIndex], …] → nodes with .val/.next/.random. The copy is read
// back the same way, and must not share any node with the input.

type Node = { val: unknown; next: Node | null; random: Node | null }

let originals = new Set<Node>()

export function prepare(args: unknown[]): unknown[] {
  const spec = args[0] as [unknown, number | null][]
  const nodes: Node[] = spec.map(([val]) => ({ val, next: null, random: null }))
  for (let i = 0; i + 1 < nodes.length; i++) nodes[i].next = nodes[i + 1]
  spec.forEach(([, randomIndex], i) => {
    if (randomIndex !== null) nodes[i].random = nodes[randomIndex]
  })
  originals = new Set(nodes)
  return [nodes[0] ?? null]
}

export function serialize(result: unknown): unknown {
  const nodes: Node[] = []
  const index = new Map<Node, number>()
  let node = (result ?? null) as Node | null
  while (node) {
    if (originals.has(node)) {
      throw new Error(
        `Node ${node.val} is from the original list — return a deep copy.`
      )
    }
    if (index.has(node)) throw new Error("Returned list contains a cycle.")
    index.set(node, nodes.length)
    nodes.push(node)
    node = node.next
  }
  return nodes.map((n) => {
    const random = n.random ?? null
    if (random && !index.has(random)) {
      throw new Error(`Node ${n.val}'s random pointer leaves the copied list.`)
    }
    return [n.val, random ? index.get(random)! : null]
  })
}
