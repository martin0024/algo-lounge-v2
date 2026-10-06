"use client"

import Link from "next/link"
import * as React from "react"

import { IconChevronRight, IconLock } from "@tabler/icons-react"

import { useDiscordAccess } from "@/components/discord-access-provider"

/**
 * A question row link that opens the Discord gate instead of navigating when
 * the visitor isn't a verified SCS member. Once they are, the gate hands them
 * straight to `href`.
 *
 * Renders its own trailing affordance (chevron, or a lock while gated).
 */
export function QuestionLink({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: React.ReactNode
}) {
  const { locked, status, requestAccess } = useDiscordAccess()
  const showLock = locked && status !== "loading"

  return (
    <Link
      href={href}
      className={className}
      onClick={(event) => {
        // Let modified clicks (new tab) through — the workspace gates itself.
        if (event.metaKey || event.ctrlKey || event.shiftKey) return
        if (requestAccess(href)) event.preventDefault()
      }}
    >
      {children}
      {showLock ? (
        <IconLock
          className="size-4 shrink-0 text-muted-foreground/50"
          aria-label="Members only"
        />
      ) : (
        <IconChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      )}
    </Link>
  )
}
