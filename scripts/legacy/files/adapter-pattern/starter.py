class Square:
    def __init__(self, sideLength: float = 0.0):
        self.sideLength = sideLength

    def getSideLength(self) -> float:
        return self.sideLength

class SquareHole:
    def __init__(self, sideLength: float):
        self.sideLength = sideLength

    def canFit(self, square: Square) -> bool:
        return self.sideLength >= square.getSideLength()

class Circle:
    def __init__(self, radius: float):
        self.radius = radius

    def getRadius(self) -> float:
        return self.radius

class CircleToSquareAdapter(Square):
    # Write your code here
    pass
