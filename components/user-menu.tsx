"use client"

import { useRouter } from "next/navigation"
import * as React from "react"

import {
  IconLayoutDashboard,
  IconLoader2,
  IconLogout,
} from "@tabler/icons-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DiscordIcon } from "@/components/icons"
import { signIn, signOut, useSession } from "@/lib/auth-client"
import { getInitials } from "@/lib/format"

export function UserMenu() {
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const [loggingIn, setLoggingIn] = React.useState(false)
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  if (!mounted || isPending) {
    return <div className="size-8 rounded-full bg-muted" />
  }

  if (!session) {
    return (
      <Button
        className="bg-[#5865F2] text-white hover:bg-[#4752c4]"
        disabled={loggingIn}
        onClick={() => {
          setLoggingIn(true)
          signIn.social(
            { provider: "discord", callbackURL: "/questions" },
            { onError: () => setLoggingIn(false) }
          )
        }}
      >
        {loggingIn ? (
          <IconLoader2 data-icon="inline-start" className="animate-spin" />
        ) : (
          <DiscordIcon />
        )}
        Login with Discord
      </Button>
    )
  }

  const { name, email, image } = session.user

  async function handleSignOut() {
    await signOut()
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full outline-none hover:opacity-80 focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label="Open account menu"
      >
        <Avatar size="sm" className="after:hidden">
          {image ? <AvatarImage src={image} alt={name} /> : null}
          <AvatarFallback>{getInitials(name || email)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="z-[100] w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-0.5">
              <span className="truncate font-medium text-foreground">
                {name}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {email}
              </span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => {
              router.push("/dashboard")
            }}
          >
            <IconLayoutDashboard />
            Dashboard
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
            <IconLogout />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
