def reverse_str(s: str, k: int) -> str:
    # In every block of 2k characters, reverse the first k.
    return "".join(s[i : i + k][::-1] + s[i + k : i + 2 * k] for i in range(0, len(s), 2 * k))
