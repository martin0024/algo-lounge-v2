class _Node:
    def __init__(self, val):
        self.val = val
        self.neighbors = []


def prepare(args):
    adj = args[0]
    if not adj:
        return [None]
    nodes = [_Node(i + 1) for i in range(len(adj))]
    for i, neighbor_vals in enumerate(adj):
        nodes[i].neighbors = [nodes[val - 1] for val in neighbor_vals]
    return [nodes[0]]


def serialize(result, args):
    if result is None:
        return []

    originals = set()
    original_root = args[0]
    if original_root is not None:
        stack = [original_root]
        while stack:
            node = stack.pop()
            if id(node) in originals:
                continue
            originals.add(id(node))
            stack.extend(node.neighbors)

    seen = {}
    stack = [result]
    while stack:
        node = stack.pop()
        if id(node) in seen:
            continue
        if id(node) in originals:
            raise ValueError(
                f"Node {node.val} is from the original graph - return a deep copy, not the input."
            )
        if not hasattr(node, "val") or not hasattr(node, "neighbors"):
            raise ValueError("Returned value is not a graph node.")
        seen[id(node)] = node
        stack.extend(node.neighbors)

    adj = [[] for _ in range(len(seen))]
    for node in seen.values():
        adj[node.val - 1] = sorted(n.val for n in node.neighbors)
    return adj
