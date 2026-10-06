type AnyNode = { val: number; neighbors: AnyNode[] }

export function prepare(args: unknown[]): unknown[] {
  const adj = args[0] as number[][] | null
  if (!adj || adj.length === 0) return [null]
  const nodes: AnyNode[] = adj.map((_, i) => ({ val: i + 1, neighbors: [] }))
  adj.forEach((neighborVals, i) => {
    nodes[i].neighbors = neighborVals.map((val) => nodes[val - 1])
  })
  return [nodes[0]]
}

export function serialize(result: unknown, args: unknown[]): number[][] {
  const clone = result as AnyNode | null
  if (clone == null) return []

  const originals = new Set<AnyNode>()
  const originalRoot = args[0] as AnyNode | null
  if (originalRoot) {
    const stack = [originalRoot]
    while (stack.length > 0) {
      const node = stack.pop()!
      if (originals.has(node)) continue
      originals.add(node)
      stack.push(...node.neighbors)
    }
  }

  const seen = new Set<AnyNode>()
  const stack = [clone]
  while (stack.length > 0) {
    const node = stack.pop()!
    if (seen.has(node)) continue
    if (originals.has(node)) {
      throw new Error(
        `Node ${node.val} is from the original graph — return a deep copy, not the input.`
      )
    }
    if (typeof node.val !== "number" || !Array.isArray(node.neighbors)) {
      throw new Error("Returned value is not a graph node.")
    }
    seen.add(node)
    stack.push(...node.neighbors)
  }

  const adj: number[][] = []
  for (const node of seen) {
    adj[node.val - 1] = node.neighbors.map((n) => n.val).sort((a, b) => a - b)
  }
  return adj
}
