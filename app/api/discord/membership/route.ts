import { headers } from "next/headers"
import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import type { MembershipResponse } from "@/lib/discord-config"
import { checkGuildMembership } from "@/lib/discord"

/** GET = cached read. POST = forced re-check (the "I've joined" button). */
async function resolve(force: boolean) {
  const requestHeaders = await headers()
  const session = await auth.api.getSession({ headers: requestHeaders })

  if (!session) {
    return json({ status: "signed-out" })
  }

  const result = await checkGuildMembership(session.user.id, {
    force,
    headers: requestHeaders,
  })

  return json(result)
}

function json(body: MembershipResponse) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
  })
}

export async function GET() {
  return resolve(false)
}

export async function POST() {
  return resolve(true)
}
