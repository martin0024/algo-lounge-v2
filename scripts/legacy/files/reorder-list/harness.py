# Linked list in, reordered in place: the answer is the list read from the
# original head, whatever the function returns.


class _ListNode:
    def __init__(self, val):
        self.val = val
        self.next = None


def prepare(args):
    head = None
    for val in reversed(args[0]):
        node = _ListNode(val)
        node.next = head
        head = node
    return [head]


def serialize(result, args):
    values = []
    seen = set()
    node = args[0]
    while node is not None:
        if id(node) in seen:
            raise ValueError("The reordered list contains a cycle.")
        seen.add(id(node))
        values.append(node.val)
        node = node.next
    return values
