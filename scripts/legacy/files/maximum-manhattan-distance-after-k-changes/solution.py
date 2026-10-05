def max_distance(s: str, k: int) -> int:
    # After i + 1 moves the distance is |N - S| + |E - W|; each change can add
    # 2, but the distance can never exceed the number of moves made.
    north = south = east = west = 0
    best = 0
    for i, ch in enumerate(s):
        if ch == "N":
            north += 1
        elif ch == "S":
            south += 1
        elif ch == "E":
            east += 1
        else:
            west += 1
        distance = abs(north - south) + abs(east - west)
        best = max(best, min(distance + 2 * k, i + 1))
    return best
