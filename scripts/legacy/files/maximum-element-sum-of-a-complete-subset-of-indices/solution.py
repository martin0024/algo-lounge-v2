def maximum_sum(nums: list[int]) -> int:
    # Indices whose product is a perfect square share a square-free part, so
    # every complete subset is {i * 1, i * 4, i * 9, ...} for some i.
    n = len(nums)
    best = 0
    for i in range(1, n + 1):
        total = 0
        j = 1
        while i * j * j <= n:
            total += nums[i * j * j - 1]
            j += 1
        best = max(best, total)
    return best
