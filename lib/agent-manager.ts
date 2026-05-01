import { WebSocket } from "ws"

interface AgentInfo {
  ws: WebSocket
  id: string
  platform: string
  hostname: string
  connectedAt: Date
}

interface PendingCommand {
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
  timeout: NodeJS.Timeout
}

class AgentManager {
  private agents = new Map<string, AgentInfo>()
  private pending = new Map<string, PendingCommand>()

  register(id: string, ws: WebSocket, platform: string, hostname: string) {
    this.agents.set(id, { ws, id, platform, hostname, connectedAt: new Date() })
    console.log(`[agent] Connected: ${id} (${platform} - ${hostname})`)
  }

  unregister(id: string) {
    this.agents.delete(id)
    console.log(`[agent] Disconnected: ${id}`)
  }

  getAgents() {
    return Array.from(this.agents.values()).map(({ id, platform, hostname, connectedAt }) => ({
      id, platform, hostname, connectedAt,
    }))
  }

  async sendCommand(agentId: string, commandId: string, action: string, params: Record<string, unknown>): Promise<unknown> {
    const agent = this.agents.get(agentId)
    if (!agent) throw new Error(`Agente ${agentId} não conectado`)

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(commandId)
        reject(new Error("Timeout: agente não respondeu em 15s"))
      }, 15000)

      this.pending.set(commandId, { resolve, reject, timeout })
      agent.ws.send(JSON.stringify({ commandId, action, params }))
    })
  }

  resolveCommand(commandId: string, result: unknown) {
    const pending = this.pending.get(commandId)
    if (pending) {
      clearTimeout(pending.timeout)
      this.pending.delete(commandId)
      pending.resolve(result)
    }
  }

  rejectCommand(commandId: string, error: string) {
    const pending = this.pending.get(commandId)
    if (pending) {
      clearTimeout(pending.timeout)
      this.pending.delete(commandId)
      pending.reject(new Error(error))
    }
  }
}

declare global {
  // eslint-disable-next-line no-var
  var agentManager: AgentManager | undefined
}

export const agentManager = global.agentManager ?? new AgentManager()
if (process.env.NODE_ENV !== "production") global.agentManager = agentManager
