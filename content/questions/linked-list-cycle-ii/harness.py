# [values, pos] → a linked list whose tail links back to node `pos`
# (-1: no cycle). The function only receives the head.


class _ListNode:
    def __init__(self, val):
        self.val = val
        self.next = None


_nodes = []


def prepare(args):
    global _nodes
    values, pos = args
    _nodes = [_ListNode(val) for val in values]
    for a, b in zip(_nodes, _nodes[1:]):
        a.next = b
    if _nodes and 0 <= pos < len(_nodes):
        _nodes[-1].next = _nodes[pos]
    return [_nodes[0] if _nodes else None]


def serialize(result, args):
    # The answer is the index of the returned node (None: no cycle).
    if result is None:
        return None
    for index, node in enumerate(_nodes):
        if node is result:
            return index
    raise ValueError("Returned node is not part of the input list.")
