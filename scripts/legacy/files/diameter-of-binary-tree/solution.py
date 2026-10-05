def diameter_of_binary_tree(root: TreeNode | None) -> int:
    # The longest path through a node joins its two deepest subtrees.
    best = 0

    def depth(node):
        nonlocal best
        if node is None:
            return 0
        left = depth(node.left)
        right = depth(node.right)
        best = max(best, left + right)
        return 1 + max(left, right)

    depth(root)
    return best
