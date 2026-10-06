export function longestPalindrome(s: string): string {
  let best = ""
  // Expand around every center (a character, or the gap between two).
  const expand = (left: number, right: number) => {
    while (left >= 0 && right < s.length && s[left] === s[right]) {
      left--
      right++
    }
    const found = s.slice(left + 1, right)
    if (found.length > best.length) best = found
  }
  for (let i = 0; i < s.length; i++) {
    expand(i, i)
    expand(i, i + 1)
  }
  return best
}
