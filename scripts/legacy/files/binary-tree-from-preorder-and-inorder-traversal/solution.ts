export function constructBinaryTreeFromPreorderAndInorderTraversal(
  preorder: number[],
  inorder: number[]
): TreeNode | null {
  const position = new Map(inorder.map((val, i) => [val, i]))
  let next = 0
  // Build the subtree whose values sit in inorder[lo..hi].
  const build = (lo: number, hi: number): TreeNode | null => {
    if (lo > hi) return null
    const val = preorder[next++]
    const mid = position.get(val)!
    const node = new TreeNode(val)
    node.left = build(lo, mid - 1)
    node.right = build(mid + 1, hi)
    return node
  }
  return build(0, inorder.length - 1)
}
