class _GraphNode:
    def __init__(self, val):
        self.val = val
        self.neighbors = []


def prepare(args):
    adj = args[0]
    if not adj:
        return [None]
    nodes = [_GraphNode(i + 1) for i in range(len(adj))]
    for i, neighbor_vals in enumerate(adj):
        nodes[i].neighbors = [nodes[val - 1] for val in neighbor_vals]
    return [nodes[0]]


def serialize(result, args):
    if result is None:
        return []
    if not hasattr(result, "neighbors"):
        return result

    seen = {}
    stack = [result]
    while stack:
        node = stack.pop()
        if id(node) in seen:
            continue
        seen[id(node)] = node
        stack.extend(node.neighbors)

    adj = [[] for _ in range(len(seen))]
    for node in seen.values():
        adj[node.val - 1] = sorted(n.val for n in node.neighbors)
    return adj
