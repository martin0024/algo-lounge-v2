export function reorderList(head: ListNode | null): void {
  if (!head || !head.next) return
  // 1. Find the middle.
  let slow: ListNode = head
  let fast: ListNode | null = head
  while (fast.next && fast.next.next) {
    slow = slow.next!
    fast = fast.next.next
  }
  // 2. Reverse the second half.
  let prev: ListNode | null = null
  let curr = slow.next
  slow.next = null
  while (curr) {
    const next: ListNode | null = curr.next
    curr.next = prev
    prev = curr
    curr = next
  }
  // 3. Weave the two halves together.
  let first: ListNode | null = head
  let second = prev
  while (second) {
    const nextFirst: ListNode | null = first!.next
    const nextSecond: ListNode | null = second.next
    first!.next = second
    second.next = nextFirst
    first = nextFirst
    second = nextSecond
  }
}
