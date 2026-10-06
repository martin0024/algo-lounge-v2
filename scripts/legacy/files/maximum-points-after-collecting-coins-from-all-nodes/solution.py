def maximum_points(edges: list[list[int]], coins: list[int], k: int) -> int:
    # dp[node][h]: best points in node's subtree when its coins have already
    # been halved h times. After 14 halvings every coin (<= 10^4) is 0.
    LIMIT = 14
    n = len(coins)
    graph = [[] for _ in range(n)]
    for a, b in edges:
        graph[a].append(b)
        graph[b].append(a)

    order, parent = [], [-1] * n
    stack, seen = [0], [False] * n
    seen[0] = True
    while stack:
        node = stack.pop()
        order.append(node)
        for nxt in graph[node]:
            if not seen[nxt]:
                seen[nxt] = True
                parent[nxt] = node
                stack.append(nxt)

    dp = [None] * n
    for node in reversed(order):
        children = [c for c in graph[node] if c != parent[node]]
        row = []
        for h in range(LIMIT + 1):
            value = coins[node] >> h
            keep = value - k + sum(dp[c][h] for c in children)
            halve = (value >> 1) + sum(dp[c][min(h + 1, LIMIT)] for c in children)
            row.append(max(keep, halve))
        dp[node] = row
    return dp[0][0]
