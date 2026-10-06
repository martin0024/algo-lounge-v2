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
