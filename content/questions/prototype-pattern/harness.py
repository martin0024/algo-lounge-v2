# [action, params]:
#   "square_clone"    [length]          → clone a Square, answer its length
#   "rectangle_clone" [width, height]   → clone a Rectangle, answer its size
#   "clone_shapes"    [["square", l] | ["rectangle", w, h], …]
#                                       → Test().clone_shapes(...), describe them
# Every clone must be a new object.


def invoke(square, args, user):
    action, params = args
    Rectangle = user["Rectangle"]
    if action == "square_clone":
        original = square(params[0])
        copy = original.clone()
        if copy is original:
            raise ValueError("clone() returned the same object.")
        return copy.get_length()
    if action == "rectangle_clone":
        original = Rectangle(params[0], params[1])
        copy = original.clone()
        if copy is original:
            raise ValueError("clone() returned the same object.")
        return [copy.get_width(), copy.get_height()]
    shapes = [square(p[1]) if p[0] == "square" else Rectangle(p[1], p[2]) for p in params]
    copies = user["Test"]().clone_shapes(shapes)
    described = []
    for i, copy in enumerate(copies):
        if copy is shapes[i]:
            raise ValueError(f"The clone at index {i} is the same object.")
        if isinstance(copy, square):
            described.append(["square", copy.get_length()])
        else:
            described.append(["rectangle", copy.get_width(), copy.get_height()])
    return described
