// For questions that modify their first argument in place: the answer is the
// mutated argument, whatever the function returns.

export function serialize(_result: unknown, args: unknown[]): unknown {
  return args[0]
}
