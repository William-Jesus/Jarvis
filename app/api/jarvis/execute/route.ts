import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"
import fs from "fs/promises"
import path from "path"
const execAsync = promisify(exec)

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || "jarvis-internal-secret-key"
const internalHeaders = { "Content-Type": "application/json", "x-internal-secret": INTERNAL_SECRET }

const BLOCKED_COMMANDS = ["rm -rf", "sudo", "mkfs", "dd if=", ":(){", "chmod 777 /"]

const REMOTE_ACTIONS = ["open_app", "set_volume", "mute", "unmute", "read_file", "write_file", "list_directory", "run_command"]

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
    const { action, params, agentId } = await request.json()

    // Route to remote agent via ws-server
    if (agentId && REMOTE_ACTIONS.includes(action)) {
      const wsApi = process.env.WS_API_URL || "http://localhost:3003"
      const res = await fetch(`${wsApi}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, action, params }),
      })
      const result = await res.json()
      return NextResponse.json(result)
    }

    if (action === "wake_windows") {
      // WoL must be sent from Mac agent on the same LAN as Windows — not from VPS
      const wsApi = process.env.WS_API_URL || "http://localhost:3003"
      const agentsRes = await fetch(`${wsApi}/agents`)
      const agentsData = await agentsRes.json()
      const macAgent = (agentsData.agents || []).find((a: { platform: string }) => a.platform === "Darwin")
      if (!macAgent) {
        return NextResponse.json({ error: "Mac agent não conectado — necessário para Wake-on-LAN" }, { status: 503 })
      }
      const MAC = (process.env.WINDOWS_MAC_ADDRESS || "9C6B001993CF").replace(/[:\-]/g, "").toUpperCase()
      const wolScript = `python3 -c "import socket; mac='${MAC}'; magic=bytes.fromhex('FF'*6+mac*16); s=socket.socket(socket.AF_INET,socket.SOCK_DGRAM); s.setsockopt(socket.SOL_SOCKET,socket.SO_BROADCAST,1); s.sendto(magic,('255.255.255.255',9)); s.close(); print('ok')"`
      await fetch(`${wsApi}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: macAgent.id, action: "run_command", params: { command: wolScript } }),
      })
      return NextResponse.json({ success: true, result: "Magic packet enviado pelo Mac. O Windows deve ligar em alguns segundos." })
    }

    if (action === "ask_claude") {
      const task = params?.task || ""
      if (!task) return NextResponse.json({ error: "Task vazia" }, { status: 400 })

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
      const res = await fetch(`${baseUrl}/api/jarvis/claude-agent`, {
        method: "POST",
        headers: internalHeaders,
        body: JSON.stringify({ task }),
      })
      const data = await res.json()
      return NextResponse.json({ success: true, result: data.result || data.error })
    }

    if (action === "open_app") {
      const appName = params?.app?.toLowerCase() || ""
      const resolvedApp = APP_MAP[appName] || params?.app

      if (!resolvedApp) {
        return NextResponse.json({ error: "App não especificado" }, { status: 400 })
      }

      await execAsync(`open -a "${resolvedApp}"`)
      return NextResponse.json({ success: true, message: `${resolvedApp} aberto` })
    }

    if (action === "get_agents") {
      const wsApi = process.env.WS_API_URL || "http://localhost:3003"
      const res = await fetch(`${wsApi}/agents`)
      const data = await res.json()
      const agents = data.agents || []
      if (agents.length === 0) return NextResponse.json({ success: true, result: "Nenhum agente conectado no momento." })
      const list = agents.map((a: {hostname: string, platform: string, id: string}) => `${a.hostname} (${a.platform}) - ID: ${a.id}`).join("\n")
      return NextResponse.json({ success: true, result: list })
    }

    if (action === "get_news") {
      const topic = params?.topic || ""
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/jarvis/news`, {
        method: "POST",
        headers: internalHeaders,
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
        headers: internalHeaders,
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

    if (action === "read_file") {
      const filePath = path.resolve(params?.path || "")
      const content = await fs.readFile(filePath, "utf-8")
      const preview = content.length > 2000 ? content.slice(0, 2000) + "\n...(truncado)" : content
      return NextResponse.json({ success: true, result: preview })
    }

    if (action === "write_file") {
      const filePath = path.resolve(params?.path || "")
      const content = params?.content || ""
      await fs.writeFile(filePath, content, "utf-8")
      return NextResponse.json({ success: true, message: `Arquivo salvo em ${filePath}` })
    }

    if (action === "list_directory") {
      const dirPath = path.resolve(params?.path || process.env.HOME || "~")
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      const list = entries.map((e) => `${e.isDirectory() ? "[pasta]" : "[arquivo]"} ${e.name}`).join("\n")
      return NextResponse.json({ success: true, result: list })
    }

    if (action === "run_command") {
      const command = params?.command || ""
      if (!command) return NextResponse.json({ error: "Comando vazio" }, { status: 400 })

      const isBlocked = BLOCKED_COMMANDS.some((blocked) => command.includes(blocked))
      if (isBlocked) return NextResponse.json({ error: "Comando não permitido por segurança" }, { status: 403 })

      const { stdout, stderr } = await execAsync(command, { timeout: 15000 })
      const output = (stdout || stderr || "Comando executado sem saída").slice(0, 2000)
      return NextResponse.json({ success: true, result: output })
    }

    return NextResponse.json({ error: "Ação desconhecida" }, { status: 400 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro desconhecido"
    console.error("Execute error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
