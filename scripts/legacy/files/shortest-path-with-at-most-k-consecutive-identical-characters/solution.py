import heapq


def shortest_path(n: int, edges: list[list[int]], labels: str, k: int) -> int:
    # Dijkstra over (node, length of the run of equal labels ending here).
    graph = [[] for _ in range(n)]
    for u, v, w in edges:
        graph[u].append((v, w))

    dist = {(0, 1): 0}
    heap = [(0, 0, 1)]
    while heap:
        d, node, run = heapq.heappop(heap)
        if d > dist.get((node, run), float("inf")):
            continue
        if node == n - 1:
            return d
        for nxt, w in graph[node]:
            next_run = run + 1 if labels[nxt] == labels[node] else 1
            if next_run > k:
                continue
            if d + w < dist.get((nxt, next_run), float("inf")):
                dist[(nxt, next_run)] = d + w
                heapq.heappush(heap, (d + w, nxt, next_run))
    return -1
