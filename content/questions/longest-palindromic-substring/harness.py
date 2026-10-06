# Several substrings can tie for longest, so any of them is accepted: a valid
# answer (a palindrome that occurs in s) is compared by its length.


def serialize(result, args):
    s = args[0]
    if not isinstance(result, str):
        raise ValueError("Return a string.")
    if result != result[::-1]:
        raise ValueError(f"{result!r} is not a palindrome.")
    if result not in s:
        raise ValueError(f"{result!r} is not a substring of s.")
    return len(result)
