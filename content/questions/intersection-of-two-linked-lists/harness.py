# [listA, listB, skipA, skipB]: after skipA nodes of A and skipB nodes of B
# the two lists share the same tail nodes. The answer is the value of the
# returned node — which must be the first shared node itself, not a copy.


class _ListNode:
    def __init__(self, val):
        self.val = val
        self.next = None


def _chain(values, tail=None):
    head = tail
    for val in reversed(values):
        node = _ListNode(val)
        node.next = head
        head = node
    return head


_shared = None


def prepare(args):
    global _shared
    list_a, list_b, skip_a, skip_b = args
    _shared = _chain(list_a[skip_a:])
    return [_chain(list_a[:skip_a], _shared), _chain(list_b[:skip_b], _shared)]


def serialize(result, args):
    if result is None:
        return None
    if result is not _shared:
        raise ValueError(
            f"Returned node ({result.val}) is not where the lists intersect."
        )
    return result.val
