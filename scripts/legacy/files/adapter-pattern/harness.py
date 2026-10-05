# [holeSize, shapeType, shapeSize]: a square is tested directly, a circle
# through CircleToSquareAdapter. The answer is SquareHole.canFit(...).


def invoke(adapter, args, user):
    hole_size, shape_type, shape_size = args
    hole = user["SquareHole"](hole_size)
    if shape_type == "square":
        shape = user["Square"](shape_size)
    else:
        shape = adapter(user["Circle"](shape_size))
    return hole.canFit(shape)
