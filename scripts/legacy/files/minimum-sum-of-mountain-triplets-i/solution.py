def minimum_sum(nums: list[int]) -> int:
    # For each peak j, pair it with the smallest value on each side.
    n = len(nums)
    best = -1
    for j in range(1, n - 1):
        left = min(nums[:j])
        right = min(nums[j + 1:])
        if left < nums[j] and right < nums[j]:
            total = left + nums[j] + right
            if best == -1 or total < best:
                best = total
    return best
