import { cookies } from "next/headers"

const SESSION_COOKIE = "jarvis_session"
const SESSION_SECRET = process.env.SESSION_SECRET || "jarvis-secret-change-in-production-32chars"
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

export async function createSession() {
  const token = Buffer.from(`${Date.now()}:${SESSION_SECRET}`).toString("base64")
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  })
  return token
}

export async function getSession(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE)?.value
    if (!token) return false
    const decoded = Buffer.from(token, "base64").toString()
    const [timestamp] = decoded.split(":")
    const age = Date.now() - parseInt(timestamp)
    return age < SESSION_DURATION
  } catch {
    return false
  }
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}
