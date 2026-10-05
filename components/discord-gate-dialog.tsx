"use client"

import Image from "next/image"
import * as React from "react"

import {
  IconAlertTriangle,
  IconCheck,
  IconCopy,
  IconExternalLink,
  IconLoader2,
  IconRefresh,
} from "@tabler/icons-react"

import { DiscordIcon } from "@/components/icons"
import {
  useDiscordAccess,
  type AccessStatus,
} from "@/components/discord-access-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { signIn } from "@/lib/auth-client"
import {
  DISCORD_GUILD_NAME,
  DISCORD_INVITE_CODE,
  DISCORD_INVITE_URL,
} from "@/lib/discord-config"
import { cn } from "@/lib/utils"

/** Pulled from the SCS logo so the gate feels like it belongs to the club. */
const SCS_PURPLE = "#8065cc"
const SCS_MINT = "#b1edb0"
const DISCORD_BLURPLE = "#5865F2"

export function DiscordGateDialog() {
  const { status, gateOpen, blocking, closeGate } = useDiscordAccess()

  return (
    <Dialog
      open={gateOpen}
      disablePointerDismissal={blocking}
      onOpenChange={(open) => {
        if (!open && !blocking) closeGate()
      }}
    >
      <DialogContent
        className="gap-0 overflow-hidden p-0 sm:max-w-md"
        showCloseButton={!blocking}
      >
        <GateBody status={status} />
      </DialogContent>
    </Dialog>
  )
}

function GateBody({ status }: { status: AccessStatus }) {
  const { refresh, refreshing, failedChecks } = useDiscordAccess()

  const step = status === "not-member" ? 2 : 1
  const needsDiscordLogin =
    status === "signed-out" || status === "no-discord" || status === "reauth"

  return (
    <>
      <div className="relative isolate flex flex-col items-center gap-4 px-6 pt-8 pb-5 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-20 -z-10 h-52"
          style={{
            background: `radial-gradient(55% 60% at 50% 50%, ${SCS_PURPLE}33, transparent 70%)`,
          }}
        />
        <GateArt showDiscord={status !== "unavailable"} />
        <div className="flex flex-col gap-2">
          <DialogTitle className="text-lg">{titleFor(status)}</DialogTitle>
          <DialogDescription className="text-balance">
            {bodyFor(status)}
          </DialogDescription>
        </div>
      </div>

      {status !== "loading" && status !== "unavailable" && (
        <GateSteps current={step} />
      )}

      <div className="flex flex-col gap-2 px-6 pt-5 pb-6">
        {status === "loading" && (
          <div className="flex items-center justify-center gap-2 py-1 text-sm text-muted-foreground">
            <IconLoader2 className="size-4 animate-spin" />
            Checking your membership…
          </div>
        )}

        {needsDiscordLogin && (
          <DiscordLoginButton reauth={status === "reauth"} />
        )}

        {status === "not-member" && (
          <>
            <InviteCard />
            <Button
              size="lg"
              className="w-full text-white hover:opacity-90"
              style={{ backgroundColor: DISCORD_BLURPLE }}
              render={
                <a
                  href={DISCORD_INVITE_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                />
              }
            >
              <DiscordIcon className="size-4" />
              Join {DISCORD_GUILD_NAME}
              <IconExternalLink data-icon="inline-end" className="size-3.5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full"
              disabled={refreshing}
              onClick={() => void refresh()}
            >
              {refreshing ? (
                <IconLoader2
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : (
                <IconRefresh data-icon="inline-start" />
              )}
              {refreshing ? "Checking…" : "I've joined, check again"}
            </Button>
            {failedChecks > 0 && !refreshing && (
              <p className="flex items-start gap-1.5 rounded-lg bg-orange-500/60 px-3 py-2 text-xs text-white">
                <IconAlertTriangle className="mt-px size-3.5 shrink-0" />
                <span>
                  Still not seeing you in the server. Make sure you accepted the
                  invite with the same Discord account you signed in with, then
                  check again.
                </span>
              </p>
            )}
          </>
        )}

        {status === "unavailable" && (
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            disabled={refreshing}
            onClick={() => void refresh()}
          >
            {refreshing ? (
              <IconLoader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <IconRefresh data-icon="inline-start" />
            )}
            Try again
          </Button>
        )}
      </div>
    </>
  )
}

function DiscordLoginButton({ reauth }: { reauth: boolean }) {
  const [pending, setPending] = React.useState(false)
  const { pendingRedirect } = useDiscordAccess()

  return (
    <Button
      size="lg"
      className="w-full text-white hover:opacity-90"
      style={{ backgroundColor: DISCORD_BLURPLE }}
      disabled={pending}
      onClick={() => {
        setPending(true)
        const callbackURL =
          pendingRedirect() ??
          `${window.location.pathname}${window.location.search}`
        signIn.social(
          { provider: "discord", callbackURL },
          { onError: () => setPending(false) }
        )
      }}
    >
      {pending ? (
        <IconLoader2 data-icon="inline-start" className="animate-spin" />
      ) : (
        <DiscordIcon className="size-4" />
      )}
      {reauth ? "Reconnect Discord" : "Continue with Discord"}
    </Button>
  )
}

function GateArt({ showDiscord }: { showDiscord: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Image
        src="/logo.png"
        alt=""
        width={56}
        height={56}
        priority
        className="size-14 rounded-2xl ring-1 ring-foreground/10"
        style={{ boxShadow: `0 10px 30px -12px ${SCS_PURPLE}` }}
      />
      {showDiscord && (
        <>
          <span
            aria-hidden
            className="h-px w-8 bg-[repeating-linear-gradient(to_right,currentColor_0_3px,transparent_3px_7px)] text-muted-foreground/60"
          />
          <span
            className="grid size-14 place-items-center rounded-2xl text-white ring-1 ring-foreground/10"
            style={{
              backgroundColor: DISCORD_BLURPLE,
              boxShadow: `0 10px 30px -12px ${DISCORD_BLURPLE}`,
            }}
          >
            <DiscordIcon className="size-7" />
          </span>
        </>
      )}
    </div>
  )
}

const STEP_LABELS = ["Sign in", "Join SCS", "Start solving"]

function StepRail({ filled, hidden }: { filled: boolean; hidden: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "h-px flex-1",
        hidden && "invisible",
        !hidden && !filled && "bg-border"
      )}
      style={!hidden && filled ? { backgroundColor: SCS_PURPLE } : undefined}
    />
  )
}

