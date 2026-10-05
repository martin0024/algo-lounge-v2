"use client"

import { usePathname, useRouter } from "next/navigation"
import * as React from "react"

import { useSession } from "@/lib/auth-client"
import type { MembershipResponse, MembershipStatus } from "@/lib/discord-config"

import { DiscordGateDialog } from "@/components/discord-gate-dialog"

export type AccessStatus = MembershipStatus | "loading"

/** The workspace is gated with a curtain the user can't dismiss. */
const BLOCKING_ROUTE = /^\/questions\/[^/]+\/?$/

type DiscordAccessValue = {
  status: AccessStatus
  /** True until we've confirmed the user is in the SCS guild. */
  locked: boolean
  /** Whether the gate is up and undismissable (question workspace). */
  blocking: boolean
  gateOpen: boolean
  refreshing: boolean
  /** How many manual re-checks have come back without access. */
  failedChecks: number
  refresh: () => Promise<void>
  /** Open the gate. Returns false if access is already granted. */
  requestAccess: (redirectTo?: string) => boolean
  closeGate: () => void
  /** Where to land after signing in, read at click time. */
  pendingRedirect: () => string | null
}

const DiscordAccessContext = React.createContext<DiscordAccessValue | null>(
  null
)

type Membership = { userId: string; status: MembershipStatus }

export function DiscordAccessProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session, isPending } = useSession()
  const userId = session?.user.id ?? null

  const [membership, setMembership] = React.useState<Membership | null>(null)
  const [refreshing, setRefreshing] = React.useState(false)
  const [failedChecks, setFailedChecks] = React.useState(0)
  const [manualOpen, setManualOpen] = React.useState(false)
  const redirectRef = React.useRef<string | null>(null)

  const status: AccessStatus = isPending
    ? "loading"
    : !userId
      ? "signed-out"
      : membership?.userId === userId
        ? membership.status
        : "loading"

  const locked = status !== "member"
  const blocking = BLOCKING_ROUTE.test(pathname)
  // On the workspace the gate opens by itself, but not while the check is in
  // flight — a returning member shouldn't see a modal flash on every load.
  const gateOpen = blocking
    ? locked && status !== "loading"
    : manualOpen && locked

  const load = React.useCallback(
    async (uid: string, force: boolean) => {
      let next: MembershipStatus = "unavailable"
      try {
        const res = await fetch("/api/discord/membership", {
          method: force ? "POST" : "GET",
          cache: "no-store",
        })
        if (res.ok) {
          next = ((await res.json()) as MembershipResponse).status
        }
      } catch {
        // Offline or aborted — treated the same as an API failure.
      }

      setMembership({ userId: uid, status: next })
      if (!force) setFailedChecks(0)

      if (next === "member") {
        setManualOpen(false)
        const target = redirectRef.current
        redirectRef.current = null
        if (target) router.push(target)
      }
      return next
    },
    [router]
  )

  // Kick off the membership check whenever the signed-in user changes.
  React.useEffect(() => {
    if (isPending || !userId) return
    if (membership?.userId === userId) return
    // `load` only sets state after awaiting the fetch, which the rule can't
    // see through — this is the ordinary "fetch on mount" shape.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(userId, false)
  }, [isPending, userId, membership?.userId, load])

  const refresh = React.useCallback(async () => {
    if (!userId) return
    setRefreshing(true)
    const next = await load(userId, true)
    setRefreshing(false)
    setFailedChecks((n) => (next === "member" ? 0 : n + 1))
  }, [userId, load])

  const requestAccess = React.useCallback(
    (redirectTo?: string) => {
      if (!locked) return false
      redirectRef.current = redirectTo ?? null
      setManualOpen(true)
      return true
    },
    [locked]
  )

  const closeGate = React.useCallback(() => {
    redirectRef.current = null
    setManualOpen(false)
  }, [])

  const pendingRedirect = React.useCallback(() => redirectRef.current, [])

  const value = React.useMemo<DiscordAccessValue>(
    () => ({
      status,
      locked,
      blocking,
      gateOpen,
      refreshing,
      failedChecks,
      refresh,
      requestAccess,
      closeGate,
      pendingRedirect,
    }),
    [
      status,
      locked,
      blocking,
      gateOpen,
      refreshing,
      failedChecks,
      refresh,
      requestAccess,
      closeGate,
      pendingRedirect,
    ]
  )

  return (
    <DiscordAccessContext.Provider value={value}>
      {children}
      <DiscordGateDialog />
    </DiscordAccessContext.Provider>
  )
}

export function useDiscordAccess() {
  const value = React.useContext(DiscordAccessContext)
  if (!value) {
    throw new Error(
      "useDiscordAccess must be used inside <DiscordAccessProvider>"
    )
  }
  return value
}
