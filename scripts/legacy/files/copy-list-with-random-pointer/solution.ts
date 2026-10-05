export function copyRandomList(head: Node | null): Node | null {
  const copies = new Map<Node, Node>()
  for (let n = head; n; n = n.next) copies.set(n, new Node(n.val))
  for (let n = head; n; n = n.next) {
    const copy = copies.get(n)!
    copy.next = n.next ? copies.get(n.next)! : null
    copy.random = n.random ? copies.get(n.random)! : null
  }
  return head ? copies.get(head)! : null
}