function GateSteps({ current }: { current: number }) {
  return (
    <ol className="mx-6 grid grid-cols-3 rounded-xl bg-muted/40 px-1 py-3.5">
      {STEP_LABELS.map((label, index) => {
        const step = index + 1
        const done = step < current
        const active = step === current

        return (
          <li
            key={label}
            aria-current={active ? "step" : undefined}
            className="flex flex-col items-center gap-2"
          >
            <div className="flex w-full items-center">
              <StepRail filled={current > index} hidden={index === 0} />
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
                  !done &&
                    !active &&
                    "bg-muted-foreground/20 text-muted-foreground"
                )}
                style={
                  done
                    ? { backgroundColor: SCS_MINT, color: "#14532d" }
                    : active
                      ? { backgroundColor: SCS_PURPLE, color: "#fff" }
                      : undefined
                }
              >
                {done ? <IconCheck className="size-3.5" /> : step}
              </span>
              <StepRail
                filled={done}
                hidden={index === STEP_LABELS.length - 1}
              />
            </div>
            <span
              className={cn(
                "text-center text-[11px] leading-tight",
                active ? "font-medium text-foreground" : "text-muted-foreground"
              )}
            >
              {label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function InviteCard() {
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(timer)
  }, [copied])

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
      <span className="truncate font-mono text-xs text-muted-foreground">
        discord.gg/
        <span className="text-foreground">{DISCORD_INVITE_CODE}</span>
      </span>
      <Button
        size="icon-sm"
        variant="ghost"
        className="ml-auto shrink-0"
        aria-label="Copy invite link"
        onClick={() => {
          void navigator.clipboard
            .writeText(DISCORD_INVITE_URL)
            .then(() => setCopied(true))
        }}
      >
        {copied ? (
          <IconCheck className="size-3.5" style={{ color: SCS_PURPLE }} />
        ) : (
          <IconCopy className="size-3.5" />
        )}
      </Button>
    </div>
  )
}

function titleFor(status: AccessStatus) {
  switch (status) {
    case "loading":
      return "Just a second"
    case "not-member":
      return "One step away"
    case "no-discord":
      return "Link your Discord"
    case "reauth":
      return "Reconnect your Discord"
    case "unavailable":
      return "Can't reach Discord"
    default:
      return "Members only"
  }
}

function bodyFor(status: AccessStatus) {
  switch (status) {
    case "loading":
      return "Confirming you're part of the club."
    case "not-member":
      return `Your Discord is linked, but you're not in the ${DISCORD_GUILD_NAME} server yet. Join it and you're in.`
    case "no-discord":
      return `Your account isn't connected to Discord yet. Link it so we can confirm your ${DISCORD_GUILD_NAME} membership.`
    case "reauth":
      return "We need permission to see which Discord servers you're in. One click and you're back."
    case "unavailable":
      return "Discord didn't answer, so we couldn't confirm your membership. Give it another try in a moment."
    default:
      return `AlgoLounge questions are for ${DISCORD_GUILD_NAME} members. Sign in with Discord to open the workspace.`
  }
}
