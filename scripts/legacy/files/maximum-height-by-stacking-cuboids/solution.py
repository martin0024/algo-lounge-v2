def max_height(cuboids: list[list[int]]) -> int:
    # Rotate every cuboid so its largest side is the height, sort, then find
    # the heaviest chain where each cuboid fits on the next (LIS-style DP).
    boxes = sorted(sorted(c) for c in cuboids)
    best = [0] * len(boxes)
    for i, (w, l, h) in enumerate(boxes):
        best[i] = h
        for j in range(i):
            if boxes[j][0] <= w and boxes[j][1] <= l and boxes[j][2] <= h:
                best[i] = max(best[i], best[j] + h)
    return max(best)
