type AnyGraphNode = { val: number; neighbors: AnyGraphNode[] }

export function prepare(args: unknown[]): unknown[] {
  const adj = args[0] as number[][] | null
  if (!adj || adj.length === 0) return [null]
  const nodes: AnyGraphNode[] = adj.map((_, i) => ({
    val: i + 1,
    neighbors: [],
  }))
  adj.forEach((neighborVals, i) => {
    nodes[i].neighbors = neighborVals.map((val) => nodes[val - 1])
  })
  return [nodes[0]]
}

export function serialize(result: unknown): unknown {
  const root = result as AnyGraphNode | null
  if (root == null) return []
  if (typeof root !== "object" || !("neighbors" in root)) return result

  const seen = new Set<AnyGraphNode>()
  const stack = [root]
  while (stack.length > 0) {
    const node = stack.pop()!
    if (seen.has(node)) continue
    seen.add(node)
    stack.push(...node.neighbors)
  }

  const adj: number[][] = []
  for (const node of seen) {
    adj[node.val - 1] = node.neighbors.map((n) => n.val).sort((a, b) => a - b)
  }
  return adj
}
