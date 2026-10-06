// [action, params]:
//   "square_clone"    [length]          → clone a Square, answer its length
//   "rectangle_clone" [width, height]   → clone a Rectangle, answer its size
//   "clone_shapes"    [["square", l] | ["rectangle", w, h], …]
//                                       → new Test().cloneShapes(...), describe them
// Every clone must be a new object.

type Shape = {
  clone(): Shape
  getLength(): number
  getWidth(): number
  getHeight(): number
}
type Ctor = new (...args: unknown[]) => Shape

export function invoke(
  square: unknown,
  args: unknown[],
  user: Record<string, unknown>
) {
  const [action, params] = args as [string, unknown[]]
  const Square = square as Ctor
  const Rectangle = user.Rectangle as Ctor
  if (action === "square_clone") {
    const original = new Square(params[0])
    const copy = original.clone()
    if (copy === original) throw new Error("clone() returned the same object.")
    return copy.getLength()
  }
  if (action === "rectangle_clone") {
    const original = new Rectangle(params[0], params[1])
    const copy = original.clone()
    if (copy === original) throw new Error("clone() returned the same object.")
    return [copy.getWidth(), copy.getHeight()]
  }
  const shapes = (params as unknown[][]).map((p) =>
    p[0] === "square" ? new Square(p[1]) : new Rectangle(p[1], p[2])
  )
  const Test = user.Test as new () => { cloneShapes(shapes: Shape[]): Shape[] }
  const copies = new Test().cloneShapes(shapes)
  return copies.map((copy, i) => {
    if (copy === shapes[i])
      throw new Error(`The clone at index ${i} is the same object.`)
    // (cast: TS would narrow the rectangle branch of Shape to never)
    return (copy as object) instanceof Square
      ? ["square", copy.getLength()]
      : ["rectangle", copy.getWidth(), copy.getHeight()]
  })
}
