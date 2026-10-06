export function preorder(root: Node | null): number[] {
  if (!root) return []
  const values: number[] = []
  const stack: Node[] = [root]
  while (stack.length > 0) {
    const node = stack.pop()!
    values.push(node.val)
    // Push children right-to-left so the leftmost is visited first.
    for (let i = node.children.length - 1; i >= 0; i--)
      stack.push(node.children[i])
  }
  return values
}
