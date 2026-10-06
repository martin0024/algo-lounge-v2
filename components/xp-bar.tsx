"use client"

import * as React from "react"

import { IconTrophy } from "@tabler/icons-react"

import { useXp } from "@/components/xp-provider"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { xpTier } from "@/lib/xp/magnitude"

/** Tween a number so XP gains read as a climb, not a jump. */
function useCountUp(target: number, durationMs = 900) {
  const [value, setValue] = React.useState(target)
  const fromRef = React.useRef(target)

  React.useEffect(() => {
    const from = fromRef.current
    if (from === target) return

    let frame = 0
    const start = performance.now()

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3) // easeOutCubic
      setValue(Math.round(from + (target - from) * eased))
      if (t < 1) frame = requestAnimationFrame(tick)
      else fromRef.current = target
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, durationMs])

  return value
}

/**
 * Drives the fill width. On a level-up the bar can't just snap backwards, so
 * it runs to 100%, resets to empty without a transition, then fills to the
 * new position — the sequence you expect from a game bar.
 */
function useBarFill(level: number, targetPct: number) {
  const [width, setWidth] = React.useState(targetPct)
  const [animate, setAnimate] = React.useState(true)
  const levelRef = React.useRef(level)

  React.useEffect(() => {
    const previousLevel = levelRef.current
    levelRef.current = level

    if (previousLevel === level) {
      setWidth(targetPct)
      return
    }

    const timers: ReturnType<typeof setTimeout>[] = []
    setAnimate(true)
    setWidth(100)

    timers.push(
      setTimeout(() => {
        setAnimate(false)
        setWidth(0)
      }, 620)
    )
    timers.push(
      setTimeout(() => {
        setAnimate(true)
        setWidth(targetPct)
      }, 700)
    )

    return () => timers.forEach(clearTimeout)
  }, [level, targetPct])

  return { width, animate }
}

export function XpBar() {
  const { profile, loading, lastGain } = useXp()

  const targetPct = profile ? Math.round(profile.progress * 100) : 0
  const level = profile?.level ?? 1

  const displayXp = useCountUp(profile?.xp ?? 0)
  const { width, animate } = useBarFill(level, targetPct)

  if (loading) {
    return <div className="h-5 w-32 animate-pulse rounded-full bg-muted" />
  }
  if (!profile) return null

  // `lastGain.id` changes on every award, which restarts the one-shot effects.
  const gainKey = lastGain?.id ?? "idle"

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div className="relative flex h-8 items-center gap-2 rounded-full py-1 pr-2.5 pl-1" />
        }
      >
        {lastGain && (
          <span
            key={gainKey}
            data-xp-tier={xpTier(lastGain.amount)}
            className="xp-float-up pointer-events-none absolute -top-1 left-1/2 text-xs font-bold tabular-nums"
            style={{
              color: "var(--xp-accent)",
              textShadow: "0 0 12px var(--xp-accent-soft)",
            }}
          >
            +{lastGain.amount}
          </span>
        )}

        <span
          key={`pill-${level}`}
          className="xp-pill-pop grid size-6 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground tabular-nums"
        >
          {profile.level}
        </span>

        <span className="hidden w-20 sm:block">
          <span className="relative block h-1.5 overflow-hidden rounded-full bg-primary/15">
            <span
              className={cn(
                "block h-full rounded-full bg-primary",
                animate &&
                  "transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
              )}
              style={{ width: `${Math.max(width, profile.xp > 0 ? 4 : 0)}%` }}
            />
            {lastGain && (
              <span
                key={`sweep-${gainKey}`}
                aria-hidden
                className="xp-bar-sweep absolute inset-y-0 left-0 w-1/2 rounded-full bg-linear-to-r from-transparent via-white/70 to-transparent"
              />
            )}
          </span>
        </span>

        <span className="text-xs font-medium text-muted-foreground tabular-nums">
          {displayXp.toLocaleString()} XP
        </span>
      </TooltipTrigger>

      <TooltipContent side="bottom" sideOffset={8} className="max-w-none">
        <div className="flex flex-col gap-1">
          <span className="font-medium">
            Level {profile.level} · {profile.rank.name}
          </span>
          <span className="text-muted-foreground">
            {profile.rank.complexity} · {profile.toNextLevel.toLocaleString()}{" "}
            XP to level {profile.level + 1}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <IconTrophy className="size-3" />
            {profile.unlockedCount}/{profile.achievementCount} achievements
          </span>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
