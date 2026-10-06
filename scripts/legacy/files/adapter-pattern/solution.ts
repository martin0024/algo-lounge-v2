export class Square {
  constructor(private sideLength: number = 0) {}

  getSideLength(): number {
    return this.sideLength
  }
}

export class SquareHole {
  constructor(private sideLength: number) {}

  canFit(square: Square): boolean {
    return this.sideLength >= square.getSideLength()
  }
}

export class Circle {
  constructor(private radius: number) {}

  getRadius(): number {
    return this.radius
  }
}

export class CircleToSquareAdapter extends Square {
  constructor(private circle: Circle) {
    super()
  }

  // The smallest square that holds the circle has side = diameter.
  getSideLength(): number {
    return 2 * this.circle.getRadius()
  }
}
