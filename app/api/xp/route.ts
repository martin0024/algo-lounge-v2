import { headers } from "next/headers"
import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { getXpProfile } from "@/lib/xp/profile"

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: "Signed out." }, { status: 401 })
  }

  return NextResponse.json(await getXpProfile(session.user.id), {
    headers: { "Cache-Control": "no-store" },
  })
}
