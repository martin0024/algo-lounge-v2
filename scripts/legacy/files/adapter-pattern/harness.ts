// [holeSize, shapeType, shapeSize]: a square is tested directly, a circle
// through CircleToSquareAdapter. The answer is SquareHole.canFit(...).

type Ctor = new (
  ...args: unknown[]
) => Record<string, (...a: unknown[]) => unknown>

export function invoke(
  adapter: unknown,
  args: unknown[],
  user: Record<string, unknown>
) {
  const [holeSize, shapeType, shapeSize] = args
  const SquareHole = user.SquareHole as Ctor
  const Square = user.Square as Ctor
  const Circle = user.Circle as Ctor
  const hole = new SquareHole(holeSize)
  const shape =
    shapeType === "square"
      ? new Square(shapeSize)
      : new (adapter as Ctor)(new Circle(shapeSize))
  return hole.canFit(shape)
}
