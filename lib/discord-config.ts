/**
 * Shared Discord constants — safe to import from client components.
 * Values are baked in at build time via NEXT_PUBLIC_* with sane defaults so a
 * fresh checkout works without extra env wiring.
 */

export const DISCORD_GUILD_ID =
  process.env.NEXT_PUBLIC_DISCORD_GUILD_ID || "631266417886625812"

export const DISCORD_GUILD_NAME =
  process.env.NEXT_PUBLIC_DISCORD_GUILD_NAME || "SCS Concordia"

export const DISCORD_INVITE_CODE =
  process.env.NEXT_PUBLIC_DISCORD_INVITE_CODE || "DKnYDWZXCg"

export const DISCORD_INVITE_URL = `https://discord.gg/${DISCORD_INVITE_CODE}`

/** Scopes we need: `guilds` is what lets us read the user's server list. */
export const DISCORD_SCOPES = ["identify", "email", "guilds"]

/**
 * Where a user stands relative to the guild.
 * - `member`      — signed in, linked, in the server. Full access.
 * - `not-member`  — signed in and linked, but hasn't joined the server.
 * - `no-discord`  — signed in with some other method, no Discord account linked.
 * - `reauth`      — Discord token is expired or predates the `guilds` scope.
 * - `unavailable` — Discord API is down / rate limiting us.
 * - `signed-out`  — no session.
 */
export type MembershipStatus =
  | "member"
  | "not-member"
  | "no-discord"
  | "reauth"
  | "unavailable"
  | "signed-out"

export type MembershipResponse = {
  status: MembershipStatus
  /** Present when Discord rate-limited us; seconds until we may retry. */
  retryAfter?: number
}
