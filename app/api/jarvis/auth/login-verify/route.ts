import { NextResponse } from "next/server"
import { verifyAuthenticationResponse } from "@simplewebauthn/server"
import { getCredential, updateCounter } from "@/lib/passkey-store"
import { createSession } from "@/lib/session"

const RP_ID = process.env.RP_ID || "localhost"
const ORIGIN = process.env.NEXT_PUBLIC_ORIGIN || "http://localhost:3000"

export async function POST(req: Request) {
  try {
    const { response, challenge } = await req.json()
    const credential = await getCredential()

    if (!credential) {
      return NextResponse.json({ error: "No credential registered" }, { status: 400 })
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: credential.id,
        publicKey: Buffer.from(credential.publicKey, "base64"),
        counter: credential.counter,
        transports: credential.transports as any,
      },
      requireUserVerification: true,
    })

    if (!verification.verified) {
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }

    await updateCounter(verification.authenticationInfo.newCounter)
    await createSession()

    return NextResponse.json({ verified: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 })
  }
}
