export function lowestCommonAncestor(
  root: TreeNode | null,
  p: TreeNode,
  q: TreeNode
): TreeNode | null {
  // In a BST the split point is the first node between p and q.
  let node = root
  while (node) {
    if (p.val < node.val && q.val < node.val) node = node.left
    else if (p.val > node.val && q.val > node.val) node = node.right
    else return node
  }
  return null
}
