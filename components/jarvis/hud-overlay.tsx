"use client"

import { useEffect, useState } from "react"
import type { JarvisState } from "./jarvis-core"

interface HudOverlayProps {
  state: JarvisState
}

const CIRC = 2 * Math.PI * 26

function GaugeCircle({
  pct, label, sub, color, offline = false,
}: {
  pct: number; label: string; sub: string; color: string; offline?: boolean
}) {
  const c = offline ? "#334155" : color
  const glow = offline ? "none" : `drop-shadow(0 0 6px ${color})`
  const offset = CIRC * (1 - Math.min(100, Math.max(0, pct)) / 100)
  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg width="64" height="64" viewBox="0 0 64 64">
        {/* outer track */}
        <circle cx="32" cy="32" r="26" fill="none" stroke={c} strokeWidth="2" opacity="0.15" />
        {/* progress ring */}
        <circle
          cx="32" cy="32" r="26" fill="none"
          stroke={c} strokeWidth="2.5"
          strokeDasharray={CIRC} strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 32 32)"
          style={{ filter: glow, transition: "stroke-dashoffset 1s ease" }}
        />
        {/* inner accent */}
        <circle cx="32" cy="32" r="20" fill="none" stroke={c} strokeWidth="0.5" opacity={offline ? 0.05 : 0.12} />
        {/* center label */}
        <text x="32" y="29" textAnchor="middle" fill={c} fontSize="10.5" fontFamily="monospace" fontWeight="700"
          style={{ filter: offline ? "none" : `drop-shadow(0 0 4px ${color})` }}>
          {label}
        </text>
        <text x="32" y="40" textAnchor="middle" fill={c} fontSize="6.5" fontFamily="monospace" opacity="0.65">
          {sub}
        </text>
      </svg>
    </div>
  )
}

