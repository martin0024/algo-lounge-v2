/**
 * How loud a gain should feel. The tier name becomes `data-xp-tier` on the
 * toast, which resolves `--xp-accent` / `--xp-accent-soft` in `globals.css`
 * (so the palette stays theme-aware without prop-drilling colors).
 */
export const xpTiers = ["spark", "steady", "strong", "big", "huge"] as const
export type XpTier = (typeof xpTiers)[number]

const THRESHOLDS: { min: number; tier: XpTier; label: string }[] = [
  { min: 200, tier: "huge", label: "Massive" },
  { min: 100, tier: "big", label: "Big" },
  { min: 50, tier: "strong", label: "Strong" },
  { min: 20, tier: "steady", label: "Solid" },
  { min: 0, tier: "spark", label: "Spark" },
]

export function xpTier(amount: number): XpTier {
  return (THRESHOLDS.find((entry) => amount >= entry.min) ?? THRESHOLDS.at(-1)!)
    .tier
}

export function xpTierLabel(amount: number): string {
  return (THRESHOLDS.find((entry) => amount >= entry.min) ?? THRESHOLDS.at(-1)!)
    .label
}
