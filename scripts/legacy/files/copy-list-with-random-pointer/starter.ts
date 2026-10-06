export class Node {
  val: number
  next: Node | null
  random: Node | null

  constructor(val = 0, next: Node | null = null, random: Node | null = null) {
    this.val = val
    this.next = next
    this.random = random
  }
}

export function copyRandomList(head: Node | null): Node | null {
  // Your code here
  return null
}
