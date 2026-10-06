from bisect import bisect_left, bisect_right


def shortest_matching_substring(s: str, p: str) -> int:
    # p = a*b*c. For every place b occurs, use the latest a ending before it
    # and the earliest c starting after it.
    a, b, c = p.split("*")

    def occurrences(part):
        if not part:
            return list(range(len(s) + 1))
        found, i = [], s.find(part)
        while i != -1:
            found.append(i)
            i = s.find(part, i + 1)
        return found

    starts_a, starts_b, starts_c = occurrences(a), occurrences(b), occurrences(c)
    best = -1
    for j in starts_b:
        i_index = bisect_right(starts_a, j - len(a)) - 1
        k_index = bisect_left(starts_c, j + len(b))
        if i_index < 0 or k_index == len(starts_c):
            continue
        length = starts_c[k_index] + len(c) - starts_a[i_index]
        if best == -1 or length < best:
            best = length
    return best
