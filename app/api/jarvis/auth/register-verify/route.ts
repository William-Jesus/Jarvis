import { NextResponse } from "next/server"
import { verifyRegistrationResponse } from "@simplewebauthn/server"
import { saveCredential } from "@/lib/passkey-store"
import { createSession } from "@/lib/session"

const RP_ID = process.env.RP_ID || "localhost"
const ORIGIN = process.env.NEXT_PUBLIC_ORIGIN || "http://localhost:3000"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { response, challenge } = body

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: true,
    })

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: "Verification failed" }, { status: 400 })
    }

    const { credential } = verification.registrationInfo

    await saveCredential({
      id: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64"),
      counter: credential.counter,
      transports: response.response.transports,
    })

    await createSession()

    return NextResponse.json({ verified: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Registration failed" }, { status: 500 })
  }
}
