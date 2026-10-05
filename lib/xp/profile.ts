import { ACHIEVEMENTS } from "@/lib/xp/achievements"
import type { AchievementTier } from "@/lib/xp/achievements"
import { totalXp, unlockedAchievementIds } from "@/lib/xp/award"
import { levelProgress, type LevelProgress } from "@/lib/xp/levels"

export type AchievementView = {
  id: string
  name: string
  description: string
  tier: AchievementTier
  xp: number
  icon: string
  unlockedAt: string | null
}

export type XpProfile = LevelProgress & {
  achievements: AchievementView[]
  unlockedCount: number
  achievementCount: number
}

/** Everything the XP bar and the dashboard panel need, in two queries. */
export async function getXpProfile(userId: string): Promise<XpProfile> {
  const [xp, unlocked] = await Promise.all([
    totalXp(userId),
    unlockedAchievementIds(userId),
  ])

  const unlockedAt = new Map(
    unlocked.map((row) => [row.id, row.unlockedAt.toISOString()])
  )

  const achievements: AchievementView[] = ACHIEVEMENTS.map(
    ({ id, name, description, tier, xp: reward, icon }) => ({
      id,
      name,
      description,
      tier,
      xp: reward,
      icon,
      unlockedAt: unlockedAt.get(id) ?? null,
    })
  )

  return {
    ...levelProgress(xp),
    achievements,
    unlockedCount: achievements.filter((a) => a.unlockedAt !== null).length,
    achievementCount: achievements.length,
  }
}
