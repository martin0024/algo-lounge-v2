"use client"

import Link from "next/link"

import { IconLoader2 } from "@tabler/icons-react"

import { useDiscordAccess } from "@/components/discord-access-provider"
import { Button } from "@/components/ui/button"

/**
 * Direct-URL guard for the question workspace: blurs the page behind the gate
 * dialog, which the provider opens automatically on this route.
 *
 * The pages themselves stay statically generated (see CLAUDE.md), so this is a
 * client-side curtain — the authoritative check lives on `/api/submit`.
 */
export function QuestionGate() {
  const { locked, status } = useDiscordAccess()

  if (!locked) return null

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-background/70 backdrop-blur-md">
      {status === "loading" ? (
        <IconLoader2 className="size-5 animate-spin text-muted-foreground" />
      ) : (
        // The gate dialog sits above this and carries the actual messaging.
        <Button
          variant="ghost"
          size="sm"
          className="mt-auto mb-10"
          render={<Link href="/questions" />}
        >
          ← Back to questions
        </Button>
      )}
    </div>
  )
}
