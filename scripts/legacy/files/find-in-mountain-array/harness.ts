// [values, target]: the array is only reachable through a MountainArray with
// get(index) and length(). More than 100 get() calls fails the case.

class MountainArray {
  private calls = 0

  constructor(private values: number[]) {}

  get(index: number): number {
    this.calls++
    if (this.calls > 100)
      throw new Error("More than 100 calls to MountainArray.get.")
    return this.values[index]
  }

  length(): number {
    return this.values.length
  }
}

export function prepare(args: unknown[]): unknown[] {
  return [new MountainArray(args[0] as number[]), args[1]]
}
