import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

const APP_MAP: Record<string, string> = {
  chrome: "Google Chrome",
  google: "Google Chrome",
  safari: "Safari",
  firefox: "Firefox",
  spotify: "Spotify",
  vscode: "Visual Studio Code",
  "visual studio code": "Visual Studio Code",
  terminal: "Terminal",
  finder: "Finder",
  slack: "Slack",
  whatsapp: "WhatsApp",
  zoom: "Zoom",
  notion: "Notion",
  figma: "Figma",
  xcode: "Xcode",
  mail: "Mail",
  calendar: "Calendar",
  notes: "Notes",
  music: "Music",
}

export async function POST(request: Request) {
  try {
    const { action, params } = await request.json()

    if (action === "open_app") {
      const appName = params?.app?.toLowerCase() || ""
      const resolvedApp = APP_MAP[appName] || params?.app

      if (!resolvedApp) {
        return NextResponse.json({ error: "App não especificado" }, { status: 400 })
      }

      await execAsync(`open -a "${resolvedApp}"`)
      return NextResponse.json({ success: true, message: `${resolvedApp} aberto` })
    }

    if (action === "get_news") {
      const topic = params?.topic || ""
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/jarvis/news`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      })
      const data = await res.json()
      return NextResponse.json({ success: true, result: data.summary })
    }

    if (action === "search_web") {
      const query = params?.query || ""
      if (!query) return NextResponse.json({ error: "Query vazia" }, { status: 400 })

      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/jarvis/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      })
      const data = await res.json()
      return NextResponse.json({ success: true, result: data.summary })
    }

    if (action === "set_volume") {
      const level = Math.max(0, Math.min(100, parseInt(params?.level ?? "50", 10)))
      await execAsync(`osascript -e "set volume output volume ${level}"`)
      return NextResponse.json({ success: true, message: `Volume definido para ${level}%` })
    }

    if (action === "mute") {
      await execAsync(`osascript -e "set volume output muted true"`)
      return NextResponse.json({ success: true, message: "Som mutado" })
    }

    if (action === "unmute") {
      await execAsync(`osascript -e "set volume output muted false"`)
      return NextResponse.json({ success: true, message: "Som ativado" })
    }

    return NextResponse.json({ error: "Ação desconhecida" }, { status: 400 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro desconhecido"
    console.error("Execute error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
