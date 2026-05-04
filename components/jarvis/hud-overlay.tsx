"use client"

import { useEffect, useState } from "react"
import type { JarvisState } from "./jarvis-core"

interface HudOverlayProps {
  state: JarvisState
}

export function HudOverlay({ state }: HudOverlayProps) {
  const [mounted, setMounted] = useState(false)
  const [time, setTime] = useState("")
  const [date, setDate] = useState("")
  const [cpu, setCpu] = useState(25)
  const [mem, setMem] = useState(45)
  const [power, setPower] = useState(87)
  const [temp, setTemp] = useState(36)
  const [scanY, setScanY] = useState(0)
  const [remoteAgents, setRemoteAgents] = useState<Array<{id: string, platform: string, hostname: string, stats: Record<string, number> | null}>>([])
  const [usage, setUsage] = useState<{
    claude: { today: { calls: number, inputTokens: number, outputTokens: number, costUSD: number }, total: { calls: number, inputTokens: number, outputTokens: number, costUSD: number } }
    gpt: { today: { sessions: number }, total: { sessions: number } }
  } | null>(null)
  const [vps, setVps] = useState<{ cpu: number, memory: number, disk: number } | null>(null)

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch("/api/jarvis/agent")
        const data = await res.json()
        setRemoteAgents(data.agents || [])
      } catch {}
    }
    fetchAgents()
    const interval = setInterval(fetchAgents, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const res = await fetch("/api/jarvis/usage")
        const data = await res.json()
        setUsage(data.usage)
        setVps(data.vps)
      } catch {}
    }
    fetchUsage()
    const interval = setInterval(fetchUsage, 10000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    setMounted(true)
    const interval = setInterval(() => {
      const now = new Date()
      setTime(now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }))
      setDate(now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }))
      setCpu(v => Math.round(Math.max(10, Math.min(60, v + (Math.random() - 0.5) * 6))))
      setMem(v => Math.round(Math.max(30, Math.min(75, v + (Math.random() - 0.5) * 3))))
      setPower(v => Math.round(Math.max(80, Math.min(99, v + (Math.random() - 0.5) * 2))))
      setTemp(v => Math.round(Math.max(34, Math.min(42, v + (Math.random() - 0.5) * 1))))
      setScanY(v => (v + 2) % 100)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  if (!mounted) return null

  const stateColor = state === "listening" ? "#00ffff" : state === "thinking" ? "#ffa500" : state === "speaking" ? "#00ff88" : "#00ccff"

  return (
    <>
      {/* Scan line */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
        <div className="absolute left-0 right-0 h-px opacity-20" style={{ top: `${scanY}%`, background: `linear-gradient(90deg, transparent, ${stateColor}, transparent)` }} />
      </div>

      {/* Hexagonal grid background */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='52' viewBox='0 0 60 52'%3E%3Cpolygon points='30,2 58,17 58,47 30,62 2,47 2,17' fill='none' stroke='%2300ccff' stroke-width='1'/%3E%3C/svg%3E")`,
        backgroundSize: "60px 52px",
      }} />

      {/* Corner brackets */}
      {[["left-0 top-0", "M0,40 L0,0 L40,0"], ["right-0 top-0", "M60,40 L60,0 L20,0"], ["left-0 bottom-0", "M0,20 L0,60 L40,60"], ["right-0 bottom-0", "M60,20 L60,60 L20,60"]].map(([pos, path], i) => (
        <div key={i} className={`pointer-events-none absolute ${pos} h-16 w-16 z-20`}>
          <svg viewBox="0 0 60 60" className="h-full w-full">
            <path d={path} fill="none" stroke="rgba(0,200,255,0.6)" strokeWidth="2" />
            <path d={path.replace("40", "20").replace("20", "10")} fill="none" stroke="rgba(0,200,255,0.3)" strokeWidth="1" />
          </svg>
        </div>
      ))}

      {/* Left panel */}
      <div className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3">
        {/* System panel */}
        <div className="rounded border border-cyan-500/20 bg-black/40 backdrop-blur-sm p-3 w-44">
          <div className="text-[9px] font-mono text-cyan-500/60 mb-2 tracking-widest">STARK INDUSTRIES</div>
          <div className="text-[10px] font-mono text-cyan-400 mb-2 tracking-wider">JARVIS v3.0</div>
          <div className="space-y-1.5">
            {[["CPU", cpu, "#00ffff"], ["MEM", mem, "#00ff88"], ["PWR", power, "#ffa500"], ["TMP", temp + "°", "#ff6060"]].map(([label, val, color]) => (
              <div key={label as string} className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-cyan-500/50 w-7">{label}</span>
                <div className="flex-1 h-px bg-cyan-900/50 overflow-hidden">
                  <div className="h-full transition-all duration-700" style={{ width: `${val}%`, background: color as string }} />
                </div>
                <span className="text-[9px] font-mono w-7 text-right" style={{ color: color as string }}>{val}{label === "TMP" ? "" : "%"}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Coordinates panel */}
        <div className="rounded border border-cyan-500/20 bg-black/40 backdrop-blur-sm p-3 w-44">
          <div className="text-[9px] font-mono text-cyan-500/60 mb-2 tracking-widest">LOCATION DATA</div>
          <div className="space-y-1">
            {[["LAT", "23°32'51\"S"], ["LON", "46°38'10\"W"], ["ALT", "760m MSL"], ["SPD", "0.0 km/h"]].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-[9px] font-mono text-cyan-500/50">{k}</span>
                <span className="text-[9px] font-mono text-cyan-400">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Threat panel */}
        <div className="rounded border border-cyan-500/20 bg-black/40 backdrop-blur-sm p-3 w-44">
          <div className="text-[9px] font-mono text-cyan-500/60 mb-2 tracking-widest">THREAT ANALYSIS</div>
          <div className="text-[9px] font-mono text-green-400">■ NO THREATS DETECTED</div>
          <div className="text-[9px] font-mono text-cyan-500/50 mt-1">SCAN RADIUS: 5km</div>
          <div className="text-[9px] font-mono text-cyan-500/50">TARGETS: 0</div>
        </div>

        {/* Claude usage panel */}
        <div className="rounded border border-violet-500/30 bg-black/40 backdrop-blur-sm p-3 w-44">
          <div className="text-[9px] font-mono text-violet-400/70 mb-2 tracking-widest">CLAUDE API</div>
          <div className="text-[9px] font-mono text-violet-300/50 mb-1">TODAY</div>
          <div className="space-y-1">
            {[
              ["CALLS", usage?.claude.today.calls ?? 0],
              ["IN", (usage?.claude.today.inputTokens ?? 0).toLocaleString() + " tk"],
              ["OUT", (usage?.claude.today.outputTokens ?? 0).toLocaleString() + " tk"],
              ["COST", "$" + (usage?.claude.today.costUSD ?? 0).toFixed(4)],
            ].map(([k, v]) => (
              <div key={k as string} className="flex justify-between">
                <span className="text-[9px] font-mono text-cyan-500/50">{k}</span>
                <span className="text-[9px] font-mono text-violet-300">{v}</span>
              </div>
            ))}
          </div>
          <div className="h-px bg-violet-500/10 my-1.5" />
          <div className="text-[9px] font-mono text-violet-300/50 mb-1">TOTAL</div>
          <div className="space-y-1">
            {[
              ["CALLS", usage?.claude.total.calls ?? 0],
              ["COST", "$" + (usage?.claude.total.costUSD ?? 0).toFixed(4)],
            ].map(([k, v]) => (
              <div key={k as string} className="flex justify-between">
                <span className="text-[9px] font-mono text-cyan-500/50">{k}</span>
                <span className="text-[9px] font-mono text-violet-300">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3 items-end">
        {/* Time panel */}
        <div className="rounded border border-cyan-500/20 bg-black/40 backdrop-blur-sm p-3 w-44 text-right">
          <div className="text-2xl font-light font-mono text-cyan-400 tabular-nums" style={{ textShadow: "0 0 10px rgba(0,200,255,0.8)" }}>
            {time || "--:--:--"}
          </div>
          <div className="text-[9px] font-mono text-cyan-500/60 mt-1">{date}</div>
          <div className="flex items-center justify-end gap-1.5 mt-2">
            <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[9px] font-mono text-green-400">ONLINE</span>
          </div>
        </div>

        {/* Status panel */}
        <div className="rounded border border-cyan-500/20 bg-black/40 backdrop-blur-sm p-3 w-44">
          <div className="text-[9px] font-mono text-cyan-500/60 mb-2 tracking-widest">SYSTEM STATUS</div>
          <div className="space-y-1">
            {[
              ["AI CORE", "ACTIVE", "#00ff88"],
              ["VOICE REC", state === "listening" ? "LISTENING" : "STANDBY", state === "listening" ? "#00ffff" : "#888"],
              ["RESPONSE", state === "speaking" ? "SPEAKING" : "READY", state === "speaking" ? "#00ff88" : "#888"],
              ["SHIELDS", "NOMINAL", "#00ff88"],
            ].map(([k, v, c]) => (
              <div key={k as string} className="flex justify-between">
                <span className="text-[9px] font-mono text-cyan-500/50">{k}</span>
                <span className="text-[9px] font-mono" style={{ color: c as string }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Network panel */}
        <div className="rounded border border-cyan-500/20 bg-black/40 backdrop-blur-sm p-3 w-44">
          <div className="text-[9px] font-mono text-cyan-500/60 mb-2 tracking-widest">NETWORK</div>
          <div className="space-y-1">
            {[["UPLINK", "98.2 Mbps"], ["LATENCY", "12ms"], ["ENCRYPT", "AES-256"], ["STATUS", "SECURED"]].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-[9px] font-mono text-cyan-500/50">{k}</span>
                <span className="text-[9px] font-mono text-cyan-400">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* VPS Cloud panel */}
        <div className="rounded border border-cyan-500/20 bg-black/40 backdrop-blur-sm p-3 w-44">
          <div className="text-[9px] font-mono text-cyan-500/60 mb-1 tracking-widest">☁ VPS CLOUD</div>
          <div className="flex items-center gap-1.5 mb-2">
            <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[9px] font-mono text-green-400">ONLINE</span>
          </div>
          <div className="space-y-1.5">
            {([["CPU", vps?.cpu ?? 0, "#00ffff"], ["MEM", vps?.memory ?? 0, "#00ff88"], ["DSK", vps?.disk ?? 0, "#ffa500"]] as [string, number, string][]).map(([label, val, color]) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-cyan-500/50 w-7">{label}</span>
                <div className="flex-1 h-px bg-cyan-900/50 overflow-hidden">
                  <div className="h-full transition-all duration-700" style={{ width: `${val}%`, background: color }} />
                </div>
                <span className="text-[9px] font-mono w-7 text-right" style={{ color }}>{val}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* GPT usage panel */}
        <div className="rounded border border-emerald-500/30 bg-black/40 backdrop-blur-sm p-3 w-44">
          <div className="text-[9px] font-mono text-emerald-400/70 mb-2 tracking-widest">GPT REALTIME</div>
          <div className="text-[9px] font-mono text-emerald-300/50 mb-1">TODAY</div>
          <div className="flex justify-between mb-1.5">
            <span className="text-[9px] font-mono text-cyan-500/50">SESSIONS</span>
            <span className="text-[9px] font-mono text-emerald-300">{usage?.gpt.today.sessions ?? 0}</span>
          </div>
          <div className="h-px bg-emerald-500/10 my-1.5" />
          <div className="text-[9px] font-mono text-emerald-300/50 mb-1">TOTAL</div>
          <div className="flex justify-between">
            <span className="text-[9px] font-mono text-cyan-500/50">SESSIONS</span>
            <span className="text-[9px] font-mono text-emerald-300">{usage?.gpt.total.sessions ?? 0}</span>
          </div>
          <div className="text-[9px] font-mono text-cyan-500/30 mt-2">REALTIME API</div>
        </div>

        {/* Remote agents panels */}
        {remoteAgents.filter(a => a.stats).map((agent) => (
          <div key={agent.id} className="rounded border border-cyan-500/20 bg-black/40 backdrop-blur-sm p-3 w-44">
            <div className="text-[9px] font-mono text-cyan-500/60 mb-1 tracking-widest">
              {agent.platform === "Windows" ? "⬛ WINDOWS" : "🍎 MAC"}
            </div>
            <div className="text-[9px] font-mono text-cyan-400 mb-2 truncate">{agent.hostname}</div>
            <div className="space-y-1.5">
              {[
                ["CPU", agent.stats?.cpu, "#00ffff"],
                ["MEM", agent.stats?.memory, "#00ff88"],
                ["DSK", agent.stats?.disk, "#ffa500"],
              ].map(([label, val, color]) => (
                <div key={label as string} className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-cyan-500/50 w-7">{label}</span>
                  <div className="flex-1 h-px bg-cyan-900/50 overflow-hidden">
                    <div className="h-full transition-all duration-700" style={{ width: `${val}%`, background: color as string }} />
                  </div>
                  <span className="text-[9px] font-mono w-7 text-right" style={{ color: color as string }}>{val}%</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[9px] font-mono text-green-400">CONNECTED</span>
            </div>
          </div>
        ))}
      </div>

      {/* Top center - state indicator line */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
        <div className="w-px h-6 bg-gradient-to-b from-transparent to-cyan-500/40" />
        <div className="h-px w-48 bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
      </div>

      {/* Bottom center - state indicator line */}
      <div className="pointer-events-none absolute bottom-20 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
        <div className="h-px w-48 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
      </div>
    </>
  )
}
