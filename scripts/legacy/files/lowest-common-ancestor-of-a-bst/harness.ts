// [root, p, q]: the tree is built from its level-order array and p/q are
// looked up by value, so the function receives real nodes. The answer is
// the value of the returned node.

type Node = { val: unknown; left: Node | null; right: Node | null }

function buildTree(values: unknown[]): Node | null {
  if (values.length === 0 || values[0] === null) return null
  const root: Node = { val: values[0], left: null, right: null }
  const queue: Node[] = [root]
  let i = 1
  while (queue.length > 0 && i < values.length) {
    const node = queue.shift()!
    if (i < values.length && values[i] !== null) {
      node.left = { val: values[i], left: null, right: null }
      queue.push(node.left)
    }
    i++
    if (i < values.length && values[i] !== null) {
      node.right = { val: values[i], left: null, right: null }
      queue.push(node.right)
    }
    i++
  }
  return root
}

function find(root: Node | null, val: unknown): Node | null {
  const stack = [root]
  while (stack.length > 0) {
    const node = stack.pop()
    if (!node) continue
    if (node.val === val) return node
    stack.push(node.left, node.right)
  }
  return null
}

export function prepare(args: unknown[]): unknown[] {
  const root = buildTree(args[0] as unknown[])
  return [root, find(root, args[1]), find(root, args[2])]
}

export function serialize(result: unknown): unknown {
  if (result === null || result === undefined) return null
  if (typeof result !== "object" || !("val" in result)) {
    throw new Error("Return a tree node, not its value.")
  }
  return (result as Node).val
}
