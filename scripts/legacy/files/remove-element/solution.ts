export function removeElement(nums: number[], val: number): number {
  let k = 0
  for (const num of nums) {
    if (num !== val) nums[k++] = num
  }
  return k
}
