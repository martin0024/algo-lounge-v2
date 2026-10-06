export class TreeNode {
  val: number
  left: TreeNode | null
  right: TreeNode | null

  constructor(val = 0, left: TreeNode | null = null, right: TreeNode | null = null) {
    this.val = val
    this.left = left
    this.right = right
  }
}

export function isSubtree(root: TreeNode | null, subRoot: TreeNode | null): boolean {
  // Your code here
  return false
}
