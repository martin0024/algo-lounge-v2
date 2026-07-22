type AnyTreeNode = {
  val: unknown
  left: AnyTreeNode | null
  right: AnyTreeNode | null
}

function buildTree(values: (unknown | null)[]): AnyTreeNode | null {
  if (values.length === 0 || values[0] === null) return null
  const root: AnyTreeNode = { val: values[0], left: null, right: null }
  const queue: AnyTreeNode[] = [root]
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

export function prepare(args: unknown[]): unknown[] {
  return args.map((arg) => (Array.isArray(arg) ? buildTree(arg) : arg))
}

export function serialize(result: unknown): unknown {
  if (result === null || result === undefined) return []
  if (typeof result !== "object" || !("left" in result)) return result

  const values: (unknown | null)[] = []
  const queue: (AnyTreeNode | null)[] = [result as AnyTreeNode]
  while (queue.length > 0) {
    const node = queue.shift()!
    if (node === null) {
      values.push(null)
      continue
    }
    values.push(node.val)
    queue.push(node.left, node.right)
  }
  while (values.length > 0 && values[values.length - 1] === null) {
    values.pop()
  }
  return values
}
