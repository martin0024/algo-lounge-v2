# [[val, random_index], …] → nodes with .val/.next/.random. The copy is read
# back the same way, and must not share any node with the input.


class _Node:
    def __init__(self, val):
        self.val = val
        self.next = None
        self.random = None


_originals = set()


def prepare(args):
    global _originals
    nodes = [_Node(val) for val, _ in args[0]]
    for a, b in zip(nodes, nodes[1:]):
        a.next = b
    for node, (_, random_index) in zip(nodes, args[0]):
        if random_index is not None:
            node.random = nodes[random_index]
    _originals = {id(node) for node in nodes}
    return [nodes[0] if nodes else None]


def serialize(result, args):
    nodes = []
    index = {}
    node = result
    while node is not None:
        if id(node) in _originals:
            raise ValueError(
                f"Node {node.val} is from the original list — return a deep copy."
            )
        if id(node) in index:
            raise ValueError("Returned list contains a cycle.")
        index[id(node)] = len(nodes)
        nodes.append(node)
        node = node.next
    out = []
    for node in nodes:
        random = getattr(node, "random", None)
        if random is not None and id(random) not in index:
            raise ValueError(f"Node {node.val}'s random pointer leaves the copied list.")
        out.append([node.val, None if random is None else index[id(random)]])
    return out
