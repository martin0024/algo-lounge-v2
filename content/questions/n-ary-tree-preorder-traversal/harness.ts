// Level-order with null separators: [1,null,3,2,4,null,5,6] is root 1 with
// children 3, 2, 4; then 3's children are 5, 6; and so on.

type Node = { val: unknown; children: Node[] }

export function prepare(args: unknown[]): unknown[] {
  const values = args[0] as unknown[]
  if (values.length === 0) return [null]
  const root: Node = { val: values[0], children: [] }
  const queue: Node[] = [root]
  let i = 2 // skip the root and the null that ends its level
  while (queue.length > 0 && i < values.length) {
    const parent = queue.shift()!
    while (i < values.length && values[i] !== null) {
      const child: Node = { val: values[i], children: [] }
      parent.children.push(child)
      queue.push(child)
      i++
    }
    i++
  }
  return [root]
}
