import type { NextConfig } from "next"

// Hosts the dev server may be opened from besides localhost (dev tunnels);
// the same list lets better-auth accept them (see lib/auth.ts).
const extraHosts = (process.env.BETTER_AUTH_ALLOWED_HOSTS ?? "")
  .split(",")
  .map((host) => host.trim().split(":")[0])
  .filter(Boolean)

const nextConfig: NextConfig = {
  allowedDevOrigins: extraHosts,
}

export default nextConfig
