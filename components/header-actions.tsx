"use client"

import * as React from "react"

import { ThemeToggle } from "@/components/theme-toggle"
import { UserMenu } from "@/components/user-menu"
import { XpBar } from "@/components/xp-bar"
import { Separator } from "@/components/ui/separator"
import { useSession } from "@/lib/auth-client"
import { cn } from "@/lib/utils"
import { XP_UI_ENABLED } from "@/lib/xp/config"

const CHIP =
  "rounded-full border bg-card/60 shadow-xs backdrop-blur-sm dark:shadow-none"

export function HeaderActions() {
  const { data: session, isPending } = useSession()
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  if (!mounted || isPending) {
    return (
      <div className={cn("ml-auto flex h-8 items-center gap-1 px-1", CHIP)}>
        <div className="h-1.5 w-20 animate-pulse rounded-full bg-muted" />
        <div className="size-6 animate-pulse rounded-full bg-muted" />
        <div className="size-6 animate-pulse rounded-full bg-muted" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="ml-auto flex h-8 items-center gap-2">
        <UserMenu />
        <ThemeToggle className={CHIP} />
      </div>
    )
  }

  return (
    <div className={cn("ml-auto flex h-8 items-center gap-1 pr-1", CHIP)}>
      {XP_UI_ENABLED && (
        <>
          <XpBar />
          <Separator
            orientation="vertical"
            className="mx-1 h-3.5 self-center"
          />
        </>
      )}
      <UserMenu />
      <ThemeToggle size="icon-xs" />
    </div>
  )
}
