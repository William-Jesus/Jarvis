const { WebSocketServer } = require("ws")
const { v4: uuidv4 } = require("uuid")

const PORT = process.env.WS_PORT || 4001
const wss = new WebSocketServer({ port: PORT })

const agents = new Map()
const pending = new Map()
const agentStats = new Map()

wss.on("connection", (ws) => {
  const agentId = uuidv4()

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString())

      if (msg.type === "register") {
        // Disconnect any existing agent with same hostname+platform
        for (const [existingId, existing] of agents.entries()) {
          if (existing.hostname === msg.hostname && existing.platform === msg.platform) {
            existing.ws.terminate()
            agents.delete(existingId)
            agentStats.delete(existingId)
            console.log(`[agent] Replaced duplicate: ${existingId} (${msg.hostname})`)
          }
        }
        agents.set(agentId, {
          ws,
          id: agentId,
          platform: msg.platform || "unknown",
          hostname: msg.hostname || "unknown",
          connectedAt: new Date(),
        })
        ws.send(JSON.stringify({ type: "registered", agentId }))
        console.log(`[agent] Connected: ${agentId} (${msg.platform} - ${msg.hostname})`)
        return
      }

      if (msg.type === "stats") {
        agentStats.set(agentId, { ...msg.stats, updatedAt: new Date() })
        return
      }

      if (msg.type === "result") {
        const p = pending.get(msg.commandId)
        if (p) {
          clearTimeout(p.timeout)
          pending.delete(msg.commandId)
          p.resolve(msg.result)
        }
        return
      }

      if (msg.type === "error") {
        const p = pending.get(msg.commandId)
        if (p) {
          clearTimeout(p.timeout)
          pending.delete(msg.commandId)
          p.reject(new Error(msg.error))
        }
        return
      }
    } catch (e) {
      console.error("WS parse error:", e)
    }
  })

  ws.on("close", () => {
    agents.delete(agentId)
    console.log(`[agent] Disconnected: ${agentId}`)
  })

  ws.on("error", () => agents.delete(agentId))
})

// HTTP API para o Next.js se comunicar com este servidor
const http = require("http")

const httpServer = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json")

  if (req.method === "GET" && req.url === "/agents") {
    const list = Array.from(agents.values()).map(({ id, platform, hostname, connectedAt }) => ({
      id, platform, hostname, connectedAt,
      stats: agentStats.get(id) || null,
    }))
    res.end(JSON.stringify({ agents: list }))
    return
  }

  if (req.method === "POST" && req.url === "/command") {
    let body = ""
    req.on("data", (chunk) => (body += chunk))
    req.on("end", () => {
      try {
        const { agentId, action, params } = JSON.parse(body)
        const agent = agents.get(agentId)

        if (!agent) {
          res.statusCode = 404
          res.end(JSON.stringify({ error: `Agente ${agentId} não conectado` }))
          return
        }

        const commandId = uuidv4()
        const timeout = setTimeout(() => {
          pending.delete(commandId)
          res.statusCode = 504
          res.end(JSON.stringify({ error: "Timeout: agente não respondeu" }))
        }, 15000)

        pending.set(commandId, {
          resolve: (result) => res.end(JSON.stringify({ success: true, ...result })),
          reject: (err) => {
            res.statusCode = 500
            res.end(JSON.stringify({ error: err.message }))
          },
          timeout,
        })

        agent.ws.send(JSON.stringify({ commandId, action, params }))
      } catch (e) {
        res.statusCode = 400
        res.end(JSON.stringify({ error: "Invalid JSON" }))
      }
    })
    return
  }

  res.statusCode = 404
  res.end(JSON.stringify({ error: "Not found" }))
})

httpServer.listen(3003, () => {
  console.log(`[agent-http] API on port 3003`)
})

console.log(`[agent-ws] WebSocket server on port ${PORT}`)
