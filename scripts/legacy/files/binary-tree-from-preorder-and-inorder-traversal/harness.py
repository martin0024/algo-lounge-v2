# Plain arrays in; the returned tree is read back as a level-order array.
from collections import deque


def serialize(result, args):
    if result is None:
        return []
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
