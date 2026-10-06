def maximum_wealth(accounts: list[list[int]]) -> int:
    return max(sum(customer) for customer in accounts)
