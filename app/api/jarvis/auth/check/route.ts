import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { getCredential } from "@/lib/passkey-store"

export async function GET() {
  const [authenticated, credential] = await Promise.all([getSession(), getCredential()])
  return NextResponse.json({
    authenticated,
    registered: !!credential,
  })
}
