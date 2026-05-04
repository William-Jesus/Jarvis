"use client"

import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import type { JarvisState } from "./jarvis-core"

interface HudOverlayProps {
  state: JarvisState
}

type RemoteAgent = {
  id: string
  platform: string
  hostname: string
  stats: Record<string, number> | null
}

type UsageData = {
  claude: {
    today: { calls: number; inputTokens: number; outputTokens: number; costUSD: number }
    total: { calls: number; costUSD: number }
  }
  gpt: { today: { sessions: number }; total: { sessions: number } }
}

const CIRC = 2 * Math.PI * 26

function clampPct(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)))
}

function Panel({
  title,
  children,
  className = "",
}: {
  title?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`relative rounded-md border border-cyan-300/20 bg-black/45 p-3 shadow-[0_0_18px_rgba(34,211,238,0.12)] backdrop-blur-sm ${className}`}>
      <span className="absolute -left-px -top-px h-3 w-8 rounded-tl-md border-l border-t border-cyan-200/70" />
      <span className="absolute -right-px -top-px h-3 w-8 rounded-tr-md border-r border-t border-cyan-200/50" />
      <span className="absolute -bottom-px -left-px h-3 w-8 rounded-bl-md border-b border-l border-cyan-200/35" />
      <span className="absolute -bottom-px -right-px h-3 w-8 rounded-br-md border-b border-r border-cyan-200/35" />
      {title && (
        <div className="mb-2 font-mono text-[9px] font-bold tracking-[0.24em] text-cyan-100/70">
          {title}
        </div>
      )}
      {children}
    </section>
  )
}

function StatusDot({ active, alert = false }: { active: boolean; alert?: boolean }) {
  const color = alert ? "#fb7185" : active ? "#34d399" : "#475569"
  return (
    <span
      className="h-1.5 w-1.5 shrink-0 rounded-full"
      style={{
        background: color,
        boxShadow: active || alert ? `0 0 7px ${color}` : "none",
      }}
    />
  )
}

function MetricBar({
  label,
  value,
  display,
  color,
}: {
  label: string
  value: number
  display?: string
  color: string
}) {
  return (
    <div className="grid grid-cols-[34px_1fr_42px] items-center gap-2">
      <span className="font-mono text-[8px] tracking-wider text-cyan-200/45">{label}</span>
      <div className="h-1 overflow-hidden bg-cyan-950/70">
        <div
          className="h-full transition-all duration-700"
          style={{
            width: `${clampPct(value)}%`,
            background: color,
            boxShadow: `0 0 7px ${color}`,
          }}
        />
      </div>
      <span className="text-right font-mono text-[8px] font-bold" style={{ color }}>
        {display ?? `${clampPct(value)}%`}
      </span>
    </div>
  )
}

function MetricLine({
  label,
  value,
  color = "#67e8f9",
  active = true,
  alert = false,
}: {
  label: string
  value: string
  color?: string
  active?: boolean
  alert?: boolean
}) {
  const shownColor = alert ? "#fb7185" : active ? color : "#64748b"
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-1.5">
        <StatusDot active={active} alert={alert} />
        <span className="truncate font-mono text-[8px] tracking-wider text-cyan-200/45">{label}</span>
      </div>
      <span className="shrink-0 font-mono text-[8px] font-bold" style={{ color: shownColor, textShadow: `0 0 5px ${shownColor}` }}>
        {value}
      </span>
    </div>
  )
}

