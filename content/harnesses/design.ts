// Drives a class through a LeetCode-style operation log:
//   input    = [operations, arguments]
//   operations[0] constructs the class, every later entry calls that method.
// One result per operation (null for the constructor and void methods).

type Instance = Record<string, unknown>

export function invoke(Cls: unknown, args: unknown[]): unknown[] {
  const [operations, argumentLists] = args as [string[], unknown[][]]
  if (operations.length === 0) return []
  const Ctor = Cls as new (...ctorArgs: unknown[]) => Instance
  const instance = new Ctor(...argumentLists[0])
  const results: unknown[] = [null]
  for (let i = 1; i < operations.length; i++) {
    const method = instance[operations[i]]
    if (typeof method !== "function") {
      throw new Error(`${Ctor.name} has no method "${operations[i]}".`)
    }
    const result = method.apply(instance, argumentLists[i])
    results.push(result === undefined ? null : result)
  }
  return results
}
