/**
 * Per-question adjustments for the legacy migration. Most questions need
 * none: plain JSON in, plain JSON out, compared exactly. Hand-written files
 * (starters, harnesses, reference solutions) live in files/<slug>/.
 */
import type { CompareMode } from "../../lib/judge/shared/compare"

import type { Ty } from "./starters"

export type Override = {
  /** Don't migrate; the reason is printed in the report. */
  skip?: string
  /** v2 functionName (camelCase function; PascalCase class for design). */
  functionName?: string
  /** Legacy entry name for the legacy check, when it differs. */
  oldEntry?: string
  /** Input names shown in the results UI. */
  args?: string[]
  /** Legacy input keys, in call order (default: read from prepare()). */
  argKeys?: string[]
  compare?: CompareMode
  /** Shared harness in content/harnesses (a local files/<slug>/harness.* wins). */
  harness?: string
  /** Python source defining convert(legacy_input: dict) -> list (v2 input). */
  convert?: string
  /** Class-based question, driven by the shared design harness. */
  design?: { className: string; from: "log" | "calls" }
  /** Node class the question uses (default: from the tree/list harness). */
  node?: "TreeNode" | "ListNode"
  /** The function returns the harness's node type (tree / list). */
  returnsNode?: boolean
  returnType?: Ty
  paramTypes?: (Ty | undefined)[]
  /** Run the legacy check against files/<slug>/solution.py, not the legacy
   * solution (when the legacy one is wrong). */
  oldSolutionFromFiles?: boolean
  /** v2 deliberately changes how the function is called (a real interface,
   * real nodes, true in-place), so the legacy prepare/verify can't run the
   * reference. Instead every v2 answer must equal the legacy expected value. */
  checkAgainstLegacyExpected?: boolean
  /** Case indexes (0-based) whose legacy `output` is wrong: the case is kept
   * with the reference solution's (verified-by-hand) answer. */
  legacyExpectedWrong?: number[]
  /** Case indexes (0-based) to drop entirely. */
  dropCases?: number[]
  /** Python prepended to the reference solution (helper classes the legacy
   * runtime used to provide). */
  prelude?: string
  /** "How the tests work" note appended to the description (default: one
   * derived from the harness). */
  note?: string
}

const tree = { harness: "binary-tree" } as const
const treeOut = { harness: "binary-tree", returnsNode: true } as const
const list = { harness: "linked-list" } as const
const listOut = { harness: "linked-list", returnsNode: true } as const
const inPlace = { harness: "in-place", returnType: { k: "null" } } as const

