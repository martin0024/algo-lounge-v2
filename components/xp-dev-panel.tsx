"use client"

import * as React from "react"

import {
  IconChevronDown,
  IconFlask,
  IconRefresh,
  IconTrophy,
} from "@tabler/icons-react"

import { AchievementIcon } from "@/components/achievement-icon"
import { useXp } from "@/components/xp-provider"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ACHIEVEMENTS } from "@/lib/xp/achievements"
import type { AwardedEvent, XpAward } from "@/lib/xp/award"
import { levelProgress } from "@/lib/xp/levels"
import { xpTier, xpTierLabel } from "@/lib/xp/magnitude"

/**
 * Visual harness for the XP feedback. Everything here is **client-side only**
 * — it never calls the API, so the ledger stays clean and "Reload" restores
 * the real numbers. It exists to exercise the animations, not to grant XP.
 *
 * Shown in `next dev`, or in a production build with NEXT_PUBLIC_XP_DEBUG=1.
 */
const ENABLED =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_XP_DEBUG === "1"

const AMOUNTS = [5, 15, 40, 80, 150, 320]

export function XpDevPanel() {
  const { profile, applyAward, refresh } = useXp()
  const [open, setOpen] = React.useState(false)

  if (!ENABLED) return null

  function grant(gained: number, events: AwardedEvent[]) {
    if (!profile) return
    const before = levelProgress(profile.xp)
    const after = levelProgress(profile.xp + gained)
    applyAward({
      gained,
      events,
      achievements: [],
      before,
      after,
      leveledUp: after.level > before.level,
    })
  }

  function grantAchievement(id: string) {
    if (!profile) return
    const achievement = ACHIEVEMENTS.find((a) => a.id === id)
    if (!achievement) return

    const before = levelProgress(profile.xp)
    const after = levelProgress(profile.xp + achievement.xp)
    const award: XpAward = {
      gained: achievement.xp,
      events: [
        {
          kind: "achievement",
          amount: achievement.xp,
          label: achievement.name,
        },
      ],
      achievements: [
        {
          id: achievement.id,
          name: achievement.name,
          description: achievement.description,
          tier: achievement.tier,
          xp: achievement.xp,
          icon: achievement.icon,
        },
      ],
      before,
      after,
      leveledUp: after.level > before.level,
    }
    applyAward(award)
  }

  /** Exactly enough to cross into the next level, so the bar refills. */
  function grantLevelUp() {
    if (!profile) return
    grant(profile.toNextLevel, [
      {
        kind: "first_solve",
        amount: profile.toNextLevel,
        label: "First solve",
      },
    ])
  }

  /** What a real accepted submission looks like on a fresh day. */
  function grantSubmissionPreset() {
    grant(65, [
      { kind: "daily", amount: 10, label: "First submission today" },
      { kind: "first_solve", amount: 40, label: "First solve" },
      { kind: "first_try_bonus", amount: 15, label: "Accepted first try" },
    ])
  }

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-[60] flex w-64 flex-col items-start gap-2">
      {open && (
        <div className="lounge-panel pointer-events-auto flex w-full flex-col gap-3 rounded-xl p-3">
          {!profile ? (
            <p className="text-xs text-muted-foreground">
              Sign in to preview XP — the bar needs a profile to animate from.
            </p>
          ) : (
            <>
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Grant XP
                </p>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                  {AMOUNTS.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      data-xp-tier={xpTier(amount)}
                      title={`${xpTierLabel(amount)} gain`}
                      onClick={() =>
                        grant(amount, [
                          {
                            kind: "attempt",
                            amount,
                            label: `Test grant (${xpTierLabel(amount)})`,
                          },
                        ])
                      }
                      className="rounded-lg border px-2 py-1.5 text-xs font-semibold tabular-nums transition-transform active:translate-y-px"
                      style={{
                        color: "var(--xp-accent)",
                        borderColor: "var(--xp-accent-soft)",
                        background: "var(--xp-accent-soft)",
                      }}
                    >
                      +{amount}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={grantSubmissionPreset}
                >
                  Solve (+65)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={grantLevelUp}
                >
                  Level up
                </Button>
              </div>

              <div>
                <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Achievements
                </p>
                <div className="mt-1.5 max-h-40 overflow-y-auto pr-0.5">
                  <div className="flex flex-col gap-1">
                    {ACHIEVEMENTS.map((achievement) => (
                      <button
                        key={achievement.id}
                        type="button"
                        onClick={() => grantAchievement(achievement.id)}
                        className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-left text-xs transition-colors hover:bg-muted"
                      >
                        <AchievementIcon
                          icon={achievement.icon}
                          className="size-3.5 shrink-0 text-muted-foreground"
                        />
                        <span className="truncate">{achievement.name}</span>
                        <span className="ml-auto shrink-0 text-muted-foreground tabular-nums">
                          +{achievement.xp}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t pt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => void refresh()}
                >
                  <IconRefresh data-icon="inline-start" />
                  Reload real XP
                </Button>
              </div>

              <p className="text-[10px] leading-snug text-muted-foreground">
                Preview only — nothing is saved. Reload to restore your real
                total.
              </p>
            </>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "lounge-panel pointer-events-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors hover:text-foreground",
          open ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {open ? (
          <IconChevronDown className="size-3.5" />
        ) : (
          <IconFlask className="size-3.5" />
        )}
        XP preview
        {!open && <IconTrophy className="size-3 opacity-50" />}
      </button>
    </div>
  )
}
