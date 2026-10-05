# Drives a class through a LeetCode-style operation log:
#   input    = [operations, arguments]
#   operations[0] constructs the class, every later entry calls that method.
# One result per operation (None for the constructor and void methods).


def invoke(cls, args, user):
    operations, arguments = args
    if not operations:
        return []
    instance = cls(*arguments[0])
    results = [None]
    for op, op_args in zip(operations[1:], arguments[1:]):
        method = getattr(instance, op, None)
        if not callable(method):
            raise AttributeError(f"{cls.__name__} has no method {op!r}.")
        results.append(method(*op_args))
    return results
