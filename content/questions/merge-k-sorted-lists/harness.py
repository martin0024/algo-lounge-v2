# [[1,4,5],[1,3,4]] → a list of linked-list heads; the merged list is walked
# back into an array.


class _ListNode:
    def __init__(self, val):
        self.val = val
        self.next = None


def _build(values):
    head = None
    for val in reversed(values):
        node = _ListNode(val)
        node.next = head
        head = node
    return head


def prepare(args):
    return [[_build(values) for values in args[0]]]


def serialize(result, args):
    values = []
    seen = set()
    node = result
    while node is not None:
        if id(node) in seen:
            raise ValueError("Returned list contains a cycle.")
        seen.add(id(node))
        values.append(node.val)
        node = node.next
    return values
