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
    // Write your code here
    return this
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
    // Write your code here
    return this
  }
}

export class Test {
  cloneShapes(shapes: Shape[]): Shape[] {
    // Write your code here
    return shapes
  }
}
