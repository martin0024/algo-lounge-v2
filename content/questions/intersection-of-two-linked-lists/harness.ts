// [listA, listB, skipA, skipB]: after skipA nodes of A and skipB nodes of B
// the two lists share the same tail nodes. The answer is the value of the
// returned node — which must be the first shared node itself, not a copy.

type Node = { val: unknown; next: Node | null }

function chain(values: unknown[], tail: Node | null = null): Node | null {
  let head = tail
  for (const val of [...values].reverse()) head = { val, next: head }
  return head
}

let shared: Node | null = null

export function prepare(args: unknown[]): unknown[] {
  const [listA, listB, skipA, skipB] = args as [
    unknown[],
    unknown[],
    number,
    number,
  ]
  shared = chain(listA.slice(skipA))
  return [
    chain(listA.slice(0, skipA), shared),
    chain(listB.slice(0, skipB), shared),
  ]
}

export function serialize(result: unknown): unknown {
  if (result === null || result === undefined) return null
  if (result !== shared) {
    throw new Error(
      `Returned node (${(result as Node).val}) is not where the lists intersect.`
    )
  }
  return (result as Node).val
}
