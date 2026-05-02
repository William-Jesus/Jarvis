import { NextResponse } from "next/server"
import { getOAuthClient, saveTokens } from "@/lib/google-client"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  if (error || !code) {
    return NextResponse.redirect(new URL("/google-setup?status=error", req.url))
  }

  try {
    const client = getOAuthClient()
    const { tokens } = await client.getToken(code)
    await saveTokens(tokens)
    return NextResponse.redirect(new URL("/google-setup?status=success", req.url))
  } catch (e) {
    console.error("Google callback error:", e)
    return NextResponse.redirect(new URL("/google-setup?status=error", req.url))
  }
}
