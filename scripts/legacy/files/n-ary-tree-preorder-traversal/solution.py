class Node:
    def __init__(self, val: int = 0, children: "list[Node] | None" = None):
        self.val = val
        self.children = children if children is not None else []


def preorder(root: Node | None) -> list[int]:
    # Iterative: push children right-to-left so the leftmost is visited first.
    if root is None:
        return []
    values = []
    stack = [root]
    while stack:
        node = stack.pop()
        values.append(node.val)
        stack.extend(reversed(node.children))
    return values
