// The answer is k together with the first k elements of nums (sorted, since
// their order is not specified).

export function serialize(result: unknown, args: unknown[]): unknown {
  const nums = args[0] as number[]
  if (typeof result !== "number" || !Number.isInteger(result)) {
    throw new Error("Return k, the number of elements kept.")
  }
  return { k: result, nums: nums.slice(0, result).sort((a, b) => a - b) }
}
