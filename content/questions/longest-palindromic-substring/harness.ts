// Several substrings can tie for longest, so any of them is accepted: a valid
// answer (a palindrome that occurs in s) is compared by its length.

export function serialize(result: unknown, args: unknown[]): unknown {
  const s = args[0] as string
  if (typeof result !== "string") throw new Error("Return a string.")
  if (result !== [...result].reverse().join("")) {
    throw new Error(`"${result}" is not a palindrome.`)
  }
  if (!s.includes(result))
    throw new Error(`"${result}" is not a substring of s.`)
  return result.length
}
