/**
 * Level curve. Cumulative XP to *reach* a level:
 *
 *   xpForLevel(L) = 25·(L-1)² + 75·(L-1)
 *
 * L1=0, L2=100, L3=250, L4=450, L5=700, L6=1000 — each level costs 50 XP more
 * than the last, so progress stays visible without ever feeling free.
 */

export type Rank = {
  /** Lowest level in this tier. */
  minLevel: number
  name: string
  /** Flavor: the complexity class you've "optimized down to". */
  complexity: string
}

export const RANKS: Rank[] = [
  { minLevel: 1, name: "Brute Forcer", complexity: "O(n²)" },
  { minLevel: 5, name: "Sorter", complexity: "O(n log n)" },
  { minLevel: 10, name: "Linear", complexity: "O(n)" },
  { minLevel: 15, name: "Binary", complexity: "O(log n)" },
  { minLevel: 20, name: "Constant", complexity: "O(1)" },
]

export function xpForLevel(level: number): number {
  const n = Math.max(0, level - 1)
  return 25 * n * n + 75 * n
}

export function levelFromXp(xp: number): number {
  if (xp <= 0) return 1
  // Invert 25n² + 75n = xp.
  const n = Math.floor((-75 + Math.sqrt(5625 + 100 * xp)) / 50)
  return n + 1
}

export function rankForLevel(level: number): Rank {
  let rank = RANKS[0]
  for (const candidate of RANKS) {
    if (level >= candidate.minLevel) rank = candidate
  }
  return rank
}

export type LevelProgress = {
  xp: number
  level: number
  rank: Rank
  /** XP earned inside the current level. */
  levelXp: number
  /** XP the current level spans. */
  levelSpan: number
  /** XP still needed to level up. */
  toNextLevel: number
  /** 0–1, for the bar. */
  progress: number
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelFromXp(xp)
  const floor = xpForLevel(level)
  const ceiling = xpForLevel(level + 1)
  const levelSpan = ceiling - floor
  const levelXp = xp - floor

  return {
    xp,
    level,
    rank: rankForLevel(level),
    levelXp,
    levelSpan,
    toNextLevel: ceiling - xp,
    progress: levelSpan > 0 ? levelXp / levelSpan : 0,
  }
}
