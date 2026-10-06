# [root, p, q]: the tree is built from its level-order array and p/q are
# looked up by value, so the function receives real nodes. The answer is
# the value of the returned node.

from collections import deque


class _TreeNode:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None


def _build_tree(values):
    if not values or values[0] is None:
        return None
    root = _TreeNode(values[0])
    queue = deque([root])
    i = 1
    while queue and i < len(values):
        node = queue.popleft()
        if i < len(values) and values[i] is not None:
            node.left = _TreeNode(values[i])
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = _TreeNode(values[i])
            queue.append(node.right)
        i += 1
    return root


def _find(node, val):
    stack = [node]
    while stack:
        current = stack.pop()
        if current is None:
            continue
        if current.val == val:
            return current
        stack.extend([current.left, current.right])
    return None


def prepare(args):
    root = _build_tree(args[0])
    return [root, _find(root, args[1]), _find(root, args[2])]


def serialize(result, args):
    if result is None:
        return None
    if not hasattr(result, "val"):
        raise ValueError("Return a tree node, not its value.")
    return result.val
