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


def prepare(args):
    return [_build_tree(a) if isinstance(a, list) else a for a in args]


def serialize(result, args):
    if result is None:
        return []
    if not hasattr(result, "left"):
        return result

    values = []
    queue = deque([result])
    while queue:
        node = queue.popleft()
        if node is None:
            values.append(None)
            continue
        values.append(node.val)
        queue.append(node.left)
        queue.append(node.right)
    while values and values[-1] is None:
        values.pop()
    return values
