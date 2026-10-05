"use client"

import { AchievementIcon, tierStyles } from "@/components/achievement-icon"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { AchievementView, XpProfile } from "@/lib/xp/profile"

export function XpPanel({ profile }: { profile: XpProfile }) {
  const pct = Math.round(profile.progress * 100)

  return (
    <TooltipProvider delay={200}>
      <div className="flex flex-col gap-5">
        <div className="relative isolate overflow-hidden rounded-2xl bg-muted/40 p-4">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-10 -left-8 -z-10 size-36 rounded-full bg-primary/25 blur-3xl"
          />

          <div className="flex items-center gap-4">
            <LevelEmblem level={profile.level} progress={profile.progress} />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-semibold tracking-tight">
                  {profile.rank.name}
                </span>
                <Badge variant="outline" className="font-mono">
                  {profile.rank.complexity}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                {profile.xp.toLocaleString()} XP total
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary/10">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-xs text-muted-foreground tabular-nums">
                <span>
                  {profile.levelXp.toLocaleString()} /{" "}
                  {profile.levelSpan.toLocaleString()} XP
                </span>
                <span>
                  {profile.toNextLevel.toLocaleString()} to level{" "}
                  {profile.level + 1}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold tracking-tight">
              Achievements
            </h3>
            <Badge variant="secondary">
              {profile.unlockedCount}/{profile.achievementCount}
            </Badge>
          </div>

          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-7">
            {profile.achievements.map((achievement) => (
              <li key={achievement.id}>
                <AchievementMedal achievement={achievement} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </TooltipProvider>
  )
}

function LevelEmblem({ level, progress }: { level: number; progress: number }) {
  const size = 68
  const stroke = 3.5
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.min(1, Math.max(0, progress)))

  return (
    <div
      className="relative size-[68px] shrink-0"
      role="img"
      aria-label={`Level ${level}, ${Math.round(progress * 100)} percent through this level`}
    >
      <svg className="size-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-primary/15"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-primary"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-[7px] grid place-items-center rounded-full bg-primary text-primary-foreground">
        <span className="text-xl leading-none font-bold tabular-nums">
          {level}
        </span>
      </div>
    </div>
  )
}

function AchievementMedal({ achievement }: { achievement: AchievementView }) {
  const unlocked = achievement.unlockedAt !== null
  const tier = tierStyles[achievement.tier]

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex w-full flex-col items-center gap-1.5 rounded-2xl px-1.5 py-2.5 transition-colors",
              "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
              unlocked ? "bg-card/60 hover:bg-card" : "hover:bg-muted/40"
            )}
          />
        }
      >
        <span
          className={cn(
            "grid size-11 place-items-center rounded-xl ring-1",
            unlocked
              ? cn(tier.badge, tier.ring)
              : "bg-muted/60 text-muted-foreground/45 ring-transparent"
          )}
          style={
            unlocked
              ? { boxShadow: `0 10px 22px -14px ${tier.glow}` }
              : undefined
          }
        >
          <AchievementIcon
            icon={achievement.icon}
            className={cn("size-5", !unlocked && "opacity-70")}
          />
        </span>
        <span
          className={cn(
            "line-clamp-2 text-center text-[11px] leading-tight font-medium",
            !unlocked && "text-muted-foreground"
          )}
        >
          {achievement.name}
        </span>
        <span
          className={cn(
            "text-[10px] tabular-nums",
            unlocked ? "font-medium text-primary" : "text-muted-foreground/50"
          )}
        >
          +{achievement.xp}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="flex-col items-start gap-1 py-2 text-left"
      >
        <span className="font-medium">{achievement.name}</span>
        <span className="opacity-70">{achievement.description}</span>
        <span className="tabular-nums opacity-70">
          {tier.label} · +{achievement.xp} XP
          {unlocked ? " · Unlocked" : ""}
        </span>
      </TooltipContent>
    </Tooltip>
  )
}
