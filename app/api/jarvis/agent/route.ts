import { NextRequest } from "next/server"
import { WebSocketServer } from "ws"
import { agentManager } from "@/lib/agent-manager"
import { v4 as uuidv4 } from "uuid"

declare global {
  // eslint-disable-next-line no-var
  var wssStarted: boolean | undefined
}

function getOrCreateWSS(): WebSocketServer {
  if (!global.wssStarted) {
    const wss = new WebSocketServer({ port: 3001 })

    wss.on("connection", (ws, req) => {
      const agentId = uuidv4()
      let platform = "unknown"
      let hostname = "unknown"

      ws.on("message", (data) => {
        try {
          const msg = JSON.parse(data.toString())

          if (msg.type === "register") {
            platform = msg.platform || "unknown"
            hostname = msg.hostname || "unknown"
            agentManager.register(agentId, ws, platform, hostname)
            ws.send(JSON.stringify({ type: "registered", agentId }))
            return
          }

          if (msg.type === "result") {
            agentManager.resolveCommand(msg.commandId, msg.result)
            return
          }

          if (msg.type === "error") {
            agentManager.rejectCommand(msg.commandId, msg.error)
            return
          }
        } catch {}
      })

      ws.on("close", () => agentManager.unregister(agentId))
      ws.on("error", () => agentManager.unregister(agentId))
    })

    global.wssStarted = true
    console.log("[agent] WebSocket server on port 3001")
  }

  return {} as WebSocketServer
}

export async function GET(request: NextRequest) {
  getOrCreateWSS()
  const agents = agentManager.getAgents()
  return Response.json({ agents })
}
