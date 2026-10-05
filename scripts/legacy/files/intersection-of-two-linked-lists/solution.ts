export function getIntersectionNode(
  headA: ListNode | null,
  headB: ListNode | null
): ListNode | null {
  // Each pointer walks A then B (or B then A): both cover the same distance,
  // so they meet at the intersection — or at null together.
  let a = headA
  let b = headB
  while (a !== b) {
    a = a ? a.next : headB
    b = b ? b.next : headA
  }
  return a
}