export function HudOverlay({ state }: HudOverlayProps) {
  const [mounted, setMounted] = useState(false)
  const [cpu, setCpu] = useState(25)
  const [mem, setMem] = useState(45)
  const [power, setPower] = useState(87)
  const [temp, setTemp] = useState(36)
  const [scanY, setScanY] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [remoteAgents, setRemoteAgents] = useState<Array<{
    id: string; platform: string; hostname: string
    stats: Record<string, number> | null
  }>>([])
  const [usage, setUsage] = useState<{
    claude: { today: { calls: number; inputTokens: number; outputTokens: number; costUSD: number }; total: { calls: number; costUSD: number } }
    gpt: { today: { sessions: number }; total: { sessions: number } }
  } | null>(null)
  const [vps, setVps] = useState<{ cpu: number; memory: number; disk: number } | null>(null)

  useEffect(() => {
    const fetch1 = async () => {
      try {
        const res = await fetch("/api/jarvis/agent")
        const d = await res.json()
        setRemoteAgents(d.agents || [])
      } catch {}
    }
    fetch1()
    const i1 = setInterval(fetch1, 5000)
    return () => clearInterval(i1)
  }, [])

  useEffect(() => {
    const fetch2 = async () => {
      try {
        const res = await fetch("/api/jarvis/usage")
        const d = await res.json()
        setUsage(d.usage)
        setVps(d.vps)
      } catch {}
    }
    fetch2()
    const i2 = setInterval(fetch2, 10000)
    return () => clearInterval(i2)
  }, [])

  useEffect(() => {
    setMounted(true)
    const id = setInterval(() => {
      setCpu(v => Math.round(Math.max(5, Math.min(60, v + (Math.random() - 0.5) * 6))))
      setMem(v => Math.round(Math.max(30, Math.min(75, v + (Math.random() - 0.5) * 3))))
      setPower(v => Math.round(Math.max(80, Math.min(99, v + (Math.random() - 0.5) * 2))))
      setTemp(v => Math.round(Math.max(34, Math.min(42, v + (Math.random() - 0.5)))))
      setScanY(v => (v + 2) % 100)
      setSeconds(new Date().getSeconds())
    }, 1000)
    return () => clearInterval(id)
  }, [])

  if (!mounted) return null

  const stateColor = state === "listening" ? "#00ffff" : state === "thinking" ? "#ffa500" : state === "speaking" ? "#00ff88" : "#00ccff"
  const macAgent = remoteAgents.find(a => a.platform === "Darwin")
  const winAgent = remoteAgents.find(a => a.platform === "Windows")

  const gauges = [
    { pct: vps?.cpu ?? 0,    label: `${vps?.cpu ?? 0}%`,    sub: "VPS CPU", color: "#00ffff" },
    { pct: vps?.memory ?? 0, label: `${vps?.memory ?? 0}%`, sub: "VPS MEM", color: "#00ff88" },
    { pct: vps?.disk ?? 0,   label: `${vps?.disk ?? 0}%`,   sub: "VPS DSK", color: "#ffa500" },
    {
      pct: macAgent?.stats?.cpu ?? 0,
      label: macAgent ? `${macAgent.stats?.cpu ?? 0}%` : "OFF",
      sub: macAgent ? "MAC CPU" : "MAC",
      color: "#00ccff",
      offline: !macAgent,
    },
    {
      pct: winAgent?.stats?.cpu ?? 0,
      label: winAgent ? `${winAgent.stats?.cpu ?? 0}%` : "OFF",
      sub: winAgent ? "WIN CPU" : "WIN",
      color: "#38bdf8",
      offline: !winAgent,
    },
    {
      pct: (seconds / 59) * 100,
      label: `${String(seconds).padStart(2, "0")}s`,
      sub: "CLOCK",
      color: stateColor,
    },
  ]

  return (
    <>
      {/* Scan line */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
        <div className="absolute left-0 right-0 h-px opacity-15"
          style={{ top: `${scanY}%`, background: `linear-gradient(90deg, transparent, ${stateColor}, transparent)` }} />
      </div>

      {/* Hex grid */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.025]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='52' viewBox='0 0 60 52'%3E%3Cpolygon points='30,2 58,17 58,47 30,62 2,47 2,17' fill='none' stroke='%2300ccff' stroke-width='1'/%3E%3C/svg%3E")`,
        backgroundSize: "60px 52px",
      }} />

      {/* Corner brackets */}
      {([["left-0 top-0","M0,40 L0,0 L40,0"],["right-0 top-0","M60,40 L60,0 L20,0"],["left-0 bottom-0","M0,20 L0,60 L40,60"],["right-0 bottom-0","M60,20 L60,60 L20,60"]] as [string,string][]).map(([pos, path], i) => (
        <div key={i} className={`pointer-events-none absolute ${pos} h-16 w-16 z-20`}>
          <svg viewBox="0 0 60 60" className="h-full w-full">
            <path d={path} fill="none" stroke="rgba(0,200,255,0.5)" strokeWidth="2" />
          </svg>
        </div>
      ))}

      {/* ── LEFT COLUMN ── */}
      <div className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2.5 w-40">

        {/* STARK INDUSTRIES */}
        <div className="rounded border border-cyan-500/20 bg-black/50 backdrop-blur-sm p-2.5">
          <div className="text-[8px] font-mono text-cyan-500/50 mb-1.5 tracking-widest">STARK INDUSTRIES</div>
          <div className="text-[9px] font-mono text-cyan-400 mb-2 tracking-wide" style={{ textShadow: "0 0 6px #00ccff" }}>JARVIS v3.0</div>
          <div className="space-y-1.5">
            {([["CPU", cpu, "#00ffff"], ["MEM", mem, "#00ff88"], ["PWR", power, "#ffa500"], ["TMP", temp, "#ff6060"]] as [string,number,string][]).map(([l, v, c]) => (
              <div key={l} className="flex items-center gap-1.5">
                <span className="text-[8px] font-mono text-cyan-500/40 w-6">{l}</span>
                <div className="flex-1 h-px bg-cyan-900/40 overflow-hidden">
                  <div className="h-full transition-all duration-700" style={{ width: `${v}%`, background: c, boxShadow: `0 0 4px ${c}` }} />
                </div>
                <span className="text-[8px] font-mono w-8 text-right" style={{ color: c }}>{l === "TMP" ? `${v}°` : `${v}%`}</span>
              </div>
            ))}
          </div>
        </div>

        {/* API USAGE */}
        <div className="rounded border border-cyan-500/20 bg-black/50 backdrop-blur-sm p-2.5">
          <div className="text-[8px] font-mono text-cyan-500/50 mb-2 tracking-widest">API USAGE</div>

          <div className="flex items-center gap-1 mb-1">
            <div className="h-1 w-1 rounded-full bg-violet-400" style={{ boxShadow: "0 0 4px #a78bfa" }} />
            <span className="text-[8px] font-mono text-violet-400/80">CLAUDE</span>
          </div>
          <div className="space-y-0.5 mb-2 pl-2">
            {([
              ["TODAY", `${usage?.claude.today.calls ?? 0} calls`],
              ["COST",  `$${(usage?.claude.today.costUSD ?? 0).toFixed(3)}`],
              ["TOTAL", `$${(usage?.claude.total.costUSD ?? 0).toFixed(3)}`],
              ["TOKENS", `${((usage?.claude.today.inputTokens ?? 0) + (usage?.claude.today.outputTokens ?? 0)).toLocaleString()} tk`],
            ] as [string,string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-[8px] font-mono text-cyan-500/40">{k}</span>
                <span className="text-[8px] font-mono text-violet-300">{v}</span>
              </div>
            ))}
          </div>

          <div className="h-px bg-cyan-500/10 mb-2" />

          <div className="flex items-center gap-1 mb-1">
            <div className="h-1 w-1 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 4px #34d399" }} />
            <span className="text-[8px] font-mono text-emerald-400/80">GPT REALTIME</span>
          </div>
          <div className="space-y-0.5 pl-2">
            {([
              ["TODAY", `${usage?.gpt.today.sessions ?? 0} sessions`],
              ["TOTAL", `${usage?.gpt.total.sessions ?? 0} sessions`],
            ] as [string,string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-[8px] font-mono text-cyan-500/40">{k}</span>
                <span className="text-[8px] font-mono text-emerald-300">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT COLUMN ── */}
      <div className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3 items-end">

        {/* Gauge grid 3x2 */}
        <div className="rounded border border-cyan-500/15 bg-black/40 backdrop-blur-sm p-3">
          <div className="text-[8px] font-mono text-cyan-500/40 mb-3 tracking-widest text-center">SYSTEM METRICS</div>
          <div className="grid grid-cols-3 gap-3">
            {gauges.map((g, i) => (
              <GaugeCircle key={i} {...g} />
            ))}
          </div>
          {/* agent hostnames */}
          <div className="mt-3 pt-2 border-t border-cyan-500/10 grid grid-cols-2 gap-2">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <div className={`h-1 w-1 rounded-full ${macAgent ? "bg-green-400 animate-pulse" : "bg-red-500/50"}`} />
                <span className="text-[7px] font-mono" style={{ color: macAgent ? "#00ff88" : "#555" }}>
                  {macAgent?.hostname ?? "OFFLINE"}
                </span>
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <div className={`h-1 w-1 rounded-full ${winAgent ? "bg-green-400 animate-pulse" : "bg-red-500/50"}`} />
                <span className="text-[7px] font-mono" style={{ color: winAgent ? "#00ff88" : "#555" }}>
                  {winAgent?.hostname ?? "OFFLINE"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* System status strip */}
        <div className="rounded border border-cyan-500/15 bg-black/40 backdrop-blur-sm px-3 py-2 w-full">
          <div className="flex items-center justify-between gap-3">
            {([
              ["AI", "ACTIVE", "#00ff88"],
              ["VOICE", state === "listening" ? "ON" : "STBY", state === "listening" ? "#00ffff" : "#444"],
              ["RESP", state === "speaking" ? "ON" : "STBY", state === "speaking" ? "#00ff88" : "#444"],
              ["NET", "OK", "#00ff88"],
            ] as [string,string,string][]).map(([k, v, c]) => (
              <div key={k} className="flex flex-col items-center gap-0.5">
                <span className="text-[7px] font-mono text-cyan-500/40">{k}</span>
                <span className="text-[8px] font-mono font-bold" style={{ color: c, textShadow: `0 0 4px ${c}` }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top/bottom accent lines */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
        <div className="w-px h-5 bg-gradient-to-b from-transparent to-cyan-500/30" />
        <div className="h-px w-40 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
      </div>
      <div className="pointer-events-none absolute bottom-20 left-1/2 -translate-x-1/2 z-20">
        <div className="h-px w-40 bg-gradient-to-r from-transparent via-cyan-500/15 to-transparent" />
      </div>
    </>
  )
}
