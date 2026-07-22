export class GraphNode {
  val: number
  neighbors: GraphNode[]

  constructor(val = 0, neighbors: GraphNode[] = []) {
    this.val = val
    this.neighbors = neighbors
  }
}

export function cloneGraph(node: GraphNode | null): GraphNode | null {
  // Your code here
  return null
}