function GaugeCircle({
  pct,
  label,
  sub,
  color,
  offline = false,
}: {
  pct: number
  label: string
  sub: string
  color: string
  offline?: boolean
}) {
  const c = offline ? "#475569" : color
  const offset = CIRC * (1 - clampPct(pct) / 100)

  return (
    <svg width="62" height="62" viewBox="0 0 64 64" className="overflow-visible">
      <circle cx="32" cy="32" r="26" fill="rgba(2,6,23,0.45)" stroke={c} strokeWidth="1" opacity="0.22" />
      <circle
        cx="32"
        cy="32"
        r="26"
        fill="none"
        stroke={c}
        strokeWidth="2.4"
        strokeDasharray={CIRC}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 32 32)"
        style={{
          filter: offline ? "none" : `drop-shadow(0 0 6px ${color})`,
          transition: "stroke-dashoffset 1s ease",
        }}
      />
      <text x="32" y="30" textAnchor="middle" fill={c} fontSize="9.5" fontFamily="monospace" fontWeight="700">
        {label}
      </text>
      <text x="32" y="40" textAnchor="middle" fill={c} fontSize="6" fontFamily="monospace" opacity="0.7">
        {sub}
      </text>
    </svg>
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
  const [remoteAgents, setRemoteAgents] = useState<RemoteAgent[]>([])
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [vps, setVps] = useState<{ cpu: number; memory: number; disk: number } | null>(null)

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch("/api/jarvis/agent")
        const d = await res.json()
        setRemoteAgents(d.agents || [])
      } catch {}
    }
    fetchAgents()
    const id = setInterval(fetchAgents, 5000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const res = await fetch("/api/jarvis/usage")
        const d = await res.json()
        setUsage(d.usage)
        setVps(d.vps)
      } catch {}
    }
    fetchUsage()
    const id = setInterval(fetchUsage, 10000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    setMounted(true)
    const id = setInterval(() => {
      setCpu(v => Math.round(Math.max(5, Math.min(60, v + (Math.random() - 0.5) * 6))))
      setMem(v => Math.round(Math.max(30, Math.min(75, v + (Math.random() - 0.5) * 3))))
      setPower(v => Math.round(Math.max(80, Math.min(99, v + (Math.random() - 0.5) * 2))))
      setTemp(v => Math.round(Math.max(34, Math.min(42, v + (Math.random() - 0.5)))))
      setScanY(v => (v + 1.25) % 100)
      setSeconds(new Date().getSeconds())
    }, 1000)
    return () => clearInterval(id)
  }, [])

  if (!mounted) return null

  const stateColor = state === "listening" ? "#22d3ee" : state === "thinking" ? "#f59e0b" : state === "speaking" ? "#34d399" : "#38bdf8"
  const macAgent = remoteAgents.find(a => a.platform === "Darwin")
  const winAgent = remoteAgents.find(a => a.platform === "Windows")
  const macCpu = macAgent?.stats?.cpu ?? 0
  const winCpu = winAgent?.stats?.cpu ?? 0
  const vpsCpu = vps?.cpu ?? 0
  const vpsMemory = vps?.memory ?? 0
  const vpsDisk = vps?.disk ?? 0
  const claudeCalls = usage?.claude.today.calls ?? 0
  const claudeCost = usage?.claude.today.costUSD ?? 0
  const claudeTotalCost = usage?.claude.total.costUSD ?? 0
  const gptSessions = usage?.gpt.today.sessions ?? 0
  const tokenTotal = (usage?.claude.today.inputTokens ?? 0) + (usage?.claude.today.outputTokens ?? 0)
  const alertActive = temp > 40 || vpsCpu > 82 || vpsMemory > 88

  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.055]"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, rgba(125,211,252,0.24) 0 1px, transparent 1px 9px)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: "linear-gradient(rgba(56,189,248,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.18) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />
        <div
          className="absolute left-0 right-0 h-px opacity-25"
          style={{
            top: `${scanY}%`,
            background: `linear-gradient(90deg, transparent, ${stateColor}, #e0faff, ${stateColor}, transparent)`,
            boxShadow: `0 0 14px ${stateColor}`,
          }}
        />
      </div>

      <div
        className="pointer-events-none absolute inset-x-4 top-4 z-20 h-px opacity-70"
        style={{ background: `linear-gradient(90deg, ${stateColor}, transparent 18%, transparent 82%, ${stateColor})`, boxShadow: `0 0 14px ${stateColor}` }}
      />
      <div
        className="pointer-events-none absolute inset-x-4 bottom-24 z-20 h-px opacity-45"
        style={{ background: `linear-gradient(90deg, transparent, ${stateColor}, transparent)`, boxShadow: `0 0 12px ${stateColor}` }}
      />

      <div className="pointer-events-none absolute left-5 top-24 z-20 hidden w-48 flex-col gap-3 lg:flex">
        <Panel title="JARVIS">
          <div className="space-y-2">
            <MetricBar label="CPU" value={cpu} color="#22d3ee" />
            <MetricBar label="MEM" value={mem} color="#34d399" />
            <MetricBar label="PWR" value={power} color="#a7fff7" />
            <MetricBar label="TMP" value={temp * 2.4} display={`${temp}C`} color="#fb7185" />
          </div>
        </Panel>

        <Panel title="API">
          <div className="space-y-1.5">
            <MetricLine label="CLAUDE" value={`${claudeCalls} calls`} color="#c4b5fd" active={claudeCalls > 0} />
            <MetricLine label="COST" value={`$${claudeCost.toFixed(3)}`} color="#c4b5fd" active={claudeCost > 0} />
            <MetricLine label="TOTAL" value={`$${claudeTotalCost.toFixed(3)}`} color="#c4b5fd" active={claudeTotalCost > 0} />
            <MetricLine label="GPT RT" value={`${gptSessions} ses`} color="#34d399" active={gptSessions > 0} />
            <MetricLine label="TOKENS" value={tokenTotal.toLocaleString()} color="#e0faff" active={tokenTotal > 0} />
          </div>
        </Panel>
      </div>

      <div className="pointer-events-none absolute right-5 top-24 z-20 hidden w-56 flex-col gap-3 lg:flex">
        <Panel title="SYSTEM">
          <div className="grid grid-cols-3 gap-2">
            <GaugeCircle pct={vpsCpu} label={`${vpsCpu}%`} sub="VPS CPU" color="#22d3ee" />
            <GaugeCircle pct={vpsMemory} label={`${vpsMemory}%`} sub="VPS MEM" color="#34d399" />
            <GaugeCircle pct={vpsDisk} label={`${vpsDisk}%`} sub="VPS DSK" color="#f59e0b" />
            <GaugeCircle pct={macCpu} label={macAgent ? `${macCpu}%` : "OFF"} sub="MAC" color="#7dd3fc" offline={!macAgent} />
            <GaugeCircle pct={winCpu} label={winAgent ? `${winCpu}%` : "OFF"} sub="WIN" color="#60a5fa" offline={!winAgent} />
            <GaugeCircle pct={(seconds / 59) * 100} label={`${String(seconds).padStart(2, "0")}s`} sub="CLOCK" color={stateColor} />
          </div>
        </Panel>

        <Panel title="AGENTS">
          <div className="space-y-1.5">
            <MetricLine label={macAgent?.hostname ?? "MAC"} value={macAgent ? `${macCpu}%` : "OFF"} active={Boolean(macAgent)} color="#34d399" />
            <MetricLine label={winAgent?.hostname ?? "WIN"} value={winAgent ? `${winCpu}%` : "OFF"} active={Boolean(winAgent)} color="#34d399" />
            <MetricLine label="VPS" value={vps ? "ONLINE" : "WAIT"} active={Boolean(vps)} color="#34d399" alert={vpsCpu > 82 || vpsMemory > 88} />
          </div>
        </Panel>
      </div>

      <div className="pointer-events-none absolute left-4 right-4 top-20 z-20 grid grid-cols-2 gap-2 lg:hidden">
        <Panel title="JARVIS" className="p-2">
          <div className="space-y-1.5">
            <MetricBar label="CPU" value={cpu} color="#22d3ee" />
            <MetricBar label="MEM" value={mem} color="#34d399" />
            <MetricBar label="TMP" value={temp * 2.4} display={`${temp}C`} color="#fb7185" />
          </div>
        </Panel>

        <Panel title="STATUS" className="p-2">
          <div className="space-y-1.5">
            <MetricLine label="VPS" value={vps ? `${vpsCpu}%` : "WAIT"} active={Boolean(vps)} color="#22d3ee" />
            <MetricLine label="MAC" value={macAgent ? `${macCpu}%` : "OFF"} active={Boolean(macAgent)} color="#34d399" />
            <MetricLine label="WIN" value={winAgent ? `${winCpu}%` : "OFF"} active={Boolean(winAgent)} color="#34d399" />
          </div>
        </Panel>
      </div>

      <div className="pointer-events-none absolute bottom-28 left-1/2 z-20 hidden w-[min(560px,60vw)] -translate-x-1/2 md:block">
        <Panel>
          <div className="grid grid-cols-4 gap-4 text-center">
            {[
              { label: "AI", value: "ACTIVE", active: true, alert: false, color: "#34d399" },
              { label: "VOICE", value: state === "listening" ? "ON" : "STBY", active: state === "listening", alert: false, color: state === "listening" ? "#22d3ee" : "#64748b" },
              { label: "RESP", value: state === "speaking" ? "ON" : "STBY", active: state === "speaking", alert: false, color: state === "speaking" ? "#34d399" : "#64748b" },
              { label: "ALERT", value: alertActive ? "WARN" : "OK", active: true, alert: alertActive, color: alertActive ? "#fb7185" : "#34d399" },
            ].map(item => (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-center gap-1.5">
                  <StatusDot active={item.active} alert={item.alert} />
                  <span className="font-mono text-[7px] tracking-widest text-cyan-200/45">{item.label}</span>
                </div>
                <div className="font-mono text-[9px] font-bold" style={{ color: item.color, textShadow: `0 0 5px ${item.color}` }}>{item.value}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  )
}
