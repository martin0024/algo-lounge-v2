export function detectCycle(head: ListNode | null): ListNode | null {
  let slow = head
  let fast = head
  while (fast && fast.next) {
    slow = slow!.next
    fast = fast.next.next
    if (slow === fast) {
      // Distance head → cycle start equals meeting point → cycle start.
      slow = head
      while (slow !== fast) {
        slow = slow!.next
        fast = fast!.next
      }
      return slow
    }
  }
  return null
}
