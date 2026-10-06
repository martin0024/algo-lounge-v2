def rotate(matrix: list[list[int]]) -> None:
    # Clockwise rotation = transpose, then reverse each row — both in place.
    n = len(matrix)
    for i in range(n):
        for j in range(i + 1, n):
            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
    for row in matrix:
        row.reverse()
