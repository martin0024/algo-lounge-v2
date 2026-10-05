def can_be_equal(s1: str, s2: str) -> bool:
    # Swaps with j - i = 2 only move characters within the even or the odd
    # positions, so each parity class just has to hold the same letters.
    return sorted(s1[0::2]) == sorted(s2[0::2]) and sorted(s1[1::2]) == sorted(s2[1::2])
