class Node:
    def __init__(self, val: int = 0, next: "Node | None" = None, random: "Node | None" = None):
        self.val = val
        self.next = next
        self.random = random


def copy_random_list(head: Node | None) -> Node | None:
    if not head:
        return None

    # First pass: one copy per original node.
    copies = {}
    current = head
    while current:
        copies[current] = Node(current.val)
        current = current.next

    # Second pass: wire next/random through the map.
    current = head
    while current:
        copy = copies[current]
        copy.next = copies.get(current.next)
        copy.random = copies.get(current.random)
        current = current.next

    return copies[head]
