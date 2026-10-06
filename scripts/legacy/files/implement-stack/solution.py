class Node:
    def __init__(self, val):
        self.val = val
        self.next = None

class Stack:
    def __init__(self):
        self.head = None
        self.size = 0
    
    def push(self, val):
        new_node = Node(val)
        new_node.next = self.head
        self.head = new_node
        self.size += 1
    
    def pop(self):
        if self.head is None:
            return None
        val = self.head.val
        self.head = self.head.next
        self.size -= 1
        return val
    
    def top(self):
        if self.head is None:
            return None
        return self.head.val
    
    def empty(self):
        return self.size == 0
