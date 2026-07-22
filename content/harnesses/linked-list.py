
class _ListNode:
    def __init__(self, val):
        self.val = val
        self.next = None


def _build_list(values):
    head = None
    tail = None
    for val in values:
        node = _ListNode(val)
        if tail is not None:
            tail.next = node
        else:
            head = node
        tail = node
    return head


def prepare(args):
    return [_build_list(a) if isinstance(a, list) else a for a in args]


def serialize(result, args):
    if result is None:
        return []
    if not hasattr(result, "next"):
        return result

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
