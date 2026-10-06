# Level-order with null separators: [1,null,3,2,4,null,5,6] is root 1 with
# children 3, 2, 4; then 3's children are 5, 6; and so on.
from collections import deque


class _Node:
    def __init__(self, val):
        self.val = val
        self.children = []


def prepare(args):
    values = args[0]
    if not values:
        return [None]
    root = _Node(values[0])
    queue = deque([root])
    i = 2  # skip the root and the null that ends its level
    while queue and i < len(values):
        parent = queue.popleft()
        while i < len(values) and values[i] is not None:
            child = _Node(values[i])
            parent.children.append(child)
            queue.append(child)
            i += 1
        i += 1
    return [root]
