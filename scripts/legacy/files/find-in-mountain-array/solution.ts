interface MountainArray {
  get(index: number): number
  length(): number
}

export function findInMountainArray(
  mountainArr: MountainArray,
  target: number
): number {
  const n = mountainArr.length()
  // 1. Binary search for the peak.
  let lo = 0
  let hi = n - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (mountainArr.get(mid) < mountainArr.get(mid + 1)) lo = mid + 1
    else hi = mid
  }
  const peak = lo
  // 2. Search the rising side, then the falling side.
  const search = (from: number, to: number, rising: boolean) => {
    while (from <= to) {
      const mid = (from + to) >> 1
      const value = mountainArr.get(mid)
      if (value === target) return mid
      if (value < target === rising) from = mid + 1
      else to = mid - 1
    }
    return -1
  }
  const left = search(0, peak, true)
  return left !== -1 ? left : search(peak + 1, n - 1, false)
}
