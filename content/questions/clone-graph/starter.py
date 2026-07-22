class GraphNode:
    def __init__(self, val: int = 0, neighbors: "list[GraphNode] | None" = None):
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []


def clone_graph(node: "GraphNode | None") -> "GraphNode | None":
    # Your code here
    return None
