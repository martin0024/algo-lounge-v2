def find_in_mountain_array(mountain_arr: "MountainArray", target: int) -> int:
    # Three binary searches: the peak, then the rising side, then the falling side.
    n = mountain_arr.length()
    lo, hi = 0, n - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if mountain_arr.get(mid) < mountain_arr.get(mid + 1):
            lo = mid + 1
        else:
            hi = mid
    peak = lo

    lo, hi = 0, peak
    while lo <= hi:
        mid = (lo + hi) // 2
        value = mountain_arr.get(mid)
        if value == target:
            return mid
        if value < target:
            lo = mid + 1
        else:
            hi = mid - 1

    lo, hi = peak + 1, n - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        value = mountain_arr.get(mid)
        if value == target:
            return mid
        if value > target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
