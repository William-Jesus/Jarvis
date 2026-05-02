import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const SESSION_COOKIE = "jarvis_session"
const SESSION_SECRET = process.env.SESSION_SECRET || "jarvis-secret-change-in-production-32chars"
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000

function isValidSession(token: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64").toString()
    const [timestamp, ...rest] = decoded.split(":")
    const secret = rest.join(":")
    if (secret !== SESSION_SECRET) return false
    const age = Date.now() - parseInt(timestamp)
    return age < SESSION_DURATION
  } catch {
    return false
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow auth API routes and login page
  if (
    pathname.startsWith("/api/jarvis/auth") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next()
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token || !isValidSession(token)) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
