import {
  IconBolt,
  IconCalendarCheck,
  IconCrosshair,
  IconFlame,
  IconHammer,
  IconLanguage,
  IconMoon,
  IconMountain,
  IconStack2,
  IconTarget,
  IconTrophy,
  IconWorld,
} from "@tabler/icons-react"

import type { AchievementTier } from "@/lib/xp/achievements"
import { cn } from "@/lib/utils"

/** Definitions carry an icon *name*; the components live here. */
const ICONS = {
  target: IconTarget,
  flame: IconFlame,
  stack: IconStack2,
  crosshair: IconCrosshair,
  languages: IconLanguage,
  world: IconWorld,
  mountain: IconMountain,
  calendar: IconCalendarCheck,
  hammer: IconHammer,
  bolt: IconBolt,
  trophy: IconTrophy,
  moon: IconMoon,
} as const

export const tierStyles: Record<
  AchievementTier,
  { badge: string; ring: string; label: string; glow: string }
> = {
  bronze: {
    badge: "bg-amber-700/15 text-amber-700 dark:text-amber-500",
    ring: "ring-amber-700/25",
    label: "Bronze",
    glow: "#b45309",
  },
  silver: {
    badge: "bg-slate-400/20 text-slate-600 dark:text-slate-300",
    ring: "ring-slate-400/30",
    label: "Silver",
    glow: "#94a3b8",
  },
  gold: {
    badge: "bg-amber-400/20 text-amber-600 dark:text-amber-400",
    ring: "ring-amber-400/35",
    label: "Gold",
    glow: "#fbbf24",
  },
}

export function AchievementIcon({
  icon,
  className,
}: {
  icon: string
  className?: string
}) {
  const Icon = ICONS[icon as keyof typeof ICONS] ?? IconTrophy
  return <Icon className={cn("size-4", className)} stroke={1.9} />
}
