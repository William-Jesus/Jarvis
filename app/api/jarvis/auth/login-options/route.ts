import { NextResponse } from "next/server"
import { generateAuthenticationOptions } from "@simplewebauthn/server"
import { getCredential } from "@/lib/passkey-store"

const RP_ID = process.env.RP_ID || "localhost"

export async function GET() {
  const credential = await getCredential()

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: "required",
    allowCredentials: credential ? [{ id: credential.id }] : [],
  })

  return NextResponse.json(options)
}
