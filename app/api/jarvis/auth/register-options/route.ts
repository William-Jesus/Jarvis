import { NextResponse } from "next/server"
import { generateRegistrationOptions } from "@simplewebauthn/server"
import { getCredential } from "@/lib/passkey-store"

const RP_ID = process.env.RP_ID || "localhost"
const RP_NAME = "JARVIS"

export async function GET() {
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
