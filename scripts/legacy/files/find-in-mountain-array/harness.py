# [values, target]: the array is only reachable through a MountainArray with
# get(index) and length(). More than 100 get() calls fails the case.


class MountainArray:
    def __init__(self, values):
        self._values = values
        self._calls = 0

    def get(self, index):
        self._calls += 1
        if self._calls > 100:
            raise RuntimeError("More than 100 calls to MountainArray.get.")
        return self._values[index]

    def length(self):
        return len(self._values)


def prepare(args):
    return [MountainArray(args[0]), args[1]]
