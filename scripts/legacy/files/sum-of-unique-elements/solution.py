from collections import Counter


def sum_of_unique(nums: list[int]) -> int:
    return sum(x for x, count in Counter(nums).items() if count == 1)
