import { NextRequest } from "next/server"

export async function GET(_request: NextRequest) {
  try {
    const wsApi = process.env.WS_API_URL || "http://localhost:3003"
    const res = await fetch(`${wsApi}/agents`)
    const data = await res.json()
    return Response.json(data)
  } catch {
    return Response.json({ agents: [] })
  }
}
