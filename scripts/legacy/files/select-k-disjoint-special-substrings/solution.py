def max_substring_length(s: str, k: int) -> bool:
    # The smallest special substring starting at a letter's first occurrence
    # grows to cover the last occurrence of every letter inside it; it fails
    # if it meets a letter that already appeared before it. Then pick as many
    # disjoint candidates as possible, earliest end first.
    first, last = {}, {}
    for i, ch in enumerate(s):
        first.setdefault(ch, i)
        last[ch] = i

    candidates = []
    for ch, start in first.items():
        end = last[ch]
        j = start
        valid = True
        while j <= end:
            if first[s[j]] < start:
                valid = False
                break
            end = max(end, last[s[j]])
            j += 1
        if valid and not (start == 0 and end == len(s) - 1):
            candidates.append((end, start))

    chosen, boundary = 0, -1
    for end, start in sorted(candidates):
        if start > boundary:
            chosen += 1
            boundary = end
    return chosen >= k
