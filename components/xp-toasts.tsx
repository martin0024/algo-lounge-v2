"use client"

import * as React from "react"

import { IconArrowUpRight, IconX } from "@tabler/icons-react"

import { AchievementIcon, tierStyles } from "@/components/achievement-icon"
import { useXp, type XpToast } from "@/components/xp-provider"
import { cn } from "@/lib/utils"
import { xpTier } from "@/lib/xp/magnitude"

const LINGER_MS: Record<XpToast["type"], number> = {
  xp: 5_200,
  level: 7_000,
  achievement: 7_000,
}

/** Matches `.xp-card-out` in globals.css. */
const EXIT_MS = 320

export function XpToastStack() {
  const { toasts } = useXp()

  if (toasts.length === 0) return null

  return (
    <div
      className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-72 flex-col-reverse gap-2"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <XpToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  )
}

function XpToastCard({ toast }: { toast: XpToast }) {
  const { dismiss } = useXp()
  const [exiting, setExiting] = React.useState(false)

  // Play the exit animation before the node actually leaves the tree.
  const close = React.useCallback(() => {
    setExiting(true)
    setTimeout(() => dismiss(toast.id), EXIT_MS)
  }, [dismiss, toast.id])

  React.useEffect(() => {
    const timer = setTimeout(close, LINGER_MS[toast.type])
    return () => clearTimeout(timer)
  }, [toast.type, close])

  // Every card resolves one accent that its glow and numbers read from:
  // gain size for XP, the level color, the achievement's tier.
  const tier = toast.type === "xp" ? xpTier(toast.award.gained) : undefined
  const accentOverride =
    toast.type === "level"
      ? "var(--primary)"
      : toast.type === "achievement"
        ? tierStyles[toast.achievement.tier].glow
        : undefined

  return (
    <div
      data-xp-tier={tier}
      style={
        accentOverride
          ? ({
              "--xp-accent": accentOverride,
              "--xp-accent-soft": `color-mix(in oklch, ${accentOverride} 22%, transparent)`,
            } as React.CSSProperties)
          : undefined
      }
      className={cn(
        "lounge-panel pointer-events-auto relative isolate overflow-hidden rounded-xl p-3",
        exiting ? "xp-card-out" : "xp-card-in"
      )}
    >
      {/* One-shot highlight sweeping across the card as it lands. */}
      <span
        aria-hidden
        className="xp-shimmer pointer-events-none absolute inset-y-0 -left-1/3 -z-10 w-1/3 skew-x-12 bg-linear-to-r from-transparent via-foreground/8 to-transparent"
      />

      <button
        type="button"
        onClick={close}
        className="absolute top-1.5 right-1.5 z-10 rounded-md p-1 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Dismiss"
      >
        <IconX className="size-3" />
      </button>

      {toast.type === "xp" && <XpBody toast={toast} />}
      {toast.type === "level" && <LevelBody toast={toast} />}
      {toast.type === "achievement" && <AchievementBody toast={toast} />}
    </div>
  )
}

function XpBody({ toast }: { toast: Extract<XpToast, { type: "xp" }> }) {
  // Achievement XP gets its own card; don't repeat it in the breakdown.
  const events = toast.award.events.filter(
    (event) => event.kind !== "achievement"
  )

  return (
    <div className="pr-5">
      <div className="relative inline-block">
        <span
          aria-hidden
          className="xp-glow-pulse absolute inset-0 -z-10 rounded-full blur-lg"
          style={{ background: "var(--xp-accent)" }}
        />
        <span
          className="xp-amount-in block origin-left text-2xl leading-none font-bold tabular-nums"
          style={{ color: "var(--xp-accent)" }}
        >
          +{toast.award.gained}
          <span className="ml-1 text-sm font-semibold tracking-wide opacity-70">
            XP
          </span>
        </span>
      </div>

      {events.length > 0 && (
        <ul className="mt-2.5 flex flex-col gap-0.5">
          {events.map((event, index) => (
            <li
              key={`${event.kind}-${index}`}
              className="xp-line-in flex items-baseline justify-between gap-2 text-xs text-muted-foreground"
              // Rows peel in behind the headline, one after another.
              style={{ animationDelay: `${320 + index * 90}ms` }}
            >
              <span className="truncate">{event.label}</span>
              <span className="shrink-0 tabular-nums">+{event.amount}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function LevelBody({ toast }: { toast: Extract<XpToast, { type: "level" }> }) {
  const { progress } = toast

  return (
    <div className="flex gap-3 pr-5">
      <span className="relative mt-0.5 grid size-9 shrink-0 place-items-center">
        <span
          aria-hidden
          className="xp-ring-burst absolute inset-0 rounded-xl ring-2 ring-primary/60"
        />
        <span
          aria-hidden
          className="xp-glow-pulse absolute inset-0 -z-10 rounded-full bg-primary blur-md"
        />
        <span className="grid size-9 place-items-center rounded-xl bg-primary text-base font-bold text-primary-foreground tabular-nums">
          {progress.level}
        </span>
      </span>

      <div className="min-w-0 flex-1">
        <div className="xp-amount-in flex origin-left items-center gap-1 text-base font-bold">
          Level up
          <IconArrowUpRight className="size-4 text-primary" />
        </div>
        <p
          className="xp-line-in mt-1 text-xs text-muted-foreground"
          style={{ animationDelay: "340ms" }}
        >
          {progress.rank.name} ·{" "}
          <span className="font-mono">{progress.rank.complexity}</span>
        </p>
      </div>
    </div>
  )
}

function AchievementBody({
  toast,
}: {
  toast: Extract<XpToast, { type: "achievement" }>
}) {
  const { achievement } = toast
  const tier = tierStyles[achievement.tier]

  return (
    <div className="flex gap-3">
      <span className="relative mt-0.5 grid size-9 shrink-0 place-items-center">
        <span
          aria-hidden
          className="xp-glow-pulse absolute inset-0 -z-10 rounded-full blur-md"
          style={{ background: "var(--xp-accent)" }}
        />
        <span
          className={cn(
            "grid size-9 place-items-center rounded-xl ring-1",
            tier.badge,
            tier.ring
          )}
        >
          <AchievementIcon icon={achievement.icon} className="size-4" />
        </span>
      </span>

      <div className="min-w-0 flex-1">
        {/* pr-5 keeps the title clear of the close button. */}
        <div className="xp-amount-in origin-left pr-5 text-sm font-bold">
          {achievement.name}
        </div>
        <p
          className="xp-line-in mt-0.5 text-xs text-muted-foreground"
          style={{ animationDelay: "340ms" }}
        >
          {achievement.description}
        </p>
        <span
          className="xp-line-in mt-1.5 inline-block text-xs font-semibold tabular-nums"
          style={{ color: "var(--xp-accent)", animationDelay: "400ms" }}
        >
          +{achievement.xp} XP
        </span>
      </div>
    </div>
  )
}
