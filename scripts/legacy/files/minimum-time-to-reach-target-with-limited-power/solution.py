import heapq


def min_time_max_power(n: int, edges: list[list[int]], power: int, cost: list[int], source: int, target: int) -> list[int]:
    # Dijkstra over (time, -power): states pop in order of time, then most
    # power left. A state is useless if we already left this node earlier
    # with at least as much power.
    graph = [[] for _ in range(n)]
    for u, v, t in edges:
        graph[u].append((v, t))

    best_power = [-1] * n
    heap = [(0, -power, source)]
    while heap:
        time, neg_power, node = heapq.heappop(heap)
        remaining = -neg_power
        if node == target:
            return [time, remaining]
        if remaining <= best_power[node]:
            continue
        best_power[node] = remaining
        if remaining < cost[node]:
            continue
        for nxt, t in graph[node]:
            heapq.heappush(heap, (time + t, -(remaining - cost[node]), nxt))
    return [-1, -1]
