export abstract class Shape {
  abstract clone(): Shape
}

export class Square extends Shape {
  constructor(private length: number) {
    super()
  }

  getLength(): number {
    return this.length
  }

  clone(): Shape {
    return new Square(this.length)
  }
}

export class Rectangle extends Shape {
  constructor(
    private width: number,
    private height: number
  ) {
    super()
  }

  getWidth(): number {
    return this.width
  }

  getHeight(): number {
    return this.height
  }

  clone(): Shape {
    return new Rectangle(this.width, this.height)
  }
}

export class Test {
  cloneShapes(shapes: Shape[]): Shape[] {
    return shapes.map((shape) => shape.clone())
  }
}