export const overrides: Record<string, Override> = {
  // ── Binary trees (level-order arrays ↔ TreeNode) ──
  "balanced-binary-tree": tree,
  "binary-tree-diameter": tree,
  "binary-tree-inorder-traversal": tree,
  "binary-tree-level-order-traversal": tree,
  "binary-tree-maximum-path-sum": tree,
  "binary-tree-postorder-traversal": tree,
  "binary-tree-preorder-traversal": tree,
  "binary-tree-right-side-view": tree,
  "diameter-of-binary-tree": tree,
  // Legacy passed the raw level-order array; v2 builds real N-ary nodes.
  "n-ary-tree-preorder-traversal": {
    checkAgainstLegacyExpected: true,
    note:
      "the tree is written in level order with `null` closing each group of " +
      "children — `[1,null,3,2,4,null,5,6]`. Your function receives real `Node` objects.",
  },
  // Legacy passed a plain list; v2 enforces the MountainArray interface.
  "find-in-mountain-array": {
    checkAgainstLegacyExpected: true,
    note:
      "`mountainArr` is written as a plain array, but your function receives a " +
      "`MountainArray` — use `get(index)` and `length()`. More than 100 `get` calls fails the test.",
  },
  "invert-binary-tree": treeOut,
  "kth-smallest-element-in-a-bst": tree,
  "maximum-depth-of-binary-tree": tree,
  "path-sum": { ...tree, legacyExpectedWrong: [7] }, // 5→4→11→7 = 27
  "same-tree": tree,
  "serialize-and-deserialize-binary-tree": treeOut,
  "subtree-of-another-tree": tree,
  "symmetric-tree": { ...tree, legacyExpectedWrong: [6] }, // [1,0,0,null,-1,-1] mirrors
  "validate-binary-search-tree": tree,
  // Plain int arrays in, a tree out — local harness (serialize only).
  "binary-tree-from-preorder-and-inorder-traversal": {
    note: "the tree you return is read back as a level-order array — `[3,9,20,null,null,15,7]`.",
  },
  // Values p/q name nodes of the tree; the answer is the node's value.
  "lowest-common-ancestor-of-a-bst": {
    note:
      "the tree is written as a level-order array and `p`/`q` as node values; your " +
      "function receives the real `TreeNode` objects, and the answer is the value " +
      "of the node you return.",
  },

  // ── Linked lists (arrays ↔ ListNode) ──
  "add-two-numbers": listOut,
  "merge-two-sorted-lists": listOut,
  "middle-of-the-linked-list": listOut,
  "odd-even-linked-list": listOut,
  "palindrome-linked-list": list,
  "remove-nth-node-from-end-of-list": listOut,
  "reverse-nodes-in-k-group": listOut,
  "sort-list": listOut,
  // Local harnesses: in-place reorder, list of lists, cycles, shared tails.
  "reorder-list": {
    note:
      "lists are written as arrays — `[1,2,3]` is `1 → 2 → 3`. The list is " +
      "read back from the original head after your function returns.",
  },
  "merge-k-sorted-lists": {
    note:
      "each list is written as an array — `[1,4,5]` is `1 → 4 → 5` — and your " +
      "function receives their `ListNode` heads. The merged list is read back into an array.",
  },
  "linked-list-cycle": {
    note:
      "`pos` is the index the tail links back to (`-1`: no cycle). It is only " +
      "used to build the list — your function receives just `head`.",
  },
  "linked-list-cycle-ii": {
    note:
      "`pos` is the index the tail links back to (`-1`: no cycle). It is only " +
      "used to build the list — your function receives just `head`. The answer " +
      "is the index of the node you return (`null` for no cycle).",
  },
  "intersection-of-two-linked-lists": {
    note:
      "`skipA`/`skipB` say where the lists join; they are only used to build the " +
      "input. The answer is the value of the node you return, which must be the " +
      "shared node itself.",
  },
  "copy-list-with-random-pointer": {
    note:
      "each node is written as `[val, randomIndex]` (`null`: no random pointer). " +
      "The copy is read back the same way and must not reuse any original node.",
  },

  // ── In-place mutation: the answer is the mutated first argument ──
  "sort-colors": inPlace,
  "move-zeroes": inPlace,
  // Legacy expected the rotated matrix to be returned.
  "rotate-image": { ...inPlace, checkAgainstLegacyExpected: true },
  "sudoku-solver": inPlace,

  // ── Answers valid in any order ──
  "3sum": { compare: "unordered-nested" },
  "4sum": { compare: "unordered-nested" },
  "anagram-groups": { compare: "unordered-nested" },
  "group-anagrams": { compare: "unordered-nested" },
  subsets: { compare: "unordered-nested" },
  "generate-parentheses": { compare: "unordered" },
  "n-queens": { compare: "unordered" },
  "pacific-atlantic-water-flow": { compare: "unordered" },
  "repeated-dna-sequences": { compare: "unordered" },
  "shut-the-box": { compare: "unordered" },
  "top-k-frequent-elements": { compare: "unordered" },
  "word-search-ii": {
    compare: "unordered",
    prelude: `
class TrieNode:
    def __init__(self):
        self.children = {}
        self.word = None
`,
  },

  "valid-binary-strings-with-cost-limit": { compare: "unordered" },
  // Legacy reference returned 1/0; files/ has the boolean version.
  "valid-parenthesis-string": { oldSolutionFromFiles: true },

  // ── Floating-point answers ──
  "calculate-amount-paid-in-taxes": { compare: "approx" },
  "fahrenheit-to-celsius": { compare: "approx" },
  "median-of-two-sorted-arrays": { compare: "approx" },
  "powx-n": { compare: "approx" },

  // ── Several correct answers: local harness checks validity ──
  "longest-palindromic-substring": {
    returnType: { k: "str" },
    note:
      "several substrings can tie for longest, so any valid one is accepted — " +
      "a palindrome that occurs in `s` is compared by its length.",
  },
  "remove-element": {
    returnType: { k: "int" },
    note:
      "the answer is `k` together with the first `k` elements of `nums` " +
      "(sorted, since their order doesn't matter).",
  },

  // ── Class-based ("design") questions ──
  // The legacy reference returned 1/0 from empty(); files/ has it returning
  // booleans (and the legacy check runs against that fixed version).
  "implement-stack": {
    design: { className: "Stack", from: "log" },
    oldSolutionFromFiles: true,
  },
  "implement-stack-using-queues": {
    design: { className: "MyStack", from: "log" },
  },
  "implement-queue": {
    design: { className: "Queue", from: "log" },
    oldSolutionFromFiles: true,
  },
  "implement-queue-using-stacks": {
    design: { className: "MyQueue", from: "log" },
    oldSolutionFromFiles: true,
  },
  "maximum-frequency-stack": {
    design: { className: "FreqStack", from: "log" },
  },
  "number-of-recent-calls": {
    design: { className: "RecentCounter", from: "log" },
  },
  "kth-largest-element-in-a-stream": {
    design: { className: "KthLargest", from: "log" },
  },
  "find-median-from-data-stream": {
    design: { className: "MedianFinder", from: "log" },
    compare: "approx",
  },
  "design-twitter": { design: { className: "Twitter", from: "log" } },
  "lru-cache": { design: { className: "LRUCache", from: "log" } },
  "min-stack": { design: { className: "MinStack", from: "log" } },
  "design-hashmap": { design: { className: "MyHashMap", from: "calls" } },
  "design-hashset": { design: { className: "MyHashSet", from: "calls" } },
  "implement-linked-list": {
    design: { className: "LinkedList", from: "calls" },
  },
  "implement-trie-prefix-tree": {
    design: { className: "Trie", from: "calls" },
  },
  "online-stock-span": {
    design: { className: "StockSpanner", from: "log" },
    convert: `
def convert(inp):
    prices = inp["prices"]
    return [["StockSpanner"] + ["next"] * len(prices), [[]] + [[p] for p in prices]]
`,
  },
  // Design-pattern exercises: several classes, local harness drives them.
  "adapter-pattern": {
    functionName: "CircleToSquareAdapter",
    note:
      "each test puts one shape in a `SquareHole` of size `holeSize` — a " +
      "`Square` directly, or a `Circle` wrapped in your adapter — and checks `canFit`.",
  },
  "factory-method-pattern": {
    functionName: "CarFactory",
    note:
      "each test runs the listed statements against your factories; the " +
      "expected output is what every statement evaluates to (`null` for assignments).",
  },
  "prototype-pattern": {
    functionName: "Square",
    note:
      "`action` picks the scenario (clone a square, clone a rectangle, or clone a " +
      "list of shapes with `Test`) and `params` supplies the shapes. Clones must be new objects.",
  },
}
