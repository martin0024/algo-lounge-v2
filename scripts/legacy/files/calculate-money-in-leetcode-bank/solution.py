def total_money(n: int) -> int:
    # Day d (0-based) of week w deposits w + d + 1 dollars.
    total = 0
    for day in range(n):
        week, weekday = divmod(day, 7)
        total += week + weekday + 1
    return total
