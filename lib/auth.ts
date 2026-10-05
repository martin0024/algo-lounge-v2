import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"

import { db, schema } from "@/lib/db"
import { DISCORD_SCOPES } from "@/lib/discord-config"

const socialProviders: Record<
  string,
  { clientId: string; clientSecret: string; scope?: string[] }
> = {}
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  }
}
if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
  socialProviders.discord = {
    clientId: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    // `guilds` lets us verify SCS server membership without a bot token.
    scope: DISCORD_SCOPES,
  }
}

/**
 * Extra hosts the app is reachable on besides BETTER_AUTH_URL — e.g. a dev
 * tunnel. With them, the base URL (and so the OAuth redirect URI) follows the
 * host the request came in on, restricted to this allowlist; unknown hosts
 * fall back to BETTER_AUTH_URL. Each host's
 * `https://<host>/api/auth/callback/<provider>` must also be registered with
 * the OAuth provider.
 */
const extraHosts = (process.env.BETTER_AUTH_ALLOWED_HOSTS ?? "")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean)

function baseURLConfig() {
  const primary = process.env.BETTER_AUTH_URL
  if (extraHosts.length === 0 || !primary) return primary
  return {
    allowedHosts: [new URL(primary).host, ...extraHosts],
    // Tunnels terminate TLS and forward x-forwarded-proto: https.
    protocol: "auto" as const,
    fallback: primary,
  }
}

// Email verification is enforced only when a delivery path is configured, so
// turning it on can't silently lock everyone out of a deployment that has no
// mailer wired up yet. Set AUTH_REQUIRE_EMAIL_VERIFICATION=1 once sending works.
const requireEmailVerification =
  process.env.AUTH_REQUIRE_EMAIL_VERIFICATION === "1"

export const auth = betterAuth({
  baseURL: baseURLConfig(),
  // Explicit allowlist of origins trusted for cookies/CSRF and OAuth redirects.
  trustedOrigins: [
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
    ...extraHosts.map((host) => `https://${host}`),
  ],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification,
  },
  emailVerification: {
    sendOnSignUp: requireEmailVerification,
    async sendVerificationEmail({ user, url }) {
      // TODO: wire a real mailer (Resend/SES/SMTP). Until then the link is only
      // logged, so AUTH_REQUIRE_EMAIL_VERIFICATION must stay off in production.
      console.log(`[auth] verification link for ${user.email}: ${url}`)
    },
  },
  // Throttle the auth endpoints to blunt scripted account creation and
  // credential brute-forcing. In-memory per instance (fine for the current
  // single-server deploy); move to a shared store if scaled horizontally.
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-up/email": { window: 3600, max: 5 },
      "/sign-in/email": { window: 300, max: 10 },
      "/forget-password": { window: 3600, max: 5 },
    },
  },
  socialProviders,
})
