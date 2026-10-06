# The answer is k together with the first k elements of nums (sorted, since
# their order is not specified).


def serialize(result, args):
    nums = args[0]
    if not isinstance(result, int) or isinstance(result, bool):
        raise ValueError("Return k, the number of elements kept.")
    return {"k": result, "nums": sorted(nums[:result])}
