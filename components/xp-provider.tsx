"use client"

import * as React from "react"

import { useSession } from "@/lib/auth-client"
import type { UnlockedAchievement, XpAward } from "@/lib/xp/award"
import { XP_UI_ENABLED } from "@/lib/xp/config"
import { levelProgress, type LevelProgress } from "@/lib/xp/levels"
import type { XpProfile } from "@/lib/xp/profile"

import { XpDevPanel } from "@/components/xp-dev-panel"
import { XpToastStack } from "@/components/xp-toasts"

export type XpToast =
  | { id: string; type: "xp"; award: XpAward }
  | { id: string; type: "level"; progress: LevelProgress }
  | { id: string; type: "achievement"; achievement: UnlockedAchievement }

type XpContextValue = {
  profile: XpProfile | null
  loading: boolean
  /** Fold a submission's award into the bar and raise the toasts. */
  applyAward: (award: XpAward | null | undefined) => void
  refresh: () => Promise<void>
  toasts: XpToast[]
  dismiss: (id: string) => void
  /** Most recent gain. The `id` changes per award so one-shot CSS restarts. */
  lastGain: { amount: number; id: string } | null
}

const XpContext = React.createContext<XpContextValue | null>(null)

export function XpProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession()
  const userId = session?.user.id ?? null

  const [loaded, setLoaded] = React.useState<{
    userId: string
    profile: XpProfile
  } | null>(null)
  const [toasts, setToasts] = React.useState<XpToast[]>([])
  const [lastGain, setLastGain] = React.useState<{
    amount: number
    id: string
  } | null>(null)

  const profile = loaded?.userId === userId ? loaded.profile : null
  const loading = isPending || (userId !== null && profile === null)

  const load = React.useCallback(async (uid: string) => {
    try {
      const res = await fetch("/api/xp", { cache: "no-store" })
      if (!res.ok) return
      setLoaded({ userId: uid, profile: (await res.json()) as XpProfile })
    } catch {
      // Nothing to show is better than a wrong number.
    }
  }, [])

  React.useEffect(() => {
    if (!XP_UI_ENABLED || isPending || !userId) return
    if (loaded?.userId === userId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(userId)
  }, [isPending, userId, loaded?.userId, load])

  const refresh = React.useCallback(async () => {
    if (userId) await load(userId)
  }, [userId, load])

  const dismiss = React.useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const applyAward = React.useCallback((award: XpAward | null | undefined) => {
    if (!award) return

    // Move the bar straight away rather than waiting on a refetch.
    setLoaded((current) =>
      current === null
        ? current
        : {
            ...current,
            profile: {
              ...current.profile,
              ...levelProgress(award.after.xp),
              achievements: current.profile.achievements.map((entry) =>
                award.achievements.some((won) => won.id === entry.id)
                  ? { ...entry, unlockedAt: new Date().toISOString() }
                  : entry
              ),
              unlockedCount:
                current.profile.unlockedCount + award.achievements.length,
            },
          }
    )

    const stamp = Date.now()
    const next: XpToast[] = []
    if (award.gained > 0) {
      next.push({ id: `xp-${stamp}`, type: "xp", award })
      setLastGain({ amount: award.gained, id: `gain-${stamp}` })
    }
    if (award.leveledUp) {
      next.push({ id: `lv-${stamp}`, type: "level", progress: award.after })
    }
    for (const achievement of award.achievements) {
      next.push({
        id: `ach-${achievement.id}-${stamp}`,
        type: "achievement",
        achievement,
      })
    }
    if (next.length > 0) setToasts((current) => [...current, ...next])
  }, [])

  const value = React.useMemo<XpContextValue>(
    () => ({
      profile,
      loading,
      applyAward,
      refresh,
      toasts,
      dismiss,
      lastGain,
    }),
    [profile, loading, applyAward, refresh, toasts, dismiss, lastGain]
  )

  return (
    <XpContext.Provider value={value}>
      {children}
      {XP_UI_ENABLED && (
        <>
          <XpToastStack />
          <XpDevPanel />
        </>
      )}
    </XpContext.Provider>
  )
}

export function useXp() {
  const value = React.useContext(XpContext)
  if (!value) throw new Error("useXp must be used inside <XpProvider>")
  return value
}
