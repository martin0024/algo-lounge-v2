import { and, eq } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { account, user } from "@/lib/db/schema"
import {
  DISCORD_GUILD_ID,
  type MembershipResponse,
  type MembershipStatus,
} from "@/lib/discord-config"

const DISCORD_API = "https://discord.com/api/v10"

/**
 * How long a *positive* membership result is trusted before we ask Discord
 * again. Negative results are never cached — the "I've joined, check again"
 * button has to be able to flip the answer instantly.
 */
const MEMBER_CACHE_MS = 10 * 60 * 1000

type CheckOptions = {
  /** Skip the cache — used by the manual refresh button. */
  force?: boolean
  /** Request headers, needed by better-auth to mint an access token. */
  headers: Headers
}

/**
 * Resolve whether `userId` is in the SCS guild.
 *
 * Two strategies, in order of reliability:
 *  1. **Bot token** (`DISCORD_BOT_TOKEN`) — asks the guild directly whether the
 *     Discord user is a member. Independent of user tokens and scopes, so it
 *     keeps working forever once the bot is in the server.
 *  2. **User access token** — reads `/users/@me/guilds`, which requires the
 *     `guilds` scope on the OAuth grant.
 */
export async function checkGuildMembership(
  userId: string,
  { force = false, headers }: CheckOptions
): Promise<MembershipResponse> {
  const [row] = await db
    .select({
      guildMember: user.discordGuildMember,
      checkedAt: user.discordCheckedAt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)

  if (!row) return { status: "signed-out" }

  const fresh =
    row.checkedAt != null &&
    Date.now() - row.checkedAt.getTime() < MEMBER_CACHE_MS

  if (!force && row.guildMember && fresh) {
    return { status: "member" }
  }

  const [discord] = await db
    .select({ accountId: account.accountId })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "discord")))
    .limit(1)

  if (!discord) {
    await persist(userId, false)
    return { status: "no-discord" }
  }

  const result =
    (await checkViaBotToken(discord.accountId)) ??
    (await checkViaUserToken(userId, headers))

  if (result.status === "member" || result.status === "not-member") {
    await persist(userId, result.status === "member")
  }

  return result
}

async function persist(userId: string, isMember: boolean) {
  await db
    .update(user)
    .set({ discordGuildMember: isMember, discordCheckedAt: new Date() })
    .where(eq(user.id, userId))
}

/**
 * Returns `null` when no bot token is configured or the bot itself is
 * misconfigured, so the caller can fall back to the user-token path.
 */
async function checkViaBotToken(
  discordUserId: string
): Promise<MembershipResponse | null> {
  const token = process.env.DISCORD_BOT_TOKEN
  if (!token) return null

  const res = await fetchDiscord(
    `${DISCORD_API}/guilds/${DISCORD_GUILD_ID}/members/${discordUserId}`,
    { Authorization: `Bot ${token}` }
  )

  if (!res) return { status: "unavailable" }
  if (res.status === 200) return { status: "member" }
  if (res.status === 404) return { status: "not-member" }
  if (res.status === 429) {
    return { status: "unavailable", retryAfter: retryAfterSeconds(res) }
  }

  // 401/403 => bad token or bot not in the guild. Not the user's problem;
  // fall through to the user-token path rather than locking everyone out.
  console.warn(
    `[discord] bot membership lookup failed with ${res.status}; falling back to user token`
  )
  return null
}

async function checkViaUserToken(
  userId: string,
  headers: Headers
): Promise<MembershipResponse> {
  let accessToken: string
  try {
    const token = await auth.api.getAccessToken({
      body: { providerId: "discord", userId },
      headers,
    })
    if (!token?.accessToken) return { status: "reauth" }
    accessToken = token.accessToken
  } catch {
    // Expired refresh token, or the account row predates token storage.
    return { status: "reauth" }
  }

  const res = await fetchDiscord(`${DISCORD_API}/users/@me/guilds`, {
    Authorization: `Bearer ${accessToken}`,
  })

  if (!res) return { status: "unavailable" }
  // 401 = dead token, 403 = token granted before we asked for `guilds`.
  if (res.status === 401 || res.status === 403) return { status: "reauth" }
  if (res.status === 429) {
    return { status: "unavailable", retryAfter: retryAfterSeconds(res) }
  }
  if (!res.ok) return { status: "unavailable" }

  const guilds = (await res.json()) as Array<{ id: string }>
  const isMember = guilds.some((guild) => guild.id === DISCORD_GUILD_ID)
  return { status: isMember ? "member" : "not-member" }
}

async function fetchDiscord(url: string, headers: Record<string, string>) {
  try {
    return await fetch(url, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    })
  } catch (error) {
    console.warn("[discord] request failed", error)
    return null
  }
}

function retryAfterSeconds(res: Response) {
  const raw = res.headers.get("retry-after")
  const parsed = raw ? Number(raw) : NaN
  return Number.isFinite(parsed) ? parsed : undefined
}

export type { MembershipStatus }
