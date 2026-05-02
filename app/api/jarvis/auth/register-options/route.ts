import { NextResponse } from "next/server"
import { generateRegistrationOptions } from "@simplewebauthn/server"
import { getCredential } from "@/lib/passkey-store"

const RP_ID = process.env.RP_ID || "localhost"
const RP_NAME = "JARVIS"
const REGISTRATION_PASSWORD = process.env.REGISTRATION_PASSWORD || ""

export async function POST(req: Request) {
  const { password } = await req.json()

  if (!password || password !== REGISTRATION_PASSWORD) {
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 })
  }

  const existing = await getCredential()

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: "tony",
    userDisplayName: "Tony Stark",
    excludeCredentials: existing ? [{ id: existing.id }] : [],
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "required",
    },
  })

  return NextResponse.json(options)
}
