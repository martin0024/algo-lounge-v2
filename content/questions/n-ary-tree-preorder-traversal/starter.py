class Node:
    def __init__(self, val: int = 0, children: "list[Node] | None" = None):
        self.val = val
        self.children = children if children is not None else []


def preorder(root: Node | None) -> list[int]:
    # Your code here
    return []
