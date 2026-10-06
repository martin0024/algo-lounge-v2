def is_acronym(words: list[str], s: str) -> bool:
    return len(words) == len(s) and all(word[0] == ch for word, ch in zip(words, s))
