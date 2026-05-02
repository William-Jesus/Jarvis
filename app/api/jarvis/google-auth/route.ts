import { NextResponse } from "next/server"
import { getOAuthClient } from "@/lib/google-client"

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
]

export async function GET() {
  const client = getOAuthClient()
  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  })
  return NextResponse.redirect(url)
}
