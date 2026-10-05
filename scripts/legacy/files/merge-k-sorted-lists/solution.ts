export function mergeKLists(lists: (ListNode | null)[]): ListNode | null {
  // Divide and conquer: merge pairs until one list remains — O(n log k).
  const mergeTwo = (a: ListNode | null, b: ListNode | null) => {
    const dummy = new ListNode()
    let tail = dummy
    while (a && b) {
      if (a.val <= b.val) {
        tail.next = a
        a = a.next
      } else {
        tail.next = b
        b = b.next
      }
      tail = tail.next
    }
    tail.next = a ?? b
    return dummy.next
  }
  let round = lists.filter((l) => l !== null)
  if (round.length === 0) return null
  while (round.length > 1) {
    const next: (ListNode | null)[] = []
    for (let i = 0; i < round.length; i += 2) {
      next.push(mergeTwo(round[i], round[i + 1] ?? null))
    }
    round = next
  }
  return round[0]
}
